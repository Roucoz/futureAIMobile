/**
 * Contacts Navigator
 * Stack navigator for contacts flow (List → Detail → History)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ContactsStackParamList } from './types';

// Import screens
import ContactsScreen from '../screens/contacts/ContactsScreen';
import ContactDetailScreen from '../screens/contacts/ContactDetailScreen';
import ContactConversationsScreen from '../screens/contacts/ContactConversationsScreen';
import ContactTicketsScreen from '../screens/contacts/ContactTicketsScreen';

const Stack = createStackNavigator<ContactsStackParamList>();

const ContactsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="ContactsList"
        component={ContactsScreen}
      />
      <Stack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Contact Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ContactConversations"
        component={ContactConversationsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Chat History',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ContactTickets"
        component={ContactTicketsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Ticket History',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default ContactsNavigator;
