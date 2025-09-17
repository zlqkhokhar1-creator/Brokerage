import { useMutation, useQuery } from '@tanstack/react-query';
import { getApi } from '@/src/lib/api';

export function useTiers() {
  return useQuery({
    queryKey: ['tiers'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/memberships/tiers');
      return data.data;
    },
  });
}

export function useCurrentMembership() {
  return useQuery({
    queryKey: ['membership'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/memberships/current');
      return data.data;
    },
  });
}

export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/memberships/usage');
      return data.data;
    },
  });
}

