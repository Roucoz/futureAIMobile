/**
 * Ticket Navigator
 * Stack navigator for ticket flow (List → Detail)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TicketStackParamList } from './types';

import TicketListScreen from '../screens/ticket/TicketListScreen';
import TicketDetailScreen from '../screens/ticket/TicketDetailScreen';

const Stack = createStackNavigator<TicketStackParamList>();

const TicketNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TicketList" component={TicketListScreen} />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Ticket Detail',
        }}
      />
    </Stack.Navigator>
  );
};

export default TicketNavigator;
