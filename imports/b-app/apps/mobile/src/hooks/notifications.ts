import { useMutation, useQuery } from '@tanstack/react-query';
import { getApi } from '@/src/lib/api';

export function useNotificationsHistory(limit: number = 50, offset: number = 0, type?: string, priority?: string) {
  return useQuery({
    queryKey: ['notifications', limit, offset, type, priority],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/notifications', { params: { limit, offset, type, priority } });
      return data.data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  return useMutation({
    mutationFn: async (preferences: Record<string, any>) => {
      const api = await getApi();
      const { data } = await api.put('/notifications/preferences', preferences);
      return data.data;
    },
  });
}

