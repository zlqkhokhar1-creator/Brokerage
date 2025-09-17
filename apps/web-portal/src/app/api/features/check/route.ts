import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature');

    if (!feature) {
      return NextResponse.json(
        { error: 'Missing feature parameter', message: 'Feature name is required' },
        { status: 400 }
      );
    }

    // Always return mock data for demo purposes
    const mockAccess = getMockFeatureAccess(feature);

    return NextResponse.json(mockAccess);
  } catch (error) {
    console.error('Error checking feature access:', error);
    // Return fallback access data even on error
    return NextResponse.json({
      hasAccess: true, // Allow access in demo mode
      userTier: 'premium',
      limits: { api_calls_per_day: 1000 },
      usageCount: 45,
      usageLimit: 1000
    });
  }
}

function getMockFeatureAccess(feature: string) {
  // Mock feature access logic - in real app, this would come from your database
  const featureRules: Record<string, { free: boolean; basic: boolean; premium: boolean; vip: boolean }> = {
    'basic_trading': { free: true, basic: true, premium: true, vip: true },
    'advanced_orders': { free: false, basic: true, premium: true, vip: true },
    'ai_predictions': { free: false, basic: true, premium: true, vip: true },
    'advanced_charts': { free: false, basic: true, premium: true, vip: true },
    'unlimited_trades': { free: false, basic: false, premium: true, vip: true },
    'options_trading': { free: false, basic: false, premium: true, vip: true },
    'futures_trading': { free: false, basic: false, premium: false, vip: true },
    'social_trading': { free: false, basic: false, premium: true, vip: true },
    'personal_coaching': { free: false, basic: false, premium: false, vip: true },
  };

  // Mock user tier - in real app, this would come from authentication
  const userTier = 'premium'; // This would be determined from user's session/token

  const hasAccess = featureRules[feature]?.[userTier as keyof typeof featureRules[string]] || false;

  // Mock limits based on tier
  const tierLimits: Record<string, Record<string, any>> = {
    free: { max_portfolio_size: 10000, api_calls_per_day: 100 },
    basic: { max_portfolio_size: 50000, api_calls_per_day: 500 },
    premium: { max_portfolio_size: 500000, api_calls_per_day: 2000 },
    vip: { max_portfolio_size: 10000000, api_calls_per_day: 10000 },
  };

  // Mock usage tracking
  const mockUsage: Record<string, { count: number; limit: number }> = {
    'ai_predictions': { count: 45, limit: 100 },
    'advanced_charts': { count: 120, limit: 500 },
    'basic_trading': { count: 15, limit: 100 },
  };

  const usage = mockUsage[feature] || { count: 0, limit: 1000 };

  return {
    hasAccess,
    userTier,
    limits: tierLimits[userTier] || {},
    usageCount: usage.count,
    usageLimit: usage.limit
  };
}