/**
 * Environment Configuration
 *
 * Three endpoint targets:
 *   - prod   → "Tuxon"     (store) → https://api.tuxon.ai
 *   - dev    → "Tuxon Dev" (store) → https://dev-api.tuxon.ai
 *   - local  → your machine        → http://<auto-detected-host>:4010 (debug only)
 *
 * Metro/debug builds default to 'dev' but can point at your local backend
 * with `npm run target:local` (then reload). The local host is auto-detected
 * from the Metro bundle URL, so it also works on Android/real devices that
 * are on the same network as your computer. Store (release) bundles always
 * follow ./env.target — use 'prod' or 'dev', never 'local'.
 */

import { NativeModules, Platform } from 'react-native';
import { APP_TARGET } from './env.target';

// ===== Local development backend ============================================
// The port your backend (apps/api) listens on during local development.
const LOCAL_API_PORT = 4010;

// OPTIONAL override: if auto-detection below can't reach your computer (e.g. a
// physical Android phone connected by USB/adb-reverse keeps reporting
// localhost), set this to your computer's LAN IP, e.g. '192.168.1.50'.
const LOCAL_HOST_OVERRIDE: string | null = null;

/**
 * Best-effort detection of the host your local backend runs on.
 *
 * During development the JS bundle is served by Metro from your computer, so
 * the bundle URL already contains your computer's host/IP. Reusing it lets a
 * phone/tablet on the same Wi-Fi reach the backend without hardcoding an IP.
 * Falls back to the right default per platform when it can't be detected.
 */
function getLocalHost(): string {
  if (LOCAL_HOST_OVERRIDE) {
    return LOCAL_HOST_OVERRIDE;
  }
  try {
    // scriptURL looks like: http://192.168.1.50:8081/index.bundle?platform=android
    const sourceCode = NativeModules.SourceCode as
      | { scriptURL?: string }
      | undefined;
    const host = sourceCode?.scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  } catch {
    // ignore and fall through to platform default
  }
  // Android emulator reaches the host machine via 10.0.2.2;
  // iOS simulator (and USB/adb-reverse on a device) can use localhost.
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

const localHost = getLocalHost();

// Endpoint sets per target.
const ENDPOINTS = {
  prod: {
    API_BASE_URL: 'https://api.tuxon.ai',
    WS_URL: 'wss://api.tuxon.ai',
  },
  dev: {
    API_BASE_URL: 'https://dev-api.tuxon.ai',
    WS_URL: 'wss://dev-api.tuxon.ai',
  },
  local: {
    API_BASE_URL: `http://${localHost}:${LOCAL_API_PORT}`,
    WS_URL: `ws://${localHost}:${LOCAL_API_PORT}`,
  },
} as const;

const isDevelopment = __DEV__;

// Debug/Metro: use 'dev' by default, but honor an explicit 'local'/'dev' target.
const debugTarget =
  APP_TARGET === 'local' || APP_TARGET === 'dev' ? APP_TARGET : 'dev';
// Store/release bundles: follow the configured target (prod or dev).
const target = isDevelopment ? debugTarget : APP_TARGET;

// Export configuration
export const env = {
  ...ENDPOINTS[target],
  isDevelopment,
  isProduction: !isDevelopment,
  platform: Platform.OS,
  appTarget: APP_TARGET,
};

// Force HTTPS in release bundles ('local' is http → throws if misconfigured)
if (!isDevelopment && !env.API_BASE_URL.startsWith('https://')) {
  throw new Error(
    `Release build must use HTTPS (current target '${APP_TARGET}'). ` +
      'Run "npm run target:prod" or "npm run target:dev".',
  );
}

export default env;

