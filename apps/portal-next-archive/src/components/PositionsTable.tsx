"use client";
'use client';

import React, { useState } from 'react';
import { motion } from '@/components/MotionWrappers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Plus, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export type Position = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  pl: number;
  plPercent: number;
  currency: string;
};

const mockPositions: Position[] = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    quantity: 100,
    avgPrice: 150,
    currentPrice: 175.43,
    marketValue: 17543,
    pl: 2543,
    plPercent: 16.95,
    currency: 'USD',
  },
  {
    id: '2',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    quantity: 10,
    avgPrice: 2800,
    currentPrice: 2847.63,
    marketValue: 28476.3,
    pl: 476.3,
    plPercent: 1.7,
    currency: 'USD',
  },
  {
    id: '3',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    quantity: 25,
    avgPrice: 250,
    currentPrice: 248.42,
    marketValue: 6210.5,
    pl: -39.5,
    plPercent: -0.16,
    currency: 'USD',
  },
  {
    id: '4',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    quantity: 50,
    avgPrice: 300,
    currentPrice: 420.5,
    marketValue: 21025,
    pl: 6025,
    plPercent: 40.17,
    currency: 'USD',
  },
];

export function PositionsTable() {
  const [positions, setPositions] = useState(mockPositions);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof Position | null>(null);
  const [sortDesc, setSortDesc] = useState(false);

  const filteredPositions = positions.filter((position) =>
    position.symbol.toLowerCase().includes(search.toLowerCase()) ||
    position.name.toLowerCase().includes(search.toLowerCase())
  );

  const sortedPositions = [...filteredPositions].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (aVal < bVal) return sortDesc ? 1 : -1;
    if (aVal > bVal) return sortDesc ? -1 : 1;
    return 0;
  });

  const handleSort = (key: keyof Position) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(false);
    }
  };

  const handleDelete = (id: string) => {
    setPositions(positions.filter((p) => p.id !== id));
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
              Positions
            </CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search positions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 h-8"
              />
              <Button onClick={() => {/* Open new position form */}}>
                <Plus className="mr-2 h-4 w-4" />
                Add Position
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
                    { key: 'symbol', label: 'Symbol' },
                    { key: 'name', label: 'Name' },
                    { key: 'quantity', label: 'Qty' },
                    { key: 'avgPrice', label: 'Avg Price' },
                    { key: 'currentPrice', label: 'Current' },
                    { key: 'marketValue', label: 'Value' },
                    { key: 'plPercent', label: 'P/L %' },
                    { key: 'actions', label: 'Actions' },
                  ].map((header) => (
                    <th
                      key={header.key}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                      onClick={() => header.key !== 'actions' && handleSort(header.key as keyof Position)}
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
                {sortedPositions.map((position, index) => (
                  <motion.tr
                    key={position.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-t border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{position.symbol}</td>
                    <td className="px-4 py-3">{position.name}</td>
                    <td className="px-4 py-3 text-right">{position.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">${position.avgPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">${position.currentPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${position.marketValue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={position.pl >= 0 ? 'default' : 'destructive'}>
                        {position.pl >= 0 ? '+' : ''}{position.plPercent.toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {/* View */}}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {/* Edit */}}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(position.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPositions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No positions found.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}