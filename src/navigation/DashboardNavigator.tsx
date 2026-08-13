/**
 * Dashboard Navigator
 * Stack navigator for dashboard flow (Dashboard → Profile)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardStackParamList } from './types';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createStackNavigator<DashboardStackParamList>();

const DashboardNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default DashboardNavigator;
