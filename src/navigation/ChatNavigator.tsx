/**
 * Chat Navigator
 * Stack navigator for chat flow (Dashboard → List → Detail)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatStackParamList } from './types';
import CustomBackButton from '../components/navigation/CustomBackButton';

// Import screens
import ConversationListScreen from '../screens/chat/ConversationListScreen';
import ChatDetailScreen from '../screens/chat/ChatDetailScreen';
import CreateTicketScreen from '../screens/ticket/CreateTicketScreen';

const Stack = createStackNavigator<ChatStackParamList>();

// Custom back button for all screens
const renderBackButton = () => <CustomBackButton />;

const ChatNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerLeft: renderBackButton,
      }}
    >
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
