/**
 * Chat Navigator
 * Stack navigator for chat flow (Dashboard → List → Detail)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatStackParamList } from './types';

// Import screens
import ConversationListScreen from '../screens/chat/ConversationListScreen';
import ChatDetailScreen from '../screens/chat/ChatDetailScreen';
import CreateTicketScreen from '../screens/ticket/CreateTicketScreen';

const Stack = createStackNavigator<ChatStackParamList>();

const ChatNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="ConversationList"
        component={ConversationListScreen}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Chat',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="CreateTicket"
        component={CreateTicketScreen}
        options={{
          headerShown: true,
          headerTitle: 'Create Ticket',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default ChatNavigator;
