/**
 * App Navigator
 * Main app navigation with bottom tabs
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from './types';

// Import navigators and screens
import ChatNavigator from './ChatNavigator';
import ContactsNavigator from './ContactsNavigator';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Placeholder screens
import { View, Text, StyleSheet } from 'react-native';

// Temporary placeholder screen
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.note}>Screen coming soon</Text>
  </View>
);

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1890ff',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: {
          fontSize: 12,
        },
        tabBarIconStyle: {
          fontSize: 24,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ 
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ChatStack"
        component={ChatNavigator}
        options={{ 
          title: 'Chats',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{ 
          title: 'Appointments',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ContactsStack"
        component={ContactsNavigator}
        options={{ 
          title: 'Contacts',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f9',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  note: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default AppNavigator;
