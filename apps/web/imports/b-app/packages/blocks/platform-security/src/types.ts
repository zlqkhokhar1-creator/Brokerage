import { z } from 'zod';

// Authentication context
export interface AuthContext {
  userId: string;
  email: string;
  claims: Record<string, any>;
  isAuthenticated: boolean;
}

// Auth verifier interface  
export interface AuthVerifier {
  verify(token: string): Promise<AuthContext>;
  extractToken(authHeader: string): string | null;
}

// Security policy interface
export interface SecurityPolicy {
  requiresAuth: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface SecurityPolicyResult {
  allowed: boolean;
  reason?: string;
}

// Security middleware context
export interface SecurityContext {
  traceId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestPath?: string;
  method?: string;
}