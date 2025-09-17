'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Target, 
  Keyboard, 
  Download, 
  Settings, 
  Bell,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Shield,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Calculator,
  BookOpen,
  PieChart
} from 'lucide-react';
import { useState, useEffect } from 'react';

const marketData = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, change: '+3.45%', changeValue: '+5.67', volume: '45.2M', positive: true },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.67, change: '+2.89%', changeValue: '+6.89', volume: '32.1M', positive: true },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 432.12, change: '-1.23%', changeValue: '-5.38', volume: '28.7M', positive: false },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 335.89, change: '+1.67%', changeValue: '+5.52', volume: '25.4M', positive: true },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 123.45, change: '-0.89%', changeValue: '-1.11', volume: '18.3M', positive: false },
  { symbol: 'AMZN', name: 'Amazon.com', price: 134.56, change: '+0.45%', changeValue: '+0.61', volume: '22.1M', positive: true },
];

const positions = [
  { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, avgPrice: 150.00, currentPrice: 175.43, value: 8771.50, pnl: 1271.50, pnlPercent: 16.95, positive: true },
  { symbol: 'TSLA', name: 'Tesla Inc.', shares: 25, avgPrice: 200.00, currentPrice: 245.67, value: 6141.75, pnl: 1141.75, pnlPercent: 22.84, positive: true },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 15, avgPrice: 350.00, currentPrice: 432.12, value: 6481.80, pnl: 1231.80, pnlPercent: 23.49, positive: true },
  { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 30, avgPrice: 280.00, currentPrice: 335.89, value: 10076.70, pnl: 1676.70, pnlPercent: 19.96, positive: true },
];

export default function TradingPage() {
  const [activeTab, setActiveTab] = useState('trading');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [orderType, setOrderType] = useState('market');
  const [action, setAction] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const tabs = [
    { id: 'trading', label: 'Trading', icon: Activity },
    { id: 'chart', label: 'Chart', icon: BarChart3 },
    { id: 'orderbook', label: 'Order Book', icon: BookOpen },
    { id: 'positions', label: 'Positions', icon: PieChart },
    { id: 'tools', label: 'Tools', icon: Calculator },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Professional Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1 text-foreground mb-2">Trading Platform</h1>
            <p className="text-body-large text-muted-foreground">
              Execute trades and manage positions with professional tools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Keyboard className="h-4 w-4" />
              Shortcuts
            </Button>
          </div>
        </div>

        {/* Market Status Banner */}
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="font-medium text-success">Market Open</span>
                <span className="text-sm text-muted-foreground">• Live trading until 4:00 PM ET</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Last Update: 2:34 PM</span>
                <Badge variant="success" size="sm">Live</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Tab Navigation */}
        <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Trading Interface */}
        {activeTab === 'trading' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Form */}
            <div className="lg:col-span-1">
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="text-xl">Place Order</CardTitle>
                  <CardDescription>Execute your trades with precision</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Symbol Selection */}
                  <div className="space-y-2">
                    <label className="label-professional">Symbol</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search symbol..."
                        value={selectedSymbol}
                        onChange={(e) => setSelectedSymbol(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Order Type */}
                  <div className="space-y-2">
                    <label className="label-professional">Order Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'market', label: 'Market' },
                        { value: 'limit', label: 'Limit' },
                        { value: 'stop', label: 'Stop' },
                        { value: 'stop_limit', label: 'Stop Limit' },
                      ].map((type) => (
                        <Button
                          key={type.value}
                          variant={orderType === type.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setOrderType(type.value)}
                          className="w-full"
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Buy/Sell Toggle */}
                  <div className="space-y-2">
                    <label className="label-professional">Action</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={action === 'buy' ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setAction('buy')}
                        className={`w-full ${action === 'buy' ? 'bg-success hover:bg-success/90' : ''}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Buy
                      </Button>
                      <Button
                        variant={action === 'sell' ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setAction('sell')}
                        className={`w-full ${action === 'sell' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Sell
                      </Button>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <label className="label-professional">Quantity</label>
                    <Input
                      type="number"
                      placeholder="Number of shares"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>

                  {/* Price (for limit orders) */}
                  {orderType !== 'market' && (
                    <div className="space-y-2">
                      <label className="label-professional">Price</label>
                      <Input
                        type="number"
                        placeholder="Limit price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-foreground">Order Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="font-medium">{selectedSymbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Action:</span>
                        <span className={`font-medium ${action === 'buy' ? 'text-success' : 'text-destructive'}`}>
                          {action.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-medium">{quantity || '0'} shares</span>
                      </div>
                      {orderType !== 'market' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium">${price || '0.00'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button className="w-full" size="lg">
                      <Activity className="h-4 w-4 mr-2" />
                      Place Order
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculate Position
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Data & Positions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Market Data */}
              <Card className="card-professional">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Market Data</CardTitle>
                      <CardDescription>Real-time stock prices and movements</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {marketData.map((stock, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <span className="font-bold text-sm">{stock.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{stock.symbol}</p>
                            <p className="text-sm text-muted-foreground">{stock.name}</p>
                            <p className="text-xs text-muted-foreground">Vol: {stock.volume}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground text-lg">${stock.price}</p>
                          <div className="flex items-center gap-1">
                            {stock.positive ? (
                              <ArrowUpRight className="h-4 w-4 text-success" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-destructive" />
                            )}
                            <span className={`text-sm font-medium ${stock.positive ? 'text-success' : 'text-destructive'}`}>
                              {stock.change}
                            </span>
                            <span className={`text-sm ${stock.positive ? 'text-success' : 'text-destructive'}`}>
                              ({stock.changeValue})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Positions */}
              <Card className="card-professional">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Current Positions</CardTitle>
                      <CardDescription>Your active holdings and performance</CardDescription>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <PieChart className="h-3 w-3" />
                      {positions.length} positions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {positions.map((position, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <span className="font-bold text-sm">{position.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{position.symbol}</p>
                            <p className="text-sm text-muted-foreground">{position.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {position.shares} shares @ ${position.avgPrice}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">${position.currentPrice}</p>
                          <p className="text-sm text-muted-foreground">${position.value.toLocaleString()}</p>
                          <div className="flex items-center gap-1">
                            {position.positive ? (
                              <ArrowUpRight className="h-4 w-4 text-success" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-destructive" />
                            )}
                            <span className={`text-sm font-medium ${position.positive ? 'text-success' : 'text-destructive'}`}>
                              ${position.pnl.toLocaleString()} ({position.pnlPercent}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Chart Tab */}
        {activeTab === 'chart' && (
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="text-xl">Advanced Charting</CardTitle>
              <CardDescription>Professional trading charts with technical indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-muted/30 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    Professional Trading Chart
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Interactive candlestick charts with technical analysis tools
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="secondary">Candlesticks</Badge>
                    <Badge variant="secondary">Volume</Badge>
                    <Badge variant="secondary">RSI</Badge>
                    <Badge variant="secondary">MACD</Badge>
                    <Badge variant="secondary">Moving Averages</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Book Tab */}
        {activeTab === 'orderbook' && (
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="text-xl">Order Book</CardTitle>
              <CardDescription>Level II market data and order flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-muted/30 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    Real-time Order Book
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Live Level II data showing bid/ask spreads and order flow
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="secondary">Bid Orders</Badge>
                    <Badge variant="secondary">Ask Orders</Badge>
                    <Badge variant="secondary">Volume</Badge>
                    <Badge variant="secondary">Spread</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="text-xl">Portfolio Positions</CardTitle>
              <CardDescription>Detailed view of all your holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {positions.map((position, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-6 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                        <span className="font-bold text-lg">{position.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-lg">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">{position.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {position.shares} shares • Avg: ${position.avgPrice}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-xl">${position.currentPrice}</p>
                      <p className="text-sm text-muted-foreground">Value: ${position.value.toLocaleString()}</p>
                      <div className="flex items-center gap-1">
                        {position.positive ? (
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        )}
                        <span className={`font-semibold ${position.positive ? 'text-success' : 'text-destructive'}`}>
                          ${position.pnl.toLocaleString()} ({position.pnlPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-professional">
              <CardHeader>
                <CardTitle className="text-xl">Position Calculator</CardTitle>
                <CardDescription>Calculate position size and risk</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="label-professional">Account Value</label>
                    <Input placeholder="$100,000" />
                  </div>
                  <div className="space-y-2">
                    <label className="label-professional">Risk Per Trade (%)</label>
                    <Input placeholder="2" />
                  </div>
                  <div className="space-y-2">
                    <label className="label-professional">Entry Price</label>
                    <Input placeholder="$175.43" />
                  </div>
                  <div className="space-y-2">
                    <label className="label-professional">Stop Loss</label>
                    <Input placeholder="$170.00" />
                  </div>
                  <Button className="w-full">
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Position Size
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card-professional">
              <CardHeader>
                <CardTitle className="text-xl">Quick Tools</CardTitle>
                <CardDescription>Essential trading utilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Download className="h-4 w-4" />
                  Export Portfolio
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Settings className="h-4 w-4" />
                  Trading Settings
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Bell className="h-4 w-4" />
                  Set Price Alert
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <BookOpen className="h-4 w-4" />
                  Trading Journal
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}