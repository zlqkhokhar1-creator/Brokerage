"use client";
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart3, 
  Info, 
  RefreshCw, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  Cell,
  Label
} from 'recharts';

// Mock data for correlation matrix
const generateMockCorrelationData = (tickers: string[]) => {
  const data: Record<string, Record<string, number>> = {};
  
  tickers.forEach((ticker1, i) => {
    data[ticker1] = {};
    tickers.forEach((ticker2, j) => {
      if (i === j) {
        data[ticker1][ticker2] = 1; // Perfect correlation with self
      } else if (i < j) {
        // Generate somewhat realistic correlation values
        const baseCorrelation = Math.random() * 1.8 - 0.9; // Between -0.9 and 0.9
        // Make correlations more extreme (closer to -1 or 1) for demo purposes
        const sign = Math.sign(baseCorrelation);
        const absValue = Math.abs(baseCorrelation);
        const adjustedValue = sign * (absValue ** 0.7);
        data[ticker1][ticker2] = parseFloat(adjustedValue.toFixed(2));
      } else {
        // Use the symmetric value
        data[ticker1][ticker2] = data[ticker2][ticker1];
      }
    });
  });
  
  return data;
};

// Mock stock data for scatter plot
const generateMockStockData = (tickers: string[]) => {
  const data: Array<{ticker: string; volatility: number; return: number; marketCap: number; sector: string}> = [];
  const sectors = ['Technology', 'Healthcare', 'Financial', 'Consumer', 'Industrial', 'Energy'];
  
  tickers.forEach(ticker => {
    data.push({
      ticker,
      volatility: Math.random() * 40 + 10, // 10-50%
      return: (Math.random() * 30 - 5) / 100, // -5% to 25%
      marketCap: 10 ** (Math.random() * 4 + 1), // $10M to $100B
      sector: sectors[Math.floor(Math.random() * sectors.length)]
    });
  });
  
  return data;
};

const sectorColors: Record<string, string> = {
  'Technology': '#3b82f6',
  'Healthcare': '#10b981',
  'Financial': '#f59e0b',
  'Consumer': '#8b5cf6',
  'Industrial': '#ec4899',
  'Energy': '#ef4444'
};

interface StockCorrelationMatrixProps {
  portfolioStocks?: string[];
  onStockSelect?: (ticker: string) => void;
}

export function StockCorrelationMatrix({ 
  portfolioStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'JNJ'],
  onStockSelect 
}: StockCorrelationMatrixProps) {
  const [timeframe, setTimeframe] = useState('1Y');
  const [sortConfig, setSortConfig] = useState<{key: string; direction: 'asc' | 'desc'}>({ key: 'ticker', direction: 'asc' });
  const [selectedSector, setSelectedSector] = useState<string>('All');
  
  // Generate mock data
  const correlationData = useMemo(() => generateMockCorrelationData(portfolioStocks), [portfolioStocks]);
  const stockData = useMemo(() => generateMockStockData(portfolioStocks), [portfolioStocks]);
  
  // Get unique sectors
  const sectors = useMemo(() => {
    const sectorsSet = new Set(stockData.map(stock => stock.sector));
    return ['All', ...Array.from(sectorsSet)];
  }, [stockData]);
  
  // Filter and sort stock data
  const filteredStockData = useMemo(() => {
    let result = [...stockData];
    
    // Filter by sector
    if (selectedSector !== 'All') {
      result = result.filter(stock => stock.sector === selectedSector);
    }
    
    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key as keyof typeof a] < b[sortConfig.key as keyof typeof b]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key as keyof typeof a] > b[sortConfig.key as keyof typeof b]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return result;
  }, [stockData, sortConfig, selectedSector]);
  
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const getCorrelationColor = (value: number) => {
    const absValue = Math.abs(value);
    const opacity = Math.min(0.2 + absValue * 0.8, 1);
    
    if (value > 0) {
      return `rgba(59, 130, 246, ${opacity})`; // Blue for positive correlation
    } else if (value < 0) {
      return `rgba(239, 68, 68, ${opacity})`; // Red for negative correlation
    }
    return '#e5e7eb'; // Gray for zero
  };
  
  const getTextColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue > 0.7) return 'font-bold';
    if (absValue > 0.4) return 'font-medium';
    return 'font-normal';
  };
  
  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <TrendingUp className="w-3 h-3 ml-1" /> 
      : <TrendingDown className="w-3 h-3 ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Correlation Matrix */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Stock Correlation Matrix</CardTitle>
                  <CardDescription>Correlation of returns between assets in your portfolio</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1M">1 Month</SelectItem>
                      <SelectItem value="3M">3 Months</SelectItem>
                      <SelectItem value="6M">6 Months</SelectItem>
                      <SelectItem value="1Y">1 Year</SelectItem>
                      <SelectItem value="3Y">3 Years</SelectItem>
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh correlation data</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle
                [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-border">
                  <Table className="min-w-max">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px] sticky left-0 bg-background z-10">
                          <div className="flex items-center">
                            <span>Ticker</span>
                            <button 
                              onClick={() => handleSort('ticker')}
                              className="ml-1 flex items-center"
                            >
                              {renderSortIcon('ticker')}
                            </button>
                          </div>
                        </TableHead>
                        {portfolioStocks.map(ticker => (
                          <TableHead key={ticker} className="text-center px-2">
                            <div className="flex flex-col items-center">
                              <button 
                                onClick={() => onStockSelect?.(ticker)}
                                className="hover:underline font-medium"
                              >
                                {ticker}
                              </button>
                              <div className="text-xs text-muted-foreground">
                                {stockData.find(s => s.ticker === ticker)?.sector.substring(0, 3)}
                              </div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portfolioStocks.map((ticker1, i) => (
                        <TableRow key={ticker1}>
                          <TableCell className="font-medium sticky left-0 bg-background z-10">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ 
                                  backgroundColor: sectorColors[stockData[i]?.sector] || '#9ca3af' 
                                }}
                              />
                              <button 
                                onClick={() => onStockSelect?.(ticker1)}
                                className="hover:underline"
                              >
                                {ticker1}
                              </button>
                            </div>
                          </TableCell>
                          {portfolioStocks.map((ticker2, j) => {
                            const correlation = correlationData[ticker1][ticker2];
                            const isDiagonal = i === j;
                            
                            return (
                              <TableCell 
                                key={ticker2} 
                                className={`text-center px-2 py-1 ${isDiagonal ? 'bg-muted/50' : ''}`}
                              >
                                {!isDiagonal && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={`inline-block w-10 h-6 rounded ${getTextColor(correlation)}`}
                                        style={{
                                          backgroundColor: getCorrelationColor(correlation),
                                          lineHeight: '1.5rem'
                                        }}
                                      >
                                        {correlation.toFixed(2)}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        Correlation between {ticker1} and {ticker2}: {correlation.toFixed(2)}
                                      </p>
                                      <p className="text-muted-foreground text-xs mt-1">
                                        {correlation > 0.7 ? 'Strong positive correlation' : 
                                         correlation > 0.3 ? 'Moderate positive correlation' :
                                         correlation > -0.3 ? 'Low correlation' :
                                         correlation > -0.7 ? 'Moderate negative correlation' :
                                         'Strong negative correlation'}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500/80 rounded mr-1"></div>
                  <span>Positive</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500/80 rounded mr-1"></div>
                  <span>Negative</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-200 rounded mr-1"></div>
                  <span>Neutral</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Risk-Return Scatter Plot */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Risk-Return Profile</CardTitle>
                  <CardDescription>Annualized risk vs. return for your holdings</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedSector} onValueChange={setSelectedSector}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors.map(sector => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 30, left: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    type="number" 
                    dataKey="volatility" 
                    name="Volatility"
                    unit="%"
                    label={{ 
                      value: 'Annualized Volatility (%)', 
                      position: 'bottom',
                      offset: 0
                    }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="return" 
                    name="Return"
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    label={{ 
                      value: 'Annualized Return', 
                      angle: -90, 
                      position: 'left',
                      offset: 0
                    }}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="marketCap" 
                    range={[100, 1000]} // Bubble size range
                    scale="log"
                  />
                  <RechartsTooltip 
                    formatter={(value: any, name: any, props: any) => {
                      if (name === 'return') return [(value * 100).toFixed(2) + '%', 'Return'];
                      if (name === 'volatility') return [value.toFixed(2) + '%', 'Volatility'];
                      if (name === 'marketCap') {
                        const marketCap = Number(value);
                        const formatter = new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          notation: 'compact',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 1
                        });
                        return [formatter.format(marketCap), 'Market Cap'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Stock: ${label}`}
                  />
                  <Scatter
                    name="Stocks"
                    data={filteredStockData}
                    fill="#8884d8"
                  >
                    {filteredStockData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={sectorColors[entry.sector] || '#9ca3af'}
                        stroke="var(--background)"
                        strokeWidth={1}
                        onClick={() => onStockSelect?.(entry.ticker)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              
              <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                {Object.entries(sectorColors).map(([sector, color]) => (
                  <div key={sector} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-1"
                      style={{ backgroundColor: color }}
                    />
                    <span>{sector}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Sector Allocation and Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6
      [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-border">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sector Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(
                stockData.reduce((acc, stock) => {
                  acc[stock.sector] = (acc[stock.sector] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([sector, count]) => ({
                sector,
                count,
                percentage: (count / stockData.length) * 100
              })).sort((a, b) => b.percentage - a.percentage)
              .map(({ sector, count, percentage }) => (
                <div key={sector} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: sectorColors[sector] || '#9ca3af' }}
                      />
                      <span>{sector}</span>
                    </div>
                    <span className="font-medium">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: sectorColors[sector] || '#9ca3af',
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portfolio Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Beta</span>
                <span className="font-medium">1.12</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: '75%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your portfolio is 12% more volatile than the market
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diversification Score</span>
                <span className="font-medium">68/100</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: '68%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Consider adding more asset classes for better diversification
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Concentration Risk</span>
                <span className="font-medium">High</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: '80%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Top 3 holdings make up 45% of your portfolio
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Correlation Heatmap</CardTitle>
            <CardDescription>How your assets move together</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-1">
              {portfolioStocks.slice(0, 5).map((ticker1, i) => (
                portfolioStocks.slice(0, 5).map((ticker2, j) => {
                  const correlation = correlationData[ticker1]?.[ticker2] || 0;
                  const isDiagonal = i === j;
                  
                  return (
                    <Tooltip key={`${ticker1}-${ticker2}`}>
                      <TooltipTrigger asChild>
                        <div 
                          className={`aspect-square flex items-center justify-center text-xs font-medium ${isDiagonal ? 'bg-muted/50' : ''}`}
                          style={{
                            backgroundColor: isDiagonal 
                              ? 'hsl(var(--muted))' 
                              : getCorrelationColor(correlation),
                            color: isDiagonal 
                              ? 'hsl(var(--muted-foreground))' 
                              : Math.abs(correlation) > 0.5 ? 'white' : 'hsl(var(--foreground))',
                            cursor: 'pointer'
                          }}
                          onClick={() => onStockSelect?.(isDiagonal ? ticker1 : ticker2)}
                        >
                          {isDiagonal ? (
                            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-background">
                              {ticker1}
                            </div>
                          ) : (
                            correlation.toFixed(1)
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{ticker1} vs {ticker2}: {correlation.toFixed(2)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              ))}
            </div>
            <div className="mt-4 text-sm text-muted-foreground text-center">
              <p>Click on a cell to view detailed correlation analysis</p>
              <div className="mt-2 flex justify-center gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500/80 rounded mr-1"></div>
                  <span>Positive</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500/80 rounded mr-1"></div>
                  <span>Negative</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default StockCorrelationMatrix;
