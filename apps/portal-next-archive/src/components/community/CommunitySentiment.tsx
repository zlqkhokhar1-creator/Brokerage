"use client";
'use client';

import { useState, useEffect } from 'react';
import { Users, MessageSquare, TrendingUp, TrendingDown, BarChart2, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

type SentimentData = {
  symbol: string;
  name: string;
  sentiment: number; // -100 to 100
  change24h: number;
  volume: number;
  socialVolume: number;
  socialVolumeChange: number;
  sources: {
    twitter: number;
    reddit: number;
    news: number;
    forums: number;
  };
  topMentions: {
    positive: string[];
    negative: string[];
  };
  peerComparison: {
    avgSentiment: number;
    rank: number;
    totalPeers: number;
  };
};

type TrendingTopic = {
  id: string;
  topic: string;
  mentionCount: number;
  sentiment: number;
  relatedAssets: string[];
};

export function CommunitySentiment() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Simulate API calls
        await Promise.all([
          new Promise(resolve => setTimeout(resolve, 1000)),
          // Fetch sentiment data
          (async () => {
            const mockData: SentimentData[] = [
              {
                symbol: 'TSLA',
                name: 'Tesla Inc',
                sentiment: 78,
                change24h: 5.2,
                volume: 1250000000,
                socialVolume: 24500,
                socialVolumeChange: 32.5,
                sources: {
                  twitter: 45,
                  reddit: 30,
                  news: 15,
                  forums: 10
                },
                topMentions: {
                  positive: ['New factory announcement', 'Strong delivery numbers', 'Battery breakthrough'],
                  negative: ['Regulatory concerns', 'CEO controversy']
                },
                peerComparison: {
                  avgSentiment: 65,
                  rank: 2,
                  totalPeers: 15
                }
              },
              {
                symbol: 'AAPL',
                name: 'Apple Inc',
                sentiment: 65,
                change24h: -1.2,
                volume: 980000000,
                socialVolume: 18700,
                socialVolumeChange: 12.3,
                sources: {
                  twitter: 40,
                  reddit: 25,
                  news: 25,
                  forums: 10
                },
                topMentions: {
                  positive: ['New product launch', 'Strong earnings'],
                  negative: ['Supply chain issues', 'Regulatory scrutiny']
                },
                peerComparison: {
                  avgSentiment: 58,
                  rank: 5,
                  totalPeers: 20
                }
              },
              {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                sentiment: 72,
                change24h: 2.1,
                volume: 450000000,
                socialVolume: 12400,
                socialVolumeChange: 8.7,
                sources: {
                  twitter: 35,
                  reddit: 20,
                  news: 35,
                  forums: 10
                },
                topMentions: {
                  positive: ['Cloud growth', 'Enterprise adoption'],
                  negative: ['Competition', 'Valuation concerns']
                },
                peerComparison: {
                  avgSentiment: 68,
                  rank: 3,
                  totalPeers: 15
                }
              }
            ];
            setSentimentData(mockData);
          })(),
          // Fetch trending topics
          (async () => {
            const mockTopics: TrendingTopic[] = [
              {
                id: '1',
                topic: '#AIRevolution',
                mentionCount: 12450,
                sentiment: 82,
                relatedAssets: ['NVDA', 'MSFT', 'GOOGL', 'AI']
              },
              {
                id: '2',
                topic: 'Earnings Season',
                mentionCount: 9870,
                sentiment: 65,
                relatedAssets: ['AAPL', 'AMZN', 'META', 'GOOGL']
              },
              {
                id: '3',
                topic: 'Interest Rates',
                mentionCount: 8450,
                sentiment: 45,
                relatedAssets: ['^IRX', '^TNX', '^TYX', 'TLT']
              },
              {
                id: '4',
                topic: 'Crypto Regulation',
                mentionCount: 7230,
                sentiment: 58,
                relatedAssets: ['BTC-USD', 'ETH-USD', 'COIN', 'MARA']
              }
            ];
            setTrendingTopics(mockTopics);
          })()
        ]);
      } catch (error) {
        console.error('Error fetching community sentiment data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  interface CustomProgressProps {
    value: number;
    className?: string;
    indicatorClassName?: string;
  }

  const CustomProgress: React.FC<CustomProgressProps> = ({ 
    value, 
    className = '', 
    indicatorClassName = '' 
  }) => (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div 
        className={`h-full ${indicatorClassName}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );

  const getSentimentLabel = (score: number) => {
    if (score >= 70) return 'Bullish';
    if (score >= 40) return 'Neutral';
    return 'Bearish';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Sentiment</CardTitle>
          <CardDescription>Loading community data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <div className="animate-pulse text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Gathering community insights...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Community Sentiment</CardTitle>
            <CardDescription>What the crowd is saying about your holdings</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs 
              value={timeRange} 
              onValueChange={setTimeRange}
              className="w-full sm:w-auto"
            >
              <TabsList>
                <TabsTrigger value="1h">1H</TabsTrigger>
                <TabsTrigger value="24h">24H</TabsTrigger>
                <TabsTrigger value="7d">7D</TabsTrigger>
                <TabsTrigger value="30d">30D</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="overview">
              <BarChart2 className="h-4 w-4 mr-2" />
              Market Overview
            </TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending Topics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sentimentData.map((asset) => (
                <Card key={asset.symbol} className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{asset.symbol}</h3>
                        <p className="text-sm text-muted-foreground">{asset.name}</p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={`${
                          asset.sentiment >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                          asset.sentiment >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {getSentimentLabel(asset.sentiment)}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Sentiment</span>
                          <span className="font-medium">{asset.sentiment}/100</span>
                        </div>
                        <CustomProgress 
                          value={asset.sentiment}
                          indicatorClassName={getSentimentColor(asset.sentiment)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">24h Change</p>
                          <p className={`font-medium ${
                            asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Social Volume</p>
                          <div className="flex items-center">
                            <p className="font-medium">{asset.socialVolume.toLocaleString()}</p>
                            <span className={`text-xs ml-1 ${
                              asset.socialVolumeChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ({asset.socialVolumeChange >= 0 ? '+' : ''}{asset.socialVolumeChange}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-sm text-muted-foreground mb-2">Sentiment Sources</p>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(asset.sources).map(([source, value]) => (
                            <div key={source} className="text-center">
                              <div className="text-xs text-muted-foreground capitalize">{source}</div>
                              <div className="font-medium">{value}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 px-6 py-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rank</span>
                      <span className="font-medium">
                        #{asset.peerComparison.rank} of {asset.peerComparison.totalPeers}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {trendingTopics.map((topic) => (
                <Card key={topic.id} className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold">{topic.topic}</h3>
                      <Badge 
                        variant="outline"
                        className={`${
                          topic.sentiment >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                          topic.sentiment >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {getSentimentLabel(topic.sentiment)}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Mentions</span>
                        <span className="font-medium">{topic.mentionCount.toLocaleString()}</span>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Related Assets</p>
                        <div className="flex flex-wrap gap-2">
                          {topic.relatedAssets.map((asset, i) => (
                            <Badge key={i} variant="secondary" className="font-normal">
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button variant="outline" size="sm" className="w-full">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Discussion
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
