import { useMutation, useQuery } from '@tanstack/react-query';
import { getApi } from '@/src/lib/api';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/auth/profile');
      return data;
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (payload: any) => {
      const api = await getApi();
      const { data } = await api.put('/auth/profile', payload);
      return data;
    },
  });
}

