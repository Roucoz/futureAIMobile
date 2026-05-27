/**
 * Chat Navigator
 * Stack navigator for chat flow (List → Detail)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatStackParamList } from './types';

// Import screens
import ConversationListScreen from '../screens/chat/ConversationListScreen';
import ChatDetailScreen from '../screens/chat/ChatDetailScreen';

const Stack = createStackNavigator<ChatStackParamList>();

const ChatNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ConversationList"
        component={ConversationListScreen}
        options={{ headerTitle: 'Conversations' }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{
          headerTitle: 'Chat',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default ChatNavigator;
