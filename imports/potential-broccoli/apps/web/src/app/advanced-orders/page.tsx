'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowUpDown, 
  Target, 
  Shield, 
  Clock, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Calculator,
  Settings
} from 'lucide-react';

interface AdvancedOrder {
  id: string;
  type: 'OCO' | 'bracket' | 'iceberg' | 'algorithmic' | 'conditional';
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  status: 'pending' | 'active' | 'filled' | 'cancelled' | 'expired';
  createdAt: string;
  parameters: any;
  fillPrice?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
}

interface OrderCondition {
  id: string;
  type: 'price' | 'volume' | 'time' | 'technical' | 'fundamental';
  operator: 'above' | 'below' | 'equals' | 'crosses';
  value: number;
  symbol?: string;
  indicator?: string;
}

export default function AdvancedOrdersPage() {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedOrderType, setSelectedOrderType] = useState('OCO');
  const [symbol, setSymbol] = useState('');
  const [orders, setOrders] = useState<AdvancedOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // OCO Order State
  const [ocoOrder, setOcoOrder] = useState({
    symbol: '',
    quantity: 0,
    leg1: { type: 'limit', price: 0 },
    leg2: { type: 'stop', price: 0, stopPrice: 0 }
  });

  // Bracket Order State
  const [bracketOrder, setBracketOrder] = useState({
    symbol: '',
    quantity: 0,
    side: 'buy' as 'buy' | 'sell',
    entryPrice: 0,
    takeProfitPrice: 0,
    stopLossPrice: 0,
    trailingStop: false,
    trailingPercent: 5
  });

  // Iceberg Order State
  const [icebergOrder, setIcebergOrder] = useState({
    symbol: '',
    totalQuantity: 0,
    displayQuantity: 0,
    priceVariance: 0.01,
    timeInterval: 30
  });

  // Algorithmic Order State
  const [algoOrder, setAlgoOrder] = useState({
    symbol: '',
    quantity: 0,
    strategy: 'TWAP',
    duration: 60,
    startTime: '',
    endTime: '',
    priceLimit: 0
  });

  // Conditional Order State
  const [conditionalOrder, setConditionalOrder] = useState({
    symbol: '',
    quantity: 0,
    side: 'buy' as 'buy' | 'sell',
    orderType: 'market',
    price: 0,
    conditions: [] as OrderCondition[]
  });

  useEffect(() => {
    fetchAdvancedOrders();
  }, []);

  const fetchAdvancedOrders = async () => {
    setLoading(true);
    // Mock API call - replace with actual backend call
    // const response = await fetch('/api/v1/orders/advanced');
    
    const mockOrders: AdvancedOrder[] = [
      {
        id: '1',
        type: 'OCO',
        symbol: 'AAPL',
        side: 'sell',
        quantity: 100,
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
        parameters: {
          leg1: { type: 'limit', price: 195.00 },
          leg2: { type: 'stop', price: 180.00, stopPrice: 182.00 }
        },
        remainingQuantity: 100
      },
      {
        id: '2',
        type: 'bracket',
        symbol: 'TSLA',
        side: 'buy',
        quantity: 50,
        status: 'filled',
        createdAt: '2024-01-14T14:20:00Z',
        parameters: {
          entryPrice: 240.00,
          takeProfitPrice: 260.00,
          stopLossPrice: 220.00
        },
        fillPrice: 241.50,
        filledQuantity: 50
      },
      {
        id: '3',
        type: 'iceberg',
        symbol: 'NVDA',
        side: 'buy',
        quantity: 1000,
        status: 'active',
        createdAt: '2024-01-15T09:15:00Z',
        parameters: {
          displayQuantity: 100,
          priceVariance: 0.02,
          timeInterval: 45
        },
        filledQuantity: 300,
        remainingQuantity: 700
      }
    ];

    setOrders(mockOrders);
    setLoading(false);
  };

  const submitOCOOrder = async () => {
    setLoading(true);
    // API call to create OCO order
    console.log('Creating OCO order:', ocoOrder);
    
    // Mock response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add to orders list
    const newOrder: AdvancedOrder = {
      id: Date.now().toString(),
      type: 'OCO',
      symbol: ocoOrder.symbol,
      side: 'sell',
      quantity: ocoOrder.quantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
      parameters: ocoOrder,
      remainingQuantity: ocoOrder.quantity
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setLoading(false);
  };

  const submitBracketOrder = async () => {
    setLoading(true);
    console.log('Creating bracket order:', bracketOrder);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrder: AdvancedOrder = {
      id: Date.now().toString(),
      type: 'bracket',
      symbol: bracketOrder.symbol,
      side: bracketOrder.side,
      quantity: bracketOrder.quantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
      parameters: bracketOrder,
      remainingQuantity: bracketOrder.quantity
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setLoading(false);
  };

  const submitIcebergOrder = async () => {
    setLoading(true);
    console.log('Creating iceberg order:', icebergOrder);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrder: AdvancedOrder = {
      id: Date.now().toString(),
      type: 'iceberg',
      symbol: icebergOrder.symbol,
      side: 'buy',
      quantity: icebergOrder.totalQuantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
      parameters: icebergOrder,
      remainingQuantity: icebergOrder.totalQuantity
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setLoading(false);
  };

  const submitAlgoOrder = async () => {
    setLoading(true);
    console.log('Creating algorithmic order:', algoOrder);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrder: AdvancedOrder = {
      id: Date.now().toString(),
      type: 'algorithmic',
      symbol: algoOrder.symbol,
      side: 'buy',
      quantity: algoOrder.quantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
      parameters: algoOrder,
      remainingQuantity: algoOrder.quantity
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setLoading(false);
  };

  const submitConditionalOrder = async () => {
    setLoading(true);
    console.log('Creating conditional order:', conditionalOrder);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrder: AdvancedOrder = {
      id: Date.now().toString(),
      type: 'conditional',
      symbol: conditionalOrder.symbol,
      side: conditionalOrder.side,
      quantity: conditionalOrder.quantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
      parameters: conditionalOrder,
      remainingQuantity: conditionalOrder.quantity
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setLoading(false);
  };

  const cancelOrder = async (orderId: string) => {
    console.log('Cancelling order:', orderId);
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'cancelled' as const }
          : order
      )
    );
  };

  const addCondition = () => {
    const newCondition: OrderCondition = {
      id: Date.now().toString(),
      type: 'price',
      operator: 'above',
      value: 0
    };
    setConditionalOrder(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const updateCondition = (conditionId: string, updates: Partial<OrderCondition>) => {
    setConditionalOrder(prev => ({
      ...prev,
      conditions: prev.conditions.map(condition =>
        condition.id === conditionId
          ? { ...condition, ...updates }
          : condition
      )
    }));
  };

  const removeCondition = (conditionId: string) => {
    setConditionalOrder(prev => ({
      ...prev,
      conditions: prev.conditions.filter(condition => condition.id !== conditionId)
    }));
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'OCO': return <ArrowUpDown className="w-4 h-4" />;
      case 'bracket': return <Shield className="w-4 h-4" />;
      case 'iceberg': return <Layers className="w-4 h-4" />;
      case 'algorithmic': return <Clock className="w-4 h-4" />;
      case 'conditional': return <Target className="w-4 h-4" />;
      default: return <Calculator className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/20 text-blue-400';
      case 'filled': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      case 'expired': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <RefreshCw className="w-4 h-4" />;
      case 'filled': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'expired': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold mb-2">Advanced Orders</h1>
              <p className="text-gray-400">Create sophisticated trading strategies with advanced order types</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Orders</TabsTrigger>
            <TabsTrigger value="active">Active Orders</TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Order Type Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  {[
                    { type: 'OCO', name: 'One-Cancels-Other', icon: ArrowUpDown, desc: 'Two orders, one cancels the other when filled' },
                    { type: 'bracket', name: 'Bracket Order', icon: Shield, desc: 'Entry with automatic stop-loss and take-profit' },
                    { type: 'iceberg', name: 'Iceberg Order', icon: Layers, desc: 'Hide large orders by breaking into smaller pieces' },
                    { type: 'algorithmic', name: 'Algo Orders', icon: Clock, desc: 'Time-weighted execution strategies' },
                    { type: 'conditional', name: 'Conditional', icon: Target, desc: 'Orders triggered by market conditions' }
                  ].map(({ type, name, icon: Icon, desc }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedOrderType(type)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedOrderType === type
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-[#1E1E1E] hover:border-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-2 text-blue-400" />
                      <h3 className="font-semibold mb-1">{name}</h3>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </button>
                  ))}
                </div>

                {/* OCO Order Form */}
                {selectedOrderType === 'OCO' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ArrowUpDown className="w-5 h-5 text-blue-400" />
                      One-Cancels-Other Order
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Symbol</Label>
                        <Input
                          placeholder="e.g., AAPL"
                          value={ocoOrder.symbol}
                          onChange={(e) => setOcoOrder(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={ocoOrder.quantity || ''}
                          onChange={(e) => setOcoOrder(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium text-green-400">Leg 1: Limit Order</h4>
                        <div>
                          <Label>Limit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="195.00"
                            value={ocoOrder.leg1.price || ''}
                            onChange={(e) => setOcoOrder(prev => ({
                              ...prev,
                              leg1: { ...prev.leg1, price: Number(e.target.value) }
                            }))}
                            className="bg-[#1A1A1A] border-[#1E1E1E]"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium text-red-400">Leg 2: Stop Order</h4>
                        <div>
                          <Label>Stop Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="182.00"
                            value={ocoOrder.leg2.stopPrice || ''}
                            onChange={(e) => setOcoOrder(prev => ({
                              ...prev,
                              leg2: { ...prev.leg2, stopPrice: Number(e.target.value) }
                            }))}
                            className="bg-[#1A1A1A] border-[#1E1E1E]"
                          />
                        </div>
                        <div>
                          <Label>Limit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="180.00"
                            value={ocoOrder.leg2.price || ''}
                            onChange={(e) => setOcoOrder(prev => ({
                              ...prev,
                              leg2: { ...prev.leg2, price: Number(e.target.value) }
                            }))}
                            className="bg-[#1A1A1A] border-[#1E1E1E]"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={submitOCOOrder}
                      disabled={loading || !ocoOrder.symbol || !ocoOrder.quantity}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Creating...' : 'Create OCO Order'}
                    </Button>
                  </div>
                )}

                {/* Bracket Order Form */}
                {selectedOrderType === 'bracket' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-400" />
                      Bracket Order
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Symbol</Label>
                        <Input
                          placeholder="e.g., TSLA"
                          value={bracketOrder.symbol}
                          onChange={(e) => setBracketOrder(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="50"
                          value={bracketOrder.quantity || ''}
                          onChange={(e) => setBracketOrder(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Side</Label>
                        <Select value={bracketOrder.side} onValueChange={(value: 'buy' | 'sell') => setBracketOrder(prev => ({ ...prev, side: value }))}>
                          <SelectTrigger className="bg-[#1A1A1A] border-[#1E1E1E]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="buy">Buy</SelectItem>
                            <SelectItem value="sell">Sell</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Entry Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="240.00"
                          value={bracketOrder.entryPrice || ''}
                          onChange={(e) => setBracketOrder(prev => ({ ...prev, entryPrice: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Take Profit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="260.00"
                          value={bracketOrder.takeProfitPrice || ''}
                          onChange={(e) => setBracketOrder(prev => ({ ...prev, takeProfitPrice: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Stop Loss Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="220.00"
                          value={bracketOrder.stopLossPrice || ''}
                          onChange={(e) => setBracketOrder(prev => ({ ...prev, stopLossPrice: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-[#1E1E1E] rounded-lg">
                      <div>
                        <Label>Trailing Stop</Label>
                        <p className="text-sm text-gray-400">Automatically adjust stop-loss as price moves favorably</p>
                      </div>
                      <Switch
                        checked={bracketOrder.trailingStop}
                        onCheckedChange={(checked) => setBracketOrder(prev => ({ ...prev, trailingStop: checked }))}
                      />
                    </div>
                    
                    {bracketOrder.trailingStop && (
                      <div>
                        <Label>Trailing Percentage</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="5.0"
                          value={bracketOrder.trailingPercent || ''}
                          onChange={(e) => setBracketOrder(prev => ({ ...prev, trailingPercent: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                    )}
                    
                    <Button 
                      onClick={submitBracketOrder}
                      disabled={loading || !bracketOrder.symbol || !bracketOrder.quantity}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Creating...' : 'Create Bracket Order'}
                    </Button>
                  </div>
                )}

                {/* Iceberg Order Form */}
                {selectedOrderType === 'iceberg' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-400" />
                      Iceberg Order
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Symbol</Label>
                        <Input
                          placeholder="e.g., NVDA"
                          value={icebergOrder.symbol}
                          onChange={(e) => setIcebergOrder(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Total Quantity</Label>
                        <Input
                          type="number"
                          placeholder="1000"
                          value={icebergOrder.totalQuantity || ''}
                          onChange={(e) => setIcebergOrder(prev => ({ ...prev, totalQuantity: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Display Quantity</Label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={icebergOrder.displayQuantity || ''}
                          onChange={(e) => setIcebergOrder(prev => ({ ...prev, displayQuantity: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Price Variance (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.01"
                          value={icebergOrder.priceVariance || ''}
                          onChange={(e) => setIcebergOrder(prev => ({ ...prev, priceVariance: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Time Interval (seconds)</Label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={icebergOrder.timeInterval || ''}
                        onChange={(e) => setIcebergOrder(prev => ({ ...prev, timeInterval: Number(e.target.value) }))}
                        className="bg-[#1A1A1A] border-[#1E1E1E]"
                      />
                    </div>
                    
                    <Button 
                      onClick={submitIcebergOrder}
                      disabled={loading || !icebergOrder.symbol || !icebergOrder.totalQuantity}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Creating...' : 'Create Iceberg Order'}
                    </Button>
                  </div>
                )}

                {/* Algorithmic Order Form */}
                {selectedOrderType === 'algorithmic' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Algorithmic Order
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Symbol</Label>
                        <Input
                          placeholder="e.g., SPY"
                          value={algoOrder.symbol}
                          onChange={(e) => setAlgoOrder(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="500"
                          value={algoOrder.quantity || ''}
                          onChange={(e) => setAlgoOrder(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Strategy</Label>
                        <Select value={algoOrder.strategy} onValueChange={(value) => setAlgoOrder(prev => ({ ...prev, strategy: value }))}>
                          <SelectTrigger className="bg-[#1A1A1A] border-[#1E1E1E]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TWAP">TWAP (Time Weighted)</SelectItem>
                            <SelectItem value="VWAP">VWAP (Volume Weighted)</SelectItem>
                            <SelectItem value="POV">POV (Percent of Volume)</SelectItem>
                            <SelectItem value="IS">Implementation Shortfall</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          placeholder="60"
                          value={algoOrder.duration || ''}
                          onChange={(e) => setAlgoOrder(prev => ({ ...prev, duration: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Price Limit (optional)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Leave empty for no limit"
                          value={algoOrder.priceLimit || ''}
                          onChange={(e) => setAlgoOrder(prev => ({ ...prev, priceLimit: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={submitAlgoOrder}
                      disabled={loading || !algoOrder.symbol || !algoOrder.quantity}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Creating...' : 'Create Algorithmic Order'}
                    </Button>
                  </div>
                )}

                {/* Conditional Order Form */}
                {selectedOrderType === 'conditional' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-400" />
                      Conditional Order
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Symbol</Label>
                        <Input
                          placeholder="e.g., AAPL"
                          value={conditionalOrder.symbol}
                          onChange={(e) => setConditionalOrder(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={conditionalOrder.quantity || ''}
                          onChange={(e) => setConditionalOrder(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                      <div>
                        <Label>Side</Label>
                        <Select value={conditionalOrder.side} onValueChange={(value: 'buy' | 'sell') => setConditionalOrder(prev => ({ ...prev, side: value }))}>
                          <SelectTrigger className="bg-[#1A1A1A] border-[#1E1E1E]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="buy">Buy</SelectItem>
                            <SelectItem value="sell">Sell</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Order Type</Label>
                        <Select value={conditionalOrder.orderType} onValueChange={(value) => setConditionalOrder(prev => ({ ...prev, orderType: value }))}>
                          <SelectTrigger className="bg-[#1A1A1A] border-[#1E1E1E]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="market">Market</SelectItem>
                            <SelectItem value="limit">Limit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {conditionalOrder.orderType === 'limit' && (
                      <div>
                        <Label>Limit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="150.00"
                          value={conditionalOrder.price || ''}
                          onChange={(e) => setConditionalOrder(prev => ({ ...prev, price: Number(e.target.value) }))}
                          className="bg-[#1A1A1A] border-[#1E1E1E]"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Trigger Conditions</h4>
                        <Button onClick={addCondition} size="sm" variant="outline">
                          Add Condition
                        </Button>
                      </div>
                      
                      {conditionalOrder.conditions.map((condition) => (
                        <div key={condition.id} className="p-4 border border-[#1E1E1E] rounded-lg space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <Select value={condition.type} onValueChange={(value) => updateCondition(condition.id, { type: value as any })}>
                              <SelectTrigger className="bg-[#1A1A1A] border-[#1E1E1E]">
                                <SelectValue placeholder="Condition Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="price">Price</SelectItem>
                                <SelectItem value="volume">Volume</SelectItem>
                                <SelectItem value="time">Time</SelectItem>
                                <SelectItem value="technical">Technical Indicator</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Select value={condition.operator} onValueChange={(value) => updateCondition(condition.id, { operator: value as any })}>
                              <SelectTrigger className="bg-[#1A1A1A] border-[#1E1E1E]">
                                <SelectValue placeholder="Operator" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="above">Above</SelectItem>
                                <SelectItem value="below">Below</SelectItem>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="crosses">Crosses</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Value"
                              value={condition.value || ''}
                              onChange={(e) => updateCondition(condition.id, { value: Number(e.target.value) })}
                              className="bg-[#1A1A1A] border-[#1E1E1E]"
                            />
                            
                            <Button 
                              onClick={() => removeCondition(condition.id)}
                              size="sm"
                              variant="destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={submitConditionalOrder}
                      disabled={loading || !conditionalOrder.symbol || !conditionalOrder.quantity || conditionalOrder.conditions.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Creating...' : 'Create Conditional Order'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Active Advanced Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.filter(order => ['pending', 'active'].includes(order.status)).map((order) => (
                    <div key={order.id} className="p-4 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            {getOrderTypeIcon(order.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{order.symbol}</span>
                              <Badge className={getStatusColor(order.status)} >
                                {getStatusIcon(order.status)}
                                {order.status}
                              </Badge>
                              <Badge variant="outline">{order.type}</Badge>
                            </div>
                            <div className="text-sm text-gray-400">
                              {order.side.toUpperCase()} {order.quantity} shares • Created {formatDateTime(order.createdAt)}
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => cancelOrder(order.id)}
                          size="sm"
                          variant="destructive"
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      {order.type === 'iceberg' && order.filledQuantity && (
                        <div className="text-sm text-gray-400">
                          Progress: {order.filledQuantity}/{order.quantity} filled ({((order.filledQuantity / order.quantity) * 100).toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {orders.filter(order => ['pending', 'active'].includes(order.status)).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No active advanced orders</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Order History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.filter(order => ['filled', 'cancelled', 'expired'].includes(order.status)).map((order) => (
                    <div key={order.id} className="p-4 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-500/20 rounded-lg">
                            {getOrderTypeIcon(order.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{order.symbol}</span>
                              <Badge className={getStatusColor(order.status)}>
                                {getStatusIcon(order.status)}
                                {order.status}
                              </Badge>
                              <Badge variant="outline">{order.type}</Badge>
                            </div>
                            <div className="text-sm text-gray-400">
                              {order.side.toUpperCase()} {order.quantity} shares • Created {formatDateTime(order.createdAt)}
                            </div>
                            {order.fillPrice && (
                              <div className="text-sm text-green-400">
                                Filled at {formatCurrency(order.fillPrice)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {orders.filter(order => ['filled', 'cancelled', 'expired'].includes(order.status)).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No order history</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
