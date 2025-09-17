import { useMutation, useQuery } from '@tanstack/react-query';
import { getApi } from '@/src/lib/api';

export type OrderInput = {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  securityType?: 'STOCK' | 'OPTION' | 'FUTURE' | 'CRYPTO';
  algorithm?: 'TWAP' | 'VWAP' | 'IS' | 'ICEBERG';
};

export function usePlaceOrder() {
  return useMutation({
    mutationFn: async (order: OrderInput) => {
      const api = await getApi();
      const { data } = await api.post('/orders', order);
      return data.data;
    },
  });
}

export function useCancelOrder() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const api = await getApi();
      const { data } = await api.delete(`/orders/${orderId}`);
      return data.data;
    },
  });
}

export function useModifyOrder() {
  return useMutation({
    mutationFn: async ({ orderId, modifications }: { orderId: string; modifications: Partial<OrderInput> }) => {
      const api = await getApi();
      const { data } = await api.put(`/orders/${orderId}`, modifications);
      return data.data;
    },
  });
}

export function useOrderStatus(orderId?: string) {
  return useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get(`/orders/${orderId}`);
      return data.data;
    },
  });
}

export function useOrderHistory(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ['orders', limit, offset],
    queryFn: async () => {
      const api = await getApi();
      const { data } = await api.get(`/orders`, { params: { limit, offset } });
      return data.data;
    },
  });
}

// Slide-to-Execute lifecycle
export function useSlidePrepare() {
  return useMutation({
    mutationFn: async ({ orderData, options = {} }: { orderData: OrderInput; options?: Record<string, any> }) => {
      const api = await getApi();
      const { data } = await api.post('/orders/slide/prepare', { orderData, options });
      return data.data as { slideToken: string; expiresAt: number; risk: any };
    },
  });
}

export function useSlideExecute() {
  return useMutation({
    mutationFn: async ({ slideToken, slideData }: { slideToken: string; slideData: any }) => {
      const api = await getApi();
      const { data } = await api.post('/orders/slide/execute', { slideToken, slideData });
      return data.data;
    },
  });
}

export function useSlideCancel() {
  return useMutation({
    mutationFn: async ({ slideToken, reason }: { slideToken: string; reason?: string }) => {
      const api = await getApi();
      const { data } = await api.delete(`/orders/slide/${slideToken}`, { data: { reason } });
      return data.data;
    },
  });
}

