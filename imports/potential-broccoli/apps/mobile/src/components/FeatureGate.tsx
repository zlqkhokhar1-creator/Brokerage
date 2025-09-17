import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMembership, useFeatureGate } from '../contexts/MembershipContext';

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
  onUpgrade?: () => void;
}

function UpgradePrompt({ requiredTier, feature, onUpgrade }: UpgradePromptProps) {
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
      <View style={styles.upgradeContainer}>
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Feature Not Available</Text>
          <Text style={styles.upgradeDescription}>
            This feature is not currently available.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.upgradeContainer}>
      <View style={styles.upgradeCard}>
        <Text style={styles.upgradeTitle}>
          Unlock {getFeatureDisplayName(feature)}
        </Text>
        <Text style={styles.upgradeDescription}>
          Upgrade to {requiredTier.display_name} to access this feature
        </Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            ${requiredTier.price_monthly}
            <Text style={styles.priceUnit}>/month</Text>
          </Text>
          <Text style={styles.yearlyPrice}>
            or ${requiredTier.price_yearly}/year (save 17%)
          </Text>
        </View>

        <Text style={styles.tierDescription}>
          {requiredTier.description}
        </Text>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What you'll get:</Text>
          {requiredTier.features.slice(0, 4).map((feat: string, index: number) => (
            <Text key={index} style={styles.featureItem}>
              • {getFeatureDisplayName(feat)}
            </Text>
          ))}
          {requiredTier.features.length > 4 && (
            <Text style={styles.moreFeatures}>
              +{requiredTier.features.length - 4} more features
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.upgradeButton} 
            onPress={onUpgrade}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.plansButton}>
            <Text style={styles.plansButtonText}>View All Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Usage limit component
interface UsageLimitProps {
  feature: string;
  children: React.ReactNode;
  showWarningAt?: number;
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
      <View style={styles.usageLimitContainer}>
        <View style={styles.usageLimitCard}>
          <Text style={styles.usageLimitTitle}>Usage Limit Reached</Text>
          <Text style={styles.usageLimitDescription}>
            You've used all {limit} of your monthly {feature.replace('_', ' ')} allowance.
          </Text>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Show warning if approaching limit
  const usagePercentage = (current / limit) * 100;
  const showWarning = usagePercentage >= showWarningAt;
  
  return (
    <View>
      {showWarning && (
        <View style={styles.warningContainer}>
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              <Text style={styles.warningBold}>{remaining}</Text> {feature.replace('_', ' ')} remaining this month
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${usagePercentage}%` }
                ]} 
              />
            </View>
            <TouchableOpacity style={styles.warningButton}>
              <Text style={styles.warningButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {children}
    </View>
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

const styles = StyleSheet.create({
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  upgradeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    maxWidth: 400,
    width: '100%',
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e293b',
  },
  upgradeDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 16,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  priceUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#64748b',
  },
  yearlyPrice: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  moreFeatures: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  buttonContainer: {
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  plansButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  plansButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  usageLimitContainer: {
    padding: 16,
  },
  usageLimitCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  usageLimitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f1d1d',
    marginBottom: 4,
  },
  usageLimitDescription: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 12,
  },
  warningContainer: {
    padding: 16,
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 8,
  },
  warningBold: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#fed7aa',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d97706',
    borderRadius: 4,
  },
  warningButton: {
    borderWidth: 1,
    borderColor: '#d97706',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  warningButtonText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
  },
});
