/**
 * Environment Configuration
 * Loads environment variables and provides typed access
 */

import { Platform } from 'react-native';

// Environment variables (create .env files for each environment)
const ENV = {
  development: {
    API_BASE_URL: 'http://192.168.1.102:4010', // Use Mac IP for simulator access
    WS_URL: 'ws://192.168.1.102:4010',
    GOOGLE_CLIENT_ID: 'your-google-client-id.apps.googleusercontent.com',
  },
  production: {
    API_BASE_URL: 'https://api.yourapp.com',
    WS_URL: 'wss://api.yourapp.com',
    GOOGLE_CLIENT_ID: 'your-google-client-id.apps.googleusercontent.com',
  },
};

// Determine current environment
const isDevelopment = __DEV__;
const currentEnv = isDevelopment ? 'development' : 'production';

// Export configuration
export const env = {
  ...ENV[currentEnv],
  isDevelopment,
  isProduction: !isDevelopment,
  platform: Platform.OS,
};

// Force HTTPS in production
if (!isDevelopment && !env.API_BASE_URL.startsWith('https://')) {
  throw new Error('Production API must use HTTPS');
}

export default env;
