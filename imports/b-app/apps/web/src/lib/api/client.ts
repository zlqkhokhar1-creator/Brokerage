/**
 * Core API Client with Request Handling, Error Management, and Rate Limiting
 * Centralized HTTP client for all API communications
 */

import { API_CONFIG, API_HEADERS, API_TIMEOUTS, API_ERRORS, RATE_LIMITS } from './config';

/**
 * Request Configuration Interface
 */
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: RequestCache;
  signal?: AbortSignal;
}

/**
 * API Response Interface
 */
interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  success: boolean;
  error?: string;
}

/**
 * Rate Limiter Class
 */
class RateLimiter {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  canMakeRequest(apiKey: string): boolean {
    const limit = RATE_LIMITS[apiKey as keyof typeof RATE_LIMITS];
    if (!limit) return true;

    const now = Date.now();
    const record = this.requestCounts.get(apiKey);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(apiKey, {
        count: 1,
        resetTime: now + limit.window,
      });
      return true;
    }

    if (record.count >= limit.requests) {
      return false;
    }

    record.count++;
    return true;
  }

  getWaitTime(apiKey: string): number {
    const record = this.requestCounts.get(apiKey);
    if (!record) return 0;
    return Math.max(0, record.resetTime - Date.now());
  }
}

/**
 * Main API Client Class
 */
class ApiClient {
  private rateLimiter = new RateLimiter();
  private baseURL: string;

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Generic request method with error handling and retries
   */
  async request<T = any>(
    url: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = API_TIMEOUTS.DEFAULT,
      retries = 2,
      cache = 'default',
      signal,
    } = config;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine signals if provided
    const combinedSignal = signal 
      ? this.combineAbortSignals([signal, controller.signal])
      : controller.signal;

    try {
      const response = await fetch(this.buildUrl(url), {
        method,
        headers: {
          ...API_HEADERS.DEFAULT,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: combinedSignal,
        cache,
      });

      clearTimeout(timeoutId);

      const responseData = await this.parseResponse(response);

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        success: response.ok,
        error: response.ok ? undefined : this.getErrorMessage(response.status),
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(API_ERRORS.TIMEOUT_ERROR);
      }

      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(1000); // Wait 1 second before retry
        return this.request<T>(url, { ...config, retries: retries - 1 });
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'POST', body: data });
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PUT', body: data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PATCH', body: data });
  }

  /**
   * Rate-limited request for external APIs
   */
  async rateLimitedRequest<T = any>(
    apiKey: keyof typeof RATE_LIMITS,
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    if (!this.rateLimiter.canMakeRequest(apiKey)) {
      const waitTime = this.rateLimiter.getWaitTime(apiKey);
      throw new Error(`${API_ERRORS.RATE_LIMIT_ERROR} Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    return this.request<T>(url, config);
  }

  /**
   * Batch request handler
   */
  async batchRequest<T = any>(
    requests: Array<{ url: string; config?: RequestConfig }>,
    concurrency = 5
  ): Promise<Array<ApiResponse<T>>> {
    const results: Array<ApiResponse<T>> = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchPromises = batch.map(({ url, config }) => 
        this.request<T>(url, config).catch(error => ({
          data: null as T,
          status: 0,
          statusText: 'Request Failed',
          headers: new Headers(),
          success: false,
          error: error.message,
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Build full URL
   */
  private buildUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    return `${this.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    if (contentType?.includes('text/')) {
      return response.text();
    }
    
    return response.blob();
  }

  /**
   * Get appropriate error message based on status code
   */
  private getErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return API_ERRORS.INVALID_DATA;
      case 401:
        return API_ERRORS.UNAUTHORIZED;
      case 403:
        return API_ERRORS.FORBIDDEN;
      case 404:
        return API_ERRORS.NOT_FOUND;
      case 429:
        return API_ERRORS.RATE_LIMIT_ERROR;
      case 500:
      case 502:
      case 503:
      case 504:
        return API_ERRORS.SERVER_ERROR;
      default:
        return `Request failed with status ${status}`;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true; // Network error
    }
    
    if (error.status >= 500) {
      return true; // Server error
    }
    
    return false;
  }

  /**
   * Combine multiple AbortSignals
   */
  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    
    return controller.signal;
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instances for different APIs
export const internalApi = new ApiClient(API_CONFIG.BASE_URL);
export const alphaVantageApi = new ApiClient(API_CONFIG.ALPHA_VANTAGE.BASE_URL);
export const finnhubApi = new ApiClient(API_CONFIG.FINNHUB.BASE_URL);
export const yahooFinanceApi = new ApiClient(API_CONFIG.YAHOO_FINANCE.BASE_URL);
export const newsApi = new ApiClient(API_CONFIG.NEWS_API.BASE_URL);
export const stripeApi = new ApiClient(API_CONFIG.STRIPE.BASE_URL);
export const openaiApi = new ApiClient(API_CONFIG.OPENAI.BASE_URL);

// Export the main ApiClient class for custom instances
export { ApiClient };
export type { RequestConfig, ApiResponse };
