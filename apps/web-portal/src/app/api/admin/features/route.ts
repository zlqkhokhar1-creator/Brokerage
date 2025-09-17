import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Always return mock data for demo purposes
    const mockFeatures = [
      {
        id: 'ai_predictions',
        name: 'ai_predictions',
        display_name: 'AI Market Predictions',
        description: 'Real-time AI-powered market predictions',
        category: 'ai',
        is_active: true,
        tier_availability: [
          { tier: 'free', tier_display_name: 'Free', enabled: false, limits: {} },
          { tier: 'basic', tier_display_name: 'Basic', enabled: true, limits: { api_calls_per_day: 100 } },
          { tier: 'premium', tier_display_name: 'Premium', enabled: true, limits: { api_calls_per_day: 1000 } },
          { tier: 'vip', tier_display_name: 'VIP', enabled: true, limits: { api_calls_per_day: 5000 } }
        ]
      },
      {
        id: 'advanced_charts',
        name: 'advanced_charts',
        display_name: 'Advanced Charts',
        description: 'Technical indicators and advanced charting',
        category: 'analytics',
        is_active: true,
        tier_availability: [
          { tier: 'free', tier_display_name: 'Free', enabled: false, limits: {} },
          { tier: 'basic', tier_display_name: 'Basic', enabled: true, limits: {} },
          { tier: 'premium', tier_display_name: 'Premium', enabled: true, limits: {} },
          { tier: 'vip', tier_display_name: 'VIP', enabled: true, limits: {} }
        ]
      },
      {
        id: 'unlimited_trades',
        name: 'unlimited_trades',
        display_name: 'Unlimited Trading',
        description: 'No daily trade limits',
        category: 'trading',
        is_active: true,
        tier_availability: [
          { tier: 'free', tier_display_name: 'Free', enabled: false, limits: {} },
          { tier: 'basic', tier_display_name: 'Basic', enabled: false, limits: {} },
          { tier: 'premium', tier_display_name: 'Premium', enabled: true, limits: {} },
          { tier: 'vip', tier_display_name: 'VIP', enabled: true, limits: {} }
        ]
      },
      {
        id: 'social_trading',
        name: 'social_trading',
        display_name: 'Social Trading',
        description: 'Copy trades from successful traders',
        category: 'social',
        is_active: true,
        tier_availability: [
          { tier: 'free', tier_display_name: 'Free', enabled: false, limits: {} },
          { tier: 'basic', tier_display_name: 'Basic', enabled: false, limits: {} },
          { tier: 'premium', tier_display_name: 'Premium', enabled: true, limits: {} },
          { tier: 'vip', tier_display_name: 'VIP', enabled: true, limits: {} }
        ]
      },
      {
        id: 'personal_coaching',
        name: 'personal_coaching',
        display_name: 'Personal Coaching',
        description: '1-on-1 coaching with expert traders',
        category: 'education',
        is_active: true,
        tier_availability: [
          { tier: 'free', tier_display_name: 'Free', enabled: false, limits: {} },
          { tier: 'basic', tier_display_name: 'Basic', enabled: false, limits: {} },
          { tier: 'premium', tier_display_name: 'Premium', enabled: false, limits: {} },
          { tier: 'vip', tier_display_name: 'VIP', enabled: true, limits: {} }
        ]
      }
    ];

    const mockTiers = [
      { id: 'free', name: 'free', display_name: 'Free', price_monthly: 0, price_yearly: 0, user_count: 1250 },
      { id: 'basic', name: 'basic', display_name: 'Basic', price_monthly: 9.99, price_yearly: 99.99, user_count: 850 },
      { id: 'premium', name: 'premium', display_name: 'Premium', price_monthly: 29.99, price_yearly: 299.99, user_count: 320 },
      { id: 'vip', name: 'vip', display_name: 'VIP', price_monthly: 99.99, price_yearly: 999.99, user_count: 45 }
    ];

    return NextResponse.json({
      features: mockFeatures,
      tiers: mockTiers,
      totalFeatures: mockFeatures.length,
      totalTiers: mockTiers.length
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    // Return fallback data even on error
    const fallbackFeatures = [
      {
        id: 'ai_predictions',
        name: 'ai_predictions',
        display_name: 'AI Market Predictions',
        description: 'Real-time AI-powered market predictions',
        category: 'ai',
        is_active: true,
        tier_availability: [
          { tier: 'free', tier_display_name: 'Free', enabled: false, limits: {} },
          { tier: 'basic', tier_display_name: 'Basic', enabled: true, limits: { api_calls_per_day: 100 } },
          { tier: 'premium', tier_display_name: 'Premium', enabled: true, limits: { api_calls_per_day: 1000 } },
          { tier: 'vip', tier_display_name: 'VIP', enabled: true, limits: { api_calls_per_day: 5000 } }
        ]
      }
    ];

    const fallbackTiers = [
      { id: 'free', name: 'free', display_name: 'Free', price_monthly: 0, price_yearly: 0, user_count: 1250 },
      { id: 'basic', name: 'basic', display_name: 'Basic', price_monthly: 9.99, price_yearly: 99.99, user_count: 850 },
      { id: 'premium', name: 'premium', display_name: 'Premium', price_monthly: 29.99, price_yearly: 299.99, user_count: 320 },
      { id: 'vip', name: 'vip', display_name: 'VIP', price_monthly: 99.99, price_yearly: 999.99, user_count: 45 }
    ];

    return NextResponse.json({
      features: fallbackFeatures,
      tiers: fallbackTiers,
      totalFeatures: fallbackFeatures.length,
      totalTiers: fallbackTiers.length,
      note: 'Using fallback demo data'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { featureId, tierName, enabled } = body;

    // In a real implementation, this would call your backend API
    // For now, we'll simulate the response
    console.log(`Toggling feature ${featureId} for ${tierName} tier: ${enabled}`);

    return NextResponse.json({
      success: true,
      message: `Feature toggled successfully`,
      data: {
        featureId,
        tierName,
        enabled,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error toggling feature:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to toggle feature', message: errorMessage },
      { status: 500 }
    );
  }
}