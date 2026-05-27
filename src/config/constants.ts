/**
 * App Constants
 */

export const APP_NAME = 'FutureAI Mobile';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'futureai.mobile.auth.token',
  USER_DATA: 'futureai.mobile.user.data',
  THEME: 'futureai.mobile.theme',
  LANGUAGE: 'futureai.mobile.language',
};

export const NOTIFICATION_CHANNELS = {
  MESSAGES: 'messages',
  APPOINTMENTS: 'appointments',
  MENTIONS: 'mentions',
  SYSTEM: 'system',
};

export const CONVERSATION_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
} as const;

export const APPOINTMENT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const MESSAGE_STATUS = {
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const;

export const REMINDER_TIMES = [
  { label: '15 minutes before', value: 15 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

export const DATE_FORMATS = {
  FULL: 'MMM dd, yyyy HH:mm',
  DATE_ONLY: 'MMM dd, yyyy',
  TIME_ONLY: 'HH:mm',
  RELATIVE: 'relative', // e.g., "2 hours ago"
};

export const API_TIMEOUT = 30000; // 30 seconds
export const WEBSOCKET_RECONNECT_INTERVAL = 5000; // 5 seconds
export const MESSAGE_FETCH_LIMIT = 50;
