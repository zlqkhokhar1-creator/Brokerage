// API Client
export { apiClient } from './api-client';

// Hooks
export * from './hooks/use-portfolio';
export * from './hooks/use-pnl-stream';

// Stores
export * from './store/theme-store';

// Types
export interface Portfolio {
  id: string;
  totalValue: number;
  cash: number;
  positions: Position[];
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  type: 'market' | 'limit' | 'stop';
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  createdAt: string;
  filledAt?: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoboAdvisorProfile {
  id: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentGoals: string[];
  timeHorizon: number; // in years
  monthlyContribution: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KycStatus {
  status: 'pending' | 'approved' | 'rejected' | 'not_started';
  documents: {
    id: string;
    type: string;
    status: 'pending' | 'approved' | 'rejected';
    uploadedAt: string;
  }[];
  completedAt?: string;
}

export interface UserSettings {
  id: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  trading: {
    confirmOrders: boolean;
    defaultOrderType: 'market' | 'limit';
  };
  display: {
    theme: 'light' | 'dark';
    currency: string;
    dateFormat: string;
  };
}
