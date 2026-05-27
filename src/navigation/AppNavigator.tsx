/**
 * App Navigator
 * Main app navigation with bottom tabs
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from './types';

// Import navigators and screens
import ChatNavigator from './ChatNavigator';

// Placeholder screens
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useAuth } from '../stores';

// Temporary placeholder screen
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.note}>Screen coming soon</Text>
  </View>
);

// Profile screen with logout
const ProfileScreen = observer(() => {
  const authStore = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {authStore.user && (
        <View style={styles.userInfo}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{authStore.user.fullName}</Text>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{authStore.user.email}</Text>
          <Text style={styles.label}>Role:</Text>
          <Text style={styles.value}>{authStore.user.role}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={() => authStore.logout()}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
});

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1890ff',
        tabBarInactiveTintColor: '#888',
      }}>
      <Tab.Screen
        name="ChatStack"
        component={ChatNavigator}
        options={{ title: 'Chat' }}
      />
      <Tab.Screen
        name="Appointments"
        component={() => <PlaceholderScreen title="Appointments" />}
      />
      <Tab.Screen
        name="Notifications"
        component={() => <PlaceholderScreen title="Notifications" />}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
  userInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  logoutButton: {
    backgroundColor: '#f5222d',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppNavigator;
