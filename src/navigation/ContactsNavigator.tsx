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
import InitiateChatScreen from '../screens/chat/InitiateChatScreen';
import SocialMessageScreen from '../screens/contacts/SocialMessageScreen';
import SendSmsScreen from '../screens/contacts/SendSmsScreen';
import ChatDetailScreen from '../screens/chat/ChatDetailScreen';
import TicketDetailScreen from '../screens/ticket/TicketDetailScreen';
import ContactOrdersScreen from '../screens/contacts/ContactOrdersScreen';
import ContactAppointmentsScreen from '../screens/contacts/ContactAppointmentsScreen';

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
        name="InitiateChat"
        component={InitiateChatScreen}
        options={{
          headerShown: true,
          headerTitle: 'Start Chat',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="SocialMessage"
        component={SocialMessageScreen}
        options={{
          headerShown: true,
          headerTitle: 'Send Message',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="SendSms"
        component={SendSmsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Send SMS',
          headerBackTitle: 'Back',
        }}
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
      <Stack.Screen
        name="ContactOrders"
        component={ContactOrdersScreen}
        options={{
          headerShown: true,
          headerTitle: 'Order History',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ContactAppointments"
        component={ContactAppointmentsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Appointment History',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ConversationChat"
        component={ChatDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Chat',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ContactTicketDetail"
        component={TicketDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Ticket Detail',
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
