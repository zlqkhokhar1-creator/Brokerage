import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Clock, 
  AlertTriangle,
  Settings,
  Calculator,
  Zap
} from 'lucide-react';

interface OrderData {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'BRACKET' | 'OCO' | 'TRAILING_STOP';
  price?: number;
  stopPrice?: number;
  trailAmount?: number;
  trailPercent?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  
  // Advanced order features
  takeProfitPrice?: number;
  stopLossPrice?: number;
  bracketOrders?: {
    takeProfit: number;
    stopLoss: number;
  };
  ocoOrders?: {
    limitPrice: number;
    stopPrice: number;
  };
  
  // Conditional orders
  conditionType?: 'PRICE' | 'TIME' | 'VOLUME' | 'TECHNICAL';
  conditionSymbol?: string;
  conditionOperator?: 'ABOVE' | 'BELOW' | 'EQUALS';
  conditionValue?: number;
  
  // Risk management
  maxLoss?: number;
  positionSizing?: 'FIXED' | 'PERCENT_PORTFOLIO' | 'RISK_BASED';
  riskAmount?: number;
}

interface QuoteData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
  volume: number;
}

const AdvancedOrderEntry: React.FC = () => {
  const [orderData, setOrderData] = useState<OrderData>({
    symbol: '',
    side: 'BUY',
    quantity: 0,
    orderType: 'MARKET',
    timeInForce: 'GTC',
    positionSizing: 'FIXED'
  });

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (orderData.symbol) {
      fetchQuote(orderData.symbol);
    }
  }, [orderData.symbol]);

  useEffect(() => {
    calculateEstimatedCost();
    calculateRisk();
  }, [orderData, quote]);

  const fetchQuote = async (symbol: string) => {
    try {
      const response = await fetch(`/api/v1/market/quote/${symbol}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuote(data.data);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    }
  };

  const calculateEstimatedCost = () => {
    if (!quote || !orderData.quantity) return;
    
    let price = quote.last;
    if (orderData.orderType === 'LIMIT' && orderData.price) {
      price = orderData.price;
    }
    
    const cost = orderData.quantity * price;
    setEstimatedCost(cost);
  };

  const calculateRisk = async () => {
    if (!orderData.symbol || !orderData.quantity) return;
    
    try {
      const response = await fetch('/api/v1/risk/position-size', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          symbol: orderData.symbol,
          quantity: orderData.quantity,
          price: orderData.price || quote?.last,
          stopLoss: orderData.stopLossPrice
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setRiskAnalysis(data.data);
      }
    } catch (error) {
      console.error('Error calculating risk:', error);
    }
  };

  const calculateOptimalPositionSize = async () => {
    if (!orderData.riskAmount || !orderData.stopLossPrice || !quote) return;
    
    const riskPerShare = Math.abs((quote.last) - orderData.stopLossPrice);
    const optimalShares = Math.floor(orderData.riskAmount / riskPerShare);
    
    setOrderData(prev => ({ ...prev, quantity: optimalShares }));
  };

  const submitOrder = async () => {
    try {
      setLoading(true);
      
      let endpoint = '/api/v1/orders';
      let payload = { ...orderData };
      
      // Handle special order types
      if (orderData.orderType === 'BRACKET') {
        payload = {
          ...payload,
          bracketOrders: {
            takeProfit: orderData.takeProfitPrice!,
            stopLoss: orderData.stopLossPrice!
          }
        };
      } else if (orderData.orderType === 'OCO') {
        payload = {
          ...payload,
          ocoOrders: {
            limitPrice: orderData.price!,
            stopPrice: orderData.stopPrice!
          }
        };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        // Reset form or show success
        setOrderData({
          symbol: '',
          side: 'BUY',
          quantity: 0,
          orderType: 'MARKET',
          timeInForce: 'GTC',
          positionSizing: 'FIXED'
        });
      }
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrderTypeDescription = (type: string) => {
    const descriptions = {
      'MARKET': 'Execute immediately at current market price',
      'LIMIT': 'Execute only at specified price or better',
      'STOP': 'Market order triggered when stop price is reached',
      'STOP_LIMIT': 'Limit order triggered when stop price is reached',
      'BRACKET': 'Order with both take-profit and stop-loss levels',
      'OCO': 'One-Cancels-Other: Two orders, one cancels the other when filled',
      'TRAILING_STOP': 'Stop order that trails the market price by a set amount'
    };
    return descriptions[type as keyof typeof descriptions] || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Order Entry</h1>
          <p className="text-muted-foreground">Place sophisticated orders with advanced risk management</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={previewMode}
            onCheckedChange={setPreviewMode}
          />
          <Label>Preview Mode</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Entry Form */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList>
              <TabsTrigger value="basic">Basic Order</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="conditional">Conditional</TabsTrigger>
              <TabsTrigger value="risk">Risk Management</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="symbol">Symbol</Label>
                      <Input
                        id="symbol"
                        value={orderData.symbol}
                        onChange={(e) => setOrderData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                        placeholder="AAPL"
                      />
                    </div>
                    <div>
                      <Label htmlFor="side">Side</Label>
                      <Select value={orderData.side} onValueChange={(value: 'BUY' | 'SELL') => setOrderData(prev => ({ ...prev, side: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              BUY
                            </div>
                          </SelectItem>
                          <SelectItem value="SELL">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              SELL
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={orderData.quantity}
                        onChange={(e) => setOrderData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="orderType">Order Type</Label>
                      <Select value={orderData.orderType} onValueChange={(value: any) => setOrderData(prev => ({ ...prev, orderType: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKET">Market</SelectItem>
                          <SelectItem value="LIMIT">Limit</SelectItem>
                          <SelectItem value="STOP">Stop</SelectItem>
                          <SelectItem value="STOP_LIMIT">Stop Limit</SelectItem>
                          <SelectItem value="BRACKET">Bracket</SelectItem>
                          <SelectItem value="OCO">OCO</SelectItem>
                          <SelectItem value="TRAILING_STOP">Trailing Stop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(orderData.orderType === 'LIMIT' || orderData.orderType === 'STOP_LIMIT') && (
                    <div>
                      <Label htmlFor="price">Limit Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={orderData.price || ''}
                        onChange={(e) => setOrderData(prev => ({ ...prev, price: Number(e.target.value) }))}
                      />
                    </div>
                  )}

                  {(orderData.orderType === 'STOP' || orderData.orderType === 'STOP_LIMIT') && (
                    <div>
                      <Label htmlFor="stopPrice">Stop Price</Label>
                      <Input
                        id="stopPrice"
                        type="number"
                        step="0.01"
                        value={orderData.stopPrice || ''}
                        onChange={(e) => setOrderData(prev => ({ ...prev, stopPrice: Number(e.target.value) }))}
                      />
                    </div>
                  )}

                  {orderData.orderType === 'TRAILING_STOP' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="trailAmount">Trail Amount ($)</Label>
                        <Input
                          id="trailAmount"
                          type="number"
                          step="0.01"
                          value={orderData.trailAmount || ''}
                          onChange={(e) => setOrderData(prev => ({ ...prev, trailAmount: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="trailPercent">Trail Percent (%)</Label>
                        <Input
                          id="trailPercent"
                          type="number"
                          step="0.1"
                          value={orderData.trailPercent || ''}
                          onChange={(e) => setOrderData(prev => ({ ...prev, trailPercent: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="timeInForce">Time in Force</Label>
                    <Select value={orderData.timeInForce} onValueChange={(value: any) => setOrderData(prev => ({ ...prev, timeInForce: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GTC">Good Till Canceled</SelectItem>
                        <SelectItem value="DAY">Day Order</SelectItem>
                        <SelectItem value="IOC">Immediate or Cancel</SelectItem>
                        <SelectItem value="FOK">Fill or Kill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      {getOrderTypeDescription(orderData.orderType)}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Order Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orderData.orderType === 'BRACKET' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="takeProfitPrice">Take Profit Price</Label>
                        <Input
                          id="takeProfitPrice"
                          type="number"
                          step="0.01"
                          value={orderData.takeProfitPrice || ''}
                          onChange={(e) => setOrderData(prev => ({ ...prev, takeProfitPrice: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="stopLossPrice">Stop Loss Price</Label>
                        <Input
                          id="stopLossPrice"
                          type="number"
                          step="0.01"
                          value={orderData.stopLossPrice || ''}
                          onChange={(e) => setOrderData(prev => ({ ...prev, stopLossPrice: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  )}

                  {orderData.orderType === 'OCO' && (
                    <div className="space-y-4">
                      <Alert>
                        <Target className="h-4 w-4" />
                        <AlertDescription>
                          OCO orders place two orders simultaneously. When one fills, the other is automatically canceled.
                        </AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ocoLimitPrice">Limit Price</Label>
                          <Input
                            id="ocoLimitPrice"
                            type="number"
                            step="0.01"
                            value={orderData.price || ''}
                            onChange={(e) => setOrderData(prev => ({ ...prev, price: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ocoStopPrice">Stop Price</Label>
                          <Input
                            id="ocoStopPrice"
                            type="number"
                            step="0.01"
                            value={orderData.stopPrice || ''}
                            onChange={(e) => setOrderData(prev => ({ ...prev, stopPrice: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conditional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conditional Order Triggers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="conditionType">Condition Type</Label>
                    <Select value={orderData.conditionType} onValueChange={(value: any) => setOrderData(prev => ({ ...prev, conditionType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRICE">Price Condition</SelectItem>
                        <SelectItem value="TIME">Time Condition</SelectItem>
                        <SelectItem value="VOLUME">Volume Condition</SelectItem>
                        <SelectItem value="TECHNICAL">Technical Indicator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {orderData.conditionType === 'PRICE' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="conditionSymbol">Symbol</Label>
                        <Input
                          id="conditionSymbol"
                          value={orderData.conditionSymbol || orderData.symbol}
                          onChange={(e) => setOrderData(prev => ({ ...prev, conditionSymbol: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="conditionOperator">Operator</Label>
                        <Select value={orderData.conditionOperator} onValueChange={(value: any) => setOrderData(prev => ({ ...prev, conditionOperator: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ABOVE">Above</SelectItem>
                            <SelectItem value="BELOW">Below</SelectItem>
                            <SelectItem value="EQUALS">Equals</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="conditionValue">Price</Label>
                        <Input
                          id="conditionValue"
                          type="number"
                          step="0.01"
                          value={orderData.conditionValue || ''}
                          onChange={(e) => setOrderData(prev => ({ ...prev, conditionValue: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Risk Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="positionSizing">Position Sizing Method</Label>
                    <Select value={orderData.positionSizing} onValueChange={(value: any) => setOrderData(prev => ({ ...prev, positionSizing: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed Quantity</SelectItem>
                        <SelectItem value="PERCENT_PORTFOLIO">Percent of Portfolio</SelectItem>
                        <SelectItem value="RISK_BASED">Risk-Based Sizing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {orderData.positionSizing === 'RISK_BASED' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="riskAmount">Risk Amount ($)</Label>
                          <Input
                            id="riskAmount"
                            type="number"
                            value={orderData.riskAmount || ''}
                            onChange={(e) => setOrderData(prev => ({ ...prev, riskAmount: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="stopLoss">Stop Loss Price</Label>
                          <Input
                            id="stopLoss"
                            type="number"
                            step="0.01"
                            value={orderData.stopLossPrice || ''}
                            onChange={(e) => setOrderData(prev => ({ ...prev, stopLossPrice: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                      
                      <Button onClick={calculateOptimalPositionSize} className="flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Calculate Optimal Size
                      </Button>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="maxLoss">Maximum Loss ($)</Label>
                    <Input
                      id="maxLoss"
                      type="number"
                      value={orderData.maxLoss || ''}
                      onChange={(e) => setOrderData(prev => ({ ...prev, maxLoss: Number(e.target.value) }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Order Summary & Quote */}
        <div className="space-y-6">
          {/* Live Quote */}
          {quote && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {orderData.symbol}
                  <Badge variant={quote.change >= 0 ? 'default' : 'destructive'}>
                    {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Bid</p>
                    <p className="font-semibold">${quote.bid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ask</p>
                    <p className="font-semibold">${quote.ask.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last</p>
                    <p className="font-semibold">${quote.last.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Volume</p>
                  <p className="font-semibold">{quote.volume.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Type</span>
                  <span className="font-semibold">{orderData.orderType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-semibold">{orderData.quantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-semibold">${estimatedCost.toLocaleString()}</span>
                </div>
                {riskAnalysis && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Score</span>
                    <Badge variant={riskAnalysis.riskLevel === 'HIGH' ? 'destructive' : 'default'}>
                      {riskAnalysis.riskLevel}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Risk Analysis */}
          {riskAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portfolio Impact</span>
                    <span className="font-semibold">{(riskAnalysis.portfolioImpact * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Loss</span>
                    <span className="font-semibold text-red-600">${riskAnalysis.maxLoss?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk/Reward</span>
                    <span className="font-semibold">{riskAnalysis.riskRewardRatio?.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="space-y-3">
            {previewMode ? (
              <Button className="w-full" variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview Order
              </Button>
            ) : (
              <Button 
                onClick={submitOrder} 
                disabled={loading || !orderData.symbol || !orderData.quantity}
                className="w-full"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Submitting...' : `${orderData.side} ${orderData.symbol}`}
              </Button>
            )}
            
            <Button variant="outline" className="w-full">
              <Clock className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOrderEntry;
