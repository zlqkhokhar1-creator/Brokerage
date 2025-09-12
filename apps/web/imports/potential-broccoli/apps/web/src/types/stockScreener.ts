// Core stock data types
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  sector: string;
  exchange: string;
  industry: string;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  rsi: number;
  volumeAvg: number;
  eps: number;
  beta: number;
}

// Filter types
export interface NumericRange {
  min: number;
  max: number;
}

export interface StockFilters {
  marketCap: NumericRange;
  pe: NumericRange;
  dividend: NumericRange;
  volume: NumericRange;
  sector: string;
  exchange: string;
  price: NumericRange;
  beta: NumericRange;
  rsi: NumericRange;
}

// API response type
export interface StockScreenerResponse {
  data: {
    results: StockData[];
    total: number;
    page: number;
    limit: number;
  };
}

// Preset screen type
export interface PresetScreen {
  name: string;
  description: string;
  filters: Partial<StockFilters>;
}
