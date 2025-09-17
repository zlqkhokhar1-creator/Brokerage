'use client';

import { Card, Text, Group, Badge, Table, ScrollArea } from '@mantine/core';
import { TrendingUp, TrendingDown } from 'lucide-react';

const marketData = [
  { name: 'Dow Jones', value: '34,567.89', change: '+0.45%', isPositive: true },
  { name: 'S&P 500', value: '4,234.56', change: '-0.12%', isPositive: false },
  { name: 'Nasdaq', value: '13,456.78', change: '+1.23%', isPositive: true },
  { name: 'Russell 2000', value: '2,123.45', change: '+0.78%', isPositive: true },
];

const topMovers = [
  { symbol: 'AAPL', price: '175.43', change: '+3.45%', volume: '45.2M' },
  { symbol: 'TSLA', price: '245.67', change: '+2.89%', volume: '32.1M' },
  { symbol: 'NVDA', price: '432.12', change: '-1.23%', volume: '28.7M' },
  { symbol: 'MSFT', price: '335.89', change: '+1.67%', volume: '25.4M' },
];

export function MarketOverview() {
  return (
    <div className="space-y-6">
      {/* Market Indices */}
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
        <Card.Section withBorder inheritPadding py="xs">
          <Group justify="space-between">
            <Text fw={500} size="lg" c="white">Market Overview</Text>
            <Badge color="green" variant="light">Markets Open</Badge>
          </Group>
        </Card.Section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {marketData.map((index) => (
            <div key={index.name} className="text-center">
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
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
        <Card.Section withBorder inheritPadding py="xs">
          <Text fw={500} size="lg" c="white">Top Movers</Text>
        </Card.Section>

        <ScrollArea>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ color: 'white' }}>Symbol</Table.Th>
                <Table.Th style={{ color: 'white' }}>Price</Table.Th>
                <Table.Th style={{ color: 'white' }}>Change</Table.Th>
                <Table.Th style={{ color: 'white' }}>Volume</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {topMovers.map((stock) => (
                <Table.Tr key={stock.symbol}>
                  <Table.Td style={{ color: 'white', fontWeight: 600 }}>
                    {stock.symbol}
                  </Table.Td>
                  <Table.Td style={{ color: 'white' }}>${stock.price}</Table.Td>
                  <Table.Td>
                    <Text
                      c={stock.change.startsWith('+') ? 'green' : 'red'}
                      fw={500}
                    >
                      {stock.change}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ color: 'white' }}>{stock.volume}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}