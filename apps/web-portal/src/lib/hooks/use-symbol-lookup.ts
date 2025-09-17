'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface SymbolInfo {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

export function useSymbolLookup(query: string) {
  return useQuery<SymbolInfo[]>({
    queryKey: ['symbol-lookup', query],
    enabled: !!query && query.length >= 1,
    queryFn: async () => {
      // Example proxy to API Gateway when wired:
      // return apiFetch<SymbolInfo[]>(`/v1/charting/symbols?query=${encodeURIComponent(query)}`)
      // Temporary stubbed data for UI until backend is wired fully
      const q = query.toUpperCase()
      return [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation' },
        { symbol: 'TSLA', name: 'Tesla, Inc.' },
      ].filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    },
    staleTime: 60_000,
  })
}

