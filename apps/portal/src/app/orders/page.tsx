"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Filter, Search, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Shell } from '@/components/shell/Shell';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';

interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  avgFillPrice?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'PARTIALLY_FILLED';
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  fees?: number;
  estimatedValue: number;
  actualValue?: number;
}

interface OrderFilter {
  status: string;
  symbol: string;
  side: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ORD-001',
      symbol: 'AAPL',
      side: 'BUY',
      type: 'MARKET',
      quantity: 100,
      filledQuantity: 100,
      avgFillPrice: 175.43,
      status: 'FILLED',
      timeInForce: 'DAY',
      createdAt: '2024-09-06T09:15:00Z',
      updatedAt: '2024-09-06T09:15:30Z',
      fees: 1.99,
      estimatedValue: 17500,
      actualValue: 17543
    },
    {
      id: 'ORD-002',
      symbol: 'MSFT',
      side: 'SELL',
      type: 'LIMIT',
      quantity: 50,
      filledQuantity: 25,
      price: 335.00,
      avgFillPrice: 334.85,
      status: 'PARTIALLY_FILLED',
      timeInForce: 'GTC',
      createdAt: '2024-09-06T08:30:00Z',
      updatedAt: '2024-09-06T10:45:00Z',
      fees: 1.49,
      estimatedValue: 16750,
      actualValue: 8371.25
    },
    {
      id: 'ORD-003',
      symbol: 'TSLA',
      side: 'BUY',
      type: 'STOP',
      quantity: 25,
      filledQuantity: 0,
      stopPrice: 250.00,
      status: 'PENDING',
      timeInForce: 'GTC',
      createdAt: '2024-09-05T16:20:00Z',
      updatedAt: '2024-09-05T16:20:00Z',
      estimatedValue: 6250
    },
    {
      id: 'ORD-004',
      symbol: 'GOOGL',
      side: 'BUY',
      type: 'LIMIT',
      quantity: 10,
      filledQuantity: 0,
      price: 140.00,
      status: 'CANCELLED',
      timeInForce: 'DAY',
      createdAt: '2024-09-04T11:00:00Z',
      updatedAt: '2024-09-04T16:00:00Z',
      estimatedValue: 1400
    }
  ]);

  const [filter, setFilter] = useState<OrderFilter>({
    status: '',
    symbol: '',
    side: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'FILLED': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'REJECTED': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'PARTIALLY_FILLED': return <AlertCircle className="w-4 h-4 text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILLED': return 'text-green-400 bg-green-400/10';
      case 'CANCELLED': return 'text-red-400 bg-red-400/10';
      case 'REJECTED': return 'text-red-400 bg-red-400/10';
      case 'PENDING': return 'text-yellow-400 bg-yellow-400/10';
      case 'PARTIALLY_FILLED': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getSideColor = (side: string) => {
    return side === 'BUY' ? 'text-green-400' : 'text-red-400';
  };

  const getSideIcon = (side: string) => {
    return side === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredOrders = orders.filter(order => {
    if (filter.status && order.status !== filter.status) return false;
    if (filter.symbol && !order.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) return false;
    if (filter.side && order.side !== filter.side) return false;
    if (filter.type && order.type !== filter.type) return false;
    if (searchTerm && !order.symbol.toLowerCase().includes(searchTerm.toLowerCase()) && !order.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const orderStats = {
    total: orders.length,
    filled: orders.filter(o => o.status === 'FILLED').length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    totalValue: orders.reduce((sum, o) => sum + (o.actualValue || o.estimatedValue), 0),
    totalFees: orders.reduce((sum, o) => sum + (o.fees || 0), 0)
  };

  const cancelOrder = async (orderId: string) => {
    try {
      // API call would go here
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: 'CANCELLED' as const, updatedAt: new Date().toISOString() } : order
      ));
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const modifyOrder = async (orderId: string, modifications: Partial<Order>) => {
    try {
      // API call would go here
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, ...modifications, updatedAt: new Date().toISOString() } : order
      ));
    } catch (error) {
      console.error('Failed to modify order:', error);
    }
  };

  return (
    <Shell right={<InspectorPanel />} showWorkspaceTabs={false}>
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Order Management</h1>
          <p className="text-gray-400">Track and manage your trading orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold">{orderStats.total}</p>
                </div>
                <div className="text-blue-400">
                  <Filter className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Filled Orders</p>
                  <p className="text-2xl font-bold text-green-400">{orderStats.filled}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Pending Orders</p>
                  <p className="text-2xl font-bold text-yellow-400">{orderStats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(orderStats.totalValue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Fees: {formatCurrency(orderStats.totalFees)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Symbol or Order ID"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="FILLED">Filled</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="PARTIALLY_FILLED">Partially Filled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Side</label>
                <Select value={filter.side} onValueChange={(value) => setFilter(prev => ({ ...prev, side: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sides" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sides</SelectItem>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select value={filter.type} onValueChange={(value) => setFilter(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="MARKET">Market</SelectItem>
                    <SelectItem value="LIMIT">Limit</SelectItem>
                    <SelectItem value="STOP">Stop</SelectItem>
                    <SelectItem value="STOP_LIMIT">Stop Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Symbol</label>
                <Input
                  value={filter.symbol}
                  onChange={(e) => setFilter(prev => ({ ...prev, symbol: e.target.value }))}
                  placeholder="e.g., AAPL"
                />
              </div>

              <Button 
                variant="outline" 
                onClick={() => {
                  setFilter({ status: '', symbol: '', side: '', type: '', dateFrom: '', dateTo: '' });
                  setSearchTerm('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>

          {/* Orders List */}
          <div className="lg:col-span-3">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Orders ({filteredOrders.length})</CardTitle>
                  <Button size="sm">Export</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="border border-[#1E1E1E] rounded-lg p-4 hover:bg-[#1A1A1A] transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            {order.status.replace('_', ' ')}
                          </Badge>
                          <span className="font-mono text-sm text-gray-400">{order.id}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatDateTime(order.createdAt)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${getSideColor(order.side)}`}>
                              {order.symbol}
                            </span>
                            <div className={getSideColor(order.side)}>
                              {getSideIcon(order.side)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {order.side} • {order.type}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-400">Quantity</div>
                          <div className="font-semibold">
                            {order.filledQuantity}/{order.quantity}
                            {order.status === 'PARTIALLY_FILLED' && (
                              <span className="text-blue-400 ml-1">
                                ({Math.round((order.filledQuantity / order.quantity) * 100)}%)
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-400">Price</div>
                          <div className="font-semibold">
                            {order.avgFillPrice ? (
                              <span>{formatCurrency(order.avgFillPrice)}</span>
                            ) : order.price ? (
                              <span>{formatCurrency(order.price)}</span>
                            ) : order.stopPrice ? (
                              <span>Stop: {formatCurrency(order.stopPrice)}</span>
                            ) : (
                              <span>Market</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-400">Value</div>
                          <div className="font-semibold">
                            {formatCurrency(order.actualValue || order.estimatedValue)}
                            {order.fees && (
                              <div className="text-xs text-gray-500">
                                Fees: {formatCurrency(order.fees)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {(order.status === 'PENDING' || order.status === 'PARTIALLY_FILLED') && (
                        <div className="flex gap-2 pt-3 border-t border-[#1E1E1E]">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedOrder(order)}
                          >
                            Modify
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => cancelOrder(order.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredOrders.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No orders match your filters</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Order Modification Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="bg-[#111111] border-[#1E1E1E] w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Modify Order {selectedOrder.id}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <Input 
                    type="number" 
                    defaultValue={selectedOrder.quantity - selectedOrder.filledQuantity}
                    min="1"
                  />
                </div>
                
                {selectedOrder.type !== 'MARKET' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Price</label>
                    <Input 
                      type="number" 
                      step="0.01"
                      defaultValue={selectedOrder.price || selectedOrder.stopPrice}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button className="flex-1">Update Order</Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </Shell>
  );
}
