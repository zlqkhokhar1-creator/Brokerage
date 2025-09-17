'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Button, Tabs, NumberInput, Select, Stack } from '@mantine/core';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Keyboard, Download, Settings, Bell } from 'lucide-react';
import { React19TradingForm } from '@/components/trading/react19-trading-form';
import { SimpleMarketData } from '@/components/trading/simple-market-data';
import { AdvancedTradingChart } from '@/components/trading/advanced-trading-chart';
import { OrderBook } from '@/components/trading/order-book';
import { PositionSizingCalculator } from '@/components/trading/position-sizing-calculator';
import { TradingJournal } from '@/components/trading/trading-journal';
import { VirtualMarketDataList } from '@/components/trading/virtual-market-data-list';
// import { CustomizableDashboard } from '@/components/dashboard/customizable-dashboard';
// import { PerformanceAnalytics } from '@/components/analytics/performance-analytics';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { KeyboardShortcuts } from '@/components/ui/keyboard-shortcuts';
import { useState, startTransition, useTransition, useDeferredValue, Suspense, useEffect } from 'react';

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
  const [activeTab, setActiveTab] = useState('trading');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const toggleReact19 = () => {
    startTransition(() => {
      setShowReact19(!showReact19);
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '/':
            e.preventDefault();
            setShowShortcuts(true);
            break;
          case 'b':
            e.preventDefault();
            // Focus buy button or form
            break;
          case 's':
            e.preventDefault();
            // Focus sell button or form
            break;
          case 'k':
            e.preventDefault();
            // Open command palette
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
              variant="outline"
              onClick={() => setShowShortcuts(true)}
              size="sm"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Shortcuts
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNotifications(true)}
              size="sm"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
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

        {/* Main Trading Interface */}
        <div className="w-full">
          <div className="flex space-x-1 mb-6">
            {['trading', 'chart', 'orderbook', 'journal', 'tools'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'trading' && (
            <div className="space-y-6">
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
                        { value: 'stop_limit', label: 'Stop Limit Order' },
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
                <Suspense fallback={<div>Loading market data...</div>}>
                  <VirtualMarketDataList height={300} />
                </Suspense>

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
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="space-y-6">
              <Suspense fallback={<div>Loading chart...</div>}>
                <AdvancedTradingChart symbol="AAPL" height={500} />
              </Suspense>
            </div>
          )}

          {activeTab === 'orderbook' && (
            <div className="space-y-6">
              <Suspense fallback={<div>Loading order book...</div>}>
                <OrderBook symbol="AAPL" />
              </Suspense>
            </div>
          )}

          {activeTab === 'journal' && (
            <div className="space-y-6">
              <Suspense fallback={<div>Loading trading journal...</div>}>
                <TradingJournal userId="user-123" />
              </Suspense>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Suspense fallback={<div>Loading position calculator...</div>}>
                  <PositionSizingCalculator symbol="AAPL" currentPrice={175.43} />
                </Suspense>
                <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
                  <Card.Section withBorder inheritPadding py="xs">
                    <Text fw={500} size="lg" c="white">Quick Tools</Text>
                  </Card.Section>
                  <div className="mt-4 space-y-4">
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export Portfolio
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Trading Settings
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Bell className="h-4 w-4 mr-2" />
                      Set Price Alert
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <KeyboardShortcuts 
          isOpen={showShortcuts} 
          onClose={() => setShowShortcuts(false)} 
        />
        <NotificationCenter 
          isOpen={showNotifications} 
          onClose={() => setShowNotifications(false)} 
        />
      </div>
    </DashboardLayout>
  );
}