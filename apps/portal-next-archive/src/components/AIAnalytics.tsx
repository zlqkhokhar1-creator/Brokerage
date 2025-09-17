"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap,
  BarChart3,
  PieChart,
  Activity,
  Lightbulb,
  Star,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'RECOMMENDATION' | 'PREDICTION' | 'RISK_ALERT' | 'OPPORTUNITY' | 'MARKET_SENTIMENT';
  title: string;
  description: string;
  confidence: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG';
  actionable: boolean;
  relatedSymbols: string[];
  createdAt: string;
}

interface MarketPrediction {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  timeframe: '1D' | '1W' | '1M' | '3M';
  confidence: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  factors: string[];
}

interface PortfolioOptimization {
  currentAllocation: { [sector: string]: number };
  recommendedAllocation: { [sector: string]: number };
  expectedReturn: number;
  riskReduction: number;
  rebalanceActions: {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    amount: number;
    reason: string;
  }[];
}

interface SentimentAnalysis {
  symbol: string;
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;
  sources: {
    news: number;
    social: number;
    analyst: number;
    technical: number;
  };
  trendingTopics: string[];
  riskFactors: string[];
}

const AIAnalytics: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [predictions, setPredictions] = useState<MarketPrediction[]>([]);
  const [optimization, setOptimization] = useState<PortfolioOptimization | null>(null);
  const [sentiment, setSentiment] = useState<SentimentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1W');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAIAnalytics();
  }, [selectedTimeframe]);

  const fetchAIAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch AI insights
      const insightsResponse = await fetch('/api/v1/ai-recommendations/insights', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.data || []);
      }

      // Fetch market predictions
      const predictionsResponse = await fetch(`/api/v1/ai-recommendations/recommendations?timeframe=${selectedTimeframe}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (predictionsResponse.ok) {
        const predictionsData = await predictionsResponse.json();
        setPredictions(predictionsData.data || []);
      }

      // Fetch portfolio optimization
      const optimizationResponse = await fetch('/api/v1/ai/portfolio-optimization', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (optimizationResponse.ok) {
        const optimizationData = await optimizationResponse.json();
        setOptimization(optimizationData.data);
      }

      // Fetch sentiment analysis
      const sentimentResponse = await fetch('/api/v1/ai/sentiment', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (sentimentResponse.ok) {
        const sentimentData = await sentimentResponse.json();
        setSentiment(sentimentData.data || []);
      }

    } catch (error) {
      console.error('Error fetching AI analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    setRefreshing(true);
    await fetchAIAnalytics();
    setRefreshing(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'RECOMMENDATION': return <Lightbulb className="w-4 h-4" />;
      case 'PREDICTION': return <TrendingUp className="w-4 h-4" />;
      case 'RISK_ALERT': return <AlertTriangle className="w-4 h-4" />;
      case 'OPPORTUNITY': return <Target className="w-4 h-4" />;
      case 'MARKET_SENTIMENT': return <Activity className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'RECOMMENDATION': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'PREDICTION': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'RISK_ALERT': return 'text-red-600 bg-red-50 border-red-200';
      case 'OPPORTUNITY': return 'text-green-600 bg-green-50 border-green-200';
      case 'MARKET_SENTIMENT': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'BULLISH': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'BEARISH': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH': return 'text-green-600 bg-green-50';
      case 'BEARISH': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading AI analytics...</p>
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
            <Brain className="w-8 h-8 text-blue-500" />
            AI Analytics
          </h1>
          <p className="text-muted-foreground">AI-powered insights and market predictions</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1D">1 Day</SelectItem>
              <SelectItem value="1W">1 Week</SelectItem>
              <SelectItem value="1M">1 Month</SelectItem>
              <SelectItem value="3M">3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refreshAnalytics} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Insights</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Confidence</p>
                <p className="text-2xl font-bold">
                  {insights.filter(i => i.confidence > 80).length}
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Predictions</p>
                <p className="text-2xl font-bold">{predictions.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opportunities</p>
                <p className="text-2xl font-bold">
                  {insights.filter(i => i.type === 'OPPORTUNITY').length}
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="predictions">Market Predictions</TabsTrigger>
          <TabsTrigger value="optimization">Portfolio Optimization</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className={getInsightColor(insight.type)}>
                          {getInsightIcon(insight.type)}
                          <span className="ml-1">{insight.type.replace('_', ' ')}</span>
                        </Badge>
                        <Badge className={getImpactColor(insight.impact)} variant="outline">
                          {insight.impact} Impact
                        </Badge>
                        <Badge variant="outline">{insight.timeframe} Term</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <div className="flex items-center space-x-2">
                          <Progress value={insight.confidence} className="w-16 h-2" />
                          <span className="text-sm font-semibold">{insight.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-semibold mb-2">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {insight.relatedSymbols.map((symbol, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">{symbol}</Badge>
                        ))}
                      </div>
                      
                      {insight.actionable && (
                        <Button size="sm">
                          <Zap className="w-3 h-3 mr-1" />
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {insights.length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No AI insights available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.map((prediction, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-lg">{prediction.symbol}</h4>
                        {getDirectionIcon(prediction.direction)}
                        <Badge className={getSentimentColor(prediction.direction)}>
                          {prediction.direction}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="font-semibold">{prediction.confidence}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="font-semibold">${prediction.currentPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Predicted Price</p>
                        <p className="font-semibold">${prediction.predictedPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Potential Change</p>
                        <p className={`font-semibold ${prediction.predictedPrice > prediction.currentPrice ? 'text-green-600' : 'text-red-600'}`}>
                          {((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Key Factors</p>
                      <div className="flex flex-wrap gap-1">
                        {prediction.factors.map((factor, factorIndex) => (
                          <Badge key={factorIndex} variant="outline" className="text-xs">{factor}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {predictions.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No predictions available for selected timeframe</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          {optimization ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3">Current vs Recommended</h4>
                      {Object.keys(optimization.currentAllocation).map((sector) => (
                        <div key={sector} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{sector}</span>
                            <span>
                              {optimization.currentAllocation[sector].toFixed(1)}% → {optimization.recommendedAllocation[sector].toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <Progress value={optimization.currentAllocation[sector]} className="flex-1 h-2" />
                            <Progress value={optimization.recommendedAllocation[sector]} className="flex-1 h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimization Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-sm text-muted-foreground">Expected Return</p>
                      <p className="text-lg font-bold text-green-600">+{optimization.expectedReturn.toFixed(1)}%</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-sm text-muted-foreground">Risk Reduction</p>
                      <p className="text-lg font-bold text-blue-600">-{optimization.riskReduction.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Recommended Actions</h4>
                    <div className="space-y-2">
                      {optimization.rebalanceActions.map((action, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-2">
                            <Badge variant={action.action === 'BUY' ? 'default' : action.action === 'SELL' ? 'destructive' : 'secondary'}>
                              {action.action}
                            </Badge>
                            <span className="font-medium">{action.symbol}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${action.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{action.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full">
                    <Target className="w-4 h-4 mr-2" />
                    Apply Optimization
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Portfolio optimization data not available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sentiment.map((analysis, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-lg">{analysis.symbol}</h4>
                        <Badge className={getSentimentColor(analysis.overallSentiment)}>
                          {analysis.overallSentiment}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Sentiment Score</p>
                        <p className="font-semibold">{analysis.sentimentScore.toFixed(1)}/100</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">News</p>
                        <p className="font-semibold">{analysis.sources.news}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Social</p>
                        <p className="font-semibold">{analysis.sources.social}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Analyst</p>
                        <p className="font-semibold">{analysis.sources.analyst}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Technical</p>
                        <p className="font-semibold">{analysis.sources.technical}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Trending Topics</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.trendingTopics.map((topic, topicIndex) => (
                            <Badge key={topicIndex} variant="outline" className="text-xs">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Risk Factors</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.riskFactors.map((risk, riskIndex) => (
                            <Badge key={riskIndex} variant="destructive" className="text-xs">{risk}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {sentiment.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No sentiment analysis data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAnalytics;
