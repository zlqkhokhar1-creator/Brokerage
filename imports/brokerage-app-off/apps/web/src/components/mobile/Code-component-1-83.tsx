import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft,
  Calculator,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { mockStocks, Stock } from '@/lib/mockData';

interface TradePageProps {
  onNavigate: (page: 'home' | 'portfolio' | 'watchlist' | 'explore') => void;
}

export function TradePage({ onNavigate }: TradePageProps) {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState<'day' | 'gtc'>('day');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const filteredStocks = mockStocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateEstimatedTotal = () => {
    if (!selectedStock || !quantity) return 0;
    const price = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : selectedStock.price;
    return parseFloat(quantity) * price;
  };

  const handlePlaceOrder = async () => {
    if (!selectedStock || !quantity) return;
    
    setIsPlacingOrder(true);
    
    // Mock order placement
    setTimeout(() => {
      alert(`${orderSide.toUpperCase()} order for ${quantity} shares of ${selectedStock.symbol} has been submitted!`);
      setIsPlacingOrder(false);
      setSelectedStock(null);
      setQuantity('');
      setLimitPrice('');
      setStopPrice('');
      onNavigate('portfolio');
    }, 1500);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-xl">Trade</h1>
        <div></div>
      </div>

      {/* Stock Search */}
      {!selectedStock && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for stocks to trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {searchQuery && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStocks.slice(0, 10).map((stock) => (
                <Card 
                  key={stock.symbol} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedStock(stock);
                    setSearchQuery('');
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{stock.symbol}</h4>
                        <p className="text-sm text-muted-foreground truncate max-w-48">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(stock.price)}</p>
                        <div className={`flex items-center gap-1 text-sm ${
                          stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stock.change >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{formatPercent(stock.changePercent)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Popular Stocks */}
          {!searchQuery && (
            <div className="space-y-4">
              <h3 className="text-lg">Popular Stocks</h3>
              <div className="grid grid-cols-1 gap-2">
                {mockStocks.slice(0, 6).map((stock) => (
                  <Card 
                    key={stock.symbol} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedStock(stock)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{stock.symbol}</h4>
                          <p className="text-sm text-muted-foreground truncate max-w-48">{stock.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(stock.price)}</p>
                          <div className={`flex items-center gap-1 text-sm ${
                            stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stock.change >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span>{formatPercent(stock.changePercent)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trading Interface */}
      {selectedStock && (
        <div className="space-y-6">
          {/* Selected Stock Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl">{selectedStock.symbol}</h2>
                  <p className="text-sm text-muted-foreground">{selectedStock.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStock(null)}
                >
                  Change
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-2xl">{formatCurrency(selectedStock.price)}</div>
                <div className={`flex items-center gap-2 ${
                  selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedStock.change >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{formatCurrency(Math.abs(selectedStock.change))}</span>
                  <span>({formatPercent(selectedStock.changePercent)})</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Form */}
          <Card>
            <CardHeader>
              <CardTitle>Place Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buy/Sell Toggle */}
              <Tabs value={orderSide} onValueChange={(value: 'buy' | 'sell') => setOrderSide(value)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buy" className="text-green-600">Buy</TabsTrigger>
                  <TabsTrigger value="sell" className="text-red-600">Sell</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Order Type */}
              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={(value: 'market' | 'limit' | 'stop') => setOrderType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market Order</SelectItem>
                    <SelectItem value="limit">Limit Order</SelectItem>
                    <SelectItem value="stop">Stop Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="Number of shares"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              {/* Limit Price (for limit orders) */}
              {orderType === 'limit' && (
                <div className="space-y-2">
                  <Label>Limit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price per share"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                  />
                </div>
              )}

              {/* Stop Price (for stop orders) */}
              {orderType === 'stop' && (
                <div className="space-y-2">
                  <Label>Stop Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Stop price"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                  />
                </div>
              )}

              {/* Time in Force */}
              <div className="space-y-2">
                <Label>Time in Force</Label>
                <Select value={timeInForce} onValueChange={(value: 'day' | 'gtc') => setTimeInForce(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Day Order
                      </div>
                    </SelectItem>
                    <SelectItem value="gtc">Good Till Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order Summary */}
              {quantity && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Order Summary
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Shares:</span>
                          <span>{quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span>
                            {orderType === 'market' 
                              ? `${formatCurrency(selectedStock.price)} (Market)`
                              : orderType === 'limit' && limitPrice
                              ? formatCurrency(parseFloat(limitPrice))
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Estimated Total:</span>
                          <span>{formatCurrency(calculateEstimatedTotal())}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Place Order Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={!quantity || isPlacingOrder || (orderType === 'limit' && !limitPrice)}
              >
                {isPlacingOrder ? (
                  'Placing Order...'
                ) : (
                  <>
                    {orderSide === 'buy' ? (
                      <TrendingUp className="h-4 w-4 mr-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-2" />
                    )}
                    {orderSide === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
                  </>
                )}
              </Button>

              {/* Risk Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Trading Risk</p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    All investments carry risk of loss. Please ensure you understand the risks before trading.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}