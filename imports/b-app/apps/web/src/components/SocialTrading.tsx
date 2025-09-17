import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Copy,
  MessageCircle,
  ThumbsUp,
  Share2,
  Eye,
  DollarSign,
  BarChart3,
  Crown,
  Award,
  Filter,
  Search
} from 'lucide-react';

interface Trader {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  followers: number;
  following: number;
  totalReturn: number;
  monthlyReturn: number;
  winRate: number;
  riskScore: number;
  copiers: number;
  aum: number;
  tradingStyle: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  specialties: string[];
  joinDate: string;
  isFollowing: boolean;
  isCopying: boolean;
}

interface Trade {
  id: string;
  traderId: string;
  traderName: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: string;
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
  likes: number;
  comments: number;
  isLiked: boolean;
  reasoning?: string;
}

interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  attachments?: {
    type: 'CHART' | 'TRADE' | 'ANALYSIS';
    data: any;
  }[];
  tags: string[];
}

interface CopyTradingPosition {
  traderId: string;
  traderName: string;
  allocatedAmount: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  activeTrades: number;
  copyRatio: number;
  startDate: string;
}

const SocialTrading: React.FC = () => {
  const [topTraders, setTopTraders] = useState<Trader[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [socialFeed, setSocialFeed] = useState<SocialPost[]>([]);
  const [copyPositions, setCopyPositions] = useState<CopyTradingPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('ALL');
  const [sortBy, setSortBy] = useState('RETURN');

  useEffect(() => {
    fetchSocialTradingData();
  }, []);

  const fetchSocialTradingData = async () => {
    try {
      setLoading(true);
      
      // Fetch top traders
      const tradersResponse = await fetch(`/api/v1/social/traders?sort=${sortBy}&filter=${filterBy}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (tradersResponse.ok) {
        const tradersData = await tradersResponse.json();
        setTopTraders(tradersData.data || []);
      }

      // Fetch recent trades
      const tradesResponse = await fetch('/api/v1/social/trades/recent', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (tradesResponse.ok) {
        const tradesData = await tradesResponse.json();
        setRecentTrades(tradesData.data || []);
      }

      // Fetch social feed
      const feedResponse = await fetch('/api/v1/social/feed', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (feedResponse.ok) {
        const feedData = await feedResponse.json();
        setSocialFeed(feedData.data || []);
      }

      // Fetch copy trading positions
      const copyResponse = await fetch('/api/v1/social/copy-positions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (copyResponse.ok) {
        const copyData = await copyResponse.json();
        setCopyPositions(copyData.data || []);
      }

    } catch (error) {
      console.error('Error fetching social trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const followTrader = async (traderId: string) => {
    try {
      const response = await fetch(`/api/v1/social/traders/${traderId}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        await fetchSocialTradingData();
      }
    } catch (error) {
      console.error('Error following trader:', error);
    }
  };

  const copyTrader = async (traderId: string, amount: number, copyRatio: number) => {
    try {
      const response = await fetch(`/api/v1/social/traders/${traderId}/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount, copyRatio })
      });

      if (response.ok) {
        await fetchSocialTradingData();
      }
    } catch (error) {
      console.error('Error copying trader:', error);
    }
  };

  const likeTrade = async (tradeId: string) => {
    try {
      const response = await fetch(`/api/v1/social/trades/${tradeId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        await fetchSocialTradingData();
      }
    } catch (error) {
      console.error('Error liking trade:', error);
    }
  };

  const likePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/v1/social/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        await fetchSocialTradingData();
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 3) return 'text-green-600 bg-green-50';
    if (riskScore <= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'CONSERVATIVE': return 'text-blue-600 bg-blue-50';
      case 'MODERATE': return 'text-purple-600 bg-purple-50';
      case 'AGGRESSIVE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredTraders = topTraders.filter(trader =>
    trader.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trader.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading social trading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-500" />
            Social Trading
          </h1>
          <p className="text-muted-foreground">Follow and copy successful traders</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search traders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RETURN">Return</SelectItem>
              <SelectItem value="FOLLOWERS">Followers</SelectItem>
              <SelectItem value="COPIERS">Copiers</SelectItem>
              <SelectItem value="WIN_RATE">Win Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Copy Trading Overview */}
      {copyPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Copy Trading Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {copyPositions.map((position, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{position.traderName}</h4>
                    <Badge variant={position.pnl >= 0 ? 'default' : 'destructive'}>
                      {position.pnl >= 0 ? '+' : ''}{position.pnlPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Allocated:</span>
                      <span className="font-medium">${position.allocatedAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Value:</span>
                      <span className="font-medium">${position.currentValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>P&L:</span>
                      <span className={`font-medium ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${position.pnl.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Trades:</span>
                      <span className="font-medium">{position.activeTrades}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="traders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="traders">Top Traders</TabsTrigger>
          <TabsTrigger value="trades">Recent Trades</TabsTrigger>
          <TabsTrigger value="feed">Social Feed</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="traders" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTraders.map((trader) => (
              <Card key={trader.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={trader.avatar} />
                        <AvatarFallback>{trader.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{trader.displayName}</h3>
                          {trader.verified && <Crown className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <p className="text-sm text-muted-foreground">@{trader.username}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                          <span>{trader.followers.toLocaleString()} followers</span>
                          <span>{trader.copiers.toLocaleString()} copiers</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Return</p>
                      <p className={`text-lg font-bold ${trader.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trader.totalReturn >= 0 ? '+' : ''}{trader.totalReturn.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Monthly Return</p>
                      <p className={`font-semibold ${trader.monthlyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trader.monthlyReturn >= 0 ? '+' : ''}{trader.monthlyReturn.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="font-semibold">{trader.winRate.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">AUM</p>
                      <p className="font-semibold">${(trader.aum / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex space-x-2">
                      <Badge className={getStyleColor(trader.tradingStyle)}>
                        {trader.tradingStyle}
                      </Badge>
                      <Badge className={getRiskColor(trader.riskScore)}>
                        Risk: {trader.riskScore}/10
                      </Badge>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Specialties</p>
                    <div className="flex flex-wrap gap-1">
                      {trader.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline" className="text-xs">{specialty}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant={trader.isFollowing ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => followTrader(trader.id)}
                      className="flex-1"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      {trader.isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button
                      variant={trader.isCopying ? "secondary" : "default"}
                      size="sm"
                      onClick={() => copyTrader(trader.id, 1000, 0.1)}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {trader.isCopying ? 'Copying' : 'Copy'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{trade.traderName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{trade.traderName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'}>
                          {trade.action}
                        </Badge>
                        {trade.pnl !== undefined && (
                          <p className={`text-sm font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-lg">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {trade.quantity.toLocaleString()} shares @ ${trade.price.toFixed(2)}
                        </p>
                      </div>
                      
                      <Badge variant="outline">{trade.status}</Badge>
                    </div>

                    {trade.reasoning && (
                      <p className="text-sm text-muted-foreground mb-3">{trade.reasoning}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <button
                          onClick={() => likeTrade(trade.id)}
                          className={`flex items-center space-x-1 ${trade.isLiked ? 'text-red-500' : ''}`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{trade.likes}</span>
                        </button>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{trade.comments}</span>
                        </div>
                      </div>
                      
                      <Button size="sm" variant="outline">
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Trade
                      </Button>
                    </div>
                  </div>
                ))}

                {recentTrades.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent trades</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {socialFeed.map((post) => (
                  <div key={post.id} className="p-4 border rounded-lg">
                    <div className="flex items-start space-x-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.authorAvatar} />
                        <AvatarFallback>{post.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-semibold">{post.authorName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(post.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm">{post.content}</p>
                      </div>
                    </div>

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">#{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <button
                          onClick={() => likePost(post.id)}
                          className={`flex items-center space-x-1 ${post.isLiked ? 'text-red-500' : ''}`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{post.likes}</span>
                        </button>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Share2 className="w-4 h-4" />
                          <span>{post.shares}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {socialFeed.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No posts in your feed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topTraders.slice(0, 10).map((trader, index) => (
                  <div key={trader.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                        {index < 3 ? (
                          <Award className={`w-5 h-5 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-500'}`} />
                        ) : (
                          <span className="font-semibold text-sm">{index + 1}</span>
                        )}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={trader.avatar} />
                        <AvatarFallback>{trader.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">{trader.displayName}</p>
                          {trader.verified && <Crown className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{trader.followers.toLocaleString()} followers</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${trader.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trader.totalReturn >= 0 ? '+' : ''}{trader.totalReturn.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">{trader.winRate.toFixed(1)}% win rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialTrading;
