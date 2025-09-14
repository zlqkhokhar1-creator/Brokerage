"use client";
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from '@/components/MotionWrappers';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useSWR from 'swr';
import { internalApi } from '@/lib/api/client';

interface Security {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto' | 'bond';
  price: number;
  changePercent: number;
}

const mockSecurities: Security[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', price: 175.43, changePercent: 1.2 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', price: 2847.63, changePercent: 0.8 },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', price: 248.42, changePercent: -0.5 },
  { symbol: 'BTC-USD', name: 'Bitcoin', type: 'crypto', price: 65000, changePercent: 3.1 },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf', price: 450.75, changePercent: 0.4 },
];

// Create a fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await internalApi.get(url);
  return response.data;
};

export function SecuritySearch({ onSelect, placeholder = "Search symbols, names..." }: { onSelect?: (security: Security) => void; placeholder?: string; }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  // SWR for real API
  const { data: securities = [], isLoading } = useSWR(query ? `/api/securities/search?q=${encodeURIComponent(query)}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const results = securities.length > 0 ? securities : mockSecurities.filter(s => 
    s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const handleSelect = (security: Security) => {
    setQuery(security.symbol);
    setShowResults(false);
    onSelect?.(security);
  };

  const clearSearch = () => {
    setQuery('');
    setShowResults(false);
    onSelect?.({ symbol: '', name: '', type: 'stock', price: 0, changePercent: 0 });
  };

  return (
    <motion.div
      initial={false}
      className="relative w-full"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(e.target.value.length > 0);
          }}
          placeholder={placeholder}
          className="pl-10 pr-10"
          onFocus={() => setShowResults(query.length > 0)}
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-auto"
          >
            {results.map((security: Security, index: number) => (
              <motion.button
                key={security.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: index * 0.05 }}
                className="w-full text-left p-3 hover:bg-accent/10 transition-colors flex justify-between items-center"
                onClick={() => handleSelect(security)}
              >
                <div className="space-y-1">
                  <div className="font-medium">{security.symbol}</div>
                  <div className="text-sm text-muted-foreground">{security.name}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm font-medium mono">${security.price.toFixed(2)}</div>
                  <Badge variant={security.changePercent >= 0 ? 'default' : 'destructive'}>
                    {security.changePercent >= 0 ? '+' : ''}{security.changePercent.toFixed(2)}%
                  </Badge>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
        {showResults && query && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 p-3"
          >
            <p className="text-sm text-muted-foreground">No securities found for "{query}"</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}