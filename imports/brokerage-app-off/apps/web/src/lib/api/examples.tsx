/**
 * Example API Integration for React Components
 * This file demonstrates how to use the API utilities in your app
 */

import React, { useState, useEffect } from 'react';
import { 
  apiServices, 
  apiUtils, 
  marketDataService, 
  authService,
  type StockQuote,
  type Portfolio,
  type User,
  type RegisterRequest
} from '@/lib/api';

/**
 * Example: Stock Quote Component
 */
export function useStockQuote(symbol: string) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchQuote = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use retry logic for better reliability
        const data = await apiUtils.retryWithBackoff(
          () => marketDataService.getStockQuote(symbol),
          3 // max retries
        );
        setQuote(data as StockQuote);
      } catch (err) {
        // Format error for user display
        setError(apiUtils.formatError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [symbol]);

  return { quote, loading, error };
}

/**
 * Example: Portfolio Data Hook
 */
export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiServices.trading.getPortfolio();
      setPortfolio(data);
    } catch (err) {
      // Handle different error types
      if (apiUtils.isAuthError(err)) {
        setError('Please log in to view your portfolio');
      } else if (apiUtils.isNetworkError(err)) {
        setError('Network error. Please check your connection.');
      } else {
        setError(apiUtils.formatError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  return { portfolio, loading, error, refetch: fetchPortfolio };
}

/**
 * Example: Authentication Hook
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    setLoading(true);
    try {
      const registerData: RegisterRequest = {
        ...data,
        acceptTerms: true,
        acceptPrivacy: true,
      };
      const response = await authService.register(registerData);
      setUser(response.user);
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatError(error));
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, login, logout, register };
}

/**
 * Example: Batch Stock Quotes
 */
export function useBatchQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbols.length) return;

    const fetchBatchQuotes = async () => {
      setLoading(true);
      setError(null);

      try {
        // Create requests for each symbol
        const requests = symbols.map(symbol => 
          () => marketDataService.getStockQuote(symbol)
        );

        // Execute with concurrency control
        const results = await apiUtils.batchRequests(requests, 3);

        // Process results
        const quotesMap: Record<string, StockQuote> = {};
        results.forEach((result, index) => {
          if (!(result instanceof Error)) {
            quotesMap[symbols[index]] = result as StockQuote;
          }
        });

        setQuotes(quotesMap);
      } catch (err) {
        setError(apiUtils.formatError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchBatchQuotes();
  }, [symbols.join(',')]);

  return { quotes, loading, error };
}

/**
 * Example: Trading Actions
 */
export function useTrading() {
  const [loading, setLoading] = useState(false);

  const placeOrder = async (orderData: {
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    price?: number;
  }) => {
    setLoading(true);
    try {
      const order = await apiServices.trading.placeOrder(orderData);
      return order;
    } catch (error) {
      throw new Error(apiUtils.formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await apiServices.trading.cancelOrder(orderId);
    } catch (error) {
      throw new Error(apiUtils.formatError(error));
    } finally {
      setLoading(false);
    }
  };

  return { placeOrder, cancelOrder, loading };
}

/**
 * Example: Market Data Utilities
 */
export const marketDataUtils = {
  /**
   * Format price with proper currency
   */
  formatPrice: (price: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  },

  /**
   * Calculate price change percentage
   */
  calculateChange: (current: number, previous: number): number => {
    return ((current - previous) / previous) * 100;
  },

  /**
   * Format percentage with color indicator
   */
  formatChangePercent: (change: number): { text: string; color: string } => {
    const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    return { text: formatted, color };
  },

  /**
   * Get market status
   */
  getMarketStatus: (): 'open' | 'closed' | 'pre-market' | 'after-hours' => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Weekend
    if (day === 0 || day === 6) return 'closed';

    // Market hours (9:30 AM - 4:00 PM EST)
    if (hour >= 9.5 && hour < 16) return 'open';
    if (hour >= 4 && hour < 9.5) return 'pre-market';
    return 'after-hours';
  },
};

/**
 * Example React Component Using API Services
 */
export function StockQuoteCard({ symbol }: { symbol: string }) {
  const { quote, loading, error } = useStockQuote(symbol);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg border-red-200 bg-red-50">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!quote) return null;

  const change = quote.previousClose 
    ? marketDataUtils.calculateChange(quote.price, quote.previousClose)
    : 0;
  const changeFormat = marketDataUtils.formatChangePercent(change);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">{quote.symbol}</h3>
          <p className="text-sm text-gray-600">Stock Quote</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">
            {marketDataUtils.formatPrice(quote.price)}
          </p>
          <p className={`text-sm ${changeFormat.color}`}>
            {changeFormat.text}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>Volume: {quote.volume?.toLocaleString() || 'N/A'}</span>
        <span>Market: {marketDataUtils.getMarketStatus()}</span>
      </div>
    </div>
  );
}

/**
 * Example: Error Boundary for API Components
 */
export class ApiErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('API Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border rounded-lg border-red-200 bg-red-50">
          <h3 className="text-red-800 font-semibold">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">
            {this.state.error ? apiUtils.formatError(this.state.error) : 'An unexpected error occurred'}
          </p>
          <button
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
