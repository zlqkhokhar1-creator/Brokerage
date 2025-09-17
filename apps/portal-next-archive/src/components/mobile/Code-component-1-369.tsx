"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Heart, 
  Share2, 
  Award,
  Star,
  ArrowUp,
  ArrowDown,
  Eye,
  Copy,
  MoreHorizontal
} from 'lucide-react';

interface SocialPageProps {
  onStockClick: (symbol: string) => void;
}

const topTraders = [
  {
    id: 1,
    name: "Alex Chen",
    username: "@alextrader",
    avatar: "AC",
    badge: "Expert",
    followers: 12500,
    return: "+34.7%",
    accuracy: 87,
    verified: true
  },
  {
    id: 2,
    name: "Sarah Kim",
    username: "@sarahk",
    avatar: "SK",
    badge: "Pro",
    followers: 8900,
    return: "+28.3%",
    accuracy: 82,
    verified: true
  },
  {
    id: 3,
    name: "Mike Torres",
    username: "@miket",
    avatar: "MT",
    badge: "Rising",
    followers: 3400,
    return: "+21.5%",
    accuracy: 79,
    verified: false
  }
];

const socialPosts = [
  {
    id: 1,
    user: {
      name: "Alex Chen",
      username: "@alextrader",
      avatar: "AC",
      verified: true
    },
    content: "Just opened a position in TSLA. The technical indicators are showing strong bullish momentum. Target price $280. 🚀",
    symbol: "TSLA",
    action: "BUY",
    price: "$245.67",
    change: "+2.34%",
    timestamp: "2h ago",
    likes: 156,
    comments: 23,
    shares: 12,
    performance: "+5.2%"
  },
  {
    id: 2,
    user: {
      name: "Sarah Kim",
      username: "@sarahk",
      avatar: "SK",
      verified: true
    },
    content: "Taking profits on AAPL position. Great run but RSI is showing overbought conditions. Time to secure gains! 💰",
    symbol: "AAPL",
    action: "SELL",
    price: "$178.23",
    change: "-1.12%",
    timestamp: "4h ago",
    likes: 89,
    comments: 15,
    shares: 8,
    performance: "+12.8%"
  },
  {
    id: 3,
    user: {
      name: "Mike Torres",
      username: "@miket",
      avatar: "MT",
      verified: false
    },
    content: "Watching NVDA closely. If it breaks above $450 resistance, could see a move to $480. Volume is picking up! 📈",
    symbol: "NVDA",
    action: "WATCH",
    price: "$445.89",
    change: "+0.89%",
    timestamp: "6h ago",
    likes: 42,
    comments: 7,
    shares: 3,
    performance: "+2.1%"
  }
];

export function SocialPage({ onStockClick }: SocialPageProps) {
  const [followingTraders, setFollowingTraders] = useState<number[]>([]);

  const toggleFollow = (traderId: number) => {
    setFollowingTraders(prev => 
      prev.includes(traderId) 
        ? prev.filter(id => id !== traderId)
        : [...prev, traderId]
    );
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 m-4 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Social Trading</h1>
            <p className="text-sm text-muted-foreground">Follow top traders and share insights</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="feed" className="px-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="traders">Top Traders</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4 mt-6">
          {socialPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* User Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {post.user.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{post.user.name}</span>
                        {post.user.verified && (
                          <div className="h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                            <Star className="h-2.5 w-2.5 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{post.user.username} • {post.timestamp}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <p className="text-sm mb-4 leading-relaxed">{post.content}</p>

                {/* Stock Card */}
                <Card 
                  className="mb-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onStockClick(post.symbol)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={post.action === 'BUY' ? 'default' : post.action === 'SELL' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {post.action}
                        </Badge>
                        <div>
                          <div className="font-semibold text-sm">{post.symbol}</div>
                          <div className="text-xs text-muted-foreground">{post.price}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${
                          post.change.startsWith('+') ? 'text-success' : 'text-destructive'
                        }`}>
                          {post.change}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          P&L: <span className="text-success">{post.performance}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center gap-6 text-muted-foreground">
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-primary">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs">{post.likes}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-primary">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">{post.comments}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-primary">
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs">{post.shares}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-primary ml-auto">
                    <Copy className="h-4 w-4" />
                    <span className="text-xs">Copy</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="traders" className="space-y-4 mt-6">
          {topTraders.map((trader) => (
            <Card key={trader.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {trader.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{trader.name}</span>
                        {trader.verified && (
                          <div className="h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                            <Star className="h-2.5 w-2.5 text-white fill-white" />
                          </div>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {trader.badge}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {trader.username} • {trader.followers.toLocaleString()} followers
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={followingTraders.includes(trader.id) ? "secondary" : "default"}
                    size="sm"
                    onClick={() => toggleFollow(trader.id)}
                  >
                    {followingTraders.includes(trader.id) ? 'Following' : 'Follow'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Return</div>
                    <div className="font-semibold text-success">{trader.return}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Accuracy</div>
                    <div className="font-semibold">{trader.accuracy}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-warning" />
                <span className="font-semibold">This Week's Top Performers</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {topTraders.map((trader, index) => (
                <div key={trader.id} className="flex items-center gap-3 p-4 border-b border-border last:border-b-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index === 0 ? 'bg-warning/20 text-warning' :
                    index === 1 ? 'bg-muted text-muted-foreground' :
                    index === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {trader.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{trader.name}</span>
                      {trader.verified && (
                        <div className="h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                          <Star className="h-2.5 w-2.5 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{trader.followers.toLocaleString()} followers</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-success text-sm">{trader.return}</div>
                    <div className="text-xs text-muted-foreground">{trader.accuracy}% accuracy</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}