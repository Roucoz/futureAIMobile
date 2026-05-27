/**
 * Auth Navigator
 * Handles authentication flow (Login, 2FA, etc.)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from './types';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* TODO: Add TwoFactorScreen and GoogleCompleteScreen */}
    </Stack.Navigator>
  );
};

export default AuthNavigator;
