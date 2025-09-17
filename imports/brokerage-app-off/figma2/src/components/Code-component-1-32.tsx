import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  TrendingUp, 
  User, 
  LogOut, 
  DollarSign, 
  TrendingDown,
  Search,
  Plus,
  Minus,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockStocks, mockPortfolio, mockTransactions, portfolioHistory, Stock, Position, Transaction } from './mockData';

interface DashboardProps {
  user: { id: string; email: string; name: string };
  onLogout: () => void;
  onStockClick: (symbol: string) => void;
}

export function Dashboard({ user, onLogout, onStockClick }: DashboardProps) {
  const [portfolio, setPortfolio] = useState(mockPortfolio);
  const [stocks, setStocks] = useState(mockStocks);
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'GOOGL', 'TSLA']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [isTrading, setIsTrading] = useState(false);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prevStocks => 
        prevStocks.map(stock => ({
          ...stock,
          price: Number((stock.price * (0.995 + Math.random() * 0.01)).toFixed(2)),
          change: Number(((Math.random() - 0.5) * 2).toFixed(2)),
          changePercent: Number(((Math.random() - 0.5) * 4).toFixed(2))
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const watchlistStocks = stocks.filter(stock => watchlist.includes(stock.symbol));

  const handleTrade = (type: 'BUY' | 'SELL') => {
    if (!selectedStock || !tradeAmount) return;
    
    setIsTrading(true);
    
    // Mock trade execution
    setTimeout(() => {
      const shares = parseInt(tradeAmount);
      const total = shares * selectedStock.price;
      
      // Add to transactions (mock)
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        type,
        symbol: selectedStock.symbol,
        shares,
        price: selectedStock.price,
        total,
        date: new Date()
      };

      console.log('Trade executed:', newTransaction);
      setIsTrading(false);
      setTradeAmount('');
      setSelectedStock(null);
      
      // In a real app, this would update the portfolio
      alert(`${type} order for ${shares} shares of ${selectedStock.symbol} submitted!`);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="ml-2 text-lg text-primary">InvestPro</span>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Account Value:</span>
                <span className="text-lg">{formatCurrency(portfolio.totalValue)}</span>
                <Badge variant={portfolio.dayChange >= 0 ? "default" : "destructive"}>
                  {portfolio.dayChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatCurrency(Math.abs(portfolio.dayChange))} ({formatPercent(portfolio.dayChangePercent)})
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm">{user.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Portfolio & Performance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Portfolio Performance</span>
                  <Badge variant={portfolio.totalReturn >= 0 ? "default" : "destructive"}>
                    {formatPercent(portfolio.totalReturnPercent)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl">{formatCurrency(portfolio.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Return</p>
                    <p className={`text-xl ${portfolio.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(portfolio.totalReturn)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Day Change</p>
                    <p className={`text-xl ${portfolio.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(portfolio.dayChange)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cash</p>
                    <p className="text-xl">{formatCurrency(25000)}</p>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={portfolioHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'Portfolio Value']} />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Holdings */}
            <Card>
              <CardHeader>
                <CardTitle>Your Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolio.positions.map((position) => (
                    <div
                      key={position.symbol}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onStockClick(position.symbol)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{position.symbol}</span>
                          <span className="text-sm text-muted-foreground">{position.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {position.shares} shares at {formatCurrency(position.avgCost)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p>{formatCurrency(position.marketValue)}</p>
                        <p className={`text-sm ${position.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(position.totalReturn)} ({formatPercent(position.totalReturnPercent)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trading & Watchlist */}
          <div className="space-y-6">
            {/* Stock Search & Trading */}
            <Card>
              <CardHeader>
                <CardTitle>Trade Stocks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search stocks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {selectedStock ? (
                    <div className="space-y-4 p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3>{selectedStock.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{selectedStock.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg">{formatCurrency(selectedStock.price)}</p>
                          <p className={`text-sm ${selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(selectedStock.change)} ({formatPercent(selectedStock.changePercent)})
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm">Number of Shares</label>
                        <Input
                          type="number"
                          placeholder="Enter shares"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                        />
                      </div>

                      {tradeAmount && (
                        <div className="text-sm text-muted-foreground">
                          Total: {formatCurrency(parseInt(tradeAmount || '0') * selectedStock.price)}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleTrade('BUY')}
                          disabled={!tradeAmount || isTrading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {isTrading ? 'Processing...' : 'Buy'}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleTrade('SELL')}
                          disabled={!tradeAmount || isTrading}
                        >
                          <Minus className="h-4 w-4 mr-2" />
                          {isTrading ? 'Processing...' : 'Sell'}
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setSelectedStock(null)}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredStocks.map((stock) => (
                        <div
                          key={stock.symbol}
                          className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedStock(stock)}
                        >
                          <div>
                            <p>{stock.symbol}</p>
                            <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{formatCurrency(stock.price)}</p>
                            <p className={`text-xs ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(stock.changePercent)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Watchlist */}
            <Card>
              <CardHeader>
                <CardTitle>Watchlist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {watchlistStocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onStockClick(stock.symbol)}
                    >
                      <div>
                        <p>{stock.symbol}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(stock.price)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={stock.change >= 0 ? "default" : "destructive"} className="text-xs">
                          {formatPercent(stock.changePercent)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockTransactions.slice(0, 4).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={transaction.type === 'BUY' ? "default" : "secondary"}>
                          {transaction.type}
                        </Badge>
                        <span>{transaction.symbol}</span>
                      </div>
                      <div className="text-right">
                        <p>{transaction.shares} shares</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(transaction.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}