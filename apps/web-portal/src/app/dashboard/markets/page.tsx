'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Table, ScrollArea, Button } from '@mantine/core';
import { Search, Filter } from 'lucide-react';

const marketIndices = [
  { name: 'S&P 500', value: '4,567.89', change: '+1.23%', isPositive: true },
  { name: 'Dow Jones', value: '34,567.89', change: '+0.45%', isPositive: true },
  { name: 'Nasdaq', value: '14,234.56', change: '-0.12%', isPositive: false },
  { name: 'Russell 2000', value: '2,123.45', change: '+0.78%', isPositive: true },
];

const topGainers = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: '432.12', change: '+8.45%', volume: '45.2M' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: '245.67', change: '+5.23%', volume: '32.1M' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: '175.43', change: '+3.45%', volume: '28.7M' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: '335.89', change: '+2.67%', volume: '25.4M' },
];

const topLosers = [
  { symbol: 'META', name: 'Meta Platforms', price: '345.67', change: '-4.23%', volume: '18.3M' },
  { symbol: 'NFLX', name: 'Netflix Inc.', price: '456.78', change: '-3.12%', volume: '15.7M' },
  { symbol: 'AMZN', name: 'Amazon.com', price: '134.56', change: '-2.89%', volume: '22.1M' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: '123.45', change: '-1.67%', volume: '19.8M' },
];

export default function MarketsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Invest Pro Markets</h1>
            <p className="text-gray-400 mt-1">Real-time market data and advanced analysis on Invest Pro</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" leftSection={<Filter className="h-4 w-4" />}>
              Filter
            </Button>
            <Button variant="outline" leftSection={<Search className="h-4 w-4" />}>
              Search
            </Button>
          </div>
        </div>

        {/* Market Indices */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">Market Indices</Text>
          </Card.Section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {marketIndices.map((index) => (
              <div key={index.name} className="text-center p-4 border border-gray-700 rounded">
                <Text size="sm" c="dimmed">{index.name}</Text>
                <Text size="xl" fw={700} c="white">{index.value}</Text>
                <Text
                  size="sm"
                  c={index.isPositive ? 'green' : 'red'}
                  fw={500}
                >
                  {index.change}
                </Text>
              </div>
            ))}
          </div>
        </Card>


        {/* Top Movers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Gainers */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Card.Section withBorder inheritPadding py="xs">
              <Group justify="space-between">
                <Text fw={500} size="lg" c="white">Top Gainers</Text>
                <Badge color="green" variant="light">Today</Badge>
              </Group>
            </Card.Section>

            <ScrollArea h={300}>
              <div className="space-y-3">
                {topGainers.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 rounded hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div>
                      <Text size="sm" fw={600} c="white">{stock.symbol}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{stock.name}</Text>
                    </div>
                    <div className="text-right">
                      <Text size="sm" fw={500} c="white">${stock.price}</Text>
                      <Text size="xs" c="green" fw={500}>
                        {stock.change}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Top Losers */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Card.Section withBorder inheritPadding py="xs">
              <Group justify="space-between">
                <Text fw={500} size="lg" c="white">Top Losers</Text>
                <Badge color="red" variant="light">Today</Badge>
              </Group>
            </Card.Section>

            <ScrollArea h={300}>
              <div className="space-y-3">
                {topLosers.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 rounded hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div>
                      <Text size="sm" fw={600} c="white">{stock.symbol}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{stock.name}</Text>
                    </div>
                    <div className="text-right">
                      <Text size="sm" fw={500} c="white">${stock.price}</Text>
                      <Text size="xs" c="red" fw={500}>
                        {stock.change}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Market Sectors */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">Sector Performance</Text>
          </Card.Section>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            {[
              { name: 'Technology', change: '+2.34%', positive: true },
              { name: 'Healthcare', change: '+1.67%', positive: true },
              { name: 'Financials', change: '-0.45%', positive: false },
              { name: 'Energy', change: '+3.12%', positive: true },
              { name: 'Consumer', change: '+0.89%', positive: true },
              { name: 'Industrials', change: '-1.23%', positive: false },
            ].map((sector) => (
              <div key={sector.name} className="text-center p-3 border border-gray-700 rounded">
                <Text size="xs" c="dimmed">{sector.name}</Text>
                <Text
                  size="sm"
                  c={sector.positive ? 'green' : 'red'}
                  fw={500}
                >
                  {sector.change}
                </Text>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}