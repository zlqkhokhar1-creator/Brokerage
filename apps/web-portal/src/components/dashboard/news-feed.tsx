'use client';

import { Card, Text, Group, Badge, ScrollArea } from '@mantine/core';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';

const newsItems = [
  {
    id: 1,
    title: 'Fed Signals Potential Rate Cuts in Q4',
    summary: 'Federal Reserve officials hint at possible interest rate reductions as inflation continues to moderate.',
    source: 'Bloomberg',
    time: '2 hours ago',
    category: 'Economy',
    sentiment: 'positive'
  },
  {
    id: 2,
    title: 'Tech Stocks Rally on AI Optimism',
    summary: 'Major technology companies see gains as investors bet on artificial intelligence growth.',
    source: 'Reuters',
    time: '4 hours ago',
    category: 'Technology',
    sentiment: 'positive'
  },
  {
    id: 3,
    title: 'Oil Prices Surge on Supply Concerns',
    summary: 'Crude oil futures climb as geopolitical tensions raise supply disruption fears.',
    source: 'WSJ',
    time: '6 hours ago',
    category: 'Commodities',
    sentiment: 'negative'
  },
  {
    id: 4,
    title: 'Retail Sales Beat Expectations',
    summary: 'US retail sales data exceeds analyst forecasts, signaling strong consumer spending.',
    source: 'CNBC',
    time: '8 hours ago',
    category: 'Economy',
    sentiment: 'positive'
  }
];

export function NewsFeed() {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500} size="lg" c="white">Financial News</Text>
          <Newspaper className="h-5 w-5 text-green-400" />
        </Group>
      </Card.Section>

      <ScrollArea h={400} mt="md">
        <div className="space-y-4">
          {newsItems.map((news) => (
            <div
              key={news.id}
              className="border-b border-gray-700 pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between mb-2">
                <Badge
                  size="sm"
                  color={news.sentiment === 'positive' ? 'green' : 'red'}
                  variant="light"
                >
                  {news.category}
                </Badge>
                <Group gap="xs">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <Text size="xs" c="dimmed">{news.time}</Text>
                </Group>
              </div>

              <Text size="sm" fw={500} c="white" mb="xs" lineClamp={2}>
                {news.title}
              </Text>

              <Text size="xs" c="dimmed" mb="sm" lineClamp={2}>
                {news.summary}
              </Text>

              <Group justify="space-between" align="center">
                <Text size="xs" c="green" fw={500}>
                  {news.source}
                </Text>
                <ExternalLink className="h-3 w-3 text-gray-400 hover:text-green-400 cursor-pointer" />
              </Group>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <Text size="xs" c="green" className="cursor-pointer hover:underline">
          View all news →
        </Text>
      </div>
    </Card>
  );
}