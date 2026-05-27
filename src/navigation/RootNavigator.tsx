/**
 * Root Navigator
 * Main navigation container - switches between Auth and App flows
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../stores';
import { RootStackParamList } from './types';

// Import navigators
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = observer(() => {
  const authStore = useAuth();

  // Initialize auth state on app load
  useEffect(() => {
    authStore.initialize();
  }, []);

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
