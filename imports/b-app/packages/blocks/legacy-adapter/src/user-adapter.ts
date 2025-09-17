import { 
  LegacyUserResponse, 
  LegacyLoginResponse, 
  DeprecationWarning 
} from './types.js';

// Import types from membership block
export interface MembershipBlock {
  registerUser: {
    execute(command: any, traceId?: string): Promise<{ userId: string; email: string; kycStatus: string }>;
  };
  authenticateUser: {
    execute(command: any, traceId?: string): Promise<{ accessToken: string; refreshToken: string; userId: string; expiresIn: number }>;
  };
  getProfile: {
    execute(command: any, traceId?: string): Promise<any>;
  };
}

/**
 * Legacy adapter for user operations - delegates to membership block
 * @deprecated Use membership block directly for new integrations
 */
export class LegacyUserAdapter {
  constructor(private membershipBlock: MembershipBlock) {}

  /**
   * Create user (legacy endpoint)
   * @deprecated Use membership RegisterUser command directly
   */
  async createUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }, traceId?: string): Promise<LegacyUserResponse> {
    
    this.logDeprecationWarning({
      command: 'CreateUser',
      reason: 'Legacy user creation endpoint',
      replacement: 'Use membership RegisterUser command',
      deprecatedSince: '2024-01-01'
    });

    try {
      // Delegate to membership block
      const result = await this.membershipBlock.registerUser.execute({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone
      }, traceId);

      // Get user profile for full response
      const profile = await this.membershipBlock.getProfile.execute({
        userId: result.userId
      }, traceId);

      // Convert to legacy format
      return {
        id: result.userId,
        email: result.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        kycStatus: result.kycStatus as 'pending' | 'approved' | 'rejected',
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString()
      };

    } catch (error) {
      console.error('Legacy CreateUser failed', {
        email: userData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });
      throw error;
    }
  }

  /**
   * Login user (legacy endpoint)
   * @deprecated Use membership AuthenticateUser command directly
   */
  async loginUser(credentials: {
    email: string;
    password: string;
  }, traceId?: string): Promise<LegacyLoginResponse> {
    
    this.logDeprecationWarning({
      command: 'LoginUser',
      reason: 'Legacy user login endpoint', 
      replacement: 'Use membership AuthenticateUser command',
      deprecatedSince: '2024-01-01'
    });

    try {
      // Delegate to membership block
      const authResult = await this.membershipBlock.authenticateUser.execute({
        email: credentials.email,
        password: credentials.password
      }, traceId);

      // Get user profile
      const profile = await this.membershipBlock.getProfile.execute({
        userId: authResult.userId
      }, traceId);

      // Convert to legacy format
      return {
        user: {
          id: authResult.userId,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          kycStatus: profile.kycStatus,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString()
        },
        token: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        expiresIn: authResult.expiresIn
      };

    } catch (error) {
      console.error('Legacy LoginUser failed', {
        email: credentials.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });
      throw error;
    }
  }

  /**
   * Get user by ID (legacy endpoint)
   * @deprecated Use membership GetProfile command directly
   */
  async getUserById(userId: string, traceId?: string): Promise<LegacyUserResponse> {
    this.logDeprecationWarning({
      command: 'GetUserById',
      reason: 'Legacy user retrieval endpoint',
      replacement: 'Use membership GetProfile command',
      deprecatedSince: '2024-01-01'
    });

    try {
      const profile = await this.membershipBlock.getProfile.execute({
        userId
      }, traceId);

      return {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        kycStatus: profile.kycStatus,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString()
      };

    } catch (error) {
      console.error('Legacy GetUserById failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });
      throw error;
    }
  }

  private logDeprecationWarning(warning: DeprecationWarning): void {
    console.warn('DEPRECATION WARNING', {
      command: warning.command,
      reason: warning.reason,
      replacement: warning.replacement,
      deprecatedSince: warning.deprecatedSince,
      removeIn: warning.removeIn,
      timestamp: new Date().toISOString()
    });
  }
}