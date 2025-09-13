/**
 * Trading API Services
 * Centralized trading operations for orders, positions, and portfolio management
 */

import { internalApi } from './client';
import { API_ENDPOINTS, API_TIMEOUTS } from './config';
import { authService } from './auth';

// Types for trading operations
export interface Order {
  id: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled';
  filledQuantity: number;
  avgFillPrice?: number;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  fees?: number;
  metadata?: Record<string, any>;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  side: 'long' | 'short';
  createdAt: string;
  lastUpdated: string;
}

export interface Portfolio {
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  positions: Position[];
  lastUpdated: string;
}

export interface OrderRequest {
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
  extendedHours?: boolean;
  metadata?: Record<string, any>;
}

export interface TradeExecution {
  orderId: string;
  symbol: string;
  quantity: number;
  price: number;
  side: 'buy' | 'sell';
  timestamp: string;
  fees: number;
  commission: number;
}

export interface PortfolioAnalytics {
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    allTime: number;
  };
  allocation: {
    symbol: string;
    percentage: number;
    value: number;
  }[];
  riskMetrics: {
    beta: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
  };
  dividends: {
    symbol: string;
    amount: number;
    exDate: string;
    payDate: string;
  }[];
}

/**
 * Trading Service Class
 */
class TradingService {
  /**
   * Place a new order
   */
  async placeOrder(orderRequest: OrderRequest): Promise<Order> {
    try {
      const response = await internalApi.post(
        API_ENDPOINTS.INTERNAL.TRADING.ORDERS,
        orderRequest,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to place order: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Order placement error:', error);
      throw error;
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<Order> {
    try {
      const response = await internalApi.delete(
        `${API_ENDPOINTS.INTERNAL.TRADING.ORDERS}/${orderId}`,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to cancel order: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Order cancellation error:', error);
      throw error;
    }
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(
    orderId: string,
    modifications: Partial<Pick<OrderRequest, 'quantity' | 'price' | 'stopPrice' | 'timeInForce'>>
  ): Promise<Order> {
    try {
      const response = await internalApi.patch(
        `${API_ENDPOINTS.INTERNAL.TRADING.ORDERS}/${orderId}`,
        modifications,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to modify order: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Order modification error:', error);
      throw error;
    }
  }

  /**
   * Get user's orders
   */
  async getOrders(
    status?: Order['status'],
    symbol?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ orders: Order[]; total: number }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(status && { status }),
        ...(symbol && { symbol }),
      });

      const response = await internalApi.get(
        `${API_ENDPOINTS.INTERNAL.TRADING.ORDERS}?${params}`,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch orders: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Orders fetch error:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await internalApi.get(
        `${API_ENDPOINTS.INTERNAL.TRADING.ORDERS}/${orderId}`,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch order: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Order fetch error:', error);
      throw error;
    }
  }

  /**
   * Get user's positions
   */
  async getPositions(): Promise<Position[]> {
    try {
      const response = await internalApi.get(
        API_ENDPOINTS.INTERNAL.TRADING.POSITIONS,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch positions: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Positions fetch error:', error);
      throw error;
    }
  }

  /**
   * Get portfolio summary
   */
  async getPortfolio(): Promise<Portfolio> {
    try {
      const response = await internalApi.get(
        API_ENDPOINTS.INTERNAL.PORTFOLIO.GET,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch portfolio: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Portfolio fetch error:', error);
      throw error;
    }
  }

  /**
   * Get portfolio performance history
   */
  async getPortfolioHistory(
    period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL' = '1M'
  ): Promise<Array<{ timestamp: string; value: number }>> {
    try {
      const response = await internalApi.get(
        `${API_ENDPOINTS.INTERNAL.PORTFOLIO.HISTORY}?period=${period}`,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch portfolio history: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Portfolio history fetch error:', error);
      throw error;
    }
  }

  /**
   * Get trading history
   */
  async getTradingHistory(
    symbol?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ executions: TradeExecution[]; total: number }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(symbol && { symbol }),
      });

      const response = await internalApi.get(
        `${API_ENDPOINTS.INTERNAL.TRADING.HISTORY}?${params}`,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch trading history: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Trading history fetch error:', error);
      throw error;
    }
  }

  /**
   * Get portfolio analytics
   */
  async getPortfolioAnalytics(): Promise<PortfolioAnalytics> {
    try {
      const response = await internalApi.get(
        API_ENDPOINTS.INTERNAL.PORTFOLIO.PERFORMANCE,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch portfolio analytics: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Portfolio analytics fetch error:', error);
      throw error;
    }
  }

  /**
   * Get buying power
   */
  async getBuyingPower(): Promise<{
    cashAvailable: number;
    dayTradingBuyingPower: number;
    regularBuyingPower: number;
    maintenanceMargin: number;
  }> {
    try {
      const response = await internalApi.get(
        '/api/trading/buying-power',
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch buying power: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Buying power fetch error:', error);
      throw error;
    }
  }

  /**
   * Validate order before placement
   */
  async validateOrder(orderRequest: OrderRequest): Promise<{
    valid: boolean;
    errors?: string[];
    estimatedCost: number;
    estimatedFees: number;
  }> {
    try {
      const response = await internalApi.post(
        '/api/trading/validate-order',
        orderRequest,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to validate order: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Order validation error:', error);
      throw error;
    }
  }

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<{
    isOpen: boolean;
    nextOpen?: string;
    nextClose?: string;
    timezone: string;
    extendedHours: boolean;
  }> {
    try {
      const response = await internalApi.get(
        '/api/trading/market-status',
        { timeout: API_TIMEOUTS.MARKET_DATA }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch market status: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Market status fetch error:', error);
      throw error;
    }
  }

  /**
   * Execute paper trading order (for demo accounts)
   */
  async executePaperTrade(orderRequest: OrderRequest): Promise<Order> {
    try {
      const response = await internalApi.post(
        '/api/trading/paper-trade',
        orderRequest,
        {
          headers: authService.getAuthHeaders(),
          timeout: API_TIMEOUTS.DEFAULT,
        }
      );

      if (!response.success) {
        throw new Error(`Failed to execute paper trade: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Paper trade execution error:', error);
      throw error;
    }
  }

  // Slide-to-execute workflow methods
  async prepareSlideOrder(orderData: Partial<Order>, options: any = {}) {
    try {
      const response = await internalApi.post('/orders/slide/prepare', {
        orderData,
        options
      });
      return response.data;
    } catch (error) {
      console.error('Slide order preparation error:', error);
      throw error;
    }
  }

  async executeSlideOrder(slideToken: string, slideData: any) {
    try {
      const response = await internalApi.post('/orders/slide/execute', {
        slideToken,
        slideData
      });
      return response.data;
    } catch (error) {
      console.error('Slide order execution error:', error);
      throw error;
    }
  }

  async cancelSlideOrder(slideToken: string) {
    try {
      const response = await internalApi.post('/orders/slide/cancel', {
        slideToken
      });
      return response.data;
    } catch (error) {
      console.error('Slide order cancellation error:', error);
      throw error;
    }
  }

  async getSlideOrderAnalytics(slideToken: string) {
    try {
      const response = await internalApi.get(`/orders/slide/analytics/${slideToken}`);
      return response.data;
    } catch (error) {
      console.error('Slide order analytics error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tradingService = new TradingService();
export { TradingService };
