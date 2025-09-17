export interface RequestContext {
  userId?: string;
  userRole?: string;
  permissions?: string[];
  ip?: string;
  userAgent?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface PolicyRule {
  authLevel: 'none' | 'user' | 'admin';
  permissions?: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  authRequired?: boolean;
  missingPermissions?: string[];
  rateLimited?: boolean;
}

export interface PolicyEvaluator {
  evaluate(context: RequestContext, policy: PolicyRule): PolicyEvaluationResult;
}

export class DefaultPolicyEvaluator implements PolicyEvaluator {
  evaluate(context: RequestContext, policy: PolicyRule): PolicyEvaluationResult {
    // Check authentication level
    if (policy.authLevel === 'admin') {
      if (!context.userId || context.userRole !== 'admin') {
        return {
          allowed: false,
          reason: 'Admin access required',
          authRequired: true
        };
      }
    } else if (policy.authLevel === 'user') {
      if (!context.userId) {
        return {
          allowed: false,
          reason: 'User authentication required',
          authRequired: true
        };
      }
    }

    // Check permissions
    if (policy.permissions && policy.permissions.length > 0) {
      const userPermissions = context.permissions || [];
      const missingPermissions = policy.permissions.filter(
        permission => !userPermissions.includes(permission)
      );

      if (missingPermissions.length > 0) {
        return {
          allowed: false,
          reason: 'Insufficient permissions',
          missingPermissions
        };
      }
    }

    // Note: Rate limiting is handled separately by middleware
    // This evaluator only checks static policy rules

    return {
      allowed: true
    };
  }
}

// Policy chain evaluator that can combine multiple policies
export class PolicyChain {
  private policies: Array<{ name: string; rule: PolicyRule }> = [];

  addPolicy(name: string, rule: PolicyRule): PolicyChain {
    this.policies.push({ name, rule });
    return this;
  }

  evaluate(context: RequestContext, evaluator: PolicyEvaluator): PolicyEvaluationResult {
    for (const policy of this.policies) {
      const result = evaluator.evaluate(context, policy.rule);
      if (!result.allowed) {
        return {
          ...result,
          reason: `Policy '${policy.name}' failed: ${result.reason}`
        };
      }
    }

    return { allowed: true };
  }
}