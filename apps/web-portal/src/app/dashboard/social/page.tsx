'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, Text, Group, Badge, Button, Avatar, Tabs, ScrollArea } from '@mantine/core';
import { Heart, MessageCircle, Share2, TrendingUp, Users, Award, ThumbsUp } from 'lucide-react';

const trendingTraders = [
  {
    name: 'Sarah Chen',
    username: '@sarahchen',
    avatar: 'SC',
    followers: 15420,
    winRate: 78.5,
    totalReturn: 245.3,
    badge: 'Top Trader',
    isFollowing: false
  },
  {
    name: 'Mike Rodriguez',
    username: '@mikerod',
    avatar: 'MR',
    followers: 12890,
    winRate: 82.1,
    totalReturn: 189.7,
    badge: 'Expert',
    isFollowing: true
  },
  {
    name: 'Emma Thompson',
    username: '@emmathompson',
    avatar: 'ET',
    followers: 9876,
    winRate: 75.3,
    totalReturn: 156.8,
    badge: 'Rising Star',
    isFollowing: false
  }
];

const socialPosts = [
  {
    id: 1,
    trader: 'Sarah Chen',
    username: '@sarahchen',
    avatar: 'SC',
    content: 'Just identified a strong bullish pattern in AAPL. The technicals are aligning perfectly with the fundamentals. Looking for a 15-20% upside in the next 2-3 weeks.',
    timestamp: '2 hours ago',
    likes: 234,
    comments: 45,
    shares: 12,
    symbol: 'AAPL',
    sentiment: 'bullish'
  },
  {
    id: 2,
    trader: 'Mike Rodriguez',
    username: '@mikerod',
    avatar: 'MR',
    content: 'NVDA earnings beat expectations! This AI momentum is just getting started. Added to my position today.',
    timestamp: '4 hours ago',
    likes: 189,
    comments: 32,
    shares: 8,
    symbol: 'NVDA',
    sentiment: 'bullish'
  },
  {
    id: 3,
    trader: 'Emma Thompson',
    username: '@emmathompson',
    avatar: 'ET',
    content: 'Market correction incoming? SPY showing some concerning patterns. Reducing exposure to tech sector.',
    timestamp: '6 hours ago',
    likes: 156,
    comments: 28,
    shares: 15,
    symbol: 'SPY',
    sentiment: 'bearish'
  }
];

const communityStats = [
  { label: 'Active Traders', value: '45,231', icon: Users },
  { label: 'Signals Today', value: '1,247', icon: TrendingUp },
  { label: 'Discussions', value: '892', icon: MessageCircle },
  { label: 'Top Performers', value: '156', icon: Award }
];

export default function SocialPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Invest Pro Social"
          description="Connect with traders and follow market insights on Invest Pro"
          actions={<Button leftSection={<Share2 className="h-4 w-4" />}>Share Your Trade</Button>}
        />

        {/* Community Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {communityStats.map((stat) => (
            <Card key={stat.label} shadow="sm" padding="md" radius="md" withBorder className="bg-card border-border">
              <Group gap="sm">
                <stat.icon className="h-5 w-5 text-green-400" />
                <div>
                  <Text size="lg" fw={700} c="white">{stat.value}</Text>
                  <Text size="xs" c="dimmed">{stat.label}</Text>
                </div>
              </Group>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            <Card shadow="sm" padding="lg" radius="md" withBorder className="bg-card border-border">
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg">Trading Feed</Text>
              </Card.Section>

              <ScrollArea h={600} mt="md">
                <div className="space-y-4">
                  {socialPosts.map((post) => (
                    <Card key={post.id} shadow="sm" padding="md" radius="md" withBorder className="bg-card border-border">
                      <div className="flex gap-3">
                        <Avatar color="blue" size="md">
                          {post.avatar}
                        </Avatar>
                        <div className="flex-1">
                          <Group justify="space-between" mb="xs">
                            <div>
                              <Text size="sm" fw={600}>{post.trader}</Text>
                              <Text size="xs" c="dimmed">{post.username} • {post.timestamp}</Text>
                            </div>
                            <Badge
                              color={post.sentiment === 'bullish' ? 'green' : 'red'}
                              variant="light"
                              size="sm"
                            >
                              {post.sentiment}
                            </Badge>
                          </Group>

                          <Text size="sm" mb="sm">
                            {post.content}
                          </Text>

                          <Group gap="xs" mb="sm">
                            <Badge variant="outline" color="blue">
                              ${post.symbol}
                            </Badge>
                          </Group>

                          <Group gap="lg">
                            <Button variant="subtle" size="xs" leftSection={<ThumbsUp className="h-3 w-3" />}>
                              {post.likes}
                            </Button>
                            <Button variant="subtle" size="xs" leftSection={<MessageCircle className="h-3 w-3" />}>
                              {post.comments}
                            </Button>
                            <Button variant="subtle" size="xs" leftSection={<Share2 className="h-3 w-3" />}>
                              {post.shares}
                            </Button>
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
            {/* Trending Traders */}
            <Card shadow="sm" padding="lg" radius="md" withBorder className="bg-card border-border">
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg">Trending Traders</Text>
              </Card.Section>

              <div className="mt-4 space-y-4">
                {trendingTraders.map((trader) => (
                  <div key={trader.username} className="flex items-center gap-3">
                    <Avatar color="green" size="md">
                      {trader.avatar}
                    </Avatar>
                    <div className="flex-1">
                      <Text size="sm" fw={600}>{trader.name}</Text>
                      <Text size="xs" c="dimmed">{trader.username}</Text>
                      <Group gap="xs" mt="xs">
                        <Badge size="xs" color="blue">{trader.badge}</Badge>
                        <Text size="xs" c="green">{trader.winRate}% win rate</Text>
                      </Group>
                    </div>
                    <Button
                      variant={trader.isFollowing ? "outline" : "filled"}
                      size="xs"
                      color={trader.isFollowing ? "gray" : "green"}
                    >
                      {trader.isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Market Sentiment */}
            <Card shadow="sm" padding="lg" radius="md" withBorder className="bg-card border-border">
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg">Market Sentiment</Text>
              </Card.Section>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <Text size="sm">Bullish</Text>
                  <Text size="sm" c="green" fw={500}>68%</Text>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                </div>

                <div className="flex justify-between items-center">
                  <Text size="sm">Bearish</Text>
                  <Text size="sm" c="red" fw={500}>32%</Text>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '32%' }}></div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card shadow="sm" padding="lg" radius="md" withBorder className="bg-card border-border">
              <Card.Section withBorder inheritPadding py="xs">
                <Text fw={500} size="lg">Quick Actions</Text>
              </Card.Section>

              <div className="mt-4 space-y-2">
                <Button variant="outline" size="sm" fullWidth>
                  Create Signal
                </Button>
                <Button variant="outline" size="sm" fullWidth>
                  Join Discussion
                </Button>
                <Button variant="outline" size="sm" fullWidth>
                  View Leaderboard
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}