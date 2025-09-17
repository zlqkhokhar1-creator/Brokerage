'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Button, Tabs, NumberInput, Select, Stack } from '@mantine/core';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target } from 'lucide-react';
import { React19TradingForm } from '@/components/trading/react19-trading-form';
import { SimpleMarketData } from '@/components/trading/simple-market-data';
import { useState, startTransition } from 'react';

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
  const [showReact19, setShowReact19] = useState(false);

  const toggleReact19 = () => {
    startTransition(() => {
      setShowReact19(!showReact19);
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Invest Pro Trading</h1>
            <p className="text-gray-400 mt-1">Execute trades and manage positions on Invest Pro</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={showReact19 ? "filled" : "outline"}
              onClick={toggleReact19}
              size="sm"
            >
              {showReact19 ? "Hide" : "Show"} React 19 Features
            </Button>
            <Badge color="green" variant="light" size="lg">Market Open</Badge>
          </div>
        </div>

        {/* React 19 Features Section */}
        {showReact19 && (
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Card.Section withBorder inheritPadding py="xs">
              <Group justify="space-between">
                <Text fw={500} size="lg" c="white">🚀 React 19 Enhanced Trading</Text>
                <Badge color="blue" variant="light">New Features</Badge>
              </Group>
            </Card.Section>
            
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Text fw={500} size="md" c="white" mb="sm">Live Market Data (React 19 Patterns)</Text>
                <SimpleMarketData symbol="AAPL" />
              </div>
              <div>
                <Text fw={500} size="md" c="white" mb="sm">Smart Trading Form (useTransition)</Text>
                <React19TradingForm symbol="AAPL" currentPrice={175.43} />
              </div>
            </div>
          </Card>
        )}

        {/* Advanced Trading Chart - Full Width */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
          <Card.Section withBorder inheritPadding py="xs">
            <Group justify="space-between">
              <Text fw={500} size="lg" c="white">Advanced Trading Chart</Text>
              <Badge color="blue" variant="light">Real-time Analysis</Badge>
            </Group>
          </Card.Section>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Text size="xl" fw={700} c="white">AAPL - Apple Inc.</Text>
                <Text size="sm" c="dimmed">Live OHLCV data with technical indicators for informed trading decisions</Text>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  1D
                </Button>
                <Button variant="outline" size="sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  5D
                </Button>
                <Button variant="filled" size="sm" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                  1M
                </Button>
                <Button variant="outline" size="sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  3M
                </Button>
                <Button variant="outline" size="sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  1Y
                </Button>
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-96 bg-card rounded-lg border relative overflow-hidden mb-4" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-20 w-20 mx-auto mb-4" style={{ color: 'hsl(var(--primary))' }} />
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    Interactive Trading Chart
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Professional candlestick chart with advanced technical analysis
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="secondary">Candlestick</Badge>
                    <Badge variant="secondary">Technical Indicators</Badge>
                    <Badge variant="secondary">Volume Analysis</Badge>
                    <Badge variant="secondary">Order Flow</Badge>
                    <Badge variant="secondary">Real-time</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Indicators Panel */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                <Text size="xs" c="dimmed">Price</Text>
                <Text size="lg" fw={700} c="white">$175.43</Text>
                <Text size="xs" c="green">+3.45%</Text>
              </div>
              <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                <Text size="xs" c="dimmed">SMA (20)</Text>
                <Text size="lg" fw={700} c="white">172.89</Text>
                <Text size="xs" c="green">Bullish</Text>
              </div>
              <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                <Text size="xs" c="dimmed">RSI (14)</Text>
                <Text size="lg" fw={700} c="white">67.8</Text>
                <Text size="xs" c="orange">Neutral</Text>
              </div>
              <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                <Text size="xs" c="dimmed">MACD</Text>
                <Text size="lg" fw={700} c="white">+1.23</Text>
                <Text size="xs" c="green">Buy Signal</Text>
              </div>
              <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                <Text size="xs" c="dimmed">Volume</Text>
                <Text size="lg" fw={700} c="white">45.2M</Text>
                <Text size="xs" c="blue">High</Text>
              </div>
            </div>

            {/* Trading Signals */}
            <div className="flex flex-wrap gap-2">
              <Badge color="green" variant="light" size="lg">Strong Buy Signal</Badge>
              <Badge color="blue" variant="light">Volume Confirmation</Badge>
              <Badge color="orange" variant="light">RSI Neutral</Badge>
              <Badge color="purple" variant="light">MACD Bullish</Badge>
            </div>
          </div>
        </Card>

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