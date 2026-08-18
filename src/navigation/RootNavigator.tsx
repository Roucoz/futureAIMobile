/**
 * Root Navigator
 * Main navigation container - switches between Auth and App flows
 */

import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, useChat, useAppointment, useModule } from '../stores';
import { notificationService } from '../services/notifications/NotificationService';
import { websocketService } from '../services/websocket/WebSocketService';
import { RootStackParamList } from './types';
import { env } from '../config/env';

// Import navigators
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = observer(() => {
  const authStore = useAuth();
  const chatStore = useChat();
  const appointmentStore = useAppointment();
  const moduleStore = useModule();
  const notificationsInitialized = useRef(false);

  // Initialize auth state on app load
  useEffect(() => {
    authStore.initialize();
  }, []);

  // Fetch enabled modules once authenticated
  // (used to gate appointments/orders/tickets API calls and tab access)
  useEffect(() => {
    if (authStore.isAuthenticated && authStore.token) {
      moduleStore.fetchModuleStatuses();
    }
  }, [authStore.isAuthenticated, authStore.token, moduleStore]);

  // Listen for session_terminated WebSocket events (forced logout)
  useEffect(() => {
    const unsubscribe = websocketService.subscribe(message => {
      if (message.type === 'session_terminated') {
        console.log('🚫 Session terminated by server:', message.message);
        authStore.logout();
      }
    });

    return unsubscribe;
  }, [authStore]);

  // Connect/disconnect WebSocket and push notifications based on auth status
  useEffect(() => {
    if (authStore.isAuthenticated && authStore.token && authStore.user) {
      console.log('🔌 Connecting WebSocket...');
      chatStore.setupWebSocketConnection(env.API_BASE_URL, authStore.token);
      appointmentStore.setupWebSocketConnection(
        env.API_BASE_URL,
        authStore.token,
      );

      // Initialize push notifications
      console.log('🔔 Initializing push notifications...');
      notificationService.initialize(authStore.user.id);
      notificationsInitialized.current = true;
    } else if (notificationsInitialized.current) {
      console.log('🔌 Disconnecting WebSocket...');
      chatStore.disconnectWebSocket();
      appointmentStore.disconnectWebSocket();
      notificationService.cleanup();
      notificationsInitialized.current = false;
    }

    // Cleanup on unmount
    return () => {
      chatStore.disconnectWebSocket();
      appointmentStore.disconnectWebSocket();
    };
  }, [authStore.isAuthenticated, authStore.token]);

  // Show loading while checking auth status
  if (authStore.loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authStore.isAuthenticated ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
});

export default RootNavigator;
