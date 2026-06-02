/**
 * Contacts Navigator
 * Stack navigator for contacts flow (List → Detail → History)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ContactsStackParamList } from './types';
import CustomBackButton from '../components/navigation/CustomBackButton';

// Import screens
import ContactsScreen from '../screens/contacts/ContactsScreen';
import ContactDetailScreen from '../screens/contacts/ContactDetailScreen';
import ContactConversationsScreen from '../screens/contacts/ContactConversationsScreen';
import ContactTicketsScreen from '../screens/contacts/ContactTicketsScreen';
import CreateTicketScreen from '../screens/ticket/CreateTicketScreen';

const Stack = createStackNavigator<ContactsStackParamList>();

// Custom back button for all screens
const renderBackButton = () => <CustomBackButton />;

const ContactsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerLeft: renderBackButton,
      }}
    >
      <Stack.Screen name="ContactsList" component={ContactsScreen} />
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

export default ContactsNavigator;
