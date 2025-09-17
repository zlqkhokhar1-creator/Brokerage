'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Progress, SimpleGrid, Tabs, Button } from '@mantine/core';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Target, Calendar } from 'lucide-react';

const portfolioData = {
  totalValue: 125430.50,
  dayChange: 3125.75,
  dayChangePercent: 2.56,
  totalReturn: 15430.50,
  totalReturnPercent: 14.02,
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, avgPrice: 150.00, currentPrice: 175.43, value: 8771.50, change: 16.95 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 30, avgPrice: 280.00, currentPrice: 335.89, value: 10076.70, change: 19.96 },
    { symbol: 'TSLA', name: 'Tesla Inc.', shares: 25, avgPrice: 200.00, currentPrice: 245.67, value: 6141.75, change: 22.84 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 15, avgPrice: 350.00, currentPrice: 432.12, value: 6481.80, change: 23.49 },
  ]
};

const allocationData = [
  { sector: 'Technology', percentage: 65, value: 81547.75, color: '#00ff00' },
  { sector: 'Healthcare', percentage: 20, value: 25086.10, color: '#0080ff' },
  { sector: 'Financials', percentage: 10, value: 12543.05, color: '#ff8000' },
  { sector: 'Energy', percentage: 5, value: 6271.53, color: '#8000ff' },
];

export default function PortfolioPage() {
  const isPositive = portfolioData.dayChange >= 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Invest Pro Portfolio</h1>
            <p className="text-gray-400 mt-1">Manage your investments and track performance on Invest Pro</p>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Total Value Card */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Total Portfolio Value</Text>
              <DollarSign className="h-5 w-5 text-green-400" />
            </Group>
            <Text size="3xl" fw={700} c="white">
              ${portfolioData.totalValue.toLocaleString()}
            </Text>
            <Group gap="xs" mt="sm">
              <Text
                size="lg"
                c={isPositive ? 'green' : 'red'}
                fw={600}
              >
                {isPositive ? '+' : ''}${portfolioData.dayChange.toLocaleString()}
              </Text>
              <Text
                size="lg"
                c={isPositive ? 'green' : 'red'}
                fw={600}
              >
                ({isPositive ? '+' : ''}{portfolioData.dayChangePercent}%)
              </Text>
            </Group>
          </Card>

          {/* Total Return Card */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Total Return</Text>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </Group>
            <Text size="3xl" fw={700} c="green">
              +${portfolioData.totalReturn.toLocaleString()}
            </Text>
            <Text size="lg" c="green" fw={600}>
              +{portfolioData.totalReturnPercent}%
            </Text>
          </Card>

          {/* Holdings Count Card */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Holdings</Text>
              <PieChart className="h-5 w-5 text-blue-400" />
            </Group>
            <Text size="3xl" fw={700} c="white">
              {portfolioData.holdings.length}
            </Text>
            <Text size="lg" c="dimmed">
              Active Positions
            </Text>
          </Card>
        </div>

        {/* Detailed Portfolio */}
        <Tabs defaultValue="holdings" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="holdings">Holdings</Tabs.Tab>
            <Tabs.Tab value="allocation">Allocation</Tabs.Tab>
            <Tabs.Tab value="performance">Performance</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="holdings" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <div className="space-y-4">
                {portfolioData.holdings.map((holding) => (
                  <div
                    key={holding.symbol}
                    className="flex items-center justify-between p-4 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold">{holding.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <Text size="sm" fw={600} c="white">{holding.symbol}</Text>
                        <Text size="xs" c="dimmed">{holding.name}</Text>
                        <Text size="xs" c="dimmed">{holding.shares} shares @ ${holding.avgPrice}</Text>
                      </div>
                    </div>
                    <div className="text-right">
                      <Text size="sm" fw={500} c="white">${holding.currentPrice}</Text>
                      <Text size="xs" c={holding.change >= 0 ? 'green' : 'red'}>
                        {holding.change >= 0 ? '+' : ''}{holding.change}%
                      </Text>
                      <Text size="sm" fw={600} c="white">${holding.value.toLocaleString()}</Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="allocation" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Text fw={500} size="lg" c="white" mb="lg">Asset Allocation</Text>
              <div className="space-y-4">
                {allocationData.map((allocation) => (
                  <div key={allocation.sector}>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500} c="white">{allocation.sector}</Text>
                      <Text size="sm" c="white">{allocation.percentage}%</Text>
                    </Group>
                    <Progress
                      value={allocation.percentage}
                      color={allocation.color}
                      size="lg"
                      mb="xs"
                    />
                    <Text size="xs" c="dimmed">${allocation.value.toLocaleString()}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="performance" pt="xl">
            <div className="space-y-6">
              {/* Portfolio Performance Chart */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Group justify="space-between">
                    <Text fw={500} size="lg" c="white">Portfolio Performance Chart</Text>
                    <Badge color="green" variant="light">+14.02% YTD</Badge>
                  </Group>
                </Card.Section>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Text size="lg" fw={600} c="white">Total Portfolio Value</Text>
                      <Text size="sm" c="dimmed">Historical performance with benchmark comparison</Text>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                        1M
                      </Button>
                      <Button variant="outline" size="sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                        3M
                      </Button>
                      <Button variant="filled" size="sm" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                        1Y
                      </Button>
                      <Button variant="outline" size="sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                        5Y
                      </Button>
                    </div>
                  </div>

                  {/* Chart Container */}
                  <div className="h-80 bg-card rounded-lg border relative overflow-hidden mb-4" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="h-16 w-16 mx-auto mb-4" style={{ color: 'hsl(var(--primary))' }} />
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                          Portfolio Performance Chart
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          Track your portfolio's growth over time with benchmark comparison
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Badge variant="secondary">Portfolio Value</Badge>
                          <Badge variant="secondary">S&P 500 Benchmark</Badge>
                          <Badge variant="secondary">Historical Returns</Badge>
                          <Badge variant="secondary">Risk Metrics</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                      <Text size="xs" c="dimmed">1M Return</Text>
                      <Text size="lg" fw={700} c="green">+2.45%</Text>
                      <Text size="xs" c="green">vs +1.23% S&P</Text>
                    </div>
                    <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                      <Text size="xs" c="dimmed">3M Return</Text>
                      <Text size="lg" fw={700} c="green">+7.89%</Text>
                      <Text size="xs" c="green">vs +5.67% S&P</Text>
                    </div>
                    <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                      <Text size="xs" c="dimmed">1Y Return</Text>
                      <Text size="lg" fw={700} c="green">+14.02%</Text>
                      <Text size="xs" c="green">vs +11.45% S&P</Text>
                    </div>
                    <div className="text-center p-3 border rounded" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                      <Text size="xs" c="dimmed">5Y Return</Text>
                      <Text size="lg" fw={700} c="green">+67.34%</Text>
                      <Text size="xs" c="green">vs +58.92% S&P</Text>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Performance Metrics */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Text fw={500} size="lg" c="white" mb="lg">Risk & Performance Metrics</Text>
                <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
                  <div>
                    <Text size="sm" c="dimmed">Sharpe Ratio</Text>
                    <Text size="xl" fw={700} c="green">1.45</Text>
                    <Text size="xs" c="dimmed">Risk-adjusted returns</Text>
                  </div>
                  <div>
                    <Text size="sm" c="dimmed">Max Drawdown</Text>
                    <Text size="xl" fw={700} c="red">-8.23%</Text>
                    <Text size="xs" c="dimmed">Peak to trough decline</Text>
                  </div>
                  <div>
                    <Text size="sm" c="dimmed">Volatility</Text>
                    <Text size="xl" fw={700} c="white">12.45%</Text>
                    <Text size="xs" c="dimmed">Annualized standard deviation</Text>
                  </div>
                  <div>
                    <Text size="sm" c="dimmed">Beta</Text>
                    <Text size="xl" fw={700} c="white">0.87</Text>
                    <Text size="xs" c="dimmed">Market correlation</Text>
                  </div>
                </SimpleGrid>
              </Card>
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}