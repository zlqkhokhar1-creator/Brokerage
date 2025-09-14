"use client";
'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Users, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type HerdMentalityInsight = {
  id: string;
  type: 'herd_mentality' | 'fear_greed' | 'overconfidence' | 'confirmation_bias';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedAssets?: {
    symbol: string;
    name: string;
    positionSize: number;
    communitySentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    yourAction: 'buy' | 'sell' | 'hold' | 'none';
    priceChange7d: number;
  }[];
  recommendations?: string[];
  timestamp: Date;
};

export function BehavioralInsights() {
  const [insights, setInsights] = useState<HerdMentalityInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch behavioral insights
    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - in a real app, this would come from your backend
        const mockInsights: HerdMentalityInsight[] = [
          {
            id: '1',
            type: 'herd_mentality',
            title: 'Herd Mentality Detected',
            description: 'Your recent trades show signs of following the crowd rather than your investment strategy.',
            severity: 'medium',
            confidence: 82,
            affectedAssets: [
              {
                symbol: 'TSLA',
                name: 'Tesla Inc',
                positionSize: 12.5,
                communitySentiment: 'very_bullish',
                yourAction: 'buy',
                priceChange7d: 8.2
              },
              {
                symbol: 'NVDA',
                name: 'NVIDIA Corporation',
                positionSize: 8.3,
                communitySentiment: 'bullish',
                yourAction: 'buy',
                priceChange7d: 15.7
              }
            ],
            recommendations: [
              'Review your investment thesis for these positions',
              'Consider setting stop-loss orders to manage risk',
              'Diversify into less crowded trades'
            ],
            timestamp: new Date()
          },
          {
            id: '2',
            type: 'fear_greed',
            title: 'Extreme Greed Detected',
            description: 'Market sentiment is showing extreme greed, which often precedes market corrections.',
            severity: 'high',
            confidence: 91,
            recommendations: [
              'Consider taking some profits on winning positions',
              'Review your portfolio allocation',
              'Ensure you have adequate cash reserves'
            ],
            timestamp: new Date()
          }
        ];
        
        setInsights(mockInsights);
      } catch (error) {
        console.error('Failed to fetch behavioral insights:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, []);

  const getSeverityBadge = (severity: string) => {
    const severityMap = {
      low: { label: 'Low', className: 'bg-green-100 text-green-800' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
      high: { label: 'High', className: 'bg-red-100 text-red-800' },
    } as const;
    
    const { label, className } = severityMap[severity as keyof typeof severityMap] || 
      { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={className}>{label} Risk</Badge>;
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'very_bullish':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'very_bearish':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Behavioral Insights</CardTitle>
          <CardDescription>Analyzing your trading patterns...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-pulse text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Analyzing your trading behavior...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Behavioral Insights</CardTitle>
          <CardDescription>No behavioral patterns detected. Keep following your investment strategy!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {insights.map((insight) => (
        <Card key={insight.id} className="border-l-4 border-yellow-400">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                  {getSeverityBadge(insight.severity)}
                </div>
                <CardDescription className="mt-1">{insight.description}</CardDescription>
              </div>
              <div className="text-xs text-muted-foreground">
                {insight.timestamp.toLocaleDateString()}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {insight.affectedAssets && insight.affectedAssets.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Affected Positions</h4>
                  <div className="space-y-3">
                    {insight.affectedAssets.map((asset, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">
                            {asset.symbol} - {asset.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${
                              asset.priceChange7d >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {asset.priceChange7d >= 0 ? '+' : ''}{asset.priceChange7d}%
                            </span>
                            {getSentimentIcon(asset.communitySentiment)}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                          <span>Position: {asset.positionSize}%</span>
                          <span>Your action: 
                            <span className={`ml-1 font-medium ${
                              asset.yourAction === 'buy' ? 'text-green-600' : 
                              asset.yourAction === 'sell' ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {asset.yourAction}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {insight.recommendations && insight.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {insight.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-primary">•</span>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="pt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Confidence</span>
                  <span>{insight.confidence}%</span>
                </div>
                <Progress value={insight.confidence} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
