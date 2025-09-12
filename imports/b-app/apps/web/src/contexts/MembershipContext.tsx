'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode, type ComponentType } from 'react';
import { useAuth } from './AuthContext';

// Environment variable types
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL?: string;
  }
}

declare global {
  interface Window {
    ENV?: {
      NEXT_PUBLIC_API_URL?: string;
    };
  }
}

export interface MembershipTier {
  id: number;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
  features: string[];
  limits: Record<string, number>;
}

export interface UserMembership {
  id: number;
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  billing_cycle: 'monthly' | 'yearly';
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  tier_name: string;
  tier_display_name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: Record<string, number>;
}

export interface UsageStats {
  period: string;
  usage: Record<string, {
    current: number;
    limit: number;
    percentage: number;
  }>;
  limits: Record<string, number>;
}

interface MembershipContextType {
  membership: UserMembership | null;
  tiers: MembershipTier[];
  usage: UsageStats | null;
  hasFeature: (featureName: string) => boolean;
  getFeatureLimit: (limitKey: string) => number;
  isFeatureUnlimited: (limitKey: string) => boolean;
  getRemainingUsage: (featureKey: string) => number;
  subscribe: (tierId: number, billingCycle: 'monthly' | 'yearly', paymentMethodId?: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

interface MembershipProviderProps {
  children: ReactNode;
}

export function MembershipProvider({ children }: MembershipProviderProps) {
  const { user, token } = useAuth();
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(() => {
    if (typeof window !== 'undefined' && window.ENV?.NEXT_PUBLIC_API_URL) {
      return window.ENV.NEXT_PUBLIC_API_URL;
    }
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return 'http://localhost:5000/api/v1';
  }, []);

  // Fetch current membership
  const fetchMembership = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/memberships/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMembership(data.data);
      } else if (response.status === 404) {
        setMembership(null);
      }
    } catch (err) {
      console.error('Error fetching membership:', err);
      setError('Failed to load membership information');
    }
  }, [token, apiUrl]);

  // Fetch available tiers
  const fetchTiers = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/memberships/tiers`);
      if (response.ok) {
        const data = await response.json();
        setTiers(data.data);
      }
    } catch (err) {
      console.error('Error fetching tiers:', err);
    }
  }, [apiUrl]);

  // Fetch usage statistics
  const fetchUsage = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/memberships/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsage(data.data);
      }
    } catch (err) {
      console.error('Error fetching usage:', err);
    }
  }, [token, apiUrl]);

  // Memoized basic features to avoid recreation
  const basicFeatures = useMemo(() => 
    ['auth', 'kyc', 'portfolio_basic', 'market_data_basic', 'trading_basic'], []
  );

  // Check if user has access to a feature
  const hasFeature = useCallback((feature: string): boolean => {
    if (!membership) {
      return basicFeatures.includes(feature);
    }
    return membership.features.includes(feature);
  }, [membership, basicFeatures]);

  // Memoized basic limits to avoid recreation
  const basicLimits = useMemo(() => ({
    portfolios: 1,
    trades_per_month: 10,
    watchlists: 1,
    api_calls_per_day: 100,
    alerts: 0
  }), []);

  // Get feature limit
  const getFeatureLimit = useCallback((limitKey: string): number => {
    if (!membership) {
      return basicLimits[limitKey] || 0;
    }
    return membership.limits[limitKey] || 0;
  }, [membership, basicLimits]);

  // Check if feature is unlimited
  const isFeatureUnlimited = useCallback((limitKey: string): boolean => {
    return getFeatureLimit(limitKey) === -1;
  }, [getFeatureLimit]);

  // Get remaining usage for a feature
  const getRemainingUsage = useCallback((featureKey: string): number => {
    if (!usage || !usage.usage[featureKey]) return 0;
    const limit = getFeatureLimit(featureKey);
    if (limit === -1) return Infinity;
    const current = usage.usage[featureKey].current;
    return Math.max(0, limit - current);
  }, [usage, getFeatureLimit]);

  // Subscribe to a membership tier
  const subscribe = useCallback(async (tierId: number, billingCycle: 'monthly' | 'yearly', paymentMethodId?: string) => {
    if (!token) throw new Error('Authentication required');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/memberships/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier_id: tierId,
          billing_cycle: billingCycle,
          payment_method_id: paymentMethodId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Subscription failed');
      }
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Subscription failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl, refresh]);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    if (!token) throw new Error('Authentication required');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/memberships/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Cancellation failed');
      }
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cancellation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl, refresh]);

  // Refresh all membership data
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchMembership(),
        fetchTiers(),
        fetchUsage()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMembership, fetchTiers, fetchUsage]);

  // Load data when user changes
  useEffect(() => {
    if (user && token) {
      refresh();
    } else {
      setMembership(null);
      setUsage(null);
    }
  }, [user, token, refresh]);

  // Load tiers on mount (public data)
  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const value: MembershipContextType = useMemo(() => ({
    membership,
    tiers,
    usage,
    hasFeature,
    getFeatureLimit,
    isFeatureUnlimited,
    getRemainingUsage,
    subscribe,
    cancelSubscription,
    loading,
    error,
    refresh,
  }), [
    membership,
    tiers,
    usage,
    hasFeature,
    getFeatureLimit,
    isFeatureUnlimited,
    getRemainingUsage,
    subscribe,
    cancelSubscription,
    loading,
    error,
    refresh
  ]);

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
}
