'use client';

import { Card, Text, Group, Badge, Button, ScrollArea } from '@mantine/core';
import { Star, TrendingUp, TrendingDown, Plus } from 'lucide-react';

const watchlistItems = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, change: 3.45, volume: '45.2M' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.67, change: 2.89, volume: '32.1M' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 432.12, change: -1.23, volume: '28.7M' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 335.89, change: 1.67, volume: '25.4M' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 134.56, change: -0.89, volume: '18.3M' },
];

export function WatchlistPanel() {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500} size="lg" c="white">Watchlist</Text>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<Plus className="h-3 w-3" />}
            style={{ color: '#00ff00' }}
          >
            Add
          </Button>
        </Group>
      </Card.Section>

      <ScrollArea h={300} mt="md">
        <div className="space-y-3">
          {watchlistItems.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                </div>
                <div>
                  <Text size="sm" fw={600} c="white">{item.symbol}</Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>{item.name}</Text>
                </div>
              </div>

              <div className="text-right">
                <Text size="sm" fw={500} c="white">${item.price}</Text>
                <div className="flex items-center gap-1">
                  {item.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <Text
                    size="xs"
                    c={item.change >= 0 ? 'green' : 'red'}
                    fw={500}
                  >
                    {item.change >= 0 ? '+' : ''}{item.change}%
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {watchlistItems.length} stocks
          </Text>
          <Text size="xs" c="green" className="cursor-pointer hover:underline">
            Manage →
          </Text>
        </Group>
      </div>
    </Card>
  );
}