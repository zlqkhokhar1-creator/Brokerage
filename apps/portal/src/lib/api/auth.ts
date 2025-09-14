/**
 * Authentication API Services
 * Centralized authentication and user management
 */

import { internalApi } from './client';
import { API_ENDPOINTS, API_TIMEOUTS } from './config';

// Types for authentication
export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_started';
  accountType: 'basic' | 'premium' | 'professional';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  currency: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    trading: boolean;
    news: boolean;
    security: boolean;
  };
  trading: {
    confirmBeforeTrade: boolean;
    defaultOrderType: 'market' | 'limit';
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  referralCode?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  requiresTwoFactor?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

/**
 * Authentication Service Class
 */
class AuthService {
  private user: User | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load saved auth state from localStorage
    this.loadAuthState();
  }

  /**
   * User login
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await internalApi.post(
        API_ENDPOINTS.INTERNAL.AUTH.LOGIN,
        credentials,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Login failed: ${response.error}`);
      }

      const authData: AuthResponse = response.data;

      if (!authData.requiresTwoFactor) {
        this.setAuthState(authData);
      }

      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * User registration
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await internalApi.post(
        API_ENDPOINTS.INTERNAL.AUTH.REGISTER,
        userData,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Registration failed: ${response.error}`);
      }

      const authData: AuthResponse = response.data;
      this.setAuthState(authData);

      return authData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await internalApi.post(
          API_ENDPOINTS.INTERNAL.AUTH.LOGOUT,
          { refreshToken: this.refreshToken },
          { timeout: API_TIMEOUTS.DEFAULT }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthState();
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await internalApi.post(
        API_ENDPOINTS.INTERNAL.AUTH.REFRESH,
        { refreshToken: this.refreshToken },
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Token refresh failed: ${response.error}`);
      }

      const { accessToken, refreshToken, expiresIn } = response.data;
      
      this.accessToken = accessToken;
      if (refreshToken) {
        this.refreshToken = refreshToken;
      }
      
      this.saveAuthState();
      return accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuthState();
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    try {
      const response = await internalApi.get(
        API_ENDPOINTS.INTERNAL.AUTH.PROFILE,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch profile: ${response.error}`);
      }

      this.user = response.data;
      this.saveAuthState();
      
      return response.data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileRequest): Promise<User> {
    try {
      const response = await internalApi.put(
        API_ENDPOINTS.INTERNAL.AUTH.PROFILE,
        updates,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to update profile: ${response.error}`);
      }

      this.user = response.data;
      this.saveAuthState();
      
      return response.data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      const response = await internalApi.post(
        '/api/auth/change-password',
        passwordData,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to change password: ${response.error}`);
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await internalApi.post(
        '/api/auth/request-password-reset',
        { email },
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to request password reset: ${response.error}`);
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(resetData: PasswordResetConfirm): Promise<void> {
    try {
      const response = await internalApi.post(
        '/api/auth/confirm-password-reset',
        resetData,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to reset password: ${response.error}`);
      }
    } catch (error) {
      console.error('Password reset confirm error:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await internalApi.post(
        '/api/auth/verify-email',
        { token },
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to verify email: ${response.error}`);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(): Promise<{ qrCode: string; backupCodes: string[] }> {
    try {
      const response = await internalApi.post(
        '/api/auth/enable-2fa',
        {},
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to enable 2FA: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('2FA enable error:', error);
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(code: string): Promise<void> {
    try {
      const response = await internalApi.post(
        '/api/auth/disable-2fa',
        { code },
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to disable 2FA: ${response.error}`);
      }
    } catch (error) {
      console.error('2FA disable error:', error);
      throw error;
    }
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.user);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Private methods
  private setAuthState(authData: AuthResponse): void {
    this.user = authData.user;
    this.accessToken = authData.accessToken;
    this.refreshToken = authData.refreshToken;
    this.saveAuthState();
  }

  private clearAuthState(): void {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tradepro_auth');
      localStorage.removeItem('tradepro_user');
    }
  }

  private saveAuthState(): void {
    if (typeof window !== 'undefined') {
      const authState = {
        user: this.user,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
      };
      
      localStorage.setItem('tradepro_auth', JSON.stringify(authState));
      if (this.user) {
        localStorage.setItem('tradepro_user', JSON.stringify(this.user));
      }
    }
  }

  private loadAuthState(): void {
    if (typeof window !== 'undefined') {
      try {
        const authState = localStorage.getItem('tradepro_auth');
        if (authState) {
          const parsed = JSON.parse(authState);
          this.user = parsed.user;
          this.accessToken = parsed.accessToken;
          this.refreshToken = parsed.refreshToken;
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        this.clearAuthState();
      }
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export { AuthService };

// Exported functions for convenience
export const login = (credentials: LoginRequest) => authService.login(credentials);
export const register = (userData: RegisterRequest) => authService.register(userData);
export const logout = () => authService.logout();
export const getProfile = () => authService.getProfile();
export const updateProfile = (updates: UpdateProfileRequest) => authService.updateProfile(updates);
export const changePassword = (currentPassword: string, newPassword: string) => authService.changePassword({ currentPassword, newPassword });
export const requestPasswordReset = (email: string) => authService.requestPasswordReset(email);
export const confirmPasswordReset = (resetData: PasswordResetConfirm) => authService.confirmPasswordReset(resetData);
export const verifyEmail = (token: string) => authService.verifyEmail(token);
export const enableTwoFactor = () => authService.enableTwoFactor();
export const disableTwoFactor = (code: string) => authService.disableTwoFactor(code);
