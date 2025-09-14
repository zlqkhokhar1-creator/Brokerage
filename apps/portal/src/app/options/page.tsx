"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, TrendingDown, Calculator, BarChart3, Target, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface OptionChain {
  strike: number;
  callBid: number;
  callAsk: number;
  callVolume: number;
  callOpenInterest: number;
  callIV: number;
  callDelta: number;
  callGamma: number;
  callTheta: number;
  callVega: number;
  putBid: number;
  putAsk: number;
  putVolume: number;
  putOpenInterest: number;
  putIV: number;
  putDelta: number;
  putGamma: number;
  putTheta: number;
  putVega: number;
}

interface OptionPosition {
  id: string;
  symbol: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
}

interface VolatilityData {
  strike: number;
  iv: number;
  volume: number;
}

export default function OptionsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [selectedExpiry, setSelectedExpiry] = useState('2024-01-19');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('single');
  
  const [underlyingPrice, setUnderlyingPrice] = useState(178.92);
  const [priceChange, setPriceChange] = useState(2.34);
  const [priceChangePercent, setPriceChangePercent] = useState(1.33);
  
  const [optionChain, setOptionChain] = useState<OptionChain[]>([
    {
      strike: 170,
      callBid: 9.80, callAsk: 10.20, callVolume: 1245, callOpenInterest: 5678,
      callIV: 0.28, callDelta: 0.85, callGamma: 0.015, callTheta: -0.12, callVega: 0.08,
      putBid: 0.85, putAsk: 0.95, putVolume: 890, putOpenInterest: 3456,
      putIV: 0.32, putDelta: -0.15, putGamma: 0.015, putTheta: -0.08, putVega: 0.08
    },
    {
      strike: 175,
      callBid: 5.60, callAsk: 5.90, callVolume: 2890, callOpenInterest: 8901,
      callIV: 0.26, callDelta: 0.65, callGamma: 0.025, callTheta: -0.15, callVega: 0.12,
      putBid: 1.80, putAsk: 1.95, putVolume: 1567, putOpenInterest: 6789,
      putIV: 0.30, putDelta: -0.35, putGamma: 0.025, putTheta: -0.10, putVega: 0.12
    },
    {
      strike: 180,
      callBid: 2.40, callAsk: 2.60, callVolume: 4567, callOpenInterest: 12345,
      callIV: 0.24, callDelta: 0.35, callGamma: 0.030, callTheta: -0.18, callVega: 0.15,
      putBid: 3.20, putAsk: 3.40, putVolume: 3210, putOpenInterest: 9876,
      putIV: 0.28, putDelta: -0.65, putGamma: 0.030, putTheta: -0.12, putVega: 0.15
    },
    {
      strike: 185,
      callBid: 0.85, callAsk: 1.05, callVolume: 2345, callOpenInterest: 7890,
      callIV: 0.22, callDelta: 0.15, callGamma: 0.020, callTheta: -0.10, callVega: 0.10,
      putBid: 6.30, putAsk: 6.60, putVolume: 1890, putOpenInterest: 5432,
      putIV: 0.26, putDelta: -0.85, putGamma: 0.020, putTheta: -0.08, putVega: 0.10
    },
    {
      strike: 190,
      callBid: 0.25, callAsk: 0.35, callVolume: 890, callOpenInterest: 3456,
      callIV: 0.20, callDelta: 0.05, callGamma: 0.010, callTheta: -0.05, callVega: 0.05,
      putBid: 10.80, putAsk: 11.20, putVolume: 567, putOpenInterest: 2345,
      putIV: 0.24, putDelta: -0.95, putGamma: 0.010, putTheta: -0.04, putVega: 0.05
    }
  ]);

  const [positions, setPositions] = useState<OptionPosition[]>([
    {
      id: '1',
      symbol: 'AAPL',
      type: 'call',
      strike: 175,
      expiry: '2024-01-19',
      quantity: 5,
      avgPrice: 6.20,
      currentPrice: 5.75,
      pnl: -225,
      pnlPercent: -7.26,
      delta: 0.65,
      gamma: 0.025,
      theta: -0.15,
      vega: 0.12,
      iv: 0.26
    },
    {
      id: '2',
      symbol: 'AAPL',
      type: 'put',
      strike: 170,
      expiry: '2024-01-19',
      quantity: -3,
      avgPrice: 1.10,
      currentPrice: 0.90,
      pnl: 60,
      pnlPercent: 18.18,
      delta: -0.15,
      gamma: 0.015,
      theta: -0.08,
      vega: 0.08,
      iv: 0.32
    }
  ]);

  const [volatilityData, setVolatilityData] = useState<VolatilityData[]>([
    { strike: 170, iv: 32, volume: 1245 },
    { strike: 175, iv: 30, volume: 2890 },
    { strike: 180, iv: 28, volume: 4567 },
    { strike: 185, iv: 26, volume: 2345 },
    { strike: 190, iv: 24, volume: 890 }
  ]);

  const pnlData = [
    { price: 160, pnl: -1500 },
    { price: 165, pnl: -800 },
    { price: 170, pnl: -300 },
    { price: 175, pnl: 200 },
    { price: 180, pnl: 700 },
    { price: 185, pnl: 1200 },
    { price: 190, pnl: 1700 },
    { price: 195, pnl: 2200 }
  ];

  const expiryDates = [
    '2024-01-19',
    '2024-01-26',
    '2024-02-02',
    '2024-02-16',
    '2024-03-15',
    '2024-04-19'
  ];

  const strategies = [
    { value: 'single', label: 'Single Option' },
    { value: 'covered-call', label: 'Covered Call' },
    { value: 'protective-put', label: 'Protective Put' },
    { value: 'bull-call-spread', label: 'Bull Call Spread' },
    { value: 'bear-put-spread', label: 'Bear Put Spread' },
    { value: 'straddle', label: 'Long Straddle' },
    { value: 'strangle', label: 'Long Strangle' },
    { value: 'iron-condor', label: 'Iron Condor' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const calculateTotalPnL = () => {
    return positions.reduce((total, pos) => total + pos.pnl, 0);
  };

  const calculateTotalDelta = () => {
    return positions.reduce((total, pos) => total + (pos.delta * pos.quantity), 0);
  };

  const calculateTotalGamma = () => {
    return positions.reduce((total, pos) => total + (pos.gamma * pos.quantity), 0);
  };

  const calculateTotalTheta = () => {
    return positions.reduce((total, pos) => total + (pos.theta * pos.quantity), 0);
  };

  const getMoneyness = (strike: number) => {
    const diff = ((underlyingPrice - strike) / strike) * 100;
    if (Math.abs(diff) < 2) return 'ATM';
    return diff > 0 ? 'ITM' : 'OTM';
  };

  const getMoneynessColor = (strike: number) => {
    const moneyness = getMoneyness(strike);
    switch (moneyness) {
      case 'ITM': return 'text-green-400';
      case 'ATM': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Options Trading</h1>
              <p className="text-gray-400">Advanced options analysis and trading interface</p>
            </div>
            <div className="flex items-center gap-4">
              <Button>
                <Calculator className="w-4 h-4 mr-2" />
                Option Calculator
              </Button>
              <Button variant="outline">
                <Target className="w-4 h-4 mr-2" />
                Strategy Builder
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-[#111111] border-[#1E1E1E]"
              />
            </div>
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AAPL">AAPL</SelectItem>
                <SelectItem value="MSFT">MSFT</SelectItem>
                <SelectItem value="GOOGL">GOOGL</SelectItem>
                <SelectItem value="TSLA">TSLA</SelectItem>
                <SelectItem value="NVDA">NVDA</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expiryDates.map((date) => (
                  <SelectItem key={date} value={date}>{date}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Underlying Info */}
          <Card className="bg-[#111111] border-[#1E1E1E] mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-2xl font-bold">{selectedSymbol}</div>
                    <div className="text-sm text-gray-400">Underlying Stock</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{formatCurrency(underlyingPrice)}</div>
                    <div className={`text-sm flex items-center gap-1 ${getChangeColor(priceChange)}`}>
                      {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatCurrency(Math.abs(priceChange))} ({formatPercent(priceChangePercent)})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-sm text-gray-400">IV Rank</div>
                    <div className="text-lg font-semibold">68%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">HV (30d)</div>
                    <div className="text-lg font-semibold">24.5%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Days to Expiry</div>
                    <div className="text-lg font-semibold">4</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="chain" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chain">Option Chain</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="volatility">Volatility</TabsTrigger>
          </TabsList>

          <TabsContent value="chain" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Option Chain - {selectedExpiry}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1E1E1E]">
                        <th className="text-left py-3 px-2">Bid</th>
                        <th className="text-left py-3 px-2">Ask</th>
                        <th className="text-left py-3 px-2">Vol</th>
                        <th className="text-left py-3 px-2">OI</th>
                        <th className="text-left py-3 px-2">IV</th>
                        <th className="text-left py-3 px-2">Delta</th>
                        <th className="text-left py-3 px-2">Calls</th>
                        <th className="text-center py-3 px-4 font-bold">Strike</th>
                        <th className="text-right py-3 px-2">Puts</th>
                        <th className="text-right py-3 px-2">Delta</th>
                        <th className="text-right py-3 px-2">IV</th>
                        <th className="text-right py-3 px-2">OI</th>
                        <th className="text-right py-3 px-2">Vol</th>
                        <th className="text-right py-3 px-2">Ask</th>
                        <th className="text-right py-3 px-2">Bid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optionChain.map((row, index) => (
                        <tr key={index} className="border-b border-[#1E1E1E]/50 hover:bg-[#1A1A1A]">
                          {/* Call Options */}
                          <td className="py-3 px-2">{row.callBid.toFixed(2)}</td>
                          <td className="py-3 px-2">{row.callAsk.toFixed(2)}</td>
                          <td className="py-3 px-2">{row.callVolume.toLocaleString()}</td>
                          <td className="py-3 px-2">{row.callOpenInterest.toLocaleString()}</td>
                          <td className="py-3 px-2">{(row.callIV * 100).toFixed(1)}%</td>
                          <td className="py-3 px-2">{row.callDelta.toFixed(3)}</td>
                          <td className="py-3 px-2">
                            <Button variant="outline" size="sm" className="w-16">
                              Call
                            </Button>
                          </td>
                          
                          {/* Strike */}
                          <td className={`py-3 px-4 text-center font-bold ${getMoneynessColor(row.strike)}`}>
                            {row.strike}
                            <div className="text-xs text-gray-400">{getMoneyness(row.strike)}</div>
                          </td>
                          
                          {/* Put Options */}
                          <td className="py-3 px-2 text-right">
                            <Button variant="outline" size="sm" className="w-16">
                              Put
                            </Button>
                          </td>
                          <td className="py-3 px-2 text-right">{row.putDelta.toFixed(3)}</td>
                          <td className="py-3 px-2 text-right">{(row.putIV * 100).toFixed(1)}%</td>
                          <td className="py-3 px-2 text-right">{row.putOpenInterest.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right">{row.putVolume.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right">{row.putAsk.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right">{row.putBid.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Total P&L</p>
                      <p className={`text-2xl font-bold ${getChangeColor(calculateTotalPnL())}`}>
                        {formatCurrency(calculateTotalPnL())}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Total Delta</p>
                      <p className="text-2xl font-bold">{calculateTotalDelta().toFixed(3)}</p>
                    </div>
                    <Target className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Total Gamma</p>
                      <p className="text-2xl font-bold">{calculateTotalGamma().toFixed(3)}</p>
                    </div>
                    <Calculator className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Total Theta</p>
                      <p className="text-2xl font-bold text-red-400">{calculateTotalTheta().toFixed(3)}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Open Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1E1E1E]">
                        <th className="text-left py-3">Symbol</th>
                        <th className="text-left py-3">Type</th>
                        <th className="text-right py-3">Strike</th>
                        <th className="text-right py-3">Expiry</th>
                        <th className="text-right py-3">Quantity</th>
                        <th className="text-right py-3">Avg Price</th>
                        <th className="text-right py-3">Current</th>
                        <th className="text-right py-3">P&L</th>
                        <th className="text-right py-3">Delta</th>
                        <th className="text-right py-3">Theta</th>
                        <th className="text-right py-3">IV</th>
                        <th className="text-right py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => (
                        <tr key={position.id} className="border-b border-[#1E1E1E]/50">
                          <td className="py-3 font-semibold">{position.symbol}</td>
                          <td className="py-3">
                            <Badge className={position.type === 'call' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                              {position.type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">{formatCurrency(position.strike)}</td>
                          <td className="py-3 text-right">{position.expiry}</td>
                          <td className="py-3 text-right">{position.quantity}</td>
                          <td className="py-3 text-right">{formatCurrency(position.avgPrice)}</td>
                          <td className="py-3 text-right">{formatCurrency(position.currentPrice)}</td>
                          <td className={`py-3 text-right ${getChangeColor(position.pnl)}`}>
                            {formatCurrency(position.pnl)}
                            <div className="text-xs">{formatPercent(position.pnlPercent)}</div>
                          </td>
                          <td className="py-3 text-right">{position.delta.toFixed(3)}</td>
                          <td className="py-3 text-right text-red-400">{position.theta.toFixed(3)}</td>
                          <td className="py-3 text-right">{(position.iv * 100).toFixed(1)}%</td>
                          <td className="py-3 text-right">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">Close</Button>
                              <Button variant="outline" size="sm">Modify</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>P&L Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={pnlData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="price" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333',
                          borderRadius: '6px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="pnl" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Greeks Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border border-[#1E1E1E] rounded-lg">
                        <div className="text-sm text-gray-400">Portfolio Delta</div>
                        <div className="text-2xl font-bold">{calculateTotalDelta().toFixed(3)}</div>
                        <div className="text-xs text-gray-400">Directional exposure</div>
                      </div>
                      <div className="p-4 border border-[#1E1E1E] rounded-lg">
                        <div className="text-sm text-gray-400">Portfolio Gamma</div>
                        <div className="text-2xl font-bold">{calculateTotalGamma().toFixed(3)}</div>
                        <div className="text-xs text-gray-400">Delta sensitivity</div>
                      </div>
                      <div className="p-4 border border-[#1E1E1E] rounded-lg">
                        <div className="text-sm text-gray-400">Portfolio Theta</div>
                        <div className="text-2xl font-bold text-red-400">{calculateTotalTheta().toFixed(3)}</div>
                        <div className="text-xs text-gray-400">Time decay</div>
                      </div>
                      <div className="p-4 border border-[#1E1E1E] rounded-lg">
                        <div className="text-sm text-gray-400">Portfolio Vega</div>
                        <div className="text-2xl font-bold">0.245</div>
                        <div className="text-xs text-gray-400">Volatility sensitivity</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strategies.slice(1).map((strategy) => (
                <Card key={strategy.value} className="bg-[#111111] border-[#1E1E1E] cursor-pointer hover:border-blue-500/50">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3">{strategy.label}</h3>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div>Market Outlook: Neutral to Bullish</div>
                      <div>Max Profit: Limited</div>
                      <div>Max Loss: Limited</div>
                      <div>Breakeven: $175.50</div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      Build Strategy
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="volatility" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Volatility Smile</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={volatilityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="strike" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333',
                          borderRadius: '6px'
                        }} 
                      />
                      <Line type="monotone" dataKey="iv" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Volatility Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border border-[#1E1E1E] rounded-lg">
                      <span>Historical Volatility (30d)</span>
                      <span className="font-semibold">24.5%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-[#1E1E1E] rounded-lg">
                      <span>Implied Volatility (ATM)</span>
                      <span className="font-semibold">28.0%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-[#1E1E1E] rounded-lg">
                      <span>IV Rank</span>
                      <span className="font-semibold text-yellow-400">68%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-[#1E1E1E] rounded-lg">
                      <span>IV Percentile</span>
                      <span className="font-semibold">72%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
