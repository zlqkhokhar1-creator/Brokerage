export interface NumericRange {
  min: number;
  max: number;
}

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio?: number;
  sector: string;
  exchange: string;
  volume: number;
  yearHigh: number;
  yearLow: number;
}

export interface PresetScreen {
  name: string;
  description: string;
  filters: Partial<StockFilters>;
}

export type FilterChangeHandler = <K extends keyof StockFilters>(
  key: K,
  value: StockFilters[K]
) => void;

export interface StockScreenerResponse {
  data: StockData[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterPanelProps {
  filters: StockFilters;
  sectors: readonly string[];
  exchanges: readonly string[];
  onFilterChange: FilterChangeHandler;
  onReset: () => void;
}

export interface StockCardProps {
  stock: StockData;
  onSave?: (symbol: string) => void;
  isSaved?: boolean;
}

export interface ResultsListProps {
  results: StockData[];
  loading: boolean;
  totalResults: number;
  onSave: (symbol: string) => void;
  savedScreens: string[];
  onRefresh: () => void;
}

export const SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive', 'Energy',
  'Utilities', 'Real Estate', 'Basic Materials'
] as const;

export const EXCHANGES = ['NYSE', 'NASDAQ', 'AMEX'] as const;

export type Sector = typeof SECTORS[number];
export type Exchange = typeof EXCHANGES[number];

export interface StockFilters {
  marketCap: NumericRange;
  pe: NumericRange;
  dividend: NumericRange;
  volume: NumericRange;
  sector: string;
  exchange: string;
}
