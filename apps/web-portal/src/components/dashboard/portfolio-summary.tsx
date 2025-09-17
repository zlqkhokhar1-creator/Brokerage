'use client';

import { Card, Text, Group, Progress, RingProgress, SimpleGrid } from '@mantine/core';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

const portfolioData = {
  totalValue: 125430.50,
  dayChange: 3125.75,
  dayChangePercent: 2.56,
  totalReturn: 15430.50,
  totalReturnPercent: 14.02,
  holdings: [
    { name: 'Apple Inc.', symbol: 'AAPL', value: 45230.00, change: 2.3 },
    { name: 'Microsoft Corp.', symbol: 'MSFT', value: 38150.00, change: -1.2 },
    { name: 'Tesla Inc.', symbol: 'TSLA', value: 28950.00, change: 4.5 },
    { name: 'NVIDIA Corp.', symbol: 'NVDA', value: 13100.00, change: 1.8 },
  ]
};

export function PortfolioSummary() {
  const isPositive = portfolioData.dayChange >= 0;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500} size="lg" c="white">Portfolio Summary</Text>
          <Group gap="xs">
            <DollarSign className="h-4 w-4 text-green-400" />
            <Text size="sm" c="green">Live</Text>
          </Group>
        </Group>
      </Card.Section>

      <div className="mt-4">
        {/* Total Value */}
        <div className="text-center mb-6">
          <Text size="sm" c="dimmed">Total Portfolio Value</Text>
          <Text size="3xl" fw={700} c="white">
            ${portfolioData.totalValue.toLocaleString()}
          </Text>
          <Group justify="center" gap="xs" mt="xs">
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
        </div>

        {/* Performance Metrics */}
        <SimpleGrid cols={2} spacing="md" mb="lg">
          <div className="text-center">
            <Text size="sm" c="dimmed">Total Return</Text>
            <Text size="xl" fw={600} c="green">
              +${portfolioData.totalReturn.toLocaleString()}
            </Text>
            <Text size="sm" c="green">
              +{portfolioData.totalReturnPercent}%
            </Text>
          </div>
          <div className="text-center">
            <Text size="sm" c="dimmed">Holdings</Text>
            <Text size="xl" fw={600} c="white">
              {portfolioData.holdings.length}
            </Text>
            <Text size="sm" c="dimmed">Stocks</Text>
          </div>
        </SimpleGrid>

        {/* Top Holdings */}
        <div>
          <Text size="sm" fw={500} c="white" mb="sm">Top Holdings</Text>
          <div className="space-y-3">
            {portfolioData.holdings.map((holding) => (
              <div key={holding.symbol} className="flex items-center justify-between">
                <div>
                  <Text size="sm" fw={500} c="white">{holding.name}</Text>
                  <Text size="xs" c="dimmed">{holding.symbol}</Text>
                </div>
                <div className="text-right">
                  <Text size="sm" fw={500} c="white">
                    ${holding.value.toLocaleString()}
                  </Text>
                  <Text
                    size="xs"
                    c={holding.change >= 0 ? 'green' : 'red'}
                  >
                    {holding.change >= 0 ? '+' : ''}{holding.change}%
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}