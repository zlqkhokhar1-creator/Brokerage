import jwt from 'jsonwebtoken';
import { AuthVerifier, AuthContext } from './types.js';

export interface MembershipBlockAuth {
  verifyToken(token: string): Promise<{ valid: boolean; claims?: any; error?: string }>;
}

/**
 * JWT Auth Verifier that delegates to membership block
 */
export class JWTAuthVerifier implements AuthVerifier {
  constructor(private membershipAuth: MembershipBlockAuth) {}

  async verify(token: string): Promise<AuthContext> {
    try {
      const result = await this.membershipAuth.verifyToken(token);
      
      if (!result.valid || !result.claims) {
        throw new Error(result.error || 'Invalid token');
      }

      const claims = result.claims;
      
      return {
        userId: claims.sub,
        email: claims.email,
        claims,
        isAuthenticated: true
      };

    } catch (error) {
      console.warn('Token verification failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return {
        userId: '',
        email: '',
        claims: {},
        isAuthenticated: false
      };
    }
  }

  extractToken(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    // Support "Bearer <token>" format
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Support direct token (for testing)
    return authHeader;
  }
}

/**
 * Mock auth verifier for testing
 */
export class MockAuthVerifier implements AuthVerifier {
  private validTokens: Set<string> = new Set();

  constructor(validTokens: string[] = []) {
    this.validTokens = new Set(validTokens);
  }

  async verify(token: string): Promise<AuthContext> {
    if (token === 'valid-test-token' || this.validTokens.has(token)) {
      return {
        userId: 'test-user-123',
        email: 'test@example.com',
        claims: { sub: 'test-user-123', email: 'test@example.com' },
        isAuthenticated: true
      };
    }

    return {
      userId: '',
      email: '',
      claims: {},
      isAuthenticated: false
    };
  }

  extractToken(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return authHeader;
  }

  addValidToken(token: string): void {
    this.validTokens.add(token);
  }

  removeValidToken(token: string): void {
    this.validTokens.delete(token);
  }
}