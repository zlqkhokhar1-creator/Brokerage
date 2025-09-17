'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Button, SimpleGrid, Progress, Tabs, Select, NumberInput } from '@mantine/core';
import { Cpu, TrendingUp, TrendingDown, Play, Pause, BarChart3, Zap, Target, AlertTriangle } from 'lucide-react';

const tradingStrategies = [
  {
    name: 'Momentum Strategy',
    description: 'Trades based on price momentum and volume analysis',
    performance: '+24.5%',
    winRate: 68,
    maxDrawdown: 12.3,
    riskLevel: 'Medium',
    status: 'Active',
    lastSignal: 'BUY AAPL'
  },
  {
    name: 'Mean Reversion',
    description: 'Identifies overbought/oversold conditions for reversal trades',
    performance: '+18.7%',
    winRate: 72,
    maxDrawdown: 8.9,
    riskLevel: 'Low',
    status: 'Active',
    lastSignal: 'SELL TSLA'
  },
  {
    name: 'Breakout Strategy',
    description: 'Trades breakouts above resistance or below support levels',
    performance: '+31.2%',
    winRate: 65,
    maxDrawdown: 15.7,
    riskLevel: 'High',
    status: 'Paused',
    lastSignal: 'BUY NVDA'
  },
  {
    name: 'Pairs Trading',
    description: 'Trades correlated asset pairs when they diverge',
    performance: '+15.8%',
    winRate: 71,
    maxDrawdown: 9.4,
    riskLevel: 'Medium',
    status: 'Active',
    lastSignal: 'SHORT SPY/LONG QQQ'
  }
];

const backtestResults = [
  {
    strategy: 'Momentum Strategy',
    period: '2023-01-01 to 2024-01-01',
    totalReturn: '+24.5%',
    annualizedReturn: '+18.3%',
    sharpeRatio: 1.45,
    maxDrawdown: '-12.3%',
    winRate: '68%',
    totalTrades: 247
  },
  {
    strategy: 'Mean Reversion',
    period: '2023-01-01 to 2024-01-01',
    totalReturn: '+18.7%',
    annualizedReturn: '+14.2%',
    sharpeRatio: 1.67,
    maxDrawdown: '-8.9%',
    winRate: '72%',
    totalTrades: 189
  }
];

const liveSignals = [
  { time: '14:32:15', symbol: 'AAPL', action: 'BUY', price: 175.43, confidence: 87, reason: 'Momentum breakout' },
  { time: '14:28:42', symbol: 'TSLA', action: 'SELL', price: 245.67, confidence: 92, reason: 'Overbought condition' },
  { time: '14:25:18', symbol: 'NVDA', action: 'BUY', price: 432.12, confidence: 89, reason: 'Volume surge' },
  { time: '14:22:33', symbol: 'META', action: 'HOLD', price: 345.67, confidence: 76, reason: 'Neutral signals' }
];

const riskMetrics = {
  portfolioValue: 125430.50,
  dailyPnL: 3125.75,
  maxDrawdown: 8.9,
  var95: 2450.30,
  expectedShortfall: 3876.50,
  beta: 0.87,
  sharpeRatio: 1.45
};

export default function AITradingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">AI Trading</h1>
            <p className="text-gray-400 mt-1">Algorithmic trading strategies and automated execution</p>
          </div>
          <div className="flex gap-2">
            <Badge color="green" variant="light" size="lg" leftSection={<Cpu className="h-4 w-4" />}>
              3 Strategies Active
            </Badge>
            <Button leftSection={<Play className="h-4 w-4" />}>
              Start All
            </Button>
          </div>
        </div>

        {/* Risk Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <Target className="h-5 w-5 text-green-400" />
              <div>
                <Text size="lg" fw={700} c="white">${riskMetrics.portfolioValue.toLocaleString()}</Text>
                <Text size="xs" c="dimmed">Portfolio Value</Text>
              </div>
            </Group>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <div>
                <Text size="lg" fw={700} c="green">+${riskMetrics.dailyPnL.toLocaleString()}</Text>
                <Text size="xs" c="dimmed">Daily P&L</Text>
              </div>
            </Group>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <Text size="lg" fw={700} c="red">{riskMetrics.maxDrawdown}%</Text>
                <Text size="xs" c="dimmed">Max Drawdown</Text>
              </div>
            </Group>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
            <Group gap="sm">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <div>
                <Text size="lg" fw={700} c="white">{riskMetrics.sharpeRatio}</Text>
                <Text size="xs" c="dimmed">Sharpe Ratio</Text>
              </div>
            </Group>
          </Card>
        </div>

        <Tabs defaultValue="strategies" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="strategies">Trading Strategies</Tabs.Tab>
            <Tabs.Tab value="signals">Live Signals</Tabs.Tab>
            <Tabs.Tab value="backtesting">Backtesting</Tabs.Tab>
            <Tabs.Tab value="risk">Risk Management</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="strategies" pt="xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tradingStrategies.map((strategy) => (
                <Card key={strategy.name} shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Group justify="space-between" mb="xs">
                        <Text size="lg" fw={600} c="white">{strategy.name}</Text>
                        <Badge
                          color={strategy.status === 'Active' ? 'green' : 'yellow'}
                          variant="light"
                        >
                          {strategy.status}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed" mb="sm">{strategy.description}</Text>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <Text size="xs" c="dimmed">Performance</Text>
                          <Text size="sm" c="green" fw={500}>{strategy.performance}</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">Win Rate</Text>
                          <Text size="sm" c="white" fw={500}>{strategy.winRate}%</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">Max Drawdown</Text>
                          <Text size="sm" c="red" fw={500}>{strategy.maxDrawdown}%</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">Risk Level</Text>
                          <Badge
                            size="sm"
                            color={
                              strategy.riskLevel === 'Low' ? 'green' :
                              strategy.riskLevel === 'Medium' ? 'yellow' : 'red'
                            }
                          >
                            {strategy.riskLevel}
                          </Badge>
                        </div>
                      </div>

                      <Text size="xs" c="dimmed">Last Signal: {strategy.lastSignal}</Text>
                    </div>
                  </div>

                  <Group grow>
                    <Button
                      variant="outline"
                      size="sm"
                      color={strategy.status === 'Active' ? 'red' : 'green'}
                      leftSection={strategy.status === 'Active' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    >
                      {strategy.status === 'Active' ? 'Pause' : 'Start'}
                    </Button>
                    <Button variant="outline" size="sm" color="blue">
                      Configure
                    </Button>
                  </Group>
                </Card>
              ))}
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="signals" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Live Trading Signals</Text>
              </Card.Section>

              <div className="mt-4 space-y-3">
                {liveSignals.map((signal, index) => (
                  <Card key={index} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{signal.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <Text size="sm" fw={600} c="white">{signal.symbol}</Text>
                          <Text size="xs" c="dimmed">{signal.time}</Text>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge
                            color={
                              signal.action === 'BUY' ? 'green' :
                              signal.action === 'SELL' ? 'red' : 'yellow'
                            }
                            variant="light"
                            mb="xs"
                          >
                            {signal.action}
                          </Badge>
                          <Text size="sm" c="white">${signal.price}</Text>
                          <Text size="xs" c="blue">{signal.confidence}% confidence</Text>
                        </div>

                        <div className="text-right">
                          <Text size="xs" c="dimmed" mb="xs">{signal.reason}</Text>
                          <Button
                            size="xs"
                            color={
                              signal.action === 'BUY' ? 'green' :
                              signal.action === 'SELL' ? 'red' : 'yellow'
                            }
                          >
                            Execute
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="backtesting" pt="xl">
            <div className="space-y-6">
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Backtesting Results</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  {backtestResults.map((result) => (
                    <Card key={result.strategy} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Text size="sm" fw={600} c="white">{result.strategy}</Text>
                          <Text size="xs" c="dimmed">{result.period}</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">Total Return</Text>
                          <Text size="sm" c="green" fw={500}>{result.totalReturn}</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">Sharpe Ratio</Text>
                          <Text size="sm" c="white" fw={500}>{result.sharpeRatio}</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">Win Rate</Text>
                          <Text size="sm" c="white" fw={500}>{result.winRate}</Text>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">Annualized Return: {result.annualizedReturn}</Text>
                          <Text size="xs" c="dimmed">Max Drawdown: {result.maxDrawdown}</Text>
                          <Text size="xs" c="dimmed">Total Trades: {result.totalTrades}</Text>
                        </Group>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Run New Backtest</Text>
                </Card.Section>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Strategy"
                    placeholder="Select strategy"
                    data={tradingStrategies.map(s => ({ value: s.name, label: s.name }))}
                    styles={{
                      input: { backgroundColor: '#25262b', color: 'white' },
                      label: { color: 'white' }
                    }}
                  />

                  <Select
                    label="Time Period"
                    placeholder="Select period"
                    data={[
                      { value: '1M', label: '1 Month' },
                      { value: '3M', label: '3 Months' },
                      { value: '6M', label: '6 Months' },
                      { value: '1Y', label: '1 Year' },
                      { value: '2Y', label: '2 Years' }
                    ]}
                    styles={{
                      input: { backgroundColor: '#25262b', color: 'white' },
                      label: { color: 'white' }
                    }}
                  />

                  <div className="flex items-end">
                    <Button color="green" fullWidth>
                      Run Backtest
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="risk" pt="xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Risk Metrics</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Text size="sm" c="dimmed">VaR (95%)</Text>
                      <Text size="lg" fw={600} c="red">${riskMetrics.var95.toLocaleString()}</Text>
                    </div>
                    <div>
                      <Text size="sm" c="dimmed">Expected Shortfall</Text>
                      <Text size="lg" fw={600} c="red">${riskMetrics.expectedShortfall.toLocaleString()}</Text>
                    </div>
                    <div>
                      <Text size="sm" c="dimmed">Beta</Text>
                      <Text size="lg" fw={600} c="white">{riskMetrics.beta}</Text>
                    </div>
                    <div>
                      <Text size="sm" c="dimmed">Sharpe Ratio</Text>
                      <Text size="lg" fw={600} c="white">{riskMetrics.sharpeRatio}</Text>
                    </div>
                  </div>
                </div>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Text fw={500} size="lg" c="white">Risk Controls</Text>
                </Card.Section>

                <div className="mt-4 space-y-4">
                  <div>
                    <Text size="sm" c="white" mb="xs">Max Position Size</Text>
                    <NumberInput
                      placeholder="Enter percentage"
                      suffix="%"
                      defaultValue={5}
                      styles={{
                        input: { backgroundColor: '#25262b', color: 'white' }
                      }}
                    />
                  </div>

                  <div>
                    <Text size="sm" c="white" mb="xs">Daily Loss Limit</Text>
                    <NumberInput
                      placeholder="Enter amount"
                      prefix="$"
                      defaultValue={1000}
                      styles={{
                        input: { backgroundColor: '#25262b', color: 'white' }
                      }}
                    />
                  </div>

                  <div>
                    <Text size="sm" c="white" mb="xs">Max Drawdown Limit</Text>
                    <NumberInput
                      placeholder="Enter percentage"
                      suffix="%"
                      defaultValue={10}
                      styles={{
                        input: { backgroundColor: '#25262b', color: 'white' }
                      }}
                    />
                  </div>

                  <Button color="green" mt="md" fullWidth>
                    Update Risk Settings
                  </Button>
                </div>
              </Card>
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}