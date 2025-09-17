import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { baseURL } from '@/src/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Quote = {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp?: string;
};

type MarketSocketContextValue = {
  isConnected: boolean;
  quotes: Record<string, Quote>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  setSymbols: (symbols: string[]) => void;
};

const MarketSocketContext = createContext<MarketSocketContextValue | undefined>(undefined);

async function deriveWebSocketUrl(): Promise<string | null> {
  const explicit = process.env.EXPO_PUBLIC_WS_URL;
  if (explicit) return explicit;
  if (!baseURL) return null;
  try {
    const httpUrl = new URL(baseURL);
    const protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = await AsyncStorage.getItem('authToken');
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${protocol}//${httpUrl.host}/ws/market-data${tokenParam}`;
  } catch (_err) {
    return null;
  }
}

export function MarketSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const desiredSymbolsRef = useRef<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await deriveWebSocketUrl();
      if (!cancelled) setWsUrl(u);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback((payload: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    symbols.forEach((s) => desiredSymbolsRef.current.add(s.toUpperCase()));
    send({ type: 'subscribe', symbols: symbols.map((s) => s.toUpperCase()) });
  }, [send]);

  const unsubscribe = useCallback((symbols: string[]) => {
    symbols.forEach((s) => desiredSymbolsRef.current.delete(s.toUpperCase()));
    send({ type: 'unsubscribe', symbols: symbols.map((s) => s.toUpperCase()) });
  }, [send]);

  const setSymbols = useCallback((symbols: string[]) => {
    desiredSymbolsRef.current = new Set(symbols.map((s) => s.toUpperCase()));
    send({ type: 'subscribe', symbols: Array.from(desiredSymbolsRef.current) });
  }, [send]);

  useEffect(() => {
    if (!wsUrl) return;

    let cancelled = false;

    const connect = () => {
      const urlWithToken = wsUrl; // Token can be embedded if backend expects it, e.g., `?token=...`
      const ws = new WebSocket(urlWithToken);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        // Resubscribe desired symbols
        const symbols = Array.from(desiredSymbolsRef.current);
        if (symbols.length > 0) {
          send({ type: 'subscribe', symbols });
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'market_data' && data.symbol) {
            setQuotes((prev) => ({
              ...prev,
              [data.symbol]: {
                symbol: data.symbol,
                ...data.data,
                timestamp: data.timestamp,
              },
            }));
          }
        } catch (_err) {
          // ignore
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setIsConnected(false);
        // Exponential backoff up to ~10s
        const attempt = ++reconnectAttemptsRef.current;
        const delay = Math.min(10000, 500 * Math.pow(2, attempt));
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // let onclose handle reconnection
      };
    };

    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [wsUrl, send]);

  const value = useMemo(() => ({ isConnected, quotes, subscribe, unsubscribe, setSymbols }), [isConnected, quotes, subscribe, unsubscribe, setSymbols]);

  return (
    <MarketSocketContext.Provider value={value}>{children}</MarketSocketContext.Provider>
  );
}

export function useMarketSocket() {
  const ctx = useContext(MarketSocketContext);
  if (!ctx) throw new Error('useMarketSocket must be used within MarketSocketProvider');
  return ctx;
}

