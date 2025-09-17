"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign,
  Target,
  Shield,
  BarChart3,
  Calculator,
  AlertTriangle,
  Clock,
  Activity
} from 'lucide-react';

interface OptionContract {
  symbol: string;
  strike: number;
  expiration: string;
  type: 'CALL' | 'PUT';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  intrinsicValue: number;
  timeValue: number;
  breakeven: number;
}

interface OptionsChain {
  underlyingSymbol: string;
  underlyingPrice: number;
  expirationDates: string[];
  calls: { [strike: string]: OptionContract };
  puts: { [strike: string]: OptionContract };
}

interface OptionStrategy {
  name: string;
  description: string;
  legs: {
    action: 'BUY' | 'SELL';
    type: 'CALL' | 'PUT';
    strike: number;
    expiration: string;
    quantity: number;
  }[];
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  capitalRequired: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const OptionsTrading: React.FC = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [optionsChain, setOptionsChain] = useState<OptionsChain | null>(null);
  const [selectedExpiration, setSelectedExpiration] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<OptionStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chain');
  
  // Strategy builder state
  const [strategyLegs, setStrategyLegs] = useState<any[]>([]);
  const [showGreeks, setShowGreeks] = useState(true);

  const predefinedStrategies = [
    {
      name: 'Long Call',
      description: 'Bullish strategy with unlimited upside potential',
      riskLevel: 'MEDIUM' as const,
      setup: { calls: [{ action: 'BUY', quantity: 1 }] }
    },
    {
      name: 'Long Put',
      description: 'Bearish strategy with high profit potential',
      riskLevel: 'MEDIUM' as const,
      setup: { puts: [{ action: 'BUY', quantity: 1 }] }
    },
    {
      name: 'Covered Call',
      description: 'Generate income on existing stock position',
      riskLevel: 'LOW' as const,
      setup: { stock: { action: 'OWN', quantity: 100 }, calls: [{ action: 'SELL', quantity: 1 }] }
    },
    {
      name: 'Cash-Secured Put',
      description: 'Generate income while potentially acquiring stock',
      riskLevel: 'MEDIUM' as const,
      setup: { puts: [{ action: 'SELL', quantity: 1 }] }
    },
    {
      name: 'Bull Call Spread',
      description: 'Limited risk, limited reward bullish strategy',
      riskLevel: 'LOW' as const,
      setup: { calls: [{ action: 'BUY', quantity: 1 }, { action: 'SELL', quantity: 1 }] }
    },
    {
      name: 'Bear Put Spread',
      description: 'Limited risk, limited reward bearish strategy',
      riskLevel: 'LOW' as const,
      setup: { puts: [{ action: 'BUY', quantity: 1 }, { action: 'SELL', quantity: 1 }] }
    },
    {
      name: 'Iron Condor',
      description: 'Profit from low volatility in underlying',
      riskLevel: 'MEDIUM' as const,
      setup: { 
        calls: [{ action: 'SELL', quantity: 1 }, { action: 'BUY', quantity: 1 }],
        puts: [{ action: 'SELL', quantity: 1 }, { action: 'BUY', quantity: 1 }]
      }
    },
    {
      name: 'Straddle',
      description: 'Profit from high volatility in either direction',
      riskLevel: 'HIGH' as const,
      setup: { calls: [{ action: 'BUY', quantity: 1 }], puts: [{ action: 'BUY', quantity: 1 }] }
    }
  ];

  useEffect(() => {
    if (symbol) {
      fetchOptionsChain();
    }
  }, [symbol]);

  useEffect(() => {
    if (optionsChain && !selectedExpiration && optionsChain.expirationDates.length > 0) {
      setSelectedExpiration(optionsChain.expirationDates[0]);
    }
  }, [optionsChain]);

  const fetchOptionsChain = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/v1/market/options/${symbol}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOptionsChain(data.data);
      }
    } catch (error) {
      console.error('Error fetching options chain:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStrategy = (strategy: any) => {
    // This would calculate P&L, Greeks, and risk metrics for the strategy
    // For now, returning mock data
    return {
      maxProfit: 500,
      maxLoss: -200,
      breakevens: [150, 160],
      capitalRequired: 1000,
      probabilityOfProfit: 65
    };
  };

  const executeStrategy = async (strategy: OptionStrategy) => {
    try {
      const response = await fetch('/api/v1/options/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          symbol,
          strategy: strategy.name,
          legs: strategy.legs
        })
      });

      if (response.ok) {
        // Handle successful execution
      }
    } catch (error) {
      console.error('Error executing strategy:', error);
    }
  };

  const getMoneyness = (strike: number, underlyingPrice: number, type: 'CALL' | 'PUT') => {
    if (type === 'CALL') {
      if (strike < underlyingPrice) return 'ITM';
      if (strike === underlyingPrice) return 'ATM';
      return 'OTM';
    } else {
      if (strike > underlyingPrice) return 'ITM';
      if (strike === underlyingPrice) return 'ATM';
      return 'OTM';
    }
  };

  const getMoneynessColor = (moneyness: string) => {
    switch (moneyness) {
      case 'ITM': return 'text-green-600 bg-green-50';
      case 'ATM': return 'text-blue-600 bg-blue-50';
      case 'OTM': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading options data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Options Trading</h1>
          <p className="text-muted-foreground">Trade options contracts and build advanced strategies</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={showGreeks}
            onCheckedChange={setShowGreeks}
          />
          <Label>Show Greeks</Label>
        </div>
      </div>

      {/* Symbol Input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="symbol">Underlying Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="max-w-32"
              />
            </div>
            {optionsChain && (
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-2xl font-bold">${optionsChain.underlyingPrice.toFixed(2)}</p>
                </div>
                <div>
                  <Label htmlFor="expiration">Expiration</Label>
                  <Select value={selectedExpiration} onValueChange={setSelectedExpiration}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsChain.expirationDates.map(date => (
                        <SelectItem key={date} value={date}>
                          {new Date(date).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="chain">Options Chain</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Builder</TabsTrigger>
          <TabsTrigger value="positions">My Positions</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="chain" className="space-y-4">
          {optionsChain && selectedExpiration && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                      <span>Strike</span>
                      <span>Bid/Ask</span>
                      <span>Last</span>
                      <span>Vol</span>
                      <span>OI</span>
                      {showGreeks && <span>Greeks</span>}
                    </div>
                    
                    {Object.values(optionsChain.calls)
                      .filter(call => call.expiration === selectedExpiration)
                      .sort((a, b) => a.strike - b.strike)
                      .map((call, index) => {
                        const moneyness = getMoneyness(call.strike, optionsChain.underlyingPrice, 'CALL');
                        return (
                          <div key={index} className={`grid grid-cols-6 gap-2 text-sm p-2 rounded hover:bg-gray-50 cursor-pointer ${getMoneynessColor(moneyness)}`}>
                            <div className="font-semibold">${call.strike}</div>
                            <div>${call.bid.toFixed(2)}/${call.ask.toFixed(2)}</div>
                            <div>${call.last.toFixed(2)}</div>
                            <div>{call.volume.toLocaleString()}</div>
                            <div>{call.openInterest.toLocaleString()}</div>
                            {showGreeks && (
                              <div className="text-xs">
                                <div>Δ: {call.delta.toFixed(2)}</div>
                                <div>Θ: {call.theta.toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Puts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    Puts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                      <span>Strike</span>
                      <span>Bid/Ask</span>
                      <span>Last</span>
                      <span>Vol</span>
                      <span>OI</span>
                      {showGreeks && <span>Greeks</span>}
                    </div>
                    
                    {Object.values(optionsChain.puts)
                      .filter(put => put.expiration === selectedExpiration)
                      .sort((a, b) => b.strike - a.strike)
                      .map((put, index) => {
                        const moneyness = getMoneyness(put.strike, optionsChain.underlyingPrice, 'PUT');
                        return (
                          <div key={index} className={`grid grid-cols-6 gap-2 text-sm p-2 rounded hover:bg-gray-50 cursor-pointer ${getMoneynessColor(moneyness)}`}>
                            <div className="font-semibold">${put.strike}</div>
                            <div>${put.bid.toFixed(2)}/${put.ask.toFixed(2)}</div>
                            <div>${put.last.toFixed(2)}</div>
                            <div>{put.volume.toLocaleString()}</div>
                            <div>{put.openInterest.toLocaleString()}</div>
                            {showGreeks && (
                              <div className="text-xs">
                                <div>Δ: {put.delta.toFixed(2)}</div>
                                <div>Θ: {put.theta.toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Predefined Strategies */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Strategy Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {predefinedStrategies.map((strategy, index) => (
                    <div key={index} className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => setSelectedStrategy(strategy as any)}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{strategy.name}</h4>
                        <Badge className={getRiskColor(strategy.riskLevel)} variant="outline">
                          {strategy.riskLevel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{strategy.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Strategy Builder */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Strategy Builder</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedStrategy ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{selectedStrategy.name}</h3>
                          <p className="text-sm text-muted-foreground">{selectedStrategy.description}</p>
                        </div>
                        <Badge className={getRiskColor(selectedStrategy.riskLevel)}>
                          <Shield className="w-3 h-3 mr-1" />
                          {selectedStrategy.riskLevel} Risk
                        </Badge>
                      </div>

                      {/* Strategy Legs */}
                      <div className="space-y-3">
                        <h4 className="font-semibold">Strategy Legs</h4>
                        {selectedStrategy.legs?.map((leg, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center space-x-3">
                              <Badge variant={leg.action === 'BUY' ? 'default' : 'secondary'}>
                                {leg.action}
                              </Badge>
                              <span className="font-medium">{leg.quantity}x</span>
                              <span className={leg.type === 'CALL' ? 'text-green-600' : 'text-red-600'}>
                                {leg.type}
                              </span>
                              <span>${leg.strike}</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(leg.expiration).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Strategy Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Max Profit</p>
                          <p className="font-semibold text-green-600">${selectedStrategy.maxProfit?.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Max Loss</p>
                          <p className="font-semibold text-red-600">${Math.abs(selectedStrategy.maxLoss || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Breakeven</p>
                          <p className="font-semibold">${selectedStrategy.breakevens?.[0]?.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Capital Req.</p>
                          <p className="font-semibold">${selectedStrategy.capitalRequired?.toLocaleString()}</p>
                        </div>
                      </div>

                      <Button onClick={() => executeStrategy(selectedStrategy)} className="w-full">
                        <Target className="w-4 h-4 mr-2" />
                        Execute Strategy
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">Select a strategy template to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Options Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">No options positions found</p>
                <p className="text-sm text-muted-foreground">Your options positions will appear here once you start trading</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Volatility Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Implied Volatility Rank</span>
                    <span className="font-semibold">65%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Historical Volatility (30d)</span>
                    <span className="font-semibold">28.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IV/HV Ratio</span>
                    <span className="font-semibold">1.15</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time Decay Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Days to Expiration</span>
                    <span className="font-semibold">21</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Theta (Portfolio)</span>
                    <span className="font-semibold text-red-600">-$45.20</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weekend Effect</span>
                    <span className="font-semibold">-$12.80</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Portfolio Delta</span>
                    <span className="font-semibold">+125.40</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Portfolio Gamma</span>
                    <span className="font-semibold">+8.75</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Portfolio Vega</span>
                    <span className="font-semibold">+234.50</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Outlook</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Bullish Strategies</span>
                    <Badge className="text-green-600 bg-green-50">Favorable</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Neutral Strategies</span>
                    <Badge className="text-yellow-600 bg-yellow-50">Moderate</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bearish Strategies</span>
                    <Badge className="text-red-600 bg-red-50">Unfavorable</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OptionsTrading;
