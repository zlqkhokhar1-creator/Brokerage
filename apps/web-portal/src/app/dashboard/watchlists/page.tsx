'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Button, SimpleGrid, ActionIcon, Menu } from '@mantine/core';
import { Star, Plus, MoreVertical, TrendingUp, TrendingDown, BarChart3, Edit, Trash2 } from 'lucide-react';

const watchlists = [
  {
    id: 1,
    name: 'Tech Giants',
    description: 'Major technology companies',
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
    performance: '+12.4%',
    isPositive: true,
    lastUpdated: '2 hours ago',
    isDefault: true
  },
  {
    id: 2,
    name: 'Growth Stocks',
    description: 'High-growth potential companies',
    symbols: ['NVDA', 'AMD', 'CRM', 'NOW', 'SQ'],
    performance: '+8.7%',
    isPositive: true,
    lastUpdated: '1 hour ago',
    isDefault: false
  },
  {
    id: 3,
    name: 'Value Picks',
    description: 'Undervalued companies with strong fundamentals',
    symbols: ['JPM', 'BAC', 'WFC', 'C', 'GS'],
    performance: '-2.1%',
    isPositive: false,
    lastUpdated: '3 hours ago',
    isDefault: false
  },
  {
    id: 4,
    name: 'Dividend Aristocrats',
    description: 'Companies with 25+ years of dividend increases',
    symbols: ['JNJ', 'PG', 'KO', 'PEP', 'CL'],
    performance: '+4.2%',
    isPositive: true,
    lastUpdated: '4 hours ago',
    isDefault: false
  }
];

const marketMovers = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 432.12, change: '+8.45%', volume: '45.2M' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.67, change: '+5.23%', volume: '32.1M' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, change: '+3.45%', volume: '28.7M' },
  { symbol: 'AMD', name: 'AMD Inc.', price: 98.76, change: '+6.12%', volume: '22.4M' },
  { symbol: 'META', name: 'Meta Platforms', price: 345.67, change: '-4.23%', volume: '18.3M' }
];

export default function WatchlistsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Invest Pro Watchlists</h1>
            <p className="text-gray-400 mt-1">Create and manage your personalized stock watchlists</p>
          </div>
          <Button leftSection={<Plus className="h-4 w-4" />}>
            Create Watchlist
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Watchlists Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchlists.map((watchlist) => (
                <Card key={watchlist.id} shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Star className={`h-5 w-5 ${watchlist.isDefault ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
                      <div>
                        <Text size="lg" fw={600} c="white">{watchlist.name}</Text>
                        <Text size="xs" c="dimmed">{watchlist.description}</Text>
                      </div>
                    </div>
                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <MoreVertical className="h-4 w-4" />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<Edit className="h-4 w-4" />}>
                          Edit Watchlist
                        </Menu.Item>
                        <Menu.Item leftSection={<BarChart3 className="h-4 w-4" />}>
                          View Performance
                        </Menu.Item>
                        <Menu.Item leftSection={<Trash2 className="h-4 w-4" />} color="red">
                          Delete Watchlist
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </div>

                  <div className="mb-3">
                    <Group gap="xs" mb="sm">
                      {watchlist.symbols.slice(0, 3).map((symbol) => (
                        <Badge key={symbol} variant="outline" color="blue" size="sm">
                          {symbol}
                        </Badge>
                      ))}
                      {watchlist.symbols.length > 3 && (
                        <Badge variant="outline" color="gray" size="sm">
                          +{watchlist.symbols.length - 3} more
                        </Badge>
                      )}
                    </Group>
                  </div>

                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="sm" c="dimmed">Performance</Text>
                      <Text
                        size="lg"
                        c={watchlist.isPositive ? 'green' : 'red'}
                        fw={600}
                      >
                        {watchlist.performance}
                      </Text>
                    </div>
                    <div className="text-right">
                      <Text size="xs" c="dimmed">Last updated</Text>
                      <Text size="xs" c="dimmed">{watchlist.lastUpdated}</Text>
                    </div>
                  </Group>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Market Movers */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Market Movers</Text>
              </Card.Section>

              <div className="mt-4 space-y-3">
                {marketMovers.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div>
                      <Text size="sm" fw={600} c="white">{stock.symbol}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{stock.name}</Text>
                    </div>
                    <div className="text-right">
                      <Text size="sm" fw={500} c="white">${stock.price}</Text>
                      <Text
                        size="xs"
                        c={stock.change.startsWith('+') ? 'green' : 'red'}
                        fw={500}
                      >
                        {stock.change}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Watchlist Stats */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Watchlist Stats</Text>
              </Card.Section>

              <div className="mt-4 space-y-4">
                <div className="text-center">
                  <Text size="2xl" fw={700} c="white">{watchlists.length}</Text>
                  <Text size="sm" c="dimmed">Total Watchlists</Text>
                </div>

                <div className="text-center">
                  <Text size="2xl" fw={700} c="green">
                    {watchlists.reduce((acc, wl) => acc + wl.symbols.length, 0)}
                  </Text>
                  <Text size="sm" c="dimmed">Stocks Tracked</Text>
                </div>

                <div className="text-center">
                  <Text size="2xl" fw={700} c="blue">
                    {watchlists.filter(wl => wl.isPositive).length}
                  </Text>
                  <Text size="sm" c="dimmed">Performing Well</Text>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Quick Actions</Text>
              </Card.Section>

              <div className="mt-4 space-y-2">
                <Button variant="outline" size="sm" fullWidth leftSection={<Plus className="h-4 w-4" />}>
                  Add Symbol
                </Button>
                <Button variant="outline" size="sm" fullWidth leftSection={<BarChart3 className="h-4 w-4" />}>
                  Performance View
                </Button>
                <Button variant="outline" size="sm" fullWidth leftSection={<Star className="h-4 w-4" />}>
                  Import Watchlist
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}