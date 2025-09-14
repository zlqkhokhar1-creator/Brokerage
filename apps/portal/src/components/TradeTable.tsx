"use client";
'use client';

import React, { useState } from 'react';
import { motion } from '@/components/MotionWrappers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, ArrowUpDown, Calendar, DollarSign, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export type Trade = {
  id: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop';
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  date: Date;
  status: 'executed' | 'cancelled' | 'pending';
};

const mockTrades: Trade[] = [
  {
    id: '1',
    symbol: 'AAPL',
    type: 'market',
    side: 'buy',
    quantity: 100,
    price: 175.43,
    value: 17543,
    date: new Date('2025-01-15'),
    status: 'executed',
  },
  {
    id: '2',
    symbol: 'GOOGL',
    type: 'limit',
    side: 'sell',
    quantity: 10,
    price: 2847.63,
    value: 28476.3,
    date: new Date('2025-01-14'),
    status: 'executed',
  },
  {
    id: '3',
    symbol: 'TSLA',
    type: 'stop',
    side: 'buy',
    quantity: 25,
    price: 248.42,
    value: 6210.5,
    date: new Date('2025-01-13'),
    status: 'pending',
  },
  {
    id: '4',
    symbol: 'MSFT',
    type: 'market',
    side: 'buy',
    quantity: 50,
    price: 420.5,
    value: 21025,
    date: new Date('2025-01-12'),
    status: 'executed',
  },
];

const statusColors = {
  executed: 'default' as const,
  pending: 'secondary' as const,
  cancelled: 'destructive' as const,
};

const sideColors = {
  buy: 'default' as const,
  sell: 'outline' as const,
};

export function TradeTable() {
  const [trades, setTrades] = useState(mockTrades);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof Trade | null>(null);
  const [sortDesc, setSortDesc] = useState(false);

  const filteredTrades = trades.filter((trade) =>
    trade.symbol.toLowerCase().includes(search.toLowerCase()) ||
    trade.id.includes(search)
  );

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDesc ? bVal - aVal : aVal - bVal;
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }
    if (aVal instanceof Date && bVal instanceof Date) {
      return sortDesc ? bVal.getTime() - aVal.getTime() : aVal.getTime() - bVal.getTime();
    }
    return 0;
  });

  const handleSort = (key: keyof Trade) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(false);
    }
  };

  const handleCancel = async (id: string) => {
    // Stub API call
    console.log('Cancel trade', id);
    setTrades(trades.map(t => t.id === id ? { ...t, status: 'cancelled' } : t));
  };

  const handleModify = (id: string) => {
    // Stub
    console.log('Modify trade', id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="elevated-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              Trade History
            </CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search trades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 h-8"
              />
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    { key: 'id', label: 'ID' },
                    { key: 'symbol', label: 'Symbol' },
                    { key: 'type', label: 'Type' },
                    { key: 'side', label: 'Side' },
                    { key: 'quantity', label: 'Qty' },
                    { key: 'price', label: 'Price' },
                    { key: 'value', label: 'Value' },
                    { key: 'date', label: 'Date' },
                    { key: 'status', label: 'Status' },
                    { key: 'actions', label: 'Actions' },
                  ].map((header) => (
                    <th
                      key={header.key}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                      onClick={() => header.key !== 'actions' && handleSort(header.key as keyof Trade)}
                    >
                      <div className="flex items-center gap-1">
                        {header.label}
                        {sortBy === header.key && <ArrowUpDown className={`h-3 w-3 ${sortDesc ? 'rotate-180' : ''}`} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTrades.map((trade, index) => (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-t border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{trade.id}</td>
                    <td className="px-4 py-3">{trade.symbol}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{trade.type.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={sideColors[trade.side]}>{trade.side.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{trade.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">${trade.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${trade.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{format(trade.date, 'MMM dd, yyyy')}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[trade.status]}>{trade.status.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {/* View */}}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {trade.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleModify(trade.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleCancel(trade.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTrades.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No trades found.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}