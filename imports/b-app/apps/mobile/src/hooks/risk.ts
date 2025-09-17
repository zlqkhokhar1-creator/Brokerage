import { useMutation, useQuery } from '@tanstack/react-query';
import { getApi } from '@/src/lib/api';

export function usePortfolioRisk() {
  return useQuery({
    queryKey: ['risk','portfolio'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/risk/portfolio');
      return data.data;
    },
  });
}

export function useStressTest() {
  return useMutation({
    mutationFn: async (scenarios: any[]) => {
      const api = await getApi();
      const { data } = await api.post('/risk/stress-test', { scenarios });
      return data.data;
    },
  });
}

export function usePositionSize() {
  return useMutation({
    mutationFn: async ({ symbol, riskTolerance }: { symbol: string; riskTolerance: number }) => {
      const api = await getApi();
      const { data } = await api.post('/risk/position-size', { symbol, riskTolerance });
      return data.data;
    },
  });
}

