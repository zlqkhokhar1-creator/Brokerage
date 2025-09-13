'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Copy, 
  Heart, 
  MessageCircle, 
  Share2, 
  Filter, 
  Search,
  Crown,
  Award,
  Target,
  BarChart3
} from 'lucide-react';

interface Trader {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  verified: boolean;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  performance: {
    totalReturn: number;
    monthlyReturn: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
  };
  followers: number;
  copiers: number;
  riskScore: number;
  portfolioValue: number;
  joinDate: string;
  topHoldings: string[];
  recentTrades: TradeActivity[];
}

interface TradeActivity {
  id: string;
  traderId: string;
  traderName: string;
  action: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
  likes: number;
  comments: number;
  isFollowing: boolean;
}

interface SocialPost {
  id: string;
  traderId: string;
  traderName: string;
  avatar?: string;
  content: string;
  trade?: {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
  };
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
}

export default function SocialTradingPage() {
  const [activeTab, setActiveTab] = useState('discover');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  const [topTraders, setTopTraders] = useState<Trader[]>([]);
  const [socialFeed, setSocialFeed] = useState<SocialPost[]>([]);
  const [followingActivity, setFollowingActivity] = useState<TradeActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - in production, fetch from backend API
  useEffect(() => {
    fetchTopTraders();
    fetchSocialFeed();
    fetchFollowingActivity();
  }, []);

  const fetchTopTraders = async () => {
    // Mock API call - replace with actual backend call
    // const response = await fetch('/api/v1/social-trading/traders');
    
    const mockTraders: Trader[] = [
      {
        id: '1',
        name: 'Sarah Chen',
        username: '@sarahc_trades',
        verified: true,
        tier: 'platinum',
        performance: {
          totalReturn: 124.5,
          monthlyReturn: 8.2,
          winRate: 78.5,
          sharpeRatio: 2.34,
          maxDrawdown: -12.5,
          totalTrades: 432
        },
        followers: 15420,
        copiers: 890,
        riskScore: 6.2,
        portfolioValue: 2400000,
        joinDate: '2022-03-15',
        topHoldings: ['NVDA', 'MSFT', 'AAPL', 'GOOGL'],
        recentTrades: []
      },
      {
        id: '2',
        name: 'Marcus Johnson',
        username: '@marcus_inv',
        verified: true,
        tier: 'gold',
        performance: {
          totalReturn: 89.3,
          monthlyReturn: 5.7,
          winRate: 71.2,
          sharpeRatio: 1.89,
          maxDrawdown: -8.9,
          totalTrades: 267
        },
        followers: 8930,
        copiers: 564,
        riskScore: 4.8,
        portfolioValue: 1850000,
        joinDate: '2021-11-20',
        topHoldings: ['TSLA', 'AMD', 'NFLX', 'META'],
        recentTrades: []
      },
      {
        id: '3',
        name: 'Emma Rodriguez',
        username: '@emma_growth',
        verified: false,
        tier: 'silver',
        performance: {
          totalReturn: 67.8,
          monthlyReturn: 4.1,
          winRate: 68.9,
          sharpeRatio: 1.56,
          maxDrawdown: -15.3,
          totalTrades: 198
        },
        followers: 3420,
        copiers: 231,
        riskScore: 7.1,
        portfolioValue: 890000,
        joinDate: '2023-01-10',
        topHoldings: ['QQQ', 'SPY', 'VTI', 'ARKK'],
        recentTrades: []
      }
    ];

    setTopTraders(mockTraders);
  };

  const fetchSocialFeed = async () => {
    const mockFeed: SocialPost[] = [
      {
        id: '1',
        traderId: '1',
        traderName: 'Sarah Chen',
        content: 'Just added NVDA to my portfolio. AI chip demand continues to surge with enterprise adoption accelerating. Target price $950.',
        trade: {
          symbol: 'NVDA',
          action: 'buy',
          quantity: 100,
          price: 789.45
        },
        timestamp: '2024-01-15T14:30:00Z',
        likes: 234,
        comments: 45,
        shares: 23,
        isLiked: false
      },
      {
        id: '2',
        traderId: '2',
        traderName: 'Marcus Johnson',
        content: 'Market volatility creating opportunities in tech. Dollar cost averaging into quality names during this dip.',
        timestamp: '2024-01-15T13:15:00Z',
        likes: 156,
        comments: 28,
        shares: 12,
        isLiked: true
      },
      {
        id: '3',
        traderId: '3',
        traderName: 'Emma Rodriguez',
        content: 'Diversification is key in uncertain times. Added some defensive positions to balance my growth portfolio.',
        trade: {
          symbol: 'JNJ',
          action: 'buy',
          quantity: 50,
          price: 165.23
        },
        timestamp: '2024-01-15T12:45:00Z',
        likes: 89,
        comments: 15,
        shares: 7,
        isLiked: false
      }
    ];

    setSocialFeed(mockFeed);
  };

  const fetchFollowingActivity = async () => {
    const mockActivity: TradeActivity[] = [
      {
        id: '1',
        traderId: '1',
        traderName: 'Sarah Chen',
        action: 'buy',
        symbol: 'NVDA',
        quantity: 100,
        price: 789.45,
        timestamp: '2024-01-15T14:30:00Z',
        likes: 234,
        comments: 45,
        isFollowing: true
      },
      {
        id: '2',
        traderId: '2',
        traderName: 'Marcus Johnson',
        action: 'sell',
        symbol: 'TSLA',
        quantity: 25,
        price: 234.78,
        timestamp: '2024-01-15T13:20:00Z',
        likes: 89,
        comments: 12,
        isFollowing: true
      }
    ];

    setFollowingActivity(mockActivity);
    setLoading(false);
  };

  const followTrader = async (traderId: string) => {
    // API call to follow trader
    console.log('Following trader:', traderId);
  };

  const copyTrader = async (traderId: string) => {
    // API call to copy trader
    console.log('Copying trader:', traderId);
  };

  const likePost = async (postId: string) => {
    setSocialFeed(prev => 
      prev.map(post => 
        post.id === postId 
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      )
    );
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-cyan-400 bg-cyan-400/20';
      case 'gold': return 'text-yellow-400 bg-yellow-400/20';
      case 'silver': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-orange-400 bg-orange-400/20';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum': return <Crown className="w-4 h-4" />;
      case 'gold': return <Award className="w-4 h-4" />;
      case 'silver': return <Star className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-400" />
          <p className="text-lg">Loading social trading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold mb-2">Social Trading</h1>
                <p className="text-gray-400">Follow top traders and copy their strategies</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search traders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-[#111111] border-[#1E1E1E]"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="discover">Discover Traders</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="feed">Social Feed</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topTraders.map((trader) => (
                <Card key={trader.id} className="bg-[#111111] border-[#1E1E1E]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={trader.avatar} />
                          <AvatarFallback>{trader.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{trader.name}</h3>
                            {trader.verified && <Badge className="bg-blue-500/20 text-blue-400">Verified</Badge>}
                          </div>
                          <p className="text-sm text-gray-400">{trader.username}</p>
                        </div>
                      </div>
                      <Badge className={`border ${getTierColor(trader.tier)} flex items-center gap-1`}>
                        {getTierIcon(trader.tier)}
                        {trader.tier}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Total Return</span>
                          <div className={`font-semibold ${getChangeColor(trader.performance.totalReturn)}`}>
                            {formatPercent(trader.performance.totalReturn)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Monthly Return</span>
                          <div className={`font-semibold ${getChangeColor(trader.performance.monthlyReturn)}`}>
                            {formatPercent(trader.performance.monthlyReturn)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Win Rate</span>
                          <div className="font-semibold">{trader.performance.winRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Sharpe Ratio</span>
                          <div className="font-semibold">{trader.performance.sharpeRatio.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <div>
                          <span className="text-gray-400">Followers: </span>
                          <span className="font-semibold">{trader.followers.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Copiers: </span>
                          <span className="font-semibold">{trader.copiers.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {trader.topHoldings.slice(0, 4).map((symbol) => (
                          <Badge key={symbol} variant="outline" className="text-xs">
                            {symbol}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => followTrader(trader.id)}
                        className="flex-1"
                        variant="outline"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Follow
                      </Button>
                      <Button 
                        onClick={() => copyTrader(trader.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="following" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Recent Activity from Traders You Follow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {followingActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${activity.action === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {activity.action === 'buy' ? 
                            <TrendingUp className="w-4 h-4 text-green-400" /> : 
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          }
                        </div>
                        <div>
                          <div className="font-semibold">
                            {activity.traderName} {activity.action === 'buy' ? 'bought' : 'sold'} {activity.symbol}
                          </div>
                          <div className="text-sm text-gray-400">
                            {activity.quantity} shares at {formatCurrency(activity.price)} • {formatTimeAgo(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Heart className="w-4 h-4" />
                          {activity.likes}
                        </div>
                        <Button size="sm" variant="outline">
                          Copy Trade
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feed" className="space-y-6">
            <div className="space-y-4">
              {socialFeed.map((post) => (
                <Card key={post.id} className="bg-[#111111] border-[#1E1E1E]">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.avatar} />
                        <AvatarFallback>{post.traderName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{post.traderName}</span>
                          <span className="text-sm text-gray-400">{formatTimeAgo(post.timestamp)}</span>
                        </div>
                        <p className="text-gray-300 mb-3">{post.content}</p>
                        
                        {post.trade && (
                          <div className="bg-[#1A1A1A] rounded-lg p-3 mb-3 border border-[#1E1E1E]">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={post.trade.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                  {post.trade.action.toUpperCase()}
                                </Badge>
                                <span className="font-semibold">{post.trade.symbol}</span>
                              </div>
                              <div className="text-sm text-gray-400">
                                {post.trade.quantity} shares @ {formatCurrency(post.trade.price)}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <button 
                              onClick={() => likePost(post.id)}
                              className={`flex items-center gap-2 text-sm ${post.isLiked ? 'text-red-400' : 'text-gray-400'} hover:text-red-400`}
                            >
                              <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                              {post.likes}
                            </button>
                            <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400">
                              <MessageCircle className="w-4 h-4" />
                              {post.comments}
                            </button>
                            <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-400">
                              <Share2 className="w-4 h-4" />
                              {post.shares}
                            </button>
                          </div>
                          {post.trade && (
                            <Button size="sm" variant="outline">
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Trade
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Top Performers This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topTraders.map((trader, index) => (
                    <div key={trader.id} className="flex items-center justify-between p-4 border border-[#1E1E1E] rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          index === 1 ? 'bg-gray-400/20 text-gray-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {index + 1}
                        </div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={trader.avatar} />
                          <AvatarFallback>{trader.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{trader.name}</span>
                            <Badge className={`border ${getTierColor(trader.tier)} flex items-center gap-1`}>
                              {getTierIcon(trader.tier)}
                              {trader.tier}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-400">
                            {trader.followers.toLocaleString()} followers • {trader.copiers.toLocaleString()} copiers
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${getChangeColor(trader.performance.monthlyReturn)}`}>
                          {formatPercent(trader.performance.monthlyReturn)}
                        </div>
                        <div className="text-sm text-gray-400">Monthly Return</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
