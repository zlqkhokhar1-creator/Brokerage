"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Globe, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  MapPin, 
  Calendar,
  AlertCircle,
  Info,
  ArrowRightLeft,
  BarChart3,
  FileText
} from 'lucide-react';

interface Market {
  id: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  localTime: string;
  indices: MarketIndex[];
  topGainers: Stock[];
  topLosers: Stock[];
  volume: number;
  change: number;
}

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  market: string;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  changePercent: number;
}

interface TradingHours {
  market: string;
  timezone: string;
  preMarket: { start: string; end: string };
  regular: { start: string; end: string };
  afterHours: { start: string; end: string };
  isOpen: boolean;
  nextOpen: string;
  nextClose: string;
}

export default function InternationalMarketsPage() {
  const [activeTab, setActiveTab] = useState('markets');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [tradingHours, setTradingHours] = useState<TradingHours[]>([]);
  const [loading, setLoading] = useState(true);

  // Currency converter state
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState(1000);
  const [convertedAmount, setConvertedAmount] = useState(0);

  useEffect(() => {
    fetchInternationalMarkets();
    fetchExchangeRates();
    fetchTradingHours();
  }, []);

  const fetchInternationalMarkets = async () => {
    // Mock API call - replace with actual backend call
    // const response = await fetch('/api/v1/international/markets');
    
    const mockMarkets: Market[] = [
      {
        id: 'NASDAQ',
        name: 'NASDAQ',
        country: 'United States',
        currency: 'USD',
        timezone: 'EST',
        isOpen: true,
        openTime: '09:30',
        closeTime: '16:00',
        localTime: '14:30',
        indices: [
          { symbol: 'IXIC', name: 'NASDAQ Composite', price: 15420.34, change: 123.45, changePercent: 0.81 },
          { symbol: 'NDX', name: 'NASDAQ 100', price: 16890.12, change: 234.56, changePercent: 1.41 }
        ],
        topGainers: [
          { symbol: 'NVDA', name: 'NVIDIA Corp', price: 789.45, change: 45.23, changePercent: 6.08, currency: 'USD', market: 'NASDAQ' },
          { symbol: 'MSFT', name: 'Microsoft Corp', price: 378.90, change: 12.34, changePercent: 3.37, currency: 'USD', market: 'NASDAQ' }
        ],
        topLosers: [
          { symbol: 'NFLX', name: 'Netflix Inc', price: 456.78, change: -23.45, changePercent: -4.89, currency: 'USD', market: 'NASDAQ' }
        ],
        volume: 4500000000,
        change: 1.2
      },
      {
        id: 'LSE',
        name: 'London Stock Exchange',
        country: 'United Kingdom',
        currency: 'GBP',
        timezone: 'GMT',
        isOpen: false,
        openTime: '08:00',
        closeTime: '16:30',
        localTime: '19:30',
        indices: [
          { symbol: 'UKX', name: 'FTSE 100', price: 7654.32, change: -45.67, changePercent: -0.59 },
          { symbol: 'MCX', name: 'FTSE 250', price: 19876.54, change: -123.45, changePercent: -0.62 }
        ],
        topGainers: [
          { symbol: 'SHEL.L', name: 'Shell PLC', price: 2456.78, change: 89.12, changePercent: 3.76, currency: 'GBP', market: 'LSE' }
        ],
        topLosers: [
          { symbol: 'BP.L', name: 'BP PLC', price: 456.78, change: -34.56, changePercent: -7.04, currency: 'GBP', market: 'LSE' }
        ],
        volume: 2100000000,
        change: -0.59
      },
      {
        id: 'TSE',
        name: 'Tokyo Stock Exchange',
        country: 'Japan',
        currency: 'JPY',
        timezone: 'JST',
        isOpen: false,
        openTime: '09:00',
        closeTime: '15:00',
        localTime: '03:30',
        indices: [
          { symbol: 'N225', name: 'Nikkei 225', price: 33456.78, change: 234.56, changePercent: 0.71 },
          { symbol: 'TPX', name: 'TOPIX', price: 2345.67, change: 12.34, changePercent: 0.53 }
        ],
        topGainers: [
          { symbol: '7203.T', name: 'Toyota Motor Corp', price: 2890.0, change: 145.0, changePercent: 5.28, currency: 'JPY', market: 'TSE' }
        ],
        topLosers: [
          { symbol: '6758.T', name: 'Sony Group Corp', price: 12450.0, change: -456.0, changePercent: -3.53, currency: 'JPY', market: 'TSE' }
        ],
        volume: 3200000000,
        change: 0.71
      },
      {
        id: 'HKEX',
        name: 'Hong Kong Exchange',
        country: 'Hong Kong',
        currency: 'HKD',
        timezone: 'HKT',
        isOpen: false,
        openTime: '09:30',
        closeTime: '16:00',
        localTime: '02:30',
        indices: [
          { symbol: 'HSI', name: 'Hang Seng Index', price: 16789.45, change: -234.56, changePercent: -1.38 }
        ],
        topGainers: [
          { symbol: '0700.HK', name: 'Tencent Holdings', price: 378.90, change: 23.45, changePercent: 6.60, currency: 'HKD', market: 'HKEX' }
        ],
        topLosers: [
          { symbol: '0941.HK', name: 'China Mobile', price: 56.78, change: -4.56, changePercent: -7.44, currency: 'HKD', market: 'HKEX' }
        ],
        volume: 1800000000,
        change: -1.38
      }
    ];

    setMarkets(mockMarkets);
  };

  const fetchExchangeRates = async () => {
    const mockRates: ExchangeRate[] = [
      { from: 'USD', to: 'EUR', rate: 0.8456, change: -0.0023, changePercent: -0.27 },
      { from: 'USD', to: 'GBP', rate: 0.7892, change: 0.0034, changePercent: 0.43 },
      { from: 'USD', to: 'JPY', rate: 149.32, change: -1.23, changePercent: -0.82 },
      { from: 'USD', to: 'HKD', rate: 7.8234, change: 0.0056, changePercent: 0.07 },
      { from: 'EUR', to: 'GBP', rate: 0.9332, change: 0.0045, changePercent: 0.48 },
      { from: 'EUR', to: 'JPY', rate: 176.54, change: -0.89, changePercent: -0.50 }
    ];

    setExchangeRates(mockRates);
  };

  const fetchTradingHours = async () => {
    const mockHours: TradingHours[] = [
      {
        market: 'NASDAQ',
        timezone: 'EST',
        preMarket: { start: '04:00', end: '09:30' },
        regular: { start: '09:30', end: '16:00' },
        afterHours: { start: '16:00', end: '20:00' },
        isOpen: true,
        nextOpen: '2024-01-16T09:30:00-05:00',
        nextClose: '2024-01-15T16:00:00-05:00'
      },
      {
        market: 'LSE',
        timezone: 'GMT',
        preMarket: { start: '07:00', end: '08:00' },
        regular: { start: '08:00', end: '16:30' },
        afterHours: { start: '16:30', end: '17:30' },
        isOpen: false,
        nextOpen: '2024-01-16T08:00:00Z',
        nextClose: '2024-01-15T16:30:00Z'
      },
      {
        market: 'TSE',
        timezone: 'JST',
        preMarket: { start: '08:00', end: '09:00' },
        regular: { start: '09:00', end: '15:00' },
        afterHours: { start: '15:00', end: '15:30' },
        isOpen: false,
        nextOpen: '2024-01-16T09:00:00+09:00',
        nextClose: '2024-01-15T15:00:00+09:00'
      }
    ];

    setTradingHours(mockHours);
    setLoading(false);
  };

  const convertCurrency = (fromCur: string, toCur: string, amount: number) => {
    const rate = exchangeRates.find(r => r.from === fromCur && r.to === toCur);
    if (rate) {
      return amount * rate.rate;
    }
    // Try reverse rate
    const reverseRate = exchangeRates.find(r => r.from === toCur && r.to === fromCur);
    if (reverseRate) {
      return amount / reverseRate.rate;
    }
    return amount; // Fallback
  };

  useEffect(() => {
    const converted = convertCurrency(fromCurrency, toCurrency, amount);
    setConvertedAmount(converted);
  }, [fromCurrency, toCurrency, amount, exchangeRates]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getMarketStatusColor = (isOpen: boolean) => {
    return isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
  };

  const getRegionFlag = (country: string) => {
    const flags: Record<string, string> = {
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'Japan': '🇯🇵',
      'Hong Kong': '🇭🇰',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺'
    };
    return flags[country] || '🌍';
  };

  const filteredMarkets = selectedRegion === 'all' 
    ? markets 
    : markets.filter(market => {
        if (selectedRegion === 'americas') return ['United States', 'Canada'].includes(market.country);
        if (selectedRegion === 'europe') return ['United Kingdom', 'Germany', 'France'].includes(market.country);
        if (selectedRegion === 'asia') return ['Japan', 'Hong Kong', 'China', 'Australia'].includes(market.country);
        return true;
      });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-400" />
          <p className="text-lg">Loading international markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold mb-2">International Markets</h1>
                <p className="text-gray-400">Trade global markets across different time zones and currencies</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-48 bg-[#111111] border-[#1E1E1E]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="americas">Americas</SelectItem>
                  <SelectItem value="europe">Europe</SelectItem>
                  <SelectItem value="asia">Asia-Pacific</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="markets">Markets Overview</TabsTrigger>
            <TabsTrigger value="hours">Trading Hours</TabsTrigger>
            <TabsTrigger value="currency">Currency Exchange</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="markets" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredMarkets.map((market) => (
                <Card key={market.id} className="bg-[#111111] border-[#1E1E1E]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getRegionFlag(market.country)}</span>
                        <div>
                          <CardTitle className="text-lg">{market.name}</CardTitle>
                          <p className="text-sm text-gray-400">{market.country}</p>
                        </div>
                      </div>
                      <Badge className={getMarketStatusColor(market.isOpen)}>
                        {market.isOpen ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Market Indices */}
                    <div>
                      <h4 className="font-medium mb-2">Major Indices</h4>
                      <div className="space-y-2">
                        {market.indices.map((index) => (
                          <div key={index.symbol} className="flex items-center justify-between text-sm">
                            <span>{index.name}</span>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(index.price, market.currency)}</div>
                              <div className={`text-xs ${getChangeColor(index.change)}`}>
                                {formatPercent(index.changePercent)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Movers */}
                    <div>
                      <h4 className="font-medium mb-2">Top Movers</h4>
                      <div className="space-y-2">
                        {[...market.topGainers.slice(0, 2), ...market.topLosers.slice(0, 1)].map((stock) => (
                          <div key={stock.symbol} className="flex items-center justify-between text-sm">
                            <div>
                              <div className="font-medium">{stock.symbol}</div>
                              <div className="text-xs text-gray-400 truncate">{stock.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(stock.price, stock.currency)}</div>
                              <div className={`text-xs ${getChangeColor(stock.change)}`}>
                                {formatPercent(stock.changePercent)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Market Info */}
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-[#1E1E1E]">
                      <div>
                        <span className="text-gray-400">Local Time: </span>
                        <span className="font-medium">{market.localTime}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Currency: </span>
                        <span className="font-medium">{market.currency}</span>
                      </div>
                    </div>

                    <Button className="w-full" variant="outline">
                      <Building2 className="w-4 h-4 mr-2" />
                      Browse {market.name} Stocks
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hours" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Global Trading Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tradingHours.map((hours) => (
                    <div key={hours.market} className="p-4 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{hours.market}</h3>
                        <Badge className={getMarketStatusColor(hours.isOpen)}>
                          <Clock className="w-3 h-3 mr-1" />
                          {hours.isOpen ? 'Open' : 'Closed'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-gray-400">Timezone: </span>
                          <span className="font-medium">{hours.timezone}</span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pre-Market:</span>
                            <span>{hours.preMarket.start} - {hours.preMarket.end}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Regular:</span>
                            <span className="font-medium">{hours.regular.start} - {hours.regular.end}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">After Hours:</span>
                            <span>{hours.afterHours.start} - {hours.afterHours.end}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-[#1E1E1E]">
                          <div className="text-xs text-gray-400">
                            Next {hours.isOpen ? 'Close' : 'Open'}: {' '}
                            {new Date(hours.isOpen ? hours.nextClose : hours.nextOpen).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="currency" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Currency Converter */}
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Currency Converter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">From</label>
                      <Select value={fromCurrency} onValueChange={setFromCurrency}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#1E1E1E]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                          <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const temp = fromCurrency;
                          setFromCurrency(toCurrency);
                          setToCurrency(temp);
                        }}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">To</label>
                      <Select value={toCurrency} onValueChange={setToCurrency}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#1E1E1E]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                          <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Amount</label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="bg-[#1A1A1A] border-[#1E1E1E]"
                    />
                  </div>
                  
                  <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#1E1E1E]">
                    <div className="text-2xl font-bold text-blue-400">
                      {formatCurrency(convertedAmount, toCurrency)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatCurrency(amount, fromCurrency)} = {formatCurrency(convertedAmount, toCurrency)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exchange Rates */}
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Live Exchange Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {exchangeRates.map((rate) => (
                      <div key={`${rate.from}-${rate.to}`} className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-semibold">
                            {rate.from}/{rate.to}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{rate.rate.toFixed(4)}</div>
                          <div className={`text-sm ${getChangeColor(rate.change)}`}>
                            {rate.change >= 0 ? '+' : ''}{rate.change.toFixed(4)} ({formatPercent(rate.changePercent)})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cross-Border Trading Requirements */}
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Cross-Border Trading Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 border border-[#1E1E1E] rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium mb-1">Identity Verification</h4>
                        <p className="text-sm text-gray-400">Enhanced KYC required for international trading</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 border border-[#1E1E1E] rounded-lg">
                      <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium mb-1">Tax Documentation</h4>
                        <p className="text-sm text-gray-400">W-8BEN or equivalent forms may be required</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 border border-[#1E1E1E] rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium mb-1">Currency Restrictions</h4>
                        <p className="text-sm text-gray-400">Some markets have currency conversion limits</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 border border-[#1E1E1E] rounded-lg">
                      <Calendar className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium mb-1">Settlement Periods</h4>
                        <p className="text-sm text-gray-400">International trades may have extended settlement times</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    View Full Compliance Guide
                  </Button>
                </CardContent>
              </Card>

              {/* Market-Specific Information */}
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Market-Specific Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🇺🇸</span>
                        <h4 className="font-medium">United States</h4>
                      </div>
                      <p className="text-sm text-gray-400">No additional restrictions for US residents</p>
                    </div>
                    
                    <div className="p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🇬🇧</span>
                        <h4 className="font-medium">United Kingdom</h4>
                      </div>
                      <p className="text-sm text-gray-400">Subject to UK stamp duty on purchases</p>
                    </div>
                    
                    <div className="p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🇯🇵</span>
                        <h4 className="font-medium">Japan</h4>
                      </div>
                      <p className="text-sm text-gray-400">Trading permitted during JST business hours only</p>
                    </div>
                    
                    <div className="p-3 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🇭🇰</span>
                        <h4 className="font-medium">Hong Kong</h4>
                      </div>
                      <p className="text-sm text-gray-400">HKD conversion limits apply for large positions</p>
                    </div>
                  </div>
                  
                  <Button className="w-full" variant="outline">
                    <Info className="w-4 h-4 mr-2" />
                    Market Access Application
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
