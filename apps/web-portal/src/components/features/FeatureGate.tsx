'use client';

import { useEffect, useState, ReactNode } from 'react';
import { Card, Text, Button, Group, Loader, Alert } from '@mantine/core';
import { Lock, Crown, AlertTriangle } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  upgradeText?: string;
  onUpgrade?: () => void;
}

interface FeatureAccess {
  hasAccess: boolean;
  userTier: string;
  limits: Record<string, any>;
  usageCount: number;
  usageLimit: number;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
  upgradeText = 'Upgrade Plan',
  onUpgrade
}: FeatureGateProps) {
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkFeatureAccess();
  }, [feature]);

  const checkFeatureAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/features/check?feature=${encodeURIComponent(feature)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAccess(data);
    } catch (err) {
      console.error('Error checking feature access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check feature access');
      // Default to no access on error
      setAccess({
        hasAccess: false,
        userTier: 'free',
        limits: {},
        usageCount: 0,
        usageLimit: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-center py-8">
          <Loader size="md" color="blue" />
          <Text ml="sm" size="sm" c="dimmed">Checking access...</Text>
        </div>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
        <Alert icon={<AlertTriangle size={16} />} title="Access Check Failed" color="red" variant="light">
          {error}
          <Button
            variant="light"
            color="red"
            size="xs"
            mt="sm"
            onClick={checkFeatureAccess}
          >
            Retry
          </Button>
        </Alert>
      </Card>
    );
  }

  // User has access - render children
  if (access?.hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
      <div className="text-center">
        <Lock className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <Text size="lg" fw={600} c="white" mb="sm">
          Premium Feature
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          This feature requires a premium plan. You're currently on the{' '}
          <Text component="span" fw={600} c="blue">
            {access?.userTier?.toUpperCase() || 'FREE'}
          </Text>{' '}
          plan.
        </Text>

        {/* Usage information if applicable */}
        {access && access.usageLimit > 0 && (
          <div className="mb-4 p-3 bg-gray-800 rounded-md">
            <Text size="sm" c="dimmed" mb="xs">Usage Limit</Text>
            <Text size="sm" c="white">
              {access.usageCount} / {access.usageLimit} requests used
            </Text>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min((access.usageCount / access.usageLimit) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {showUpgrade && (
          <Group justify="center">
            <Button
              leftSection={<Crown className="h-4 w-4" />}
              color="yellow"
              onClick={onUpgrade || (() => window.location.href = '/pricing')}
            >
              {upgradeText}
            </Button>
            <Button variant="light" color="gray" size="sm">
              Learn More
            </Button>
          </Group>
        )}
      </div>
    </Card>
  );
}

// Higher-order component version for class components or more complex scenarios
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string,
  options?: Omit<FeatureGateProps, 'feature' | 'children'>
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature} {...options}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}

// Hook version for programmatic access
export function useFeatureAccess(feature: string): {
  access: FeatureAccess | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/features/check?feature=${encodeURIComponent(feature)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAccess(data);
    } catch (err) {
      console.error('Error checking feature access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check feature access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [feature]);

  return {
    access,
    loading,
    error,
    refetch: checkAccess
  };
}

// Usage tracking hook
export function useFeatureUsage(feature: string) {
  const trackUsage = async () => {
    try {
      await fetch('/api/features/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ feature })
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  };

  return { trackUsage };
}