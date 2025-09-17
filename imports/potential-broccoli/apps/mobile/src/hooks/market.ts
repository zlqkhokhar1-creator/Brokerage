import { useQuery, useMutation } from '@tanstack/react-query';
import { getApi } from '@/src/lib/api';

export function useQuote(symbol?: string) {
  return useQuery({
    queryKey: ['quote', symbol],
    enabled: !!symbol,
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get(`/market/quote/${symbol}`);
      return data.data;
    },
  });
}

export function useLevel2(symbol?: string) {
  return useQuery({
    queryKey: ['level2', symbol],
    enabled: !!symbol,
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get(`/market/level2/${symbol}`);
      return data.data;
    },
    staleTime: 1000,
  });
}

export function useOptionsChain(symbol?: string, expiration?: string) {
  return useQuery({
    queryKey: ['options', symbol, expiration],
    enabled: !!symbol,
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get(`/market/options/${symbol}`, {
        params: { expiration },
      });
      return data.data;
    },
  });
}

export function useTechnicals(symbol?: string, period: string = '1d', indicators: string[] = ['sma','ema','rsi','macd']) {
  return useQuery({
    queryKey: ['technicals', symbol, period, indicators.join(',')],
    enabled: !!symbol,
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get(`/market/technicals/${symbol}`, {
        params: { period, indicators: indicators.join(',') },
      });
      return data.data;
    },
  });
}

export function useScreenStocks() {
  return useMutation({
    mutationFn: async (criteria: Record<string, any>) => {
      const api = await getApi();
      const { data } = await api.post('/market/screen', criteria);
      return data.data;
    },
  });
}

