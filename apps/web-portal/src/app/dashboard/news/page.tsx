'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, Text, Group, Badge, Button, ScrollArea, Avatar } from '@mantine/core';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Clock, Filter } from 'lucide-react';

const newsArticles = [
  {
    id: 1,
    title: 'Federal Reserve Signals Potential Rate Cuts in Q4',
    summary: 'Federal Reserve officials hint at possible interest rate reductions as inflation continues to moderate. Market analysts predict 2-3 rate cuts by year-end.',
    source: 'Invest Pro News',
    time: '2 hours ago',
    category: 'Economy',
    sentiment: 'positive',
    author: 'Sarah Chen',
    readTime: '3 min read',
    views: 15420
  },
  {
    id: 2,
    title: 'Tech Stocks Rally on AI Optimism',
    summary: 'Major technology companies see gains as investors bet on artificial intelligence growth. NVIDIA and AMD lead the charge with double-digit gains.',
    source: 'Market Watch',
    time: '4 hours ago',
    category: 'Technology',
    sentiment: 'positive',
    author: 'Mike Rodriguez',
    readTime: '5 min read',
    views: 12890
  },
  {
    id: 3,
    title: 'Oil Prices Surge on Supply Concerns',
    summary: 'Crude oil futures climb as geopolitical tensions raise supply disruption fears. Brent crude hits $85 per barrel for the first time this year.',
    source: 'Energy Report',
    time: '6 hours ago',
    category: 'Commodities',
    sentiment: 'negative',
    author: 'Emma Thompson',
    readTime: '4 min read',
    views: 9876
  },
  {
    id: 4,
    title: 'Retail Sales Beat Expectations',
    summary: 'US retail sales data exceeds analyst forecasts, signaling strong consumer spending. Holiday season outlook remains optimistic.',
    source: 'Economic Daily',
    time: '8 hours ago',
    category: 'Economy',
    sentiment: 'positive',
    author: 'David Kim',
    readTime: '6 min read',
    views: 15670
  },
  {
    id: 5,
    title: 'Cryptocurrency Market Shows Signs of Recovery',
    summary: 'Bitcoin and major altcoins see gains as institutional adoption increases. Regulatory clarity boosts investor confidence.',
    source: 'Crypto Insider',
    time: '10 hours ago',
    category: 'Cryptocurrency',
    sentiment: 'positive',
    author: 'Alex Rivera',
    readTime: '7 min read',
    views: 22340
  }
];

const trendingTopics = [
  { topic: 'Federal Reserve', mentions: 1247, change: '+15%' },
  { topic: 'AI Technology', mentions: 892, change: '+8%' },
  { topic: 'Oil Prices', mentions: 756, change: '+22%' },
  { topic: 'Retail Sales', mentions: 634, change: '+12%' },
  { topic: 'Cryptocurrency', mentions: 523, change: '+18%' }
];

export default function NewsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Invest Pro News</h1>
            <p className="text-gray-400 mt-1">Stay informed with the latest financial news and market insights</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" leftSection={<Filter className="h-4 w-4" />}>
              Filter
            </Button>
            <Button variant="outline" leftSection={<Newspaper className="h-4 w-4" />}>
              My Feed
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main News Feed */}
          <div className="lg:col-span-3">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Latest News</Text>
              </Card.Section>

              <ScrollArea h={600} mt="md">
                <div className="space-y-4">
                  {newsArticles.map((article) => (
                    <Card key={article.id} shadow="sm" padding="md" radius="md" withBorder style={{ backgroundColor: '#25262b' }}>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Group justify="space-between" mb="xs">
                            <Badge
                              color={article.sentiment === 'positive' ? 'green' : 'red'}
                              variant="light"
                              size="sm"
                            >
                              {article.category}
                            </Badge>
                            <Group gap="xs">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <Text size="xs" c="dimmed">{article.time}</Text>
                            </Group>
                          </Group>

                          <Text size="lg" fw={600} c="white" mb="sm" lineClamp={2}>
                            {article.title}
                          </Text>

                          <Text size="sm" c="dimmed" mb="sm" lineClamp={3}>
                            {article.summary}
                          </Text>

                          <Group justify="space-between" align="center">
                            <div className="flex items-center gap-2">
                              <Avatar size="sm" color="blue">
                                {article.author.split(' ').map(n => n[0]).join('')}
                              </Avatar>
                              <div>
                                <Text size="xs" c="white">{article.author}</Text>
                                <Text size="xs" c="dimmed">{article.source}</Text>
                              </div>
                            </div>
                            <Group gap="md">
                              <Text size="xs" c="dimmed">{article.readTime}</Text>
                              <Text size="xs" c="dimmed">{article.views.toLocaleString()} views</Text>
                              <Button variant="subtle" size="xs" rightSection={<ExternalLink className="h-3 w-3" />}>
                                Read More
                              </Button>
                            </Group>
                          </Group>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Topics */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Trending Topics</Text>
              </Card.Section>

              <div className="mt-4 space-y-3">
                {trendingTopics.map((topic, index) => (
                  <div key={topic.topic} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Text size="sm" c="dimmed">#{index + 1}</Text>
                      <Text size="sm" c="white">{topic.topic}</Text>
                    </div>
                    <div className="text-right">
                      <Text size="xs" c="green" fw={500}>{topic.change}</Text>
                      <Text size="xs" c="dimmed">{topic.mentions} mentions</Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Market Sentiment */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Market Sentiment</Text>
              </Card.Section>

              <div className="mt-4 space-y-4">
                <div>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="white">Bullish</Text>
                    <Text size="sm" c="green" fw={500}>68%</Text>
                  </Group>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>

                <div>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="white">Bearish</Text>
                    <Text size="sm" c="red" fw={500}>32%</Text>
                  </Group>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '32%' }}></div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#1a1a1a' }}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg" c="white">Quick Actions</Text>
              </Card.Section>

              <div className="mt-4 space-y-2">
                <Button variant="outline" size="sm" fullWidth>
                  Create Alert
                </Button>
                <Button variant="outline" size="sm" fullWidth>
                  Export News
                </Button>
                <Button variant="outline" size="sm" fullWidth>
                  Customize Feed
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}