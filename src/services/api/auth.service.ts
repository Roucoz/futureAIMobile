/**
 * Authentication Service
 * Handles login, logout, registration, 2FA, Google OAuth
 */

import apiClient from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  requiresTwoFactor?: boolean;
  userId?: string;
  user?: User;
  project?: Project;
  memberId?: string;
  role?: string;
  permissions?: Permission[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  twoFactorEnabled: boolean;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    console.log('🔐 Login request:', {
      email: credentials.email,
      passwordLength: credentials.password.length,
      hasWhitespace: credentials.password !== credentials.password.trim(),
    });
    
    const response = await apiClient.post('/v1/auth/login', credentials);
    
    console.log('✅ Login response:', {
      hasToken: !!response.data.token,
      requiresTwoFactor: response.data.requiresTwoFactor,
    });
    
    return response.data;
  }

  /**
   * Complete 2FA login
   */
  async completeTwoFactor(userId: string, code: string): Promise<LoginResponse> {
    const response = await apiClient.post('/v1/auth/login/2fa-complete', {
      userId,
      code,
    });
    return response.data;
  }

  /**
   * Get current user data
   */
  async getMe(): Promise<{
    user: User;
    project: Project;
    memberId: string;
    role: string;
    permissions: Permission[];
  }> {
    try {
      const response = await apiClient.get('/v1/auth/me');
      console.log('✅ authService.getMe() - Success:', {
        userId: response.data?.user?.id,
        projectId: response.data?.project?.id,
        memberId: response.data?.memberId,
      });
      // Backend returns data directly, not wrapped in 'data' property
      return {
        user: response.data.user,
        project: response.data.project,
        memberId: response.data.memberId,
        role: response.data.role,
        permissions: response.data.permissions || [],
      };
    } catch (error: any) {
      console.error('❌ authService.getMe() - Error:', {
        status: error.status,
        message: error.message,
        data: error.data,
      });
      throw error;
    }
  }

  /**
   * Logout (no API call needed, just clear token)
   */
  async logout(): Promise<void> {
    // Backend doesn't require logout API call
    // Just clear local token
    return Promise.resolve();
  }

  /**
   * Setup 2FA
   */
  async setup2FA(): Promise<{ qrCode: string; backupCodes: string[] }> {
    const response = await apiClient.post('/v1/auth/2fa/setup');
    return response.data;
  }

  /**
   * Verify 2FA code
   */
  async verify2FA(code: string): Promise<{ success: boolean }> {
    const response = await apiClient.post('/v1/auth/2fa/verify', { code });
    return response.data;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(): Promise<{ success: boolean }> {
    const response = await apiClient.post('/v1/auth/2fa/disable');
    return response.data;
  }

  /**
   * Register device for push notifications
   */
  async registerDevice(token: string, platform: string): Promise<void> {
    await apiClient.post('/v1/notifications/register-device', {
      token,
      platform,
    });
  }
}

export const authService = new AuthService();
export default authService;
