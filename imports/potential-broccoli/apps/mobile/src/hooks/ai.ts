import { useMutation, useQuery } from '@tanstack/react-query';
import { getApi } from '@/src/lib/api';

export function useWeeklyInsights() {
  return useQuery({
    queryKey: ['ai','weekly-insights'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/advanced/ai-analytics/weekly-insights');
      return data;
    },
  });
}

export function useMorningBriefing() {
  return useQuery({
    queryKey: ['ai','morning-briefing'],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/advanced/ai-analytics/morning-briefing');
      return data;
    },
  });
}

export function usePersonalizedNews(limit: number = 20) {
  return useQuery({
    queryKey: ['ai','personalized-news', limit],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get('/advanced/ai-analytics/personalized-news', { params: { limit } });
      return data;
    },
  });
}

export function useCashFlowPrediction() {
  return useMutation({
    mutationFn: async (params: { portfolioId: string; timeHorizon: '6M' | '1Y' | '2Y' | '5Y' }) => {
      const api = await getApi();
      const { data } = await api.post('/advanced/ai-analytics/cash-flow-prediction', params);
      return data;
    },
  });
}

