/**
 * Market Data API Services
 * Centralized market data functions for stocks, crypto, and financial instruments
 */

import { alphaVantageApi, finnhubApi, yahooFinanceApi } from './client';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUTS } from './config';

// Types for market data
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  marketCap?: number;
  timestamp: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  employees?: number;
  website?: string;
  logo?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  symbols?: string[];
}

export interface MarketOverview {
  markets: any;
  topGainers: any[];
  topLosers: any[];
}

/**
 * Market Data Service Class
 */
class MarketDataService {
  /**
   * Get real-time stock quote
   */
  async getStockQuote(symbol: string, provider: 'alpha_vantage' | 'finnhub' | 'yahoo' = 'finnhub'): Promise<StockQuote> {
    try {
      switch (provider) {
        case 'finnhub':
          return await this.getFinnhubQuote(symbol);
        case 'alpha_vantage':
          return await this.getAlphaVantageQuote(symbol);
        case 'yahoo':
          return await this.getYahooQuote(symbol);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical candle data
   */
  async getCandleData(
    symbol: string,
    from: Date,
    to: Date,
    resolution: 'D' | '1' | '5' | '15' | '30' | '60' = 'D'
  ): Promise<CandleData[]> {
    try {
      const fromTimestamp = Math.floor(from.getTime() / 1000);
      const toTimestamp = Math.floor(to.getTime() / 1000);
      
      const endpoint = API_ENDPOINTS.MARKET_DATA.FINNHUB.CANDLES(symbol, fromTimestamp, toTimestamp, resolution);
      const response = await finnhubApi.rateLimitedRequest('FINNHUB', endpoint, {
        headers: API_HEADERS.FINNHUB,
        timeout: API_TIMEOUTS.MARKET_DATA,
      });

      if (!response.success || !response.data) {
        throw new Error(`Failed to fetch candle data: ${response.error}`);
      }

      const data = response.data;
      if (data.s !== 'ok') {
        throw new Error('No data available for the specified period');
      }

      return data.t.map((timestamp: number, index: number) => ({
        timestamp: timestamp * 1000, // Convert to milliseconds
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: data.c[index],
        volume: data.v[index],
      }));
    } catch (error) {
      console.error(`Error fetching candle data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    try {
      const endpoint = API_ENDPOINTS.MARKET_DATA.FINNHUB.PROFILE(symbol);
      const response = await finnhubApi.rateLimitedRequest('FINNHUB', endpoint, {
        headers: API_HEADERS.FINNHUB,
        timeout: API_TIMEOUTS.MARKET_DATA,
      });

      if (!response.success || !response.data) {
        throw new Error(`Failed to fetch company profile: ${response.error}`);
      }

      const data = response.data;
      return {
        symbol,
        name: data.name || symbol,
        description: data.description,
        sector: data.finnhubIndustry,
        industry: data.gsubind,
        marketCap: data.marketCapitalization,
        employees: data.employeeTotal,
        website: data.weburl,
        logo: data.logo,
      };
    } catch (error) {
      console.error(`Error fetching company profile for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get market news
   */
  async getMarketNews(symbol?: string, limit: number = 10): Promise<NewsItem[]> {
    try {
      let endpoint: string;
      
      if (symbol) {
        endpoint = API_ENDPOINTS.MARKET_DATA.FINNHUB.NEWS(symbol);
      } else {
        // Use general news endpoint - you might want to add this to config
        endpoint = '/news?category=general';
      }

      const response = await finnhubApi.rateLimitedRequest('FINNHUB', endpoint, {
        headers: API_HEADERS.FINNHUB,
        timeout: API_TIMEOUTS.MARKET_DATA,
      });

      if (!response.success || !response.data) {
        throw new Error(`Failed to fetch news: ${response.error}`);
      }

      return response.data.slice(0, limit).map((item: any) => ({
        id: item.id?.toString() || `${item.headline}-${item.datetime}`,
        title: item.headline,
        summary: item.summary,
        url: item.url,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        source: item.source,
        symbols: item.related ? [item.related] : symbol ? [symbol] : [],
      }));
    } catch (error) {
      console.error('Error fetching market news:', error);
      throw error;
    }
  }

  /**
   * Search for stocks/symbols
   */
  async searchSymbols(query: string): Promise<Array<{ symbol: string; name: string; type: string }>> {
    try {
      const endpoint = `/search?q=${encodeURIComponent(query)}`;
      const response = await finnhubApi.rateLimitedRequest('FINNHUB', endpoint, {
        headers: API_HEADERS.FINNHUB,
        timeout: API_TIMEOUTS.MARKET_DATA,
      });

      if (!response.success || !response.data) {
        throw new Error(`Failed to search symbols: ${response.error}`);
      }

      return response.data.result?.map((item: any) => ({
        symbol: item.symbol,
        name: item.description,
        type: item.type,
      })) || [];
    } catch (error) {
      console.error('Error searching symbols:', error);
      throw error;
    }
  }

  // Private methods for different providers
  private async getFinnhubQuote(symbol: string): Promise<StockQuote> {
    const endpoint = API_ENDPOINTS.MARKET_DATA.FINNHUB.QUOTE(symbol);
    const response = await finnhubApi.rateLimitedRequest('FINNHUB', endpoint, {
      headers: API_HEADERS.FINNHUB,
      timeout: API_TIMEOUTS.MARKET_DATA,
    });

    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch Finnhub quote: ${response.error}`);
    }

    const data = response.data;
    return {
      symbol,
      price: data.c || 0,
      change: data.d || 0,
      changePercent: data.dp || 0,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: Date.now(),
    };
  }

  private async getAlphaVantageQuote(symbol: string): Promise<StockQuote> {
    const endpoint = API_ENDPOINTS.MARKET_DATA.ALPHA_VANTAGE.QUOTE(symbol);
    const response = await alphaVantageApi.rateLimitedRequest('ALPHA_VANTAGE', endpoint, {
      timeout: API_TIMEOUTS.MARKET_DATA,
    });

    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch Alpha Vantage quote: ${response.error}`);
    }

    const quote = response.data['Global Quote'];
    if (!quote) {
      throw new Error('Invalid response format from Alpha Vantage');
    }

    return {
      symbol,
      price: parseFloat(quote['05. price']) || 0,
      change: parseFloat(quote['09. change']) || 0,
      changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      open: parseFloat(quote['02. open']),
      previousClose: parseFloat(quote['08. previous close']),
      volume: parseInt(quote['06. volume']),
      timestamp: Date.now(),
    };
  }

  private async getYahooQuote(symbol: string): Promise<StockQuote> {
    const endpoint = API_ENDPOINTS.MARKET_DATA.YAHOO_FINANCE.QUOTE(symbol);
    const response = await yahooFinanceApi.get(endpoint, {
      timeout: API_TIMEOUTS.MARKET_DATA,
    });

    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch Yahoo quote: ${response.error}`);
    }

    const result = response.data.chart?.result?.[0];
    if (!result) {
      throw new Error('Invalid response format from Yahoo Finance');
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    return {
      symbol,
      price: meta.regularMarketPrice || 0,
      change: (meta.regularMarketPrice - meta.previousClose) || 0,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100) || 0,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: quote?.open?.[0] || meta.regularMarketPrice,
      previousClose: meta.previousClose,
      volume: meta.regularMarketVolume,
      marketCap: meta.marketCap,
      timestamp: Date.now(),
    };
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
export { MarketDataService };

/**
 * Get market overview with top movers, indices, etc.
 */
export const getMarketOverview = async (): Promise<MarketOverview> => {
  try {
    // For now, return a simplified overview since the specific endpoints aren't configured
    // You can add these endpoints to the config file if needed
    const mockOverview: MarketOverview = {
      markets: {
        status: 'open',
        indices: [
          { symbol: '^GSPC', name: 'S&P 500', price: 4500, change: 15.2, changePercent: 0.34 },
          { symbol: '^DJI', name: 'Dow Jones', price: 35000, change: 120.5, changePercent: 0.35 },
          { symbol: '^IXIC', name: 'NASDAQ', price: 14000, change: 45.8, changePercent: 0.33 },
        ]
      },
      topGainers: [],
      topLosers: []
    };

    // Try to get real data if available
    try {
      // You can implement real market status and movers here when endpoints are available
      // const statusResponse = await finnhubApi.rateLimitedRequest('FINNHUB', '/stock/market-status', {
      //   headers: API_HEADERS.FINNHUB,
      //   timeout: API_TIMEOUTS.MARKET_DATA,
      // });
      
      return mockOverview;
    } catch (error) {
      console.warn('Using mock data for market overview:', error);
      return mockOverview;
    }
  } catch (error) {
    console.error('Error fetching market overview:', error);
    throw error;
  }
};
