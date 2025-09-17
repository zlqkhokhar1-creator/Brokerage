import { computeEntitlements } from '../src/computeEntitlements';
import { SubscriptionPlan, FeatureFlag } from '../src/types';

describe('computeEntitlements', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  it('should return correct entitlements for free plan', () => {
    const result = computeEntitlements(userId, 'free');
    
    expect(result.userId).toBe(userId);
    expect(result.plan).toBe('free');
    expect(result.entitlements).toHaveLength(4);
    
    const portfolioTracking = result.entitlements.find(e => e.feature === 'portfolio_tracking');
    expect(portfolioTracking?.enabled).toBe(true);
    expect(portfolioTracking?.limit).toBe(1);
    
    const realTrading = result.entitlements.find(e => e.feature === 'real_trading');
    expect(realTrading?.enabled).toBe(false);
  });

  it('should return correct entitlements for premium plan', () => {
    const result = computeEntitlements(userId, 'premium');
    
    expect(result.plan).toBe('premium');
    
    const advancedAnalytics = result.entitlements.find(e => e.feature === 'advanced_analytics');
    expect(advancedAnalytics?.enabled).toBe(true);
    
    const realTrading = result.entitlements.find(e => e.feature === 'real_trading');
    expect(realTrading?.enabled).toBe(true);
    expect(realTrading?.limit).toBe(1000);
  });

  it('should apply feature flag overrides', () => {
    const flags: FeatureFlag[] = [
      { name: 'advanced_analytics', enabled: true }
    ];
    
    const result = computeEntitlements(userId, 'free', flags);
    
    const advancedAnalytics = result.entitlements.find(e => e.feature === 'advanced_analytics');
    expect(advancedAnalytics?.enabled).toBe(true);
    expect(advancedAnalytics?.metadata?.appliedFlag).toBe('advanced_analytics');
  });

  it('should have deterministic output', () => {
    const result1 = computeEntitlements(userId, 'basic');
    const result2 = computeEntitlements(userId, 'basic');
    
    // Remove timestamps before comparison
    const { computedAt: _, ...rest1 } = result1;
    const { computedAt: __, ...rest2 } = result2;
    
    expect(rest1).toEqual(rest2);
  });
});