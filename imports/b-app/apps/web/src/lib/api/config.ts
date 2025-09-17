/**
 * API Configuration and Base Settings
 * Centralized configuration for all external APIs
 */

export const API_CONFIG = {
  // Base URLs
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  
  // Market Data APIs
  ALPHA_VANTAGE: {
    BASE_URL: 'https://www.alphavantage.co/query',
    API_KEY: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'demo',
    RATE_LIMIT: 5, // requests per minute for free tier
  },
  
  FINNHUB: {
    BASE_URL: 'https://finnhub.io/api/v1',
    API_KEY: process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'demo',
    RATE_LIMIT: 60, // requests per minute for free tier
  },
  
  YAHOO_FINANCE: {
    BASE_URL: 'https://query1.finance.yahoo.com/v8/finance',
    RATE_LIMIT: 2000, // requests per hour
  },
  
  // Payment Gateways
  STRIPE: {
    PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    BASE_URL: 'https://api.stripe.com/v1',
  },
  
  PAYPAL: {
    CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    BASE_URL: process.env.NODE_ENV === 'production' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com',
  },
  
  // Banking/Financial APIs
  PLAID: {
    CLIENT_ID: process.env.NEXT_PUBLIC_PLAID_CLIENT_ID,
    PUBLIC_KEY: process.env.NEXT_PUBLIC_PLAID_PUBLIC_KEY,
    BASE_URL: process.env.NODE_ENV === 'production'
      ? 'https://production.plaid.com'
      : 'https://sandbox.plaid.com',
  },
  
  // News APIs
  NEWS_API: {
    BASE_URL: 'https://newsapi.org/v2',
    API_KEY: process.env.NEXT_PUBLIC_NEWS_API_KEY,
  },
  
  ALPHA_VANTAGE_NEWS: {
    BASE_URL: 'https://www.alphavantage.co/query',
    API_KEY: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'demo',
  },
  
  // Social Trading APIs
  ETORO_API: {
    BASE_URL: 'https://api.etoro.com/sapi/v1',
    API_KEY: process.env.NEXT_PUBLIC_ETORO_API_KEY,
  },
  
  // KYC/Identity Verification
  JUMIO: {
    BASE_URL: 'https://netverify.com/api/netverify/v2',
    API_TOKEN: process.env.JUMIO_API_TOKEN,
    API_SECRET: process.env.JUMIO_API_SECRET,
  },
  
  // Notifications
  SENDGRID: {
    API_KEY: process.env.SENDGRID_API_KEY,
    BASE_URL: 'https://api.sendgrid.com/v3',
  },
  
  TWILIO: {
    ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    BASE_URL: 'https://api.twilio.com/2010-04-01',
  },
  
  // Analytics
  MIXPANEL: {
    PROJECT_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
    API_SECRET: process.env.MIXPANEL_API_SECRET,
  },
  
  // AI/ML APIs
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY,
    BASE_URL: 'https://api.openai.com/v1',
  },
  
  // Crypto APIs
  COINBASE: {
    BASE_URL: 'https://api.coinbase.com/v2',
    API_KEY: process.env.COINBASE_API_KEY,
    API_SECRET: process.env.COINBASE_API_SECRET,
  },
  
  BINANCE: {
    BASE_URL: 'https://api.binance.com/api/v3',
    API_KEY: process.env.BINANCE_API_KEY,
    API_SECRET: process.env.BINANCE_API_SECRET,
  },
} as const;

/**
 * API Request Headers
 */
export const API_HEADERS = {
  DEFAULT: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  ALPHA_VANTAGE: {
    'Content-Type': 'application/json',
  },
  
  FINNHUB: {
    'Content-Type': 'application/json',
    'X-Finnhub-Token': API_CONFIG.FINNHUB.API_KEY,
  },
  
  STRIPE: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.STRIPE.PUBLIC_KEY}`,
  },
  
  NEWS_API: {
    'Content-Type': 'application/json',
    'X-API-Key': API_CONFIG.NEWS_API.API_KEY,
  },
  
  SENDGRID: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.SENDGRID.API_KEY}`,
  },
  
  OPENAI: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.OPENAI.API_KEY}`,
  },
} as const;

/**
 * API Endpoints Configuration
 */
export const API_ENDPOINTS = {
  // Internal Backend APIs
  INTERNAL: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      REFRESH: '/api/auth/refresh',
      PROFILE: '/api/auth/profile',
    },
    PORTFOLIO: {
      GET: '/api/portfolio',
      UPDATE: '/api/portfolio',
      HISTORY: '/api/portfolio/history',
      PERFORMANCE: '/api/portfolio/performance',
    },
    TRADING: {
      ORDERS: '/api/trading/orders',
      EXECUTE: '/api/trading/execute',
      HISTORY: '/api/trading/history',
      POSITIONS: '/api/trading/positions',
    },
    PAYMENTS: {
      DEPOSIT: '/api/payments/deposit',
      WITHDRAW: '/api/payments/withdraw',
      HISTORY: '/api/payments/history',
      METHODS: '/api/payments/methods',
    },
    KYC: {
      SUBMIT: '/api/kyc/submit',
      STATUS: '/api/kyc/status',
      DOCUMENTS: '/api/kyc/documents',
    },
  },
  
  // Market Data APIs
  MARKET_DATA: {
    ALPHA_VANTAGE: {
      QUOTE: (symbol: string) => `?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_CONFIG.ALPHA_VANTAGE.API_KEY}`,
      INTRADAY: (symbol: string, interval = '5min') => `?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${API_CONFIG.ALPHA_VANTAGE.API_KEY}`,
      DAILY: (symbol: string) => `?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_CONFIG.ALPHA_VANTAGE.API_KEY}`,
      NEWS: (symbol: string) => `?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${API_CONFIG.ALPHA_VANTAGE.API_KEY}`,
    },
    
    FINNHUB: {
      QUOTE: (symbol: string) => `/quote?symbol=${symbol}`,
      CANDLES: (symbol: string, from: number, to: number, resolution = 'D') => 
        `/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`,
      NEWS: (symbol: string) => `/company-news?symbol=${symbol}&from=${new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}`,
      PROFILE: (symbol: string) => `/stock/profile2?symbol=${symbol}`,
      METRICS: (symbol: string) => `/stock/metric?symbol=${symbol}&metric=all`,
    },
    
    YAHOO_FINANCE: {
      QUOTE: (symbol: string) => `/chart/${symbol}`,
      SEARCH: (query: string) => `/search?q=${query}`,
    },
  },
  
  // Payment APIs
  PAYMENTS: {
    STRIPE: {
      PAYMENT_INTENTS: '/payment_intents',
      CUSTOMERS: '/customers',
      PAYMENT_METHODS: '/payment_methods',
    },
    
    PAYPAL: {
      ORDERS: '/v2/checkout/orders',
      PAYMENTS: '/v2/payments',
    },
  },
  
  // News APIs
  NEWS: {
    NEWS_API: {
      EVERYTHING: '/everything',
      TOP_HEADLINES: '/top-headlines',
    },
  },
  
  // Notifications
  NOTIFICATIONS: {
    SENDGRID: {
      SEND: '/mail/send',
    },
    
    TWILIO: {
      MESSAGES: '/Messages.json',
    },
  },
  
  // AI APIs
  AI: {
    OPENAI: {
      CHAT: '/chat/completions',
      EMBEDDINGS: '/embeddings',
    },
  },
  
  // Crypto APIs
  CRYPTO: {
    COINBASE: {
      EXCHANGE_RATES: '/exchange-rates',
      PRICES: '/prices',
    },
    
    BINANCE: {
      TICKER: '/ticker/24hr',
      KLINES: '/klines',
    },
  },
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMITS = {
  ALPHA_VANTAGE: {
    requests: 5,
    window: 60000, // 1 minute
  },
  FINNHUB: {
    requests: 60,
    window: 60000, // 1 minute
  },
  NEWS_API: {
    requests: 1000,
    window: 86400000, // 24 hours
  },
  STRIPE: {
    requests: 100,
    window: 1000, // 1 second
  },
} as const;

/**
 * Error Messages
 */
export const API_ERRORS = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  RATE_LIMIT_ERROR: 'Rate limit exceeded. Please wait before making another request.',
  UNAUTHORIZED: 'Authentication required. Please log in.',
  FORBIDDEN: 'Access denied. Insufficient permissions.',
  NOT_FOUND: 'Requested resource not found.',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  INVALID_DATA: 'Invalid data provided. Please check your input.',
  API_KEY_INVALID: 'Invalid API key. Please check your configuration.',
  QUOTA_EXCEEDED: 'API quota exceeded. Please upgrade your plan.',
} as const;

/**
 * Default Request Timeouts (in milliseconds)
 */
export const API_TIMEOUTS = {
  DEFAULT: 10000,      // 10 seconds
  MARKET_DATA: 5000,   // 5 seconds for real-time data
  PAYMENTS: 30000,     // 30 seconds for payment processing
  FILE_UPLOAD: 60000,  // 60 seconds for file uploads
  LONG_RUNNING: 120000, // 2 minutes for complex operations
} as const;
