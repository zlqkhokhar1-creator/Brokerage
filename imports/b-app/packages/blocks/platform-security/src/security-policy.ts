import { SecurityPolicy, SecurityPolicyResult, AuthContext } from './types.js';

/**
 * Security policy engine for command authorization
 */
export class SecurityPolicyEngine {
  private policies: Map<string, SecurityPolicy> = new Map();

  /**
   * Register a security policy for a command
   */
  registerPolicy(commandName: string, policy: SecurityPolicy): void {
    this.policies.set(commandName, policy);
    
    console.info('Security policy registered', {
      commandName,
      requiresAuth: policy.requiresAuth,
      roles: policy.roles,
      permissions: policy.permissions
    });
  }

  /**
   * Check if a command is authorized for the given auth context
   */
  checkAuthorization(commandName: string, authContext: AuthContext): SecurityPolicyResult {
    const policy = this.policies.get(commandName);
    
    // No policy means no restrictions (allow by default)
    if (!policy) {
      return { allowed: true };
    }

    // Check if authentication is required
    if (policy.requiresAuth && !authContext.isAuthenticated) {
      return {
        allowed: false,
        reason: 'Authentication required'
      };
    }

    // Check roles if specified
    if (policy.roles && policy.roles.length > 0) {
      const userRoles = authContext.claims.roles || [];
      const hasRequiredRole = policy.roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return {
          allowed: false,
          reason: `Required role not found. Required: ${policy.roles.join(', ')}`
        };
      }
    }

    // Check permissions if specified
    if (policy.permissions && policy.permissions.length > 0) {
      const userPermissions = authContext.claims.permissions || [];
      const hasRequiredPermission = policy.permissions.some(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasRequiredPermission) {
        return {
          allowed: false,
          reason: `Required permission not found. Required: ${policy.permissions.join(', ')}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get policy for a command
   */
  getPolicy(commandName: string): SecurityPolicy | undefined {
    return this.policies.get(commandName);
  }

  /**
   * Get all registered policies
   */
  getAllPolicies(): Record<string, SecurityPolicy> {
    const policies: Record<string, SecurityPolicy> = {};
    this.policies.forEach((policy, commandName) => {
      policies[commandName] = policy;
    });
    return policies;
  }

  /**
   * Remove a policy
   */
  removePolicy(commandName: string): boolean {
    return this.policies.delete(commandName);
  }

  /**
   * Clear all policies
   */
  clearPolicies(): void {
    this.policies.clear();
  }
}

/**
 * Default security policies for membership and payment commands
 */
export const DefaultSecurityPolicies = {
  // Membership policies
  'RegisterUser': { requiresAuth: false }, // Public registration
  'AuthenticateUser': { requiresAuth: false }, // Public login
  'GetProfile': { requiresAuth: true },
  'UpdateProfile': { requiresAuth: true },
  'ValidateToken': { requiresAuth: false }, // Internal use

  // Payment policies 
  'InitializePayment': { requiresAuth: true },
  'AuthorizePayment': { requiresAuth: true },
  'CapturePayment': { requiresAuth: true },
  'RefundPayment': { requiresAuth: true },
  'GetPayment': { requiresAuth: true }
} as const;