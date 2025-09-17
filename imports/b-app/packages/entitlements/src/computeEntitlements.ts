import { SubscriptionPlan, FeatureFlag, Entitlement, UserEntitlements } from './types';

const PLAN_ENTITLEMENTS: Record<SubscriptionPlan, Entitlement[]> = {
  free: [
    { feature: 'portfolio_tracking', enabled: true, limit: 1 },
    { feature: 'paper_trading', enabled: true, limit: 10 },
    { feature: 'real_trading', enabled: false },
    { feature: 'advanced_analytics', enabled: false },
  ],
  basic: [
    { feature: 'portfolio_tracking', enabled: true, limit: 3 },
    { feature: 'paper_trading', enabled: true, limit: 50 },
    { feature: 'real_trading', enabled: true, limit: 100 },
    { feature: 'advanced_analytics', enabled: false },
  ],
  premium: [
    { feature: 'portfolio_tracking', enabled: true },
    { feature: 'paper_trading', enabled: true },
    { feature: 'real_trading', enabled: true, limit: 1000 },
    { feature: 'advanced_analytics', enabled: true },
  ],
  enterprise: [
    { feature: 'portfolio_tracking', enabled: true },
    { feature: 'paper_trading', enabled: true },
    { feature: 'real_trading', enabled: true },
    { feature: 'advanced_analytics', enabled: true },
    { feature: 'api_access', enabled: true },
  ],
};

export function computeEntitlements(
  userId: string,
  plan: SubscriptionPlan,
  flags: FeatureFlag[] = []
): UserEntitlements {
  const baseEntitlements = PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.free;
  
  // Apply feature flag overrides
  const finalEntitlements = baseEntitlements.map(entitlement => {
    const flag = flags.find(f => f.name === entitlement.feature);
    if (flag) {
      return {
        ...entitlement,
        enabled: flag.enabled,
        metadata: { ...entitlement.metadata, appliedFlag: flag.name }
      };
    }
    return entitlement;
  });

  return {
    userId,
    plan,
    entitlements: finalEntitlements,
    computedAt: new Date().toISOString(),
  };
}