/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register background message handler for Firebase Cloud Messaging.
// This MUST be at module level (before AppRegistry) so headless JS can invoke it.
// Wrapped in try/catch because the native Firebase module may not be ready
// at bundle parse time on iOS (GoogleService-Info.plist auto-init is async).
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('📬 Background notification received:', remoteMessage);

    const type = remoteMessage.data?.type;
    if (type === 'session_terminated') {
      // Clear stored auth — when app opens, it will show login screen
      const {
        secureStorage,
      } = require('./src/services/storage/SecureStorageService');
      await secureStorage.removeToken();
      console.log('🚪 Session terminated — logged out from background');
    }
  });
} catch (error) {
  console.warn(
    '⚠️ Firebase not ready yet for background handler (will retry on next launch):',
    error.message,
  );
}

AppRegistry.registerComponent(appName, () => App);
