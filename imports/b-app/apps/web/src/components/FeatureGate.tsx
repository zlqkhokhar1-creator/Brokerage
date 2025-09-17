'use client';

import React from 'react';
import { useMembership, useFeatureGate } from '@/contexts/MembershipContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { hasAccess, requiredTier, upgradeRequired } = useFeatureGate(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return <UpgradePrompt requiredTier={requiredTier} feature={feature} />;
}

interface UpgradePromptProps {
  requiredTier: any;
  feature: string;
}

function UpgradePrompt({ requiredTier, feature }: UpgradePromptProps) {
  const getTierIcon = (tierName: string) => {
    switch (tierName) {
      case 'premium':
        return <Zap className="h-6 w-6 text-blue-500" />;
      case 'pro':
        return <Crown className="h-6 w-6 text-purple-500" />;
      default:
        return <Lock className="h-6 w-6 text-gray-500" />;
    }
  };

  const getFeatureDisplayName = (featureName: string) => {
    const featureNames: Record<string, string> = {
      'social_trading': 'Social Trading',
      'ai_recommendations': 'AI Recommendations',
      'international_markets': 'International Markets',
      'options_trading': 'Options Trading',
      'advanced_orders': 'Advanced Orders',
      'risk_management': 'Risk Management',
      'compliance_tools': 'Compliance Tools',
      'api_access': 'API Access',
      'advanced_charts': 'Advanced Charts',
      'alerts': 'Price Alerts',
      'research': 'Research Tools',
    };
    return featureNames[featureName] || featureName.replace('_', ' ');
  };

  if (!requiredTier) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lock className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Feature Not Available
          </h3>
          <p className="text-gray-600 text-center">
            This feature is not currently available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {getTierIcon(requiredTier.name)}
        </div>
        <CardTitle className="text-xl">
          Unlock {getFeatureDisplayName(feature)}
        </CardTitle>
        <CardDescription>
          Upgrade to {requiredTier.display_name} to access this feature
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="mb-6">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            ${requiredTier.price_monthly}
            <span className="text-sm font-normal text-gray-600">/month</span>
          </div>
          <div className="text-sm text-gray-600">
            or ${requiredTier.price_yearly}/year (save 17%)
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-700">
            {requiredTier.description}
          </p>
          
          {/* Show some key features */}
          <div className="text-left">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              What you'll get:
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {requiredTier.features.slice(0, 4).map((feat: string, index: number) => (
                <li key={index} className="flex items-center">
                  <ArrowRight className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                  {getFeatureDisplayName(feat)}
                </li>
              ))}
              {requiredTier.features.length > 4 && (
                <li className="text-gray-500 text-xs">
                  +{requiredTier.features.length - 4} more features
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1">
            <Link href="/memberships/upgrade">
              Upgrade Now
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/pricing">
              View All Plans
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Usage limit component
interface UsageLimitProps {
  feature: string;
  children: React.ReactNode;
  showWarningAt?: number; // Show warning when usage reaches this percentage
}

export function UsageLimit({ 
  feature, 
  children, 
  showWarningAt = 80 
}: UsageLimitProps) {
  const { getRemainingUsage, getFeatureLimit, usage } = useMembership();
  
  const remaining = getRemainingUsage(feature);
  const limit = getFeatureLimit(feature);
  const current = usage?.usage[feature]?.current || 0;
  
  // If unlimited, always show content
  if (limit === -1) {
    return <>{children}</>;
  }
  
  // If no usage left, show upgrade prompt
  if (remaining <= 0) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-900">Usage Limit Reached</h3>
              <p className="text-sm text-red-700">
                You've used all {limit} of your monthly {feature.replace('_', ' ')} allowance.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/memberships/upgrade">
                Upgrade
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Show warning if approaching limit
  const usagePercentage = (current / limit) * 100;
  const showWarning = usagePercentage >= showWarningAt;
  
  return (
    <>
      {showWarning && (
        <Card className="border-yellow-200 bg-yellow-50 mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>{remaining}</strong> {feature.replace('_', ' ')} remaining this month
                </p>
                <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/memberships/upgrade">
                  Upgrade
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {children}
    </>
  );
}

// Conditional component wrapper
interface ConditionalFeatureProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ConditionalFeature({ 
  feature, 
  children, 
  fallback 
}: ConditionalFeatureProps) {
  const { hasFeature } = useMembership();
  
  if (hasFeature(feature)) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
}
