import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/src/lib/api';

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/portfolio');
      return data.data;
    },
    staleTime: 2000,
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/portfolio/positions');
      return data.data;
    },
    staleTime: 2000,
  });
}

export function usePerformance(timeframe: string = '1y') {
  return useQuery({
    queryKey: ['performance', timeframe],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/portfolio/performance', { params: { timeframe } });
      return data.data;
    },
  });
}

