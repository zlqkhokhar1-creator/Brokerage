import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * HTTP client configuration for legacy backend integration
 */
export interface LegacyHttpClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * HTTP client helper for legacy backend integration
 * Provides consistent configuration and error handling for legacy API calls
 */
export class LegacyHttpClient {
  private client: AxiosInstance;

  constructor(config: LegacyHttpClientConfig = {}) {
    const baseUrl = config.baseUrl || process.env.LEGACY_BASE_URL || 'http://localhost:5001';
    
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'legacy-adapter/0.1.0',
        ...config.headers,
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log({
          method: config.method?.toUpperCase(),
          url: `${config.baseURL}${config.url}`,
          headers: config.headers,
        }, 'Legacy HTTP Request');
        return config;
      },
      (error) => {
        console.error('Legacy HTTP Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log({
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          duration: response.headers['x-response-time'] || 'unknown',
        }, 'Legacy HTTP Response');
        return response;
      },
      (error) => {
        console.error({
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
        }, 'Legacy HTTP Response Error');
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get the underlying Axios instance
   */
  getInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * POST request to legacy backend
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  /**
   * GET request to legacy backend
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  /**
   * PUT request to legacy backend
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  /**
   * DELETE request to legacy backend
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

/**
 * Factory function to create HTTP client with environment-based configuration
 */
export function createLegacyHttpClient(config: LegacyHttpClientConfig = {}): LegacyHttpClient {
  return new LegacyHttpClient(config);
}