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
  InitiateChat: { phoneNumber: string; contactName?: string };
  SocialMessage: {
    channel: 'TELEGRAM' | 'INSTAGRAM';
    nativeUserId: string;
    contactName?: string;
  };
  SendSms: {
    contactId: string;
    phoneNumber: string;
    contactName?: string;
  };
  ContactConversations: {
    contactId: string;
    contactName: string;
    conversations: any[];
  };
  ContactTickets: { contactId: string; contactName: string; tickets: any[] };
  ContactOrders: { contactName: string; orders: any[] };
  ContactAppointments: { contactName: string; appointments: any[] };
  // Pushed onto the Contacts stack so back returns to history, then contact
  ConversationChat: { conversationId: string };
  ContactTicketDetail: { ticketId: string };
  CreateTicket: { customerId?: string; conversationId?: string };
};

// Ticket Stack Params
export type TicketStackParamList = {
  TicketList: undefined;
  TicketDetail: { ticketId: string };
};

// App Navigator Params (Bottom Tabs)
export type AppTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  ChatStack: NavigatorScreenParams<ChatStackParamList>;
  Appointments: undefined;
  Orders: undefined;
  TicketStack: NavigatorScreenParams<TicketStackParamList>;
  ContactsStack: NavigatorScreenParams<ContactsStackParamList>;
};

// Dashboard Stack Params
export type DashboardStackParamList = {
  DashboardMain: undefined;
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
    interface RootParamList extends RootStackParamList { }
  }
}
