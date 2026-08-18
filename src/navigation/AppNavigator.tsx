/**
 * App Navigator
 * Main app navigation with bottom tabs
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { observer } from 'mobx-react-lite';
import { AppTabParamList } from './types';
import { useModule, useAuth } from '../stores';

// Import navigators and screens
import ChatNavigator from './ChatNavigator';
import ContactsNavigator from './ContactsNavigator';
import TicketNavigator from './TicketNavigator';
import DashboardNavigator from './DashboardNavigator';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = observer(() => {
  const moduleStore = useModule();
  const authStore = useAuth();

  /**
   * Show a friendly alert when a paid module is not enabled.
   * Guides the user to enable it from the web admin panel.
   */
  const handleModuleDisabled = (moduleLabel: string) => {
    Alert.alert(
      'Module Not Enabled',
      `The ${moduleLabel} module is not enabled for your account.\n\nYou can enable it from the admin panel on the website (Configuration → Modules).`,
      [{ text: 'OK' }],
    );
  };

  /**
   * Show a friendly alert when the user lacks the group permission to access
   * a feature (mirrors the backend "Insufficient permissions" 403).
   */
  const handlePermissionDenied = (moduleLabel: string) => {
    Alert.alert(
      'Access Restricted',
      `You don't have permission to access ${moduleLabel}. Please contact your account administrator to request access.`,
      [{ text: 'OK' }],
    );
  };

  /**
   * Build a tabPress listener that blocks navigation when the module is
   * disabled OR the user lacks the required RBAC permission for the tab.
   */
  const gateTab = (
    moduleLabel: string,
    options: { moduleEnabled?: boolean; resource?: string } = {},
  ) => ({
    tabPress: (e: any) => {
      // 1. Module not enabled (only once the module status has loaded)
      if (moduleStore.isLoaded && options.moduleEnabled === false) {
        e.preventDefault();
        handleModuleDisabled(moduleLabel);
        return;
      }
      // 2. No group permission (RBAC-gated resources)
      if (options.resource && !authStore.canAccessResource(options.resource)) {
        e.preventDefault();
        handlePermissionDenied(moduleLabel);
        return;
      }
    },
  });

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
        listeners={gateTab('Chats', { resource: 'chats' })}
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
        listeners={gateTab('Appointments', {
          moduleEnabled: moduleStore.appointments,
          resource: 'appointments',
        })}
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
        listeners={gateTab('Orders', {
          moduleEnabled: moduleStore.orders,
          resource: 'orders',
        })}
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
        listeners={gateTab('Tickets', {
          moduleEnabled: moduleStore.ticketing,
          resource: 'tickets',
        })}
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
        listeners={gateTab('Contacts', { resource: 'chats' })}
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <Icon name="people" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
});

export default AppNavigator;
