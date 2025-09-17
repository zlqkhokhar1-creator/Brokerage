'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Button, Tabs, NumberInput, Select, Stack } from '@mantine/core';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target } from 'lucide-react';

const marketData = [
  { symbol: 'AAPL', price: 175.43, change: '+3.45%', volume: '45.2M' },
  { symbol: 'TSLA', price: 245.67, change: '+2.89%', volume: '32.1M' },
  { symbol: 'NVDA', price: 432.12, change: '-1.23%', volume: '28.7M' },
  { symbol: 'MSFT', price: 335.89, change: '+1.67%', volume: '25.4M' },
];

const positions = [
  { symbol: 'AAPL', shares: 50, avgPrice: 150.00, currentPrice: 175.43, pnl: 1271.50, pnlPercent: 16.95 },
  { symbol: 'TSLA', shares: 25, avgPrice: 200.00, currentPrice: 245.67, pnl: 1141.75, pnlPercent: 22.84 },
];

export default function TradingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Invest Pro Trading</h1>
            <p className="text-gray-400 mt-1">Execute trades and manage positions on Invest Pro</p>
          </div>
          <Badge color="green" variant="light" size="lg">Market Open</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Form */}
          <div className="lg:col-span-1">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Place Order</Text>
              </Card.Section>

              <Stack mt="md" gap="md">
                <Select
                  label="Symbol"
                  placeholder="Select stock"
                  data={[
                    { value: 'AAPL', label: 'Apple Inc. (AAPL)' },
                    { value: 'TSLA', label: 'Tesla Inc. (TSLA)' },
                    { value: 'NVDA', label: 'NVIDIA Corp. (NVDA)' },
                    { value: 'MSFT', label: 'Microsoft Corp. (MSFT)' },
                  ]}
                  styles={{
                    input: { backgroundColor: '#25262b', color: 'white' },
                    label: { color: 'white' }
                  }}
                />

                <Select
                  label="Order Type"
                  placeholder="Select type"
                  data={[
                    { value: 'market', label: 'Market Order' },
                    { value: 'limit', label: 'Limit Order' },
                    { value: 'stop', label: 'Stop Order' },
                  ]}
                  styles={{
                    input: { backgroundColor: '#25262b', color: 'white' },
                    label: { color: 'white' }
                  }}
                />

                <Select
                  label="Action"
                  placeholder="Buy or Sell"
                  data={[
                    { value: 'buy', label: 'Buy' },
                    { value: 'sell', label: 'Sell' },
                  ]}
                  styles={{
                    input: { backgroundColor: '#25262b', color: 'white' },
                    label: { color: 'white' }
                  }}
                />

                <NumberInput
                  label="Quantity"
                  placeholder="Number of shares"
                  min={1}
                  styles={{
                    input: { backgroundColor: '#25262b', color: 'white' },
                    label: { color: 'white' }
                  }}
                />

                <NumberInput
                  label="Price (optional)"
                  placeholder="Limit price"
                  min={0}
                  styles={{
                    input: { backgroundColor: '#25262b', color: 'white' },
                    label: { color: 'white' }
                  }}
                />

                <Group grow mt="lg">
                  <Button variant="outline" color="red">Cancel</Button>
                  <Button color="green">Place Order</Button>
                </Group>
              </Stack>
            </Card>
          </div>

          {/* Market Data & Positions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Data */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                  <Text fw={500} size="lg" c="white">Market Data</Text>
                  <BarChart3 className="h-5 w-5 text-green-400" />
                </Group>
              </Card.Section>

              <div className="mt-4 space-y-3">
                {marketData.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 border border-gray-700 rounded hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div>
                      <Text size="sm" fw={600} c="white">{stock.symbol}</Text>
                      <Text size="xs" c="dimmed">Volume: {stock.volume}</Text>
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

            {/* Current Positions */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                  <Text fw={500} size="lg" c="white">Current Positions</Text>
                  <Target className="h-5 w-5 text-blue-400" />
                </Group>
              </Card.Section>

              <div className="mt-4 space-y-3">
                {positions.map((position) => (
                  <div
                    key={position.symbol}
                    className="flex items-center justify-between p-3 border border-gray-700 rounded"
                  >
                    <div>
                      <Text size="sm" fw={600} c="white">{position.symbol}</Text>
                      <Text size="xs" c="dimmed">{position.shares} shares @ ${position.avgPrice}</Text>
                    </div>
                    <div className="text-right">
                      <Text size="sm" fw={500} c="white">${position.currentPrice}</Text>
                      <Text
                        size="xs"
                        c={position.pnl >= 0 ? 'green' : 'red'}
                        fw={500}
                      >
                        P&L: ${position.pnl} ({position.pnlPercent}%)
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Order History */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">Recent Orders</Text>
          </Card.Section>

          <div className="mt-4 space-y-3">
            {[
              { symbol: 'AAPL', type: 'Buy', quantity: 10, price: 175.43, status: 'Filled', time: '2 hours ago' },
              { symbol: 'TSLA', type: 'Sell', quantity: 5, price: 245.67, status: 'Pending', time: '4 hours ago' },
              { symbol: 'NVDA', type: 'Buy', quantity: 3, price: 432.12, status: 'Filled', time: '1 day ago' },
            ].map((order, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-700 rounded"
              >
                <div className="flex items-center gap-4">
                  <Badge color={order.type === 'Buy' ? 'green' : 'red'} variant="light">
                    {order.type}
                  </Badge>
                  <div>
                    <Text size="sm" fw={600} c="white">{order.symbol}</Text>
                    <Text size="xs" c="dimmed">{order.quantity} shares @ ${order.price}</Text>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    color={order.status === 'Filled' ? 'green' : 'yellow'}
                    variant="light"
                    size="sm"
                  >
                    {order.status}
                  </Badge>
                  <Text size="xs" c="dimmed" mt="xs">{order.time}</Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}