/**
 * Navigation Types
 * TypeScript types for React Navigation
 */

import { NavigatorScreenParams } from '@react-navigation/native';

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
};

// App Navigator Params (Bottom Tabs)
export type AppTabParamList = {
  ChatStack: NavigatorScreenParams<ChatStackParamList>;
  Appointments: undefined;
  Notifications: undefined;
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
