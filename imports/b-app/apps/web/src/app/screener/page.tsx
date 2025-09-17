'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ScreeningCriteria {
  marketCap: { min: number; max: number };
  peRatio: { min: number; max: number };
  volume: { min: number };
  price: { min: number; max: number };
  sector: string;
  exchange: string;
  dividendYield: { min: number };
}

interface ScreenResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  sector: string;
  dividendYield: number;
}

export default function StockScreenerPage() {
  const [criteria, setCriteria] = useState<ScreeningCriteria>({
    marketCap: { min: 0, max: 1000000 },
    peRatio: { min: 0, max: 50 },
    volume: { min: 100000 },
    price: { min: 1, max: 1000 },
    sector: '',
    exchange: '',
    dividendYield: { min: 0 }
  });

  const [results, setResults] = useState<ScreenResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const sectors = [
    'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
    'Communication Services', 'Industrials', 'Consumer Defensive', 'Energy',
    'Utilities', 'Real Estate', 'Basic Materials'
  ];

  const exchanges = ['NASDAQ', 'NYSE', 'AMEX'];

  const presetScreens = [
    { name: 'Large Cap Growth', criteria: { marketCap: { min: 10000, max: 1000000 }, peRatio: { min: 15, max: 30 } } },
    { name: 'Dividend Aristocrats', criteria: { dividendYield: { min: 2 }, marketCap: { min: 1000, max: 1000000 } } },
    { name: 'Small Cap Value', criteria: { marketCap: { min: 100, max: 2000 }, peRatio: { min: 5, max: 15 } } },
    { name: 'High Volume', criteria: { volume: { min: 1000000 } } }
  ];

  const handleScreen = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/market/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria)
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.data.results || []);
        setTotalResults(data.data.total || 0);
      }
    } catch (error) {
      console.error('Screening failed:', error);
      // Mock data for demo
      setResults([
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 175.43,
          change: 2.31,
          changePercent: 1.33,
          volume: 45234567,
          marketCap: 2847000,
          peRatio: 28.5,
          sector: 'Technology',
          dividendYield: 0.52
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          price: 332.89,
          change: -1.45,
          changePercent: -0.43,
          volume: 23456789,
          marketCap: 2456000,
          peRatio: 31.2,
          sector: 'Technology',
          dividendYield: 0.89
        }
      ]);
      setTotalResults(2);
    }
    setIsLoading(false);
  };

  const applyPreset = (presetCriteria: any) => {
    setCriteria(prev => ({ ...prev, ...presetCriteria }));
  };

  const formatNumber = (num: number, type: 'currency' | 'number' | 'percent' = 'number') => {
    if (type === 'currency') return `$${num.toFixed(2)}`;
    if (type === 'percent') return `${num.toFixed(2)}%`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Stock Screener</h1>
          <p className="text-gray-400">Find stocks that match your investment criteria</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Screening Criteria */}
          <div className="lg:col-span-1">
            <Card className="bg-[#111111] border-[#1E1E1E] sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Screening Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preset Screens */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Preset Screens</label>
                  <div className="space-y-2">
                    {presetScreens.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => applyPreset(preset.criteria)}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Market Cap */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Market Cap (Millions)</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={criteria.marketCap.min}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          marketCap: { ...prev.marketCap, min: Number(e.target.value) }
                        }))}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={criteria.marketCap.max}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          marketCap: { ...prev.marketCap, max: Number(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* P/E Ratio */}
                <div>
                  <label className="text-sm font-medium mb-2 block">P/E Ratio</label>
                  <div className="space-y-2">
                    <Slider
                      value={[criteria.peRatio.min, criteria.peRatio.max]}
                      onValueChange={([min, max]) => setCriteria(prev => ({
                        ...prev,
                        peRatio: { min, max }
                      }))}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{criteria.peRatio.min}</span>
                      <span>{criteria.peRatio.max}</span>
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range ($)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={criteria.price.min}
                      onChange={(e) => setCriteria(prev => ({
                        ...prev,
                        price: { ...prev.price, min: Number(e.target.value) }
                      }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={criteria.price.max}
                      onChange={(e) => setCriteria(prev => ({
                        ...prev,
                        price: { ...prev.price, max: Number(e.target.value) }
                      }))}
                    />
                  </div>
                </div>

                {/* Sector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Sector</label>
                  <Select value={criteria.sector} onValueChange={(value) => setCriteria(prev => ({ ...prev, sector: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sectors</SelectItem>
                      {sectors.map(sector => (
                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Exchange */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Exchange</label>
                  <Select value={criteria.exchange} onValueChange={(value) => setCriteria(prev => ({ ...prev, exchange: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Exchanges" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Exchanges</SelectItem>
                      {exchanges.map(exchange => (
                        <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Minimum Volume */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Volume</label>
                  <Input
                    type="number"
                    value={criteria.volume.min}
                    onChange={(e) => setCriteria(prev => ({
                      ...prev,
                      volume: { min: Number(e.target.value) }
                    }))}
                  />
                </div>

                {/* Dividend Yield */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Dividend Yield (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={criteria.dividendYield.min}
                    onChange={(e) => setCriteria(prev => ({
                      ...prev,
                      dividendYield: { min: Number(e.target.value) }
                    }))}
                  />
                </div>

                <Button onClick={handleScreen} disabled={isLoading} className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Screening...' : 'Run Screen'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Screening Results</CardTitle>
                  <Badge variant="secondary">
                    {totalResults} stocks found
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-4">
                    {results.map((stock, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-[#1E1E1E] rounded-lg hover:bg-[#1A1A1A] transition-colors">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-semibold">{stock.symbol}</div>
                            <div className="text-sm text-gray-400">{stock.name}</div>
                          </div>
                          <Badge variant="outline">{stock.sector}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="font-semibold">{formatNumber(stock.price, 'currency')}</div>
                            <div className={`text-sm flex items-center gap-1 ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {formatNumber(Math.abs(stock.change), 'currency')} ({formatNumber(Math.abs(stock.changePercent), 'percent')})
                            </div>
                          </div>
                          
                          <div className="text-right text-sm text-gray-400">
                            <div>Vol: {formatNumber(stock.volume)}</div>
                            <div>P/E: {stock.peRatio.toFixed(1)}</div>
                          </div>
                          
                          <div className="text-right text-sm text-gray-400">
                            <div>MCap: {formatNumber(stock.marketCap)}M</div>
                            <div>Yield: {formatNumber(stock.dividendYield, 'percent')}</div>
                          </div>
                          
                          <Button size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Run a screen to find stocks matching your criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
