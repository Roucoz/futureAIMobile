/**
 * AuthStore - MobX State Tree
 * Manages authentication state
 */

import { types, flow, Instance, cast } from 'mobx-state-tree';
import { authService, AccountStatus } from '../services/api/auth.service';
import { secureStorage } from '../services/storage/SecureStorageService';

// Permission model
export const PermissionModel = types.model('Permission', {
  resource: types.string,
  actions: types.array(types.string),
});

// User model (matches backend response)
export const UserModel = types
  .model('User', {
    id: types.identifier,
    email: types.string,
    firstName: types.string,
    lastName: types.string,
    projectId: types.string,
    role: types.string,
    twoFactorEnabled: types.boolean,
    avatarUrl: types.maybeNull(types.string),
    createdAt: types.maybeNull(types.string),
  })
  .views(self => ({
    get fullName() {
      return `${self.firstName} ${self.lastName}`;
    },
  }));

// AuthStore
export const AuthStore = types
  .model('AuthStore', {
    user: types.maybeNull(UserModel),
    permissions: types.array(PermissionModel),
    token: types.maybeNull(types.string),
    memberId: types.maybeNull(types.string), // ProjectMember.id - used for sending messages
    accountStatus: types.maybeNull(types.frozen<AccountStatus>()),
    isAuthenticated: types.optional(types.boolean, false),
    loading: types.optional(types.boolean, false),
    initializing: types.optional(types.boolean, false), // only true during the startup token check
    error: types.maybeNull(types.string),
  })
  // Declared in its own actions block so other actions can call it
  // (self-referencing actions within a single MST actions object don't type-check).
  .actions(self => ({
    refreshAccountStatus: flow(function* () {
      if (!self.token) return;
      try {
        const response = yield authService.getMe();
        self.accountStatus = response.accountStatus || null;
      } catch (error: any) {
        console.error('❌ AuthStore.refreshAccountStatus() - ERROR:', error);
      }
    }),
  }))
  .actions(self => ({
    /**
     * Login with email and password
     */
    login: flow(function* (email: string, password: string) {
      self.loading = true;
      self.error = null;

      try {
        const response = yield authService.login({ email, password });

        // Check if 2FA is required
        if (response.requiresTwoFactor) {
          self.loading = false;
          return { requiresTwoFactor: true, userId: response.userId };
        }

        // Store token
        if (response.token) {
          yield secureStorage.setToken(response.token);
          self.token = response.token;

          // Map user data to match model
          self.user = cast({
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            projectId: response.project.id,
            role: response.role,
            twoFactorEnabled: response.user.twoFactorEnabled,
            avatarUrl: response.user.avatarUrl || null,
            createdAt: response.user.createdAt || null,
          });

          self.memberId = response.memberId;
          self.permissions = cast(response.permissions || []);
          self.isAuthenticated = true;
        }
        // Load account status (trial expiry / renewal / wallet balance)
        yield self.refreshAccountStatus();
        // Load account status (trial expiry / renewal / wallet balance)
        yield self.refreshAccountStatus();

        self.loading = false;
        return { success: true };
      } catch (error: any) {
        console.error('❌ AuthStore.login() - ERROR:', error);
        self.error = error.message || 'Login failed';
        self.loading = false;
        throw error;
      }
    }),

    /**
     * Request a one-time sign-in code (email OTP) for passwordless login
     */
    requestOtp: flow(function* (email: string) {
      self.loading = true;
      self.error = null;
      try {
        yield authService.requestOtp(email);
        self.loading = false;
        return { sent: true };
      } catch (error: any) {
        console.error('❌ AuthStore.requestOtp() - ERROR:', error);
        self.error = error.message || 'Failed to send sign-in code';
        self.loading = false;
        throw error;
      }
    }),

    /**
     * Verify an emailed sign-in code and log in
     */
    loginWithOtp: flow(function* (email: string, code: string) {
      self.loading = true;
      self.error = null;
      try {
        const response = yield authService.verifyOtp(email, code);

        // Check if 2FA is required
        if (response.requiresTwoFactor) {
          self.loading = false;
          return { requiresTwoFactor: true, userId: response.userId };
        }

        // Store token and map user data (same shape as login)
        if (response.token) {
          yield secureStorage.setToken(response.token);
          self.token = response.token;

          self.user = cast({
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            projectId: response.project.id,
            role: response.role,
            twoFactorEnabled: response.user.twoFactorEnabled,
            avatarUrl: response.user.avatarUrl || null,
            createdAt: response.user.createdAt || null,
          });

          self.memberId = response.memberId;
          self.permissions = cast(response.permissions || []);
          self.isAuthenticated = true;
        }

        // Load account status (trial expiry / renewal / wallet balance)
        yield self.refreshAccountStatus();

        self.loading = false;
        return { success: true };
      } catch (error: any) {
        console.error('❌ AuthStore.loginWithOtp() - ERROR:', error);
        self.error = error.message || 'Invalid sign-in code';
        self.loading = false;
        throw error;
      }
    }),

    /**
     * Complete 2FA login
     */
    completeTwoFactor: flow(function* (
      userId: string,
      code: string,
      isBackupCode = false,
    ) {
      self.loading = true;
      self.error = null;

      try {
        const response = yield authService.completeTwoFactor(
          userId,
          code,
          isBackupCode,
        );

        if (response.token) {
          yield secureStorage.setToken(response.token);
          self.token = response.token;

          // Map user data to match model
          self.user = cast({
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            projectId: response.project.id,
            role: response.role,
            twoFactorEnabled: response.user.twoFactorEnabled,
            avatarUrl: response.user.avatarUrl || null,
            createdAt: response.user.createdAt || null,
          });

          self.memberId = response.memberId;
          self.permissions = cast(response.permissions || []);
          self.isAuthenticated = true;
        }

        self.loading = false;
        return { success: true };
      } catch (error: any) {
        self.error = error.message || '2FA verification failed';
        self.loading = false;
        throw error;
      }
    }),

    /**
     * Initialize auth state (check if token exists and fetch user)
     * Uses `initializing` (not `loading`) so the RootNavigator splash only
     * shows during startup — auth actions like OTP request must NOT unmount
     * the auth screens.
     */
    initialize: flow(function* () {
      self.initializing = true;

      try {
        const token = yield secureStorage.getToken();

        if (!token) {
          self.isAuthenticated = false;
          self.initializing = false;
          return;
        }

        self.token = token;

        try {
          const response = yield authService.getMe();

          // Map user data to match model
          self.user = cast({
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            projectId: response.project.id,
            role: response.role,
            twoFactorEnabled: response.user.twoFactorEnabled,
            avatarUrl: response.user.avatarUrl || null,
            createdAt: response.user.createdAt || null,
          });

          self.memberId = response.memberId;
          self.permissions = cast(response.permissions || []);
          self.accountStatus = response.accountStatus || null;
          self.isAuthenticated = true;
        } catch {
          yield secureStorage.removeToken();
          self.token = null;
          self.isAuthenticated = false;
        }
      } catch (error: any) {
        console.error('❌ AuthStore.initialize() - ERROR:', error);
      } finally {
        self.initializing = false;
      }
    }),

    /**
     * Logout
     */
    logout: flow(function* () {
      try {
        // Cleanup push notifications (unregister FCM token)
        const { notificationService } = require('../services/notifications/NotificationService');
        yield notificationService.cleanup();

        yield authService.logout();
        yield secureStorage.removeToken();

        // Reset state
        self.user = null;
        self.token = null;
        self.memberId = null;
        self.permissions.clear();
        self.accountStatus = null;
        self.isAuthenticated = false;
        self.error = null;
      } catch (error: any) {
        console.error('Logout error:', error);
      }
    }),

    /**
     * Clear error
     */
    clearError() {
      self.error = null;
    },
  }))
  .views(self => ({
    /**
     * Check if user has specific permission
     */
    hasPermission(resource: string, action: string): boolean {
      return self.permissions.some(
        p => p.resource === resource && p.actions.includes(action),
      );
    },

    /**
     * Check if user is the project owner (bypasses all permission checks)
     */
    get isOwner() {
      return self.user?.role === 'OWNER';
    },

    /**
     * Check if the user can access (view) a resource.
     * OWNER always has full access; other users must have the "view" action
     * granted through their group permissions.
     */
    canAccessResource(resource: string): boolean {
      if (self.user?.role === 'OWNER') return true;
      return self.permissions.some(
        p => p.resource === resource && p.actions.includes('view'),
      );
    },

    /**
     * Get user role
     */
    get userRole() {
      return self.user?.role || '';
    },

    /**
     * Get project ID
     */
    get projectId() {
      return self.user?.projectId || '';
    },
  }));

export type IAuthStore = Instance<typeof AuthStore>;
export default AuthStore;
