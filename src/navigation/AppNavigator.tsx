/**
 * App Navigator
 * Main app navigation with bottom tabs
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { AppTabParamList } from './types';

// Import navigators and screens
import ChatNavigator from './ChatNavigator';
import ContactsNavigator from './ContactsNavigator';
import TicketNavigator from './TicketNavigator';
import DashboardNavigator from './DashboardNavigator';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';

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
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardNavigator}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Icon name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatStack"
        component={ChatNavigator}
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Icon name="cart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TicketStack"
        component={TicketNavigator}
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => (
            <Icon name="ticket" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ContactsStack"
        component={ContactsNavigator}
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <Icon name="people" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
