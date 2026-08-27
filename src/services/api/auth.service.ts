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
  avatarUrl?: string | null;
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

/**
 * Account status returned by /v1/auth/me
 * Used to drive trial-expiry / renewal warnings and wallet display on mobile.
 */
export interface AccountStatus {
  isBlocked: boolean;
  reason: 'TRIAL_EXPIRED' | 'SUSPENDED' | 'ACTIVE';
  subscriptionStatus: string;
  balance: number;
  regularBalance: number;
  usageAllocation: number;
  currency: string;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  nextBillingDate: string | null;
  autoRenew: boolean;
  warningMessage: string | null;
  hoursUntilExpiry: number | null;
  renewalWarningMessage: string | null;
  daysUntilRenewal: number | null;
  amountNeeded: number;
  canAccessBilling: boolean;
  canReadConversations: boolean;
}

class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {

    try {
      const response = await apiClient.post('/v1/auth/login', {
        ...credentials,
        clientType: 'mobile',
      });

      return response.data;
    } catch (error) {
      console.error('❌ authService.login() - Error:', {
        status: error.status,
        message: error.message,
        data: error.data,
      });
      throw error;
    }
  }

  /**
   * Complete 2FA login
   * Verifies the TOTP/backup code server-side FIRST (via /v1/auth/2fa/verify),
   * then completes the login to receive the JWT. Matches the web flow.
   */
  async completeTwoFactor(
    userId: string,
    code: string,
    isBackupCode = false,
  ): Promise<LoginResponse> {
    // 1. Verify the code (throws on invalid code)
    await apiClient.post('/v1/auth/2fa/verify', {
      userId,
      token: code,
      isBackupCode,
    });

    // 2. Complete login and receive JWT
    const response = await apiClient.post('/v1/auth/login/2fa-complete', {
      userId,
      clientType: 'mobile',
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
    accountStatus?: AccountStatus | null;
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
        accountStatus: response.data.accountStatus || null,
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

  /**
   * Request a one-time sign-in code (email OTP) for passwordless login
   */
  async requestOtp(email: string): Promise<{ sent: boolean }> {
    const response = await apiClient.post('/v1/auth/otp/request', { email });
    return response.data;
  }

  /**
   * Verify an emailed sign-in code and log in.
   * Response shape matches /v1/auth/login (may require 2FA).
   */
  async verifyOtp(email: string, code: string): Promise<LoginResponse> {
    const response = await apiClient.post('/v1/auth/otp/verify', {
      email,
      code,
      clientType: 'mobile',
    });
    return response.data;
  }
}

export const authService = new AuthService();
export default authService;
