'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, Text, Group, Badge, Button, SimpleGrid, Progress, Tabs } from '@mantine/core';
import { TrendingUp, TrendingDown, DollarSign, Shield, Target, BarChart3 } from 'lucide-react';

const mutualFunds = [
  {
    name: 'Tech Growth Fund',
    symbol: 'TGF001',
    category: 'Technology',
    nav: 45.67,
    aum: '2.3B',
    expenseRatio: 0.85,
    ytdReturn: 24.5,
    oneYearReturn: 18.3,
    threeYearReturn: 12.7,
    risk: 'High',
    minInvestment: 1000,
    holdings: ['AAPL', 'MSFT', 'NVDA', 'GOOGL']
  },
  {
    name: 'Balanced Income Fund',
    symbol: 'BIF002',
    category: 'Balanced',
    nav: 32.45,
    aum: '1.8B',
    expenseRatio: 0.65,
    ytdReturn: 8.2,
    oneYearReturn: 6.9,
    threeYearReturn: 5.4,
    risk: 'Medium',
    minInvestment: 500,
    holdings: ['JPM', 'BAC', 'WFC', 'C']
  },
  {
    name: 'Green Energy Fund',
    symbol: 'GEF003',
    category: 'Thematic',
    nav: 28.90,
    aum: '950M',
    expenseRatio: 0.95,
    ytdReturn: 15.7,
    oneYearReturn: 12.4,
    threeYearReturn: 8.9,
    risk: 'High',
    minInvestment: 2500,
    holdings: ['TSLA', 'ENPH', 'SEDG', 'FSLR']
  },
  {
    name: 'Dividend Aristocrats',
    symbol: 'DAF004',
    category: 'Income',
    nav: 67.23,
    aum: '3.1B',
    expenseRatio: 0.55,
    ytdReturn: 6.8,
    oneYearReturn: 5.2,
    threeYearReturn: 7.1,
    risk: 'Low',
    minInvestment: 100,
    holdings: ['JNJ', 'PG', 'KO', 'PEP']
  }
];

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'Low': return 'green';
    case 'Medium': return 'yellow';
    case 'High': return 'red';
    default: return 'gray';
  }
};

export default function MutualFundsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Invest Pro Mutual Funds"
          description="Discover and invest in professionally managed funds on Invest Pro"
          actions={<Button leftSection={<BarChart3 className="h-4 w-4" />}>Compare Funds</Button>}
        />

        {/* Fund Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Equity Funds', count: 45, return: '+12.3%' },
            { name: 'Bond Funds', count: 32, return: '+4.7%' },
            { name: 'Balanced Funds', count: 28, return: '+8.1%' },
            { name: 'Money Market', count: 15, return: '+2.9%' },
          ].map((category) => (
            <Card key={category.name} shadow="sm" padding="md" radius="md" withBorder className="bg-card border-border">
              <Text size="sm" fw={500} c="white">{category.name}</Text>
              <Text size="lg" fw={700} c="white">{category.count}</Text>
              <Text size="xs" c="green">{category.return}</Text>
            </Card>
          ))}
        </div>

        {/* Featured Funds */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">Featured Mutual Funds</Text>
          </Card.Section>

          <SimpleGrid cols={1} spacing="lg" mt="md">
            {mutualFunds.map((fund) => (
              <Card key={fund.symbol} shadow="sm" padding="md" radius="md" withBorder className="bg-card border-border">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <Group justify="space-between" mb="xs">
                      <Text size="lg" fw={600} c="white">{fund.name}</Text>
                      <Badge color={getRiskColor(fund.risk)} variant="light">
                        {fund.risk} Risk
                      </Badge>
                    </Group>

                    <Group gap="lg" mb="sm">
                      <div>
                        <Text size="sm" c="dimmed">NAV</Text>
                        <Text size="lg" fw={500} c="white">${fund.nav}</Text>
                      </div>
                      <div>
                        <Text size="sm" c="dimmed">AUM</Text>
                        <Text size="lg" fw={500} c="white">${fund.aum}</Text>
                      </div>
                      <div>
                        <Text size="sm" c="dimmed">Expense Ratio</Text>
                        <Text size="lg" fw={500} c="white">{fund.expenseRatio}%</Text>
                      </div>
                    </Group>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <Text size="xs" c="dimmed">YTD Return</Text>
                        <Text size="sm" c="green" fw={500}>+{fund.ytdReturn}%</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">1Y Return</Text>
                        <Text size="sm" c="green" fw={500}>+{fund.oneYearReturn}%</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">3Y Return</Text>
                        <Text size="sm" c="green" fw={500}>+{fund.threeYearReturn}%</Text>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Text size="xs" c="dimmed" mb="xs">Top Holdings</Text>
                      <Group gap="xs">
                        {fund.holdings.slice(0, 4).map((holding) => (
                          <Badge key={holding} size="sm" variant="outline" color="blue">
                            {holding}
                          </Badge>
                        ))}
                      </Group>
                    </div>

                    <Text size="xs" c="dimmed">
                      Minimum Investment: ${fund.minInvestment}
                    </Text>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" color="green">
                      View Details
                    </Button>
                    <Button size="sm" color="green">
                      Invest Now
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </SimpleGrid>
        </Card>

        {/* Performance Comparison */}
        <Card shadow="sm" padding="lg" radius="md" withBorder className="bg-card border-border">
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">Performance Comparison</Text>
          </Card.Section>

          <div className="mt-4 space-y-4">
            {mutualFunds.map((fund) => (
              <div key={fund.symbol}>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500} c="white">{fund.name}</Text>
                  <Text size="sm" c="green">+{fund.ytdReturn}% YTD</Text>
                </Group>
                <Progress
                  value={fund.ytdReturn}
                  color="green"
                  size="lg"
                  mb="xs"
                />
                <Text size="xs" c="dimmed">${fund.aum} AUM • {fund.expenseRatio}% expense ratio</Text>
              </div>
            ))}
          </div>
        </Card>

        {/* Investment Calculator */}
        <Card shadow="sm" padding="lg" radius="md" withBorder className="bg-card border-border">
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500} size="lg" c="white">Investment Calculator</Text>
          </Card.Section>

          <Text size="sm" c="dimmed" mt="md">
            Calculate potential returns based on historical performance
          </Text>

          <Group grow mt="md">
            <Button variant="outline" color="green">
              Monthly SIP Calculator
            </Button>
            <Button variant="outline" color="green">
              Lump Sum Calculator
            </Button>
          </Group>
        </Card>
      </div>
    </DashboardLayout>
  );
}