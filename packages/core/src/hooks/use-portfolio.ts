import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

// Portfolio hooks
export const usePortfolio = () => {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => apiClient.getPortfolio(),
    staleTime: 30000, // 30 seconds
  });
};

export const usePortfolioPositions = () => {
  return useQuery({
    queryKey: ['portfolio', 'positions'],
    queryFn: () => apiClient.getPortfolioPositions(),
    staleTime: 30000,
  });
};

// Trading hooks
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => apiClient.getOrders(),
    staleTime: 10000, // 10 seconds for orders
  });
};

export const usePlaceOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (order: any) => apiClient.placeOrder(order),
    onSuccess: () => {
      // Invalidate and refetch portfolio and orders
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// Market data hooks
export const useMarketData = (symbol: string) => {
  return useQuery({
    queryKey: ['market-data', symbol],
    queryFn: () => apiClient.getMarketData(symbol),
    staleTime: 5000, // 5 seconds for market data
    enabled: !!symbol,
  });
};

export const useWatchlists = () => {
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: () => apiClient.getWatchlists(),
    staleTime: 60000, // 1 minute
  });
};

// Robo advisor hooks
export const useRoboAdvisorProfile = () => {
  return useQuery({
    queryKey: ['robo-advisor', 'profile'],
    queryFn: () => apiClient.getRoboAdvisorProfile(),
  });
};

export const useUpdateRoboAdvisorProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (profile: any) => apiClient.updateRoboAdvisorProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['robo-advisor', 'profile'] });
    },
  });
};

// KYC hooks
export const useKycStatus = () => {
  return useQuery({
    queryKey: ['kyc', 'status'],
    queryFn: () => apiClient.getKycStatus(),
  });
};

export const useSubmitKycDocuments = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (documents: any) => apiClient.submitKycDocuments(documents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc', 'status'] });
    },
  });
};

// Settings hooks
export const useUserSettings = () => {
  return useQuery({
    queryKey: ['user', 'settings'],
    queryFn: () => apiClient.getUserSettings(),
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settings: any) => apiClient.updateUserSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
    },
  });
};
