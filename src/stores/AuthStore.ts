/**
 * AuthStore - MobX State Tree
 * Manages authentication state
 */

import { types, flow, Instance, cast } from 'mobx-state-tree';
import { authService } from '../services/api/auth.service';
import { secureStorage } from '../services/storage/SecureStorageService';

// Permission model
export const PermissionModel = types.model('Permission', {
  resource: types.string,
  actions: types.array(types.string),
});

// User model (matches backend response)
export const UserModel = types.model('User', {
  id: types.identifier,
  email: types.string,
  firstName: types.string,
  lastName: types.string,
  projectId: types.string,
  role: types.string,
  twoFactorEnabled: types.boolean,
})
  .views((self) => ({
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
    isAuthenticated: types.optional(types.boolean, false),
    loading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
  })
  .actions((self) => ({
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
          });
          
          self.memberId = response.memberId;
          self.permissions = cast(response.permissions || []);
          self.isAuthenticated = true;
        }

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
     * Complete 2FA login
     */
    completeTwoFactor: flow(function* (userId: string, code: string) {
      self.loading = true;
      self.error = null;

      try {
        const response = yield authService.completeTwoFactor(userId, code);

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
     */
    initialize: flow(function* () {
      self.loading = true;
      
      try {
        const token = yield secureStorage.getToken();

        if (!token) {
          self.isAuthenticated = false;
          self.loading = false;
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
          });
          
          self.memberId = response.memberId;
          self.permissions = cast(response.permissions || []);
          self.isAuthenticated = true;
        } catch {
          yield secureStorage.removeToken();
          self.token = null;
          self.isAuthenticated = false;
        }
      } catch (error: any) {
        console.error('❌ AuthStore.initialize() - ERROR:', error);
      } finally {
        self.loading = false;
      }
    }),

    /**
     * Logout
     */
    logout: flow(function* () {
      try {
        yield authService.logout();
        yield secureStorage.removeToken();
        
        // Reset state
        self.user = null;
        self.token = null;
        self.memberId = null;
        self.permissions.clear();
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
  .views((self) => ({
    /**
     * Check if user has specific permission
     */
    hasPermission(resource: string, action: string): boolean {
      return self.permissions.some(
        (p) => p.resource === resource && p.actions.includes(action)
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
