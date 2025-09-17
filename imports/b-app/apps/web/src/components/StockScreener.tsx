/** @jsxImportSource react */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Save, RefreshCw, Star } from 'lucide-react';
import { StockData, StockFilters, FilterChangeHandler, PresetScreen, NumericRange } from './stock-screener/types';
import { FilterPanel } from './stock-screener/FilterPanel';
import { ResultsList } from './stock-screener/ResultsList';
import { PresetScreens } from './stock-screener/PresetScreens';
import { StockCard } from './stock-screener/StockCard';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Mock data for demonstration
const MOCK_STOCKS: StockData[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 175.34,
    change: 2.34,
    changePercent: 1.35,
    marketCap: 2.8e12,
    peRatio: 28.5,
    sector: 'Technology',
    exchange: 'NASDAQ',
  },
  // Add more mock data as needed
];

// Preset screens for quick filtering
const PRESET_SCREENS: PresetScreen[] = [
  {
    name: 'Growth Stocks',
    description: 'High growth companies with strong fundamentals',
    filters: {
      pe: { min: 15, max: 40 },
      marketCap: { min: 1000000000, max: 100000000000 },
      sector: 'Technology',
      exchange: 'all'
    }
  },
  {
    name: 'Value Stocks',
    description: 'Undervalued companies with strong fundamentals',
    filters: {
      pe: { min: 0, max: 15 },
      marketCap: { min: 500000000, max: 50000000000 },
      sector: 'all',
      exchange: 'all'
    }
  },
  {
    name: 'Dividend Stocks',
    description: 'Stable companies with consistent dividend history',
    filters: {
      dividend: { min: 3, max: 20 },
      marketCap: { min: 1000000000, max: 1000000000000 },
      sector: 'all',
      exchange: 'all'
    }
  },
  {
    name: 'Tech Leaders',
    description: 'Technology sector leaders with strong metrics',
    filters: {
      sector: 'Technology',
      marketCap: { min: 10000000000, max: 1000000000000 },
      pe: { min: 20, max: 60 },
      exchange: 'all'
    }
  }
] as const;

// Extend the base StockFilters with additional properties if needed
interface LocalStockFilters extends StockFilters {
  marketCap: NumericRange;
  pe: NumericRange;
  dividend: NumericRange;
  volume: NumericRange;
  sector: string;
  exchange: string;
}

const StockScreener: React.FC = () => {
  const [filters, setFilters] = useState<StockFilters>({
    marketCap: { min: 0, max: 1000000000000 },
    pe: { min: 0, max: 100 },
    dividend: { min: 0, max: 20 },
    volume: { min: 0, max: 1000000000 },
    sector: 'all',
    exchange: 'all'
  });

  const [results, setResults] = useState<StockData[]>(MOCK_STOCKS);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [savedScreens, setSavedScreens] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState<string>('');

  const sectors = ['Technology', 'Healthcare', 'Finance', 'Consumer', 'Industrial'];
  const exchanges = ['NASDAQ', 'NYSE', 'LSE', 'TSE', 'HKEX'];

  // Fetch stocks based on current filters
  const fetchScreenedStocks = useCallback(async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data - replace with actual API response
      const mockData: StockData[] = [];
      setResults(mockData);
      setTotalResults(mockData.length);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounce the API call when filters change
  useEffect(() => {
    const timerId = setTimeout(() => {
      fetchScreenedStocks();
    }, 300);

    return () => clearTimeout(timerId);
  }, [filters, fetchScreenedStocks]);

  // Handle filter changes
  const handleFilterChange: FilterChangeHandler = useCallback((key: keyof StockFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setActivePreset(undefined);
  }, []);

  // Save current screen configuration
  const handleSaveScreen = useCallback(() => {
    console.log('Saving screen with filters:', filters);
    // TODO: Implement save to backend
  }, [filters]);

  // Toggle stock in watchlist
  const handleSaveStock = useCallback((symbol: string) => {
    setSavedScreens(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol) 
        : [...prev, symbol]
    );
  }, []);

  // Apply preset filters
  const handleApplyPreset = useCallback((presetFilters: Partial<StockFilters> & { name?: string }) => {
    setFilters(prev => ({
      ...prev,
      ...presetFilters
    }));
    setActivePreset(presetFilters.name);
  }, []);

  // Reset all filters to default
  const handleResetFilters = useCallback(() => {
    setFilters({
      marketCap: { min: 0, max: 1000000000000 },
      pe: { min: 0, max: 100 },
      dividend: { min: 0, max: 20 },
      volume: { min: 0, max: 1000000000 },
      sector: 'all',
      exchange: 'all'
    });
    setActivePreset(undefined);
  }, []);

  // Export results to CSV
  const handleExportCSV = (data: StockData[]) => {
    if (!data || data.length === 0) return;
    const headers = [
      'Symbol', 'Name', 'Price', 'Change', 'Change %', 'Market Cap', 
      'P/E', 'Volume', 'Sector', 'Exchange', 'Dividend Yield'
    ].join(',');
    
    const csvContent = [
      headers,
      ...data.map(stock => (
        [
          `"${stock.symbol}"`,
          `"${stock.name}"`,
          stock.price.toFixed(2),
          stock.change.toFixed(2),
          stock.changePercent.toFixed(2) + '%',
          stock.marketCap.toLocaleString(),
          stock.peRatio?.toFixed(2) || 'N/A',
          stock.volume.toLocaleString(),
          `"${stock.sector}"`,
          `"${stock.exchange}"`,
          stock.dividendYield ? (stock.dividendYield * 100).toFixed(2) + '%' : 'N/A'
        ].join(',')
      ))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stocks-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stock Screener</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleSaveScreen}
            className="flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Screen
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportResults(results)}
            disabled={results.length === 0}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchScreenedStocks} 
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <FilterPanel
            filters={filters}
            sectors={SECTORS}
            exchanges={EXCHANGES}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
          <PresetScreens
            presets={PRESET_SCREENS}
            onApply={handleApplyPreset}
            activePreset={activePreset}
          />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Dividend Yield Range (%)</Label>
                    <div className="px-2 py-2">
                      <Slider
                        value={[filters.dividend.min, filters.dividend.max]}
                        onValueChange={(value) => handleFilterChange('dividend', { 
                          min: value[0], 
                          max: value[1] 
                        })}
                        min={0}
                        max={20}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{filters.dividend.min}%</span>
                        <span>{filters.dividend.max}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Volume Range</Label>
                    <div className="px-2 py-4">
                      <Slider
                        value={filters.volume}
                        onValueChange={(value) => handleFilterChange('volume', value)}
                        max={1000000000}
                        step={100000}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{filters.volume.min}</span>
                        <span>{filters.volume.max}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Sector</Label>
                    <Select value={filters.sector} onValueChange={(value: any) => handleFilterChange('sector', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {sectors.map(sector => (
                          <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Exchange</Label>
                    <Select value={filters.exchange} onValueChange={(value: any) => handleFilterChange('exchange', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {exchanges.map(exchange => (
                          <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {filteredStocks.slice(0, 50).map((stock, index) => (
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
                  
                  {filteredStocks.length > 50 && (
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

// Memoize the component to prevent unnecessary re-renders
export const StockScreenerComponent = memo(StockScreener);

export default StockScreenerComponent;
