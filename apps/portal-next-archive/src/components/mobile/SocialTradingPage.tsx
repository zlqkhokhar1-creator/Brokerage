"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { 
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  Copy,
  Bell,
  MessageSquare,
  Share2,
  Eye,
  Crown,
  Award,
  Target,
  Activity,
  Calendar,
  DollarSign,
  Filter,
  Search,
  Heart,
  MoreHorizontal,
  UserPlus,
  AlertCircle
} from 'lucide-react';

interface SocialTradingPageProps {
  onNavigate: (page: string) => void;
}

const topTraders = [
  {
    id: 1,
    name: 'Sarah Chen',
    username: '@sarahtrader',
    avatar: 'SC',
    verified: true,
    followers: 12500,
    roi: 68.4,
    winRate: 84.2,
    totalTrades: 156,
    copiers: 450,
    risk: 'Medium',
    specialty: 'Tech Stocks',
    isFollowing: false,
    premium: true
  },
  {
    id: 2,
    name: 'Michael Rodriguez',
    username: '@mikefinance',
    avatar: 'MR',
    verified: true,
    followers: 8900,
    roi: 45.7,
    winRate: 76.8,
    totalTrades: 203,
    copiers: 320,
    risk: 'Low',
    specialty: 'ETFs & Dividends',
    isFollowing: true,
    premium: false
  },
  {
    id: 3,
    name: 'Emma Thompson',
    username: '@cryptoemma',
    avatar: 'ET',
    verified: false,
    followers: 15600,
    roi: 127.3,
    winRate: 65.4,
    totalTrades: 89,
    copiers: 780,
    risk: 'High',
    specialty: 'Crypto ETFs',
    isFollowing: false,
    premium: true
  },
  {
    id: 4,
    name: 'David Kim',
    username: '@valueinvestor',
    avatar: 'DK',
    verified: true,
    followers: 6700,
    roi: 32.1,
    winRate: 88.5,
    totalTrades: 124,
    copiers: 210,
    risk: 'Low',
    specialty: 'Value Investing',
    isFollowing: false,
    premium: false
  }
];

const recentTrades = [
  {
    id: 1,
    trader: 'Sarah Chen',
    avatar: 'SC',
    action: 'BUY',
    symbol: 'NVDA',
    price: 875.50,
    amount: 50,
    timestamp: '2 hours ago',
    commentary: 'Strong Q4 earnings expected. AI demand continues to surge.',
    likes: 24,
    comments: 8,
    isLiked: false
  },
  {
    id: 2,
    trader: 'Michael Rodriguez',
    avatar: 'MR',
    action: 'SELL',
    symbol: 'TSLA',
    price: 195.75,
    amount: 25,
    timestamp: '4 hours ago',
    commentary: 'Taking profits after recent rally. Will reassess at $180 level.',
    likes: 16,
    comments: 12,
    isLiked: true
  },
  {
    id: 3,
    trader: 'Emma Thompson',
    avatar: 'ET',
    action: 'BUY',
    symbol: 'ARKK',
    price: 48.25,
    amount: 100,
    timestamp: '6 hours ago',
    commentary: 'Innovation ETF at attractive levels. Long-term play.',
    likes: 31,
    comments: 5,
    isLiked: false
  }
];

const notifications = [
  {
    id: 1,
    type: 'trade',
    message: 'Sarah Chen bought NVDA at $875.50',
    time: '10 minutes ago',
    unread: true
  },
  {
    id: 2,
    type: 'follow',
    message: 'Michael Rodriguez started following you',
    time: '1 hour ago',
    unread: true
  },
  {
    id: 3,
    type: 'copy',
    message: 'Your AAPL trade was copied by 15 traders',
    time: '2 hours ago',
    unread: false
  }
];

export function SocialTradingPage({ onNavigate }: SocialTradingPageProps) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [followingTraders, setFollowingTraders] = useState<number[]>([2]);
  const [likedTrades, setLikedTrades] = useState<number[]>([2]);

  const handleFollow = (traderId: number) => {
    setFollowingTraders(prev => 
      prev.includes(traderId) 
        ? prev.filter(id => id !== traderId)
        : [...prev, traderId]
    );
  };

  const handleLike = (tradeId: number) => {
    setLikedTrades(prev => 
      prev.includes(tradeId)
        ? prev.filter(id => id !== tradeId)
        : [...prev, tradeId]
    );
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'text-success bg-success/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'high': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 m-4 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Social Trading</h1>
            <p className="text-muted-foreground">Follow and copy top traders</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UserPlus className="h-4 w-4 text-primary" />
              <span className="font-semibold">{followingTraders.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Copy className="h-4 w-4 text-success" />
              <span className="font-semibold">3</span>
            </div>
            <p className="text-xs text-muted-foreground">Copy Trading</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Bell className="h-4 w-4 text-warning" />
              <span className="font-semibold">{notifications.filter(n => n.unread).length}</span>
            </div>
            <p className="text-xs text-muted-foreground">New Updates</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="leaderboard" className="px-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard">Top Traders</TabsTrigger>
          <TabsTrigger value="feed">Live Feed</TabsTrigger>
          <TabsTrigger value="notifications">Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4 mt-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('all')}
            >
              All Traders
            </Button>
            <Button
              variant={selectedFilter === 'following' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('following')}
            >
              Following
            </Button>
            <Button
              variant={selectedFilter === 'premium' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('premium')}
            >
              Premium
            </Button>
          </div>

          {/* Top Traders Leaderboard */}
          <div className="space-y-4">
            {topTraders.map((trader, index) => (
              <Card key={trader.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < 3 ? <Crown className="h-4 w-4" /> : index + 1}
                      </div>
                    </div>

                    {/* Trader Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm">{trader.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{trader.name}</h3>
                            {trader.verified && <Star className="h-4 w-4 text-primary fill-current" />}
                            {trader.premium && <Crown className="h-4 w-4 text-warning" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{trader.username}</p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-2 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">ROI</span>
                          <p className={`font-semibold ${trader.roi > 0 ? 'text-success' : 'text-destructive'}`}>
                            +{trader.roi}%
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Win Rate</span>
                          <p className="font-semibold">{trader.winRate}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trades</span>
                          <p className="font-semibold">{trader.totalTrades}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Copiers</span>
                          <p className="font-semibold">{trader.copiers}</p>
                        </div>
                      </div>

                      {/* Tags & Risk */}
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {trader.specialty}
                        </Badge>
                        <Badge className={`text-xs ${getRiskColor(trader.risk)}`}>
                          {trader.risk} Risk
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {trader.followers.toLocaleString()} followers
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant={followingTraders.includes(trader.id) ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => handleFollow(trader.id)}
                        >
                          {followingTraders.includes(trader.id) ? (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Following
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Follow
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Trade
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Performance Disclaimer */}
          <Card className="bg-gradient-to-r from-warning/5 to-accent/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Risk Disclaimer</h3>
                  <p className="text-sm text-muted-foreground">
                    Past performance does not guarantee future results. Copy trading involves risk of loss. 
                    Only invest what you can afford to lose.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feed" className="space-y-4 mt-6">
          {/* Live Trading Feed */}
          <div className="space-y-4">
            {recentTrades.map((trade) => (
              <Card key={trade.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm">{trade.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{trade.trader}</h3>
                        <Badge 
                          variant={trade.action === 'BUY' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {trade.action}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{trade.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{trade.symbol}</span>
                        <span className="text-sm">at ${trade.price}</span>
                        <span className="text-sm text-muted-foreground">
                          ({trade.amount} shares)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Commentary */}
                  <div className="bg-muted/30 rounded-lg p-3 mb-3">
                    <p className="text-sm">{trade.commentary}</p>
                  </div>

                  {/* Engagement */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(trade.id)}
                        className={likedTrades.includes(trade.id) ? 'text-primary' : ''}
                      >
                        <Heart 
                          className={`h-4 w-4 mr-1 ${
                            likedTrades.includes(trade.id) ? 'fill-current' : ''
                          }`} 
                        />
                        {trade.likes + (likedTrades.includes(trade.id) ? 1 : 0)}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {trade.comments}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Stay Connected</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Follow more traders to see their latest moves in your feed
              </p>
              <Button size="sm">
                <Search className="h-4 w-4 mr-1" />
                Discover Traders
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-6">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={notification.unread ? 'border-primary/50 bg-primary/5' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      notification.unread ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                    {notification.type === 'trade' && (
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">You're all caught up!</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}