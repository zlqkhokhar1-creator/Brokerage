import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  // Get auth token from AsyncStorage
  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Create axios instance with auth
  const createAuthenticatedAxios = async () => {
    const token = await getAuthToken();
    return axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  };

  // Fetch current membership
  const fetchMembership = async () => {
    const token = await getAuthToken();
    if (!token) return;

    try {
      const api = await createAuthenticatedAxios();
      const response = await api.get('/memberships/current');
      setMembership(response.data.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setMembership(null);
      } else {
        console.error('Error fetching membership:', err);
        setError('Failed to load membership information');
      }
    }
  };

  // Fetch available tiers
  const fetchTiers = async () => {
    try {
      const response = await axios.get(`${apiUrl}/memberships/tiers`);
      setTiers(response.data.data);
    } catch (err) {
      console.error('Error fetching tiers:', err);
    }
  };

  // Fetch usage statistics
  const fetchUsage = async () => {
    const token = await getAuthToken();
    if (!token) return;

    try {
      const api = await createAuthenticatedAxios();
      const response = await api.get('/memberships/usage');
      setUsage(response.data.data);
    } catch (err) {
      console.error('Error fetching usage:', err);
    }
  };

  // Check if user has access to a feature
  const hasFeature = (featureName: string): boolean => {
    if (!membership) {
      const basicFeatures = ['auth', 'kyc', 'portfolio_basic', 'market_data_basic', 'trading_basic'];
      return basicFeatures.includes(featureName);
    }
    
    return membership.features.includes(featureName);
  };

  // Get feature limit
  const getFeatureLimit = (limitKey: string): number => {
    if (!membership) {
      const basicLimits: Record<string, number> = {
        portfolios: 1,
        trades_per_month: 10,
        watchlists: 1,
        api_calls_per_day: 100,
        alerts: 0
      };
      return basicLimits[limitKey] || 0;
    }
    
    return membership.limits[limitKey] || 0;
  };

  // Check if feature is unlimited
  const isFeatureUnlimited = (limitKey: string): boolean => {
    return getFeatureLimit(limitKey) === -1;
  };

  // Get remaining usage for a feature
  const getRemainingUsage = (featureKey: string): number => {
    if (!usage || !usage.usage[featureKey]) return 0;
    
    const limit = getFeatureLimit(featureKey);
    if (limit === -1) return Infinity;
    
    const current = usage.usage[featureKey].current;
    return Math.max(0, limit - current);
  };

  // Subscribe to a membership tier
  const subscribe = async (tierId: number, billingCycle: 'monthly' | 'yearly', paymentMethodId?: string) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');

    setLoading(true);
    setError(null);

    try {
      const api = await createAuthenticatedAxios();
      await api.post('/memberships/subscribe', {
        tier_id: tierId,
        billing_cycle: billingCycle,
        payment_method_id: paymentMethodId,
      });

      await refresh();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Subscription failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');

    setLoading(true);
    setError(null);

    try {
      const api = await createAuthenticatedAxios();
      await api.post('/memberships/cancel');
      await refresh();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Cancellation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Refresh all membership data
  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchMembership(),
        fetchTiers(),
        fetchUsage(),
      ]);
    } catch (err) {
      console.error('Error refreshing membership data:', err);
      setError('Failed to refresh membership data');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      const token = await getAuthToken();
      if (token) {
        refresh();
      } else {
        fetchTiers();
      }
    };

    loadData();
  }, []);

  const value: MembershipContextType = {
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
  };

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

// Hook for feature-specific logic
export function useFeatureGate(featureName: string) {
  const { hasFeature, membership, tiers } = useMembership();
  const hasAccess = hasFeature(featureName);

  const requiredTier = tiers.find(tier => 
    tier.features.includes(featureName)
  );

  return {
    hasAccess,
    requiredTier,
    currentTier: membership?.tier_name || 'basic',
    upgradeRequired: !hasAccess,
  };
}
