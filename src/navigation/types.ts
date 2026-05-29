/**
 * Navigation Types
 * TypeScript types for React Navigation
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// Import types we need
import { Contact } from '../services/api/contact.service';

// Auth Navigator Params
export type AuthStackParamList = {
  Login: undefined;
  TwoFactor: { userId: string };
  GoogleComplete: { tempToken: string };
};

// Chat Stack Params
export type ChatStackParamList = {
  ConversationList: undefined;
  ChatDetail: { conversationId: string };
  CreateTicket: { conversationId: string };
};

// Contacts Stack Params
export type ContactsStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contact: Contact };
  ContactConversations: { contactId: string; contactName: string; conversations: any[] };
  ContactTickets: { contactId: string; contactName: string; tickets: any[] };
};

// App Navigator Params (Bottom Tabs)
export type AppTabParamList = {
  Dashboard: undefined;
  ChatStack: NavigatorScreenParams<ChatStackParamList>;
  Appointments: undefined;
  ContactsStack: NavigatorScreenParams<ContactsStackParamList>;
  Profile: undefined;
};

// Appointments Stack Params
export type AppointmentsStackParamList = {
  AppointmentList: undefined;
  AppointmentDetail: { appointmentId: string };
  AppointmentForm: { appointmentId?: string };
};

// Root Navigator Params
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};

// Type helpers for navigation props
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
