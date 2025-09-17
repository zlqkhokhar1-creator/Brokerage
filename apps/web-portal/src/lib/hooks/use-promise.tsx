'use client';

import { use, Suspense } from 'react';

// React 19 use() hook for promises
export function usePromise<T>(promise: Promise<T>): T {
  return use(promise);
}

// Trading data promise hook
export function useTradingData(symbol: string) {
  const promise = fetch(`/api/trading/${symbol}`)
    .then(res => res.json())
    .then(data => ({
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      timestamp: new Date().toISOString(),
    }));
  
  return usePromise(promise);
}

// Portfolio data promise hook
export function usePortfolioData() {
  const promise = fetch('/api/portfolio')
    .then(res => res.json())
    .then(data => ({
      totalValue: data.totalValue,
      dayChange: data.dayChange,
      dayChangePercent: data.dayChangePercent,
      holdings: data.holdings,
      lastUpdated: new Date().toISOString(),
    }));
  
  return usePromise(promise);
}

// Wrapper component for Suspense boundaries
export function TradingDataProvider({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode; 
  fallback: React.ReactNode; 
}) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}
