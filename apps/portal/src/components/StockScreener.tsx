import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  DollarSign,
  Percent,
  Users,
  Building,
  Star,
  Download,
  Save,
  RefreshCw
} from 'lucide-react';

interface ScreenerCriteria {
  // Price & Volume
  priceRange: [number, number];
  volumeMin: number;
  marketCapRange: [number, number];
  
  // Financial Metrics
  peRatioRange: [number, number];
  pbRatioRange: [number, number];
  dividendYieldRange: [number, number];
  debtToEquityMax: number;
  
  // Performance
  priceChangeRange: [number, number];
  revenueGrowthMin: number;
  earningsGrowthMin: number;
  
  // Technical
  rsiRange: [number, number];
  macdSignal: 'BULLISH' | 'BEARISH' | 'ANY';
  movingAverageSignal: 'ABOVE_50' | 'BELOW_50' | 'ABOVE_200' | 'BELOW_200' | 'ANY';
  
  // Sector & Industry
  sectors: string[];
  industries: string[];
  exchanges: string[];
  
  // ESG & Ratings
  esgScoreMin: number;
  analystRatingMin: number;
}

interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  sector: string;
  industry: string;
  analystRating: number;
  esgScore: number;
  technicalScore: number;
}

interface PresetScreen {
  name: string;
  description: string;
  criteria: Partial<ScreenerCriteria>;
}

const StockScreener: React.FC = () => {
  const [criteria, setCriteria] = useState<ScreenerCriteria>({
    priceRange: [0, 1000],
    volumeMin: 100000,
    marketCapRange: [0, 1000000],
    peRatioRange: [0, 50],
    pbRatioRange: [0, 10],
    dividendYieldRange: [0, 10],
    debtToEquityMax: 2,
    priceChangeRange: [-50, 50],
    revenueGrowthMin: 0,
    earningsGrowthMin: 0,
    rsiRange: [0, 100],
    macdSignal: 'ANY',
    movingAverageSignal: 'ANY',
    sectors: [],
    industries: [],
    exchanges: ['NYSE', 'NASDAQ'],
    esgScoreMin: 0,
    analystRatingMin: 0
  });

  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [savedScreens, setSavedScreens] = useState<string[]>([]);

  const presetScreens: PresetScreen[] = [
    {
      name: 'Growth Stocks',
      description: 'High growth companies with strong fundamentals',
      criteria: {
        revenueGrowthMin: 15,
        earningsGrowthMin: 20,
        peRatioRange: [15, 40],
        marketCapRange: [1000, 100000]
      }
    },
    {
      name: 'Value Stocks',
      description: 'Undervalued stocks with low P/E ratios',
      criteria: {
        peRatioRange: [5, 15],
        pbRatioRange: [0.5, 2],
        dividendYieldRange: [2, 8],
        debtToEquityMax: 1
      }
    },
    {
      name: 'Dividend Aristocrats',
      description: 'High dividend yield stocks with consistent payouts',
      criteria: {
        dividendYieldRange: [3, 10],
        marketCapRange: [5000, 500000],
        debtToEquityMax: 1.5
      }
    },
    {
      name: 'Small Cap Growth',
      description: 'Small companies with high growth potential',
      criteria: {
        marketCapRange: [300, 2000],
        revenueGrowthMin: 25,
        earningsGrowthMin: 30,
        volumeMin: 500000
      }
    },
    {
      name: 'Tech Leaders',
      description: 'Technology sector leaders with strong metrics',
      criteria: {
        sectors: ['Technology'],
        marketCapRange: [10000, 1000000],
        revenueGrowthMin: 10,
        peRatioRange: [20, 60]
      }
    },
    {
      name: 'ESG Champions',
      description: 'Companies with high ESG scores',
      criteria: {
        esgScoreMin: 80,
        marketCapRange: [5000, 500000],
        analystRatingMin: 3.5
      }
    }
  ];

  const sectors = [
    'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
    'Communication Services', 'Industrials', 'Consumer Defensive', 'Energy',
    'Utilities', 'Real Estate', 'Basic Materials'
  ];

  const exchanges = ['NYSE', 'NASDAQ', 'AMEX'];

  useEffect(() => {
    // Auto-run screen when criteria changes (debounced)
    const timeoutId = setTimeout(() => {
      if (Object.values(criteria).some(value => 
        Array.isArray(value) ? value.length > 0 : value !== 0 && value !== 'ANY'
      )) {
        runScreen();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [criteria]);

  const runScreen = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/v1/market/screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(criteria)
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.data.results || []);
        setTotalResults(data.data.total || 0);
      }
    } catch (error) {
      console.error('Error running screen:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: PresetScreen) => {
    setCriteria(prev => ({
      ...prev,
      ...preset.criteria
    }));
  };

  const resetCriteria = () => {
    setCriteria({
      priceRange: [0, 1000],
      volumeMin: 100000,
      marketCapRange: [0, 1000000],
      peRatioRange: [0, 50],
      pbRatioRange: [0, 10],
      dividendYieldRange: [0, 10],
      debtToEquityMax: 2,
      priceChangeRange: [-50, 50],
      revenueGrowthMin: 0,
      earningsGrowthMin: 0,
      rsiRange: [0, 100],
      macdSignal: 'ANY',
      movingAverageSignal: 'ANY',
      sectors: [],
      industries: [],
      exchanges: ['NYSE', 'NASDAQ'],
      esgScoreMin: 0,
      analystRatingMin: 0
    });
  };

  const saveScreen = async (name: string) => {
    try {
      const response = await fetch('/api/v1/screener/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, criteria })
      });

      if (response.ok) {
        setSavedScreens(prev => [...prev, name]);
      }
    } catch (error) {
      console.error('Error saving screen:', error);
    }
  };

  const exportResults = () => {
    const csv = [
      ['Symbol', 'Name', 'Price', 'Change%', 'Volume', 'Market Cap', 'P/E', 'P/B', 'Div Yield', 'Sector'].join(','),
      ...results.map(stock => [
        stock.symbol,
        stock.name,
        stock.price,
        stock.changePercent.toFixed(2),
        stock.volume,
        stock.marketCap,
        stock.peRatio.toFixed(2),
        stock.pbRatio.toFixed(2),
        stock.dividendYield.toFixed(2),
        stock.sector
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_screen_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Screener</h1>
          <p className="text-muted-foreground">Find stocks that match your investment criteria</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={resetCriteria} variant="outline">
            Reset
          </Button>
          <Button onClick={runScreen} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Screening...' : 'Run Screen'}
          </Button>
        </div>
      </div>

      {/* Preset Screens */}
      <Card>
        <CardHeader>
          <CardTitle>Preset Screens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presetScreens.map((preset, index) => (
              <div key={index} className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => applyPreset(preset)}>
                <h4 className="font-semibold mb-1">{preset.name}</h4>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Screening Criteria */}
        <div className="lg:col-span-1">
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Criteria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Price Range ($)</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={criteria.priceRange}
                        onValueChange={(value) => setCriteria(prev => ({ ...prev, priceRange: value as [number, number] }))}
                        max={1000}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>${criteria.priceRange[0]}</span>
                        <span>${criteria.priceRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Market Cap Range ($ Millions)</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={criteria.marketCapRange}
                        onValueChange={(value) => setCriteria(prev => ({ ...prev, marketCapRange: value as [number, number] }))}
                        max={1000000}
                        step={100}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>${criteria.marketCapRange[0]}M</span>
                        <span>${criteria.marketCapRange[1]}M</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="volumeMin">Minimum Volume</Label>
                    <Input
                      id="volumeMin"
                      type="number"
                      value={criteria.volumeMin}
                      onChange={(e) => setCriteria(prev => ({ ...prev, volumeMin: Number(e.target.value) }))}
                    />
                  </div>

                  <div>
                    <Label>Sectors</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {sectors.map(sector => (
                        <div key={sector} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={sector}
                            checked={criteria.sectors.includes(sector)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCriteria(prev => ({ ...prev, sectors: [...prev.sectors, sector] }));
                              } else {
                                setCriteria(prev => ({ ...prev, sectors: prev.sectors.filter(s => s !== sector) }));
                              }
                            }}
                          />
                          <Label htmlFor={sector} className="text-sm">{sector}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Exchanges</Label>
                    <div className="space-y-2">
                      {exchanges.map(exchange => (
                        <div key={exchange} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={exchange}
                            checked={criteria.exchanges.includes(exchange)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCriteria(prev => ({ ...prev, exchanges: [...prev.exchanges, exchange] }));
                              } else {
                                setCriteria(prev => ({ ...prev, exchanges: prev.exchanges.filter(ex => ex !== exchange) }));
                              }
                            }}
                          />
                          <Label htmlFor={exchange} className="text-sm">{exchange}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>P/E Ratio Range</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={criteria.peRatioRange}
                        onValueChange={(value) => setCriteria(prev => ({ ...prev, peRatioRange: value as [number, number] }))}
                        max={100}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{criteria.peRatioRange[0]}</span>
                        <span>{criteria.peRatioRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>P/B Ratio Range</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={criteria.pbRatioRange}
                        onValueChange={(value) => setCriteria(prev => ({ ...prev, pbRatioRange: value as [number, number] }))}
                        max={20}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{criteria.pbRatioRange[0]}</span>
                        <span>{criteria.pbRatioRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Dividend Yield Range (%)</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={criteria.dividendYieldRange}
                        onValueChange={(value) => setCriteria(prev => ({ ...prev, dividendYieldRange: value as [number, number] }))}
                        max={15}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{criteria.dividendYieldRange[0]}%</span>
                        <span>{criteria.dividendYieldRange[1]}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="revenueGrowth">Min Revenue Growth (%)</Label>
                    <Input
                      id="revenueGrowth"
                      type="number"
                      value={criteria.revenueGrowthMin}
                      onChange={(e) => setCriteria(prev => ({ ...prev, revenueGrowthMin: Number(e.target.value) }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="earningsGrowth">Min Earnings Growth (%)</Label>
                    <Input
                      id="earningsGrowth"
                      type="number"
                      value={criteria.earningsGrowthMin}
                      onChange={(e) => setCriteria(prev => ({ ...prev, earningsGrowthMin: Number(e.target.value) }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="debtToEquity">Max Debt-to-Equity</Label>
                    <Input
                      id="debtToEquity"
                      type="number"
                      step="0.1"
                      value={criteria.debtToEquityMax}
                      onChange={(e) => setCriteria(prev => ({ ...prev, debtToEquityMax: Number(e.target.value) }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Technical Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>RSI Range</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={criteria.rsiRange}
                        onValueChange={(value) => setCriteria(prev => ({ ...prev, rsiRange: value as [number, number] }))}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{criteria.rsiRange[0]}</span>
                        <span>{criteria.rsiRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>MACD Signal</Label>
                    <Select value={criteria.macdSignal} onValueChange={(value: any) => setCriteria(prev => ({ ...prev, macdSignal: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANY">Any</SelectItem>
                        <SelectItem value="BULLISH">Bullish</SelectItem>
                        <SelectItem value="BEARISH">Bearish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Moving Average Signal</Label>
                    <Select value={criteria.movingAverageSignal} onValueChange={(value: any) => setCriteria(prev => ({ ...prev, movingAverageSignal: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANY">Any</SelectItem>
                        <SelectItem value="ABOVE_50">Above 50-day MA</SelectItem>
                        <SelectItem value="BELOW_50">Below 50-day MA</SelectItem>
                        <SelectItem value="ABOVE_200">Above 200-day MA</SelectItem>
                        <SelectItem value="BELOW_200">Below 200-day MA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Price Change Range (%)</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={criteria.priceChangeRange}
                        onValueChange={(value) => setCriteria(prev => ({ ...prev, priceChangeRange: value as [number, number] }))}
                        min={-100}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{criteria.priceChangeRange[0]}%</span>
                        <span>{criteria.priceChangeRange[1]}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Screening Results ({totalResults} stocks found)</span>
                <div className="flex items-center gap-2">
                  <Button onClick={exportResults} variant="outline" size="sm" disabled={results.length === 0}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  <Button onClick={() => saveScreen('My Screen')} variant="outline" size="sm">
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {results.slice(0, 50).map((stock, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-semibold">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground">{stock.name}</p>
                          <p className="text-xs text-muted-foreground">{stock.sector}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-right">
                          <p className="font-semibold">${stock.price.toFixed(2)}</p>
                          <p className={`text-xs ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-muted-foreground">Vol</p>
                          <p className="font-semibold">{(stock.volume / 1000000).toFixed(1)}M</p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-muted-foreground">P/E</p>
                          <p className="font-semibold">{stock.peRatio.toFixed(1)}</p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-muted-foreground">Mkt Cap</p>
                          <p className="font-semibold">${(stock.marketCap / 1000).toFixed(0)}B</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {stock.analystRating >= 4 && (
                          <Badge variant="default">
                            <Star className="w-3 h-3 mr-1" />
                            Strong Buy
                          </Badge>
                        )}
                        {stock.esgScore >= 80 && (
                          <Badge variant="outline" className="text-green-600">
                            ESG
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {results.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">No stocks match your criteria</p>
                      <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                    </div>
                  )}
                  
                  {results.length > 50 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Showing first 50 results. {totalResults - 50} more available.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StockScreener;
