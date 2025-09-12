import { create } from 'zustand';

export type WatchlistItem = {
  symbol: string;
  displayName?: string;
};

type WatchlistState = {
  items: WatchlistItem[];
  addSymbol: (symbol: string, displayName?: string) => void;
  removeSymbol: (symbol: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  set: (items: WatchlistItem[]) => void;
};

const defaultSymbols: WatchlistItem[] = [
  { symbol: 'AAPL', displayName: 'Apple' },
  { symbol: 'MSFT', displayName: 'Microsoft' },
  { symbol: 'NVDA', displayName: 'NVIDIA' },
  { symbol: 'TSLA', displayName: 'Tesla' },
  { symbol: 'GOOGL', displayName: 'Alphabet' },
];

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: defaultSymbols,
  addSymbol: (symbol: string, displayName?: string) => {
    const existing = get().items.find((item) => item.symbol === symbol.toUpperCase());
    if (existing) return;
    set({ items: [...get().items, { symbol: symbol.toUpperCase(), displayName }] });
  },
  removeSymbol: (symbol: string) => {
    set({ items: get().items.filter((i) => i.symbol !== symbol.toUpperCase()) });
  },
  reorder: (fromIndex: number, toIndex: number) => {
    const items = [...get().items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    set({ items });
  },
  set: (items: WatchlistItem[]) => set({ items }),
}));

