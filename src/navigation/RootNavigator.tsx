/**
 * Root Navigator
 * Main navigation container - switches between Auth and App flows
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, useChat } from '../stores';
import { RootStackParamList } from './types';
import { env } from '../config/env';

// Import navigators
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = observer(() => {
  const authStore = useAuth();
  const chatStore = useChat();

  // Initialize auth state on app load
  useEffect(() => {
    authStore.initialize();
  }, []);

  // Connect/disconnect WebSocket based on auth status
  useEffect(() => {
    if (authStore.isAuthenticated && authStore.token) {
      console.log('🔌 Connecting WebSocket...');
      chatStore.setupWebSocketConnection(env.API_BASE_URL, authStore.token);
    } else {
      console.log('🔌 Disconnecting WebSocket...');
      chatStore.disconnectWebSocket();
    }

    // Cleanup on unmount
    return () => {
      chatStore.disconnectWebSocket();
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
