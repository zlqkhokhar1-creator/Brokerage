import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { mockPortfolio, portfolioHistory, Position } from '@/lib/mockData';

interface PortfolioPageProps {
  onStockClick: (symbol: string) => void;
}

export function PortfolioPage({ onStockClick }: PortfolioPageProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [viewType, setViewType] = useState<'value' | 'performance'>('value');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const timeframes = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <div className="p-4 space-y-6">
      {/* Portfolio Summary */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button 
            variant={viewType === 'value' ? 'default' : 'ghost'}
            size="sm"
            className="px-0 h-auto"
            onClick={() => setViewType('value')}
          >
            Value
          </Button>
          <Button 
            variant={viewType === 'performance' ? 'default' : 'ghost'}
            size="sm" 
            className="px-0 h-auto"
            onClick={() => setViewType('performance')}
          >
            Performance
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-3xl">{formatCurrency(mockPortfolio.totalValue)}</div>
          <div className={`flex items-center gap-2 ${mockPortfolio.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {mockPortfolio.dayChange >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>
              {formatCurrency(Math.abs(mockPortfolio.dayChange))} ({formatPercent(mockPortfolio.dayChangePercent)}) today
            </span>
          </div>
        </div>
      </div>

      {/* Portfolio Chart */}
      <Card>
        <CardContent className="pt-4">
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioHistory}>
                <XAxis hide />
                <YAxis hide />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={mockPortfolio.totalReturn >= 0 ? "#22c55e" : "#ef4444"}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex gap-2 justify-center overflow-x-auto">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                variant={selectedTimeframe === tf ? "default" : "ghost"}
                size="sm"
                className={`flex-shrink-0 h-8 px-3 text-xs rounded-full ${
                  selectedTimeframe === tf 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-muted-foreground'
                }`}
                onClick={() => setSelectedTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-lg">{formatCurrency(mockPortfolio.totalValue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cash Balance</p>
              <p className="text-lg">{formatCurrency(25000)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Day P&L</p>
              <p className={`text-lg ${mockPortfolio.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(mockPortfolio.dayChange)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <p className={`text-lg ${mockPortfolio.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(mockPortfolio.totalReturn)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings */}
      <div className="space-y-4">
        <h2 className="text-lg">Holdings</h2>
        
        <div className="space-y-3">
          {mockPortfolio.positions.map((position: Position) => (
            <Card 
              key={position.symbol} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onStockClick(position.symbol)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium">{position.symbol}</h3>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(position.marketValue)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div>
                        <p>{position.shares} shares • {formatCurrency(position.currentPrice)}</p>
                        <p className="text-xs">Avg cost: {formatCurrency(position.avgCost)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`${position.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(position.totalReturn)}
                        </p>
                        <p className={`text-xs ${position.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(position.totalReturnPercent)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">1 Day Return</span>
              <span className={`text-sm ${mockPortfolio.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(mockPortfolio.dayChangePercent)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Return</span>
              <span className={`text-sm ${mockPortfolio.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(mockPortfolio.totalReturnPercent)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Beta</span>
              <span className="text-sm">1.12</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
              <span className="text-sm">1.45</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}