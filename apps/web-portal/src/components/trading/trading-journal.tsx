'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Plus, TrendingUp, TrendingDown, Filter, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl?: number;
  pnlPercent?: number;
  status: 'OPEN' | 'CLOSED';
  entryDate: string;
  exitDate?: string;
  notes?: string;
  tags: string[];
  strategy: string;
  emotions: string[];
}

interface TradingJournalProps {
  userId: string;
}

export function TradingJournal({ userId }: TradingJournalProps) {
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    symbol: '',
    side: 'BUY',
    quantity: 0,
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    notes: '',
    tags: [],
    strategy: '',
    emotions: []
  });
  const [filter, setFilter] = useState({
    status: 'ALL',
    symbol: '',
    strategy: '',
    dateRange: '30'
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const queryClient = useQueryClient();

  // Fetch trades
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades', userId, filter],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockTrades: Trade[] = [
        {
          id: '1',
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          entryPrice: 150.00,
          exitPrice: 175.43,
          pnl: 2543.00,
          pnlPercent: 16.95,
          status: 'CLOSED',
          entryDate: '2024-01-15',
          exitDate: '2024-01-20',
          notes: 'Strong earnings beat, held for 5 days',
          tags: ['earnings', 'swing'],
          strategy: 'Momentum',
          emotions: ['confident', 'patient']
        },
        {
          id: '2',
          symbol: 'TSLA',
          side: 'SELL',
          quantity: 50,
          entryPrice: 200.00,
          exitPrice: 245.67,
          pnl: -2283.50,
          pnlPercent: -22.84,
          status: 'CLOSED',
          entryDate: '2024-01-10',
          exitDate: '2024-01-18',
          notes: 'Stop loss hit, poor risk management',
          tags: ['stop-loss', 'mistake'],
          strategy: 'Breakout',
          emotions: ['frustrated', 'impatient']
        },
        {
          id: '3',
          symbol: 'NVDA',
          side: 'BUY',
          quantity: 25,
          entryPrice: 400.00,
          status: 'OPEN',
          entryDate: '2024-01-25',
          stopLoss: 380.00,
          takeProfit: 450.00,
          notes: 'AI momentum play, watching closely',
          tags: ['AI', 'momentum'],
          strategy: 'Growth',
          emotions: ['optimistic', 'cautious']
        }
      ];

      return mockTrades.filter(trade => {
        if (filter.status !== 'ALL' && trade.status !== filter.status) return false;
        if (filter.symbol && !trade.symbol.toLowerCase().includes(filter.symbol.toLowerCase())) return false;
        if (filter.strategy && trade.strategy !== filter.strategy) return false;
        return true;
      });
    }
  });

  // Add trade mutation
  const addTradeMutation = useMutation({
    mutationFn: async (trade: Partial<Trade>) => {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Generate ID on client side only
      const clientId = typeof window !== 'undefined' ? Date.now().toString() : Math.random().toString();
      return { ...trade, id: clientId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', userId] });
      setShowAddForm(false);
      setNewTrade({
        symbol: '',
        side: 'BUY',
        quantity: 0,
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        notes: '',
        tags: [],
        strategy: '',
        emotions: []
      });
    }
  });

  // Close trade mutation
  const closeTradeMutation = useMutation({
    mutationFn: async ({ tradeId, exitPrice }: { tradeId: string; exitPrice: number }) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { tradeId, exitPrice };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', userId] });
    }
  });

  const handleAddTrade = () => {
    if (!newTrade.symbol || !newTrade.quantity || !newTrade.entryPrice) return;

    // Generate date on client side only to prevent hydration mismatch
    const currentDate = typeof window !== 'undefined'
      ? new Date().toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]; // Fallback for SSR

    const trade: Partial<Trade> = {
      ...newTrade,
      entryDate: currentDate,
      status: 'OPEN',
      pnl: 0,
      pnlPercent: 0
    };

    addTradeMutation.mutate(trade);
  };

  const handleCloseTrade = (tradeId: string, exitPrice: number) => {
    closeTradeMutation.mutate({ tradeId, exitPrice });
  };

  const calculateStats = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    
    return { totalTrades, winningTrades, winRate, totalPnl, avgPnl };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Trading Journal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Trading Journal
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Trade
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trades" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <Label htmlFor="symbol-filter">Symbol</Label>
                <Input
                  id="symbol-filter"
                  placeholder="Filter by symbol"
                  value={filter.symbol}
                  onChange={(e) => setFilter(prev => ({ ...prev, symbol: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Trades</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="strategy-filter">Strategy</Label>
                <Select value={filter.strategy} onValueChange={(value) => setFilter(prev => ({ ...prev, strategy: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Strategies</SelectItem>
                    <SelectItem value="Momentum">Momentum</SelectItem>
                    <SelectItem value="Breakout">Breakout</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Add Trade Form */}
            {showAddForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="symbol">Symbol</Label>
                      <Input
                        id="symbol"
                        value={newTrade.symbol}
                        onChange={(e) => setNewTrade(prev => ({ ...prev, symbol: e.target.value }))}
                        placeholder="AAPL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="side">Side</Label>
                      <Select value={newTrade.side} onValueChange={(value: 'BUY' | 'SELL') => setNewTrade(prev => ({ ...prev, side: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">Buy</SelectItem>
                          <SelectItem value="SELL">Sell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={newTrade.quantity}
                        onChange={(e) => setNewTrade(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entryPrice">Entry Price</Label>
                      <Input
                        id="entryPrice"
                        type="number"
                        step="0.01"
                        value={newTrade.entryPrice}
                        onChange={(e) => setNewTrade(prev => ({ ...prev, entryPrice: Number(e.target.value) }))}
                        placeholder="175.43"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stopLoss">Stop Loss</Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        step="0.01"
                        value={newTrade.stopLoss}
                        onChange={(e) => setNewTrade(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
                        placeholder="166.66"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="takeProfit">Take Profit</Label>
                      <Input
                        id="takeProfit"
                        type="number"
                        step="0.01"
                        value={newTrade.takeProfit}
                        onChange={(e) => setNewTrade(prev => ({ ...prev, takeProfit: Number(e.target.value) }))}
                        placeholder="192.97"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newTrade.notes}
                        onChange={(e) => setNewTrade(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Trade rationale, market conditions, etc."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleAddTrade} disabled={addTradeMutation.isPending}>
                      {addTradeMutation.isPending ? 'Adding...' : 'Add Trade'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trades List */}
            <div className="space-y-4">
              {trades.map((trade) => (
                <Card key={trade.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="font-bold text-lg">{trade.symbol}</div>
                          <div className="text-sm text-muted-foreground">{trade.side}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{trade.quantity} shares</div>
                          <div className="text-sm text-muted-foreground">@ ${trade.entryPrice}</div>
                        </div>
                        {trade.status === 'CLOSED' && trade.pnl && (
                          <div className="text-center">
                            <div className={`font-bold ${trade.pnl > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ${trade.pnl.toFixed(2)}
                            </div>
                            <div className={`text-sm ${trade.pnl > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {trade.pnlPercent?.toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={trade.status === 'OPEN' ? 'default' : 'secondary'}>
                          {trade.status}
                        </Badge>
                        {trade.status === 'OPEN' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const exitPrice = prompt('Enter exit price:');
                              if (exitPrice) {
                                handleCloseTrade(trade.id, Number(exitPrice));
                              }
                            }}
                          >
                            Close Trade
                          </Button>
                        )}
                      </div>
                    </div>
                    {trade.notes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {trade.notes}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {trade.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{stats.totalTrades}</div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-500">{stats.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${stats.totalPnl.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total P&L</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl font-bold ${stats.avgPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${stats.avgPnl.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg P&L</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Advanced analytics and charts will be implemented here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
