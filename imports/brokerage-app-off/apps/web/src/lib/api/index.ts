/**
 * Main API Index
 * Central export point for all API services and utilities
 */

// Core API utilities
export { ApiClient, internalApi, alphaVantageApi, finnhubApi, yahooFinanceApi, newsApi, stripeApi, openaiApi } from './client';
export type { RequestConfig, ApiResponse } from './client';

// Configuration and constants
export { API_CONFIG, API_HEADERS, API_ENDPOINTS, API_TIMEOUTS, API_ERRORS, RATE_LIMITS } from './config';

// Authentication services
export { authService, AuthService } from './auth';
export type {
  User,
  UserPreferences,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from './auth';

// Market data services
export { marketDataService, MarketDataService } from './market-data';
export type {
  StockQuote,
  CandleData,
  CompanyProfile,
  NewsItem,
} from './market-data';

// Payment services
export { paymentService, PaymentService } from './payments';
export type {
  PaymentMethod,
  Transaction,
  PaymentIntent,
  DepositRequest,
  WithdrawalRequest,
} from './payments';

// Trading services
export { tradingService, TradingService } from './trading';
export type {
  Order,
  Position,
  Portfolio,
  OrderRequest,
  TradeExecution,
  PortfolioAnalytics,
} from './trading';

// Import services for internal use
import { authService } from './auth';
import { marketDataService } from './market-data';
import { paymentService } from './payments';
import { tradingService } from './trading';
import { API_CONFIG, API_ENDPOINTS, API_TIMEOUTS } from './config';
import { internalApi, alphaVantageApi, finnhubApi, yahooFinanceApi, newsApi, stripeApi, openaiApi } from './client';

/**
 * API Service Collections for Easy Access
 */
export const apiServices = {
  auth: authService,
  marketData: marketDataService,
  payments: paymentService,
  trading: tradingService,
} as const;

/**
 * API Utilities and Helpers
 */
export const apiUtils = {
  /**
   * Format API error for user display
   */
  formatError: (error: any): string => {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  },

  /**
   * Check if error is network related
   */
  isNetworkError: (error: any): boolean => {
    return error?.code === 'NETWORK_ERROR' || 
           error?.message?.includes('Network') ||
           error?.message?.includes('fetch');
  },

  /**
   * Check if error is authentication related
   */
  isAuthError: (error: any): boolean => {
    return error?.status === 401 || 
           error?.code === 'UNAUTHORIZED' ||
           error?.message?.includes('Authentication');
  },

  /**
   * Check if error is rate limit related
   */
  isRateLimitError: (error: any): boolean => {
    return error?.status === 429 || 
           error?.code === 'RATE_LIMIT_ERROR' ||
           error?.message?.includes('rate limit');
  },

  /**
   * Check if error has status code
   */
  hasStatusCode: (error: any): error is { status: number } => {
    return typeof error?.status === 'number';
  },

  /**
   * Retry function with exponential backoff
   */
  retryWithBackoff: async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Don't retry auth errors or client errors (4xx)
        if (apiUtils.isAuthError(error) || 
            (apiUtils.hasStatusCode(error) && error.status >= 400 && error.status < 500)) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  },

  /**
   * Batch API requests with concurrency control
   */
  batchRequests: async <T>(
    requests: Array<() => Promise<T>>,
    concurrency: number = 5
  ): Promise<Array<T | Error>> => {
    const results: Array<T | Error> = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchPromises = batch.map(request => 
        request().catch(error => error as Error)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  },

  /**
   * Create abort controller with timeout
   */
  createTimeoutController: (timeoutMs: number): AbortController => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller;
  },
} as const;

/**
 * API Hooks for React Components (if using React)
 */
export const createApiHooks = () => {
  // These would be implemented using React hooks like useState, useEffect, etc.
  // This is a placeholder for potential React integration
  
  return {
    /**
     * Hook for authenticated API requests
     */
    useAuthenticatedRequest: <T>(
      requestFn: () => Promise<T>,
      dependencies: any[] = []
    ) => {
      // Implementation would go here
      // This is just a type-safe placeholder
      return {
        data: null as T | null,
        loading: false,
        error: null as Error | null,
        refetch: () => Promise.resolve(),
      };
    },

    /**
     * Hook for market data with real-time updates
     */
    useMarketData: (symbol: string) => {
      // Implementation would go here
      return {
        quote: null,
        loading: false,
        error: null as Error | null,
      };
    },

    /**
     * Hook for portfolio data
     */
    usePortfolio: () => {
      // Implementation would go here
      return {
        portfolio: null,
        loading: false,
        error: null as Error | null,
        refetch: () => Promise.resolve(),
      };
    },
  };
};

/**
 * Environment-specific API configurations
 */
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      enableLogging: true,
      enableMocking: true,
      defaultTimeout: API_TIMEOUTS.DEFAULT,
      rateLimitWarnings: true,
    },
    
    staging: {
      enableLogging: true,
      enableMocking: false,
      defaultTimeout: API_TIMEOUTS.DEFAULT,
      rateLimitWarnings: true,
    },
    
    production: {
      enableLogging: false,
      enableMocking: false,
      defaultTimeout: API_TIMEOUTS.DEFAULT * 0.8, // Slightly shorter timeout in prod
      rateLimitWarnings: false,
    },
  };
  
  return configs[env as keyof typeof configs] || configs.development;
};

/**
 * Default export with all services
 */
export default {
  services: apiServices,
  utils: apiUtils,
  config: API_CONFIG,
  endpoints: API_ENDPOINTS,
  client: {
    internal: internalApi,
    alphaVantage: alphaVantageApi,
    finnhub: finnhubApi,
    yahooFinance: yahooFinanceApi,
    news: newsApi,
    stripe: stripeApi,
    openai: openaiApi,
  },
} as const;
