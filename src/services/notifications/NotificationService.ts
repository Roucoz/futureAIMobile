import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import apiClient from '../api/client';

/**
 * Request POST_NOTIFICATIONS permission on Android 13+ (API 33).
 * Without this, ALL notifications are silently blocked by the OS.
 */
async function requestAndroidPermission(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const result = await PermissionsAndroid.request(
        'android.permission.POST_NOTIFICATIONS' as any,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Notification permission granted');
      } else {
        console.warn('⚠️ Notification permission denied — push notifications will not appear');
      }
    } catch (err) {
      console.warn('⚠️ Failed to request notification permission:', err);
    }
  }
}

/**
 * Create the default notification channel (required for Android 8+ to show notifications)
 */
async function createDefaultChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const channel = await messaging().android.getChannel('default');
      if (!channel) {
        await messaging().android.createChannel({
          id: 'default',
          name: 'Notifications',
          description: 'General notifications',
          importance: 4, // HIGH
          sound: 'default',
          vibration: true,
        });
        console.log('📢 Notification channel created');
      }
    } catch (err) {
      console.warn('⚠️ Failed to create notification channel:', err);
    }
  }
}

type NotificationData = {
  type?: string;
  conversationId?: string;
  [key: string]: string | undefined;
};

type NotificationHandler = (data: NotificationData) => void;

class NotificationService {
  private fcmToken: string | null = null;
  private onNotificationTapHandlers: NotificationHandler[] = [];
  private sessionTerminatedCallbacks: Array<() => void> = [];
  private initialized = false;

  /**
   * Initialize push notifications: request permission, get FCM token, register with backend
   */
  async initialize(_userId: string): Promise<void> {
    if (this.initialized) {
      console.log('🔔 Notifications already initialized');
      return;
    }

    try {
      // Request Android 13+ notification permission (REQUIRED or notifications are silently blocked)
      await requestAndroidPermission();

      // Create notification channel (required for Android 8+)
      await createDefaultChannel();

      // Request permission (iOS only; Android doesn't need this since API 33+)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('🔕 Push notification permission denied');
        return;
      }

      // Get FCM token
      this.fcmToken = await messaging().getToken();
      console.log('📱 FCM Token:', this.fcmToken);

      // Register with backend
      const platform = Platform.OS as 'ios' | 'android';
      await apiClient.post('/v1/device-tokens', {
        token: this.fcmToken,
        platform,
      });
      console.log('✅ Device registered for push notifications');

      // Listen for token refresh
      this.setupTokenRefresh();

      // Handle foreground messages
      this.setupForegroundHandler();

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    }
  }

  /**
   * Clean up on logout: unregister device token, reset state
   */
  async cleanup(): Promise<void> {
    if (!this.initialized && !this.fcmToken) {
      return; // Nothing to clean up
    }

    try {
      if (this.fcmToken) {
        await apiClient.delete('/v1/device-tokens', {
          data: { token: this.fcmToken },
        });
        console.log('🗑️ Device unregistered from push notifications');
      }

      // Delete FCM token so a new one is generated on next login
      if (this.initialized) {
        await messaging().deleteToken();
      }
    } catch (error) {
      console.error('Failed to cleanup notifications:', error);
    } finally {
      this.fcmToken = null;
      this.initialized = false;
    }
  }

  /**
   * Register a handler for when user taps a notification
   */
  onNotificationTap(handler: NotificationHandler): () => void {
    this.onNotificationTapHandlers.push(handler);
    return () => {
      this.onNotificationTapHandlers = this.onNotificationTapHandlers.filter(
        h => h !== handler,
      );
    };
  }

  /**
   * Get the current FCM token
   */
  getToken(): string | null {
    return this.fcmToken;
  }

  // ---- Private setup methods ----

  private setupTokenRefresh(): void {
    messaging().onTokenRefresh(async newToken => {
      console.log('🔄 FCM Token refreshed:', newToken);
      this.fcmToken = newToken;

      try {
        const platform = Platform.OS as 'ios' | 'android';
        await apiClient.post('/v1/device-tokens', {
          token: newToken,
          platform,
        });
        console.log('✅ Refreshed token registered with backend');
      } catch (error) {
        console.error('❌ Failed to register refreshed token:', error);
      }
    });
  }

  private setupForegroundHandler(): void {
    messaging().onMessage(async remoteMessage => {
      console.log('📬 Foreground notification:', remoteMessage);

      // FCM data values can be `string | object`; we only use string values
      const rawData = remoteMessage.data as Record<string, string> | undefined;
      const type = rawData?.type;

      // Session terminated: show notification then force logout
      if (type === 'session_terminated') {
        console.log('🚪 Session terminated — showing notification then logging out');

        // Show notification before logout
        const notification = remoteMessage.notification;
        if (notification?.title || notification?.body) {
          await displayLocalNotification(
            notification.title || '',
            notification.body || '',
            rawData,
          );
        }

        // Small delay so the notification has time to appear
        await new Promise<void>(resolve => setTimeout(resolve, 300));

        this.sessionTerminatedCallbacks.forEach(cb => cb());
        return;
      }

      if (rawData?.showInForeground === 'false') {
        console.log('🔇 Notification suppressed in foreground:', type);
        return;
      }

      // Show local notification for all other types
      const notification = remoteMessage.notification;
      if (notification?.title || notification?.body) {
        await displayLocalNotification(
          notification.title || '',
          notification.body || '',
          rawData,
        );
      }
    });
  }

  /**
   * Register a callback for when this device's session is terminated (login elsewhere)
   */
  onSessionTerminated(callback: () => void): () => void {
    this.sessionTerminatedCallbacks.push(callback);
    return () => {
      this.sessionTerminatedCallbacks = this.sessionTerminatedCallbacks.filter(
        cb => cb !== callback,
      );
    };
  }
}

// Singleton
export const notificationService = new NotificationService();

/**
 * Display a local notification via notifee when the app is in the foreground.
 * FCM does not auto-display notifications in the foreground, so we use notifee
 * to show a heads-up / system notification that looks identical to a background push.
 */
async function displayLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string | undefined>,
): Promise<void> {
  try {
    // Create / reuse a channel (Android)
    let channelId = 'default';
    if (Platform.OS === 'android') {
      channelId = await notifee.createChannel({
        id: 'default',
        name: 'Notifications',
        importance: AndroidImportance.HIGH,
      });
    }

    await notifee.displayNotification({
      title,
      body,
      data: data as Record<string, string>,
      android: {
        channelId,
        pressAction: { id: 'default' },
        importance: AndroidImportance.HIGH,
      },
      ios: {
        sound: 'default',
      },
    });
  } catch (error) {
    console.error('❌ Failed to display local notification:', error);
  }
}
