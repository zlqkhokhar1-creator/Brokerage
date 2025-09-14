"use client";
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Button 
} from '@/components/ui/button';
import { StockCorrelationMatrix } from '@/components/portfolio/StockCorrelationMatrix';
import { Progress } from '@/components/ui/progress';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Slider 
} from '@/components/ui/slider';
import { 
  Sparkles,
  Target,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  BrainCircuit,
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Gauge,
  Clock,
  Activity,
  BarChart2,
  ArrowUpRight,
  AlertOctagon,
  Lightbulb,
  ShieldCheck,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ReferenceLine,
  LabelList
} from 'recharts';

// Mock data for advanced analytics
const advancedAnalyticsData = {
  // Stock Correlation Matrix
  stockCorrelations: {
    timeframes: ['1M', '3M', '6M', '1Y', '3Y'],
    selectedTimeframe: '1Y',
    stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'JNJ']
  },
  
  // Market Regime Detection
  marketRegime: {
    current: 'Expansion',
    confidence: 82,
    nextRegime: 'Peak',
    probability: 68,
    expectedDuration: '2-4 months',
    indicators: [
      { name: 'Economic Growth', value: 78, status: 'increasing' },
      { name: 'Inflation', value: 65, status: 'increasing' },
      { name: 'Volatility', value: 42, status: 'decreasing' },
      { name: 'Earnings Growth', value: 71, status: 'increasing' },
      { name: 'Valuations', value: 85, status: 'high' },
    ],
    historicalRegimes: [
      { date: 'Jan 2023', regime: 'Recovery', duration: '3 months' },
      { date: 'Apr 2023', regime: 'Expansion', duration: '5 months' },
      { date: 'Sep 2023', regime: 'Peak', duration: '2 months' },
      { date: 'Nov 2023', regime: 'Contraction', duration: '4 months' },
      { date: 'Mar 2024', regime: 'Recovery', duration: '2 months' },
      { date: 'May 2024', regime: 'Expansion', duration: '4 months+' },
    ]
  },

  // Behavioral Finance Insights
  behavioralInsights: {
    riskProfile: 'Moderately Aggressive',
    riskScore: 7.2,
    biases: [
      { 
        name: 'Loss Aversion', 
        level: 'High',
        impact: 'May be holding losing positions too long',
        suggestions: ['Set stop-loss orders', 'Review positions objectively']
      },
      { 
        name: 'Recency Bias', 
        level: 'Moderate',
        impact: 'Overweighting recent market movements',
        suggestions: ['Focus on long-term trends', 'Diversify time horizons']
      },
      { 
        name: 'Confirmation Bias', 
        level: 'Low',
        impact: 'Seeking information that confirms existing views',
        suggestions: ['Consider alternative viewpoints', 'Review contrarian analysis']
      },
    ],
    tradingPatterns: [
      { metric: 'Average Holding Period', value: '45 days', benchmark: '90 days', status: 'below' },
      { metric: 'Win Rate', value: '58%', benchmark: '55%', status: 'above' },
      { metric: 'Risk/Reward Ratio', value: '1.8', benchmark: '2.0', status: 'below' },
      { metric: 'Overtrading Frequency', value: '12%', benchmark: '8%', status: 'above' },
    ]
  },

  // Predictive Analytics
  predictiveAnalytics: {
    portfolio: {
      currentValue: 125000,
      predictedValue: {
        '1M': { value: 128500, confidence: 72 },
        '3M': { value: 133200, confidence: 68 },
        '6M': { value: 141500, confidence: 63 },
        '1Y': { value: 156800, confidence: 58 },
      },
      riskMetrics: {
        valueAtRisk: 8.2, // %
        expectedShortfall: 12.5, // %
        maxDrawdown: 15.3, // %
        sharpeRatio: 1.8,
        sortinoRatio: 2.1
      }
    },
    marketSentiment: {
      overall: 'Bullish',
      score: 68,
      indicators: [
        { name: 'News Sentiment', value: 72, trend: 'up' },
        { name: 'Social Media', value: 65, trend: 'up' },
        { name: 'Options Flow', value: 62, trend: 'down' },
        { name: 'Institutional Flow', value: 58, trend: 'up' },
        { name: 'Retail Flow', value: 71, trend: 'up' },
      ]
    },
    scenarioAnalysis: [
      { scenario: 'Base Case', probability: 55, return: 12.5 },
      { scenario: 'Bull Case', probability: 25, return: 24.8 },
      { scenario: 'Bear Case', probability: 15, return: -8.3 },
      { scenario: 'Black Swan', probability: 5, return: -22.7 },
    ]
  },

  // Alternative Data Insights
  alternativeData: {
    satelliteImagery: {
      retailTraffic: {
        value: '12%',
        trend: 'up',
        description: 'Increase in retail foot traffic for consumer holdings',
        impact: 'Positive for retail stocks'
      },
      shippingActivity: {
        value: '8%',
        trend: 'up',
        description: 'Increased shipping activity in key ports',
        impact: 'Positive for logistics and retail'
      }
    },
    socialSentiment: {
      topMentions: [
        { ticker: 'AAPL', sentiment: 78, volume: 12500, change: 12 },
        { ticker: 'TSLA', sentiment: 65, volume: 9800, change: -5 },
        { ticker: 'NVDA', sentiment: 82, volume: 11200, change: 18 },
        { ticker: 'AMZN', sentiment: 71, volume: 8700, change: 8 },
      ],
      trendingThemes: [
        { theme: 'AI Revolution', mentions: 24500, sentiment: 78 },
        { theme: 'Fed Policy', mentions: 18700, sentiment: 42 },
        { theme: 'Earnings Season', mentions: 16200, sentiment: 65 },
        { theme: 'Supply Chain', mentions: 12400, sentiment: 58 },
      ]
    }
  }
};

// Helper functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const getTrendIcon = (trend: string) => {
  switch(trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <LineChartIcon className="w-4 h-4 text-gray-500" />;
  }
};

const getSentimentColor = (score: number) => {
  if (score >= 70) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (confidence >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (confidence >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
};

export function AIAdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState('market-regime');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock data state - in a real app, this would come from an API
  const [data, setData] = useState(advancedAnalyticsData);
  
  // Simulate data refresh
  const refreshData = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setData(advancedAnalyticsData); // In a real app, this would be an API call
      setIsLoading(false);
    }, 1500);
  };

  // Market Regime Component
  const MarketRegimeCard = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Market Regime Detection</CardTitle>
            <CardDescription>Current market conditions and regime analysis</CardDescription>
          </div>
          <Badge className={`px-3 py-1 ${getSentimentColor(data.marketRegime.confidence)}`}>
            {data.marketRegime.current} Market
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium">Current Regime</h3>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{data.marketRegime.current}</span>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Confidence</div>
                <div className="text-lg font-semibold">{data.marketRegime.confidence}%</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Next Expected:</span>
                <span className="font-medium">{data.marketRegime.nextRegime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Probability:</span>
                <span className="font-medium">{data.marketRegime.probability}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Expected Duration:</span>
                <span className="font-medium">{data.marketRegime.expectedDuration}</span>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="font-medium mb-3">Regime Indicators</h3>
            <div className="space-y-3">
              {data.marketRegime.indicators.map((indicator, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{indicator.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{indicator.value}</span>
                      {indicator.status === 'increasing' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : indicator.status === 'decreasing' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <LineChartIcon className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                  <Progress value={indicator.value} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-medium mb-3">Historical Regime Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Regime</th>
                  <th className="pb-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.marketRegime.historicalRegimes.map((regime, index) => (
                  <tr key={index} className="border-b border-border/40">
                    <td className="py-2">{regime.date}</td>
                    <td>
                      <Badge variant="outline">
                        {regime.regime}
                      </Badge>
                    </td>
                    <td className="text-right">{regime.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Behavioral Insights Component
  const BehavioralInsightsCard = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Behavioral Finance Insights</CardTitle>
            <CardDescription>Analysis of your trading behavior and potential biases</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Brain className="w-4 h-4" />
            {data.behavioralInsights.riskProfile}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">Cognitive Biases Detected</h3>
            <div className="space-y-4">
              {data.behavioralInsights.biases.map((bias, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{bias.name}</h4>
                      <Badge 
                        variant="outline" 
                        className={`mt-1 ${
                          bias.level === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          bias.level === 'Moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {bias.level}
                      </Badge>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{bias.impact}</p>
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground">Suggestions:</p>
                    <ul className="text-xs space-y-1 mt-1">
                      {bias.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-1">•</span> {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Trading Patterns</h3>
            <div className="space-y-4">
              {data.behavioralInsights.tradingPatterns.map((pattern, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{pattern.metric}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{pattern.value}</span>
                      {pattern.status === 'above' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Benchmark: {pattern.benchmark}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4" />
                AI Suggestion
              </h4>
              <p className="text-sm">
                Consider increasing your average holding period to better align with your long-term 
                investment goals. Our analysis shows that extending your holding period could 
                potentially increase your risk-adjusted returns by ~15% annually.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Predictive Analytics Component
  const PredictiveAnalyticsCard = () => {
    const [timeframe, setTimeframe] = useState('1Y');
    
    const timeframes = [
      { value: '1M', label: '1M' },
      { value: '3M', label: '3M' },
      { value: '6M', label: '6M' },
      { value: '1Y', label: '1Y' },
    ];
    
    const projectedValue = data.predictiveAnalytics.portfolio.predictedValue[timeframe as keyof typeof data.predictiveAnalytics.portfolio.predictedValue];
    const growth = ((projectedValue.value - data.predictiveAnalytics.portfolio.currentValue) / data.predictiveAnalytics.portfolio.currentValue) * 100;
    
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Predictive Analytics</CardTitle>
              <CardDescription>AI-powered portfolio projections and scenario analysis</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe(tf.value)}
                  className="h-8"
                >
                  {tf.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Current Value</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.predictiveAnalytics.portfolio.currentValue)}
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  Projected Value ({timeframe})
                </div>
                <div className="flex items-end gap-2">
                  <div className="text-2xl font-bold">
                    {formatCurrency(projectedValue.value)}
                  </div>
                  <div className={`text-sm ${growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Confidence</span>
                    <span className="font-medium">{projectedValue.confidence}%</span>
                  </div>
                  <Progress value={projectedValue.confidence} className="h-1.5 mt-1" />
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-3">Risk Metrics</div>
                <div className="space-y-3">
                  {Object.entries(data.predictiveAnalytics.portfolio.riskMetrics).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">
                          {key.split(/(?=[A-Z])/).join(' ')}
                        </span>
                        <span className="font-medium">
                          {typeof value === 'number' ? value.toFixed(1) : value}
                          {key === 'sharpeRatio' || key === 'sortinoRatio' ? '' : '%'}
                        </span>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={key.includes('Ratio') ? value * 20 : value} 
                          className="h-1.5 mt-1"
                        />
                        {key.includes('Ratio') && value > 1 && (
                          <div className="absolute inset-0 bg-green-500 rounded-full" style={{
                            width: `${value * 20}%`,
                            transition: 'width 0.5s ease-in-out'
                          }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64">
                <h3 className="text-sm font-medium mb-2">Portfolio Projection</h3>
                <div className="h-full bg-muted/50 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { month: 'Now', value: data.predictiveAnalytics.portfolio.currentValue },
                        { month: timeframe, value: projectedValue.value },
                      ]}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis dataKey="month" />
                      <YAxis 
                        tickFormatter={(value) => `$${value / 1000}k`}
                        domain={['dataMin - 10000', 'dataMax + 10000']}
                      />
                      <RechartsTooltip 
                        formatter={(value) => [formatCurrency(Number(value)), 'Value']}
                        labelFormatter={(label) => label === 'Now' ? 'Current' : `Projected (${timeframe})`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.2} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Scenario Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {data.predictiveAnalytics.scenarioAnalysis.map((scenario, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{scenario.scenario}</div>
                          <div className={`text-2xl font-bold ${
                            scenario.return >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {scenario.return >= 0 ? '+' : ''}{scenario.return}%
                          </div>
                        </div>
                        <div className="text-xs bg-muted px-2 py-1 rounded-full">
                          {scenario.probability}% probability
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            scenario.return >= 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${scenario.probability}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Market Sentiment</h3>
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-muted-foreground text-sm">Overall Sentiment</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">
                          {data.predictiveAnalytics.marketSentiment.overall}
                        </span>
                        <Badge className={getSentimentColor(data.predictiveAnalytics.marketSentiment.score)}>
                          {data.predictiveAnalytics.marketSentiment.score}/100
                        </Badge>
                      </div>
                    </div>
                    <div className="h-16 w-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { name: 'Positive', value: data.predictiveAnalytics.marketSentiment.score, color: '#10b981' },
                              { 
                                name: 'Negative', 
                                value: 100 - data.predictiveAnalytics.marketSentiment.score,
                                color: '#ef4444'
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={30}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#ef4444" />
                          </Pie>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {data.predictiveAnalytics.marketSentiment.indicators.map((indicator, index) => (
                      <div key={index} className="text-center">
                        <div className="text-sm text-muted-foreground">{indicator.name}</div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-medium">{indicator.value}</span>
                          {indicator.trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Alternative Data Component
  const AlternativeDataCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>Alternative Data Insights</CardTitle>
        <CardDescription>Unconventional data sources for unique market insights</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="satellite" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="satellite">Satellite Imagery</TabsTrigger>
            <TabsTrigger value="sentiment">Social Sentiment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="satellite" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data.alternativeData.satelliteImagery).map(([key, item]) => (
                <div key={key} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">{item.value}</div>
                    {item.trend === 'up' ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    <span className="font-medium">Impact:</span> {item.impact}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">How to Use This Data</h3>
              <p className="text-sm text-muted-foreground">
                Satellite imagery provides real-time insights into economic activity that aren't 
                captured by traditional data sources. Use this data to identify emerging trends 
                before they're reflected in financial statements or market prices.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="sentiment" className="space-y-6">
            <div>
              <h3 className="font-medium mb-3">Top Stock Mentions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.alternativeData.socialSentiment.topMentions.map((stock, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg">{stock.ticker}</div>
                        <div className="text-sm text-muted-foreground">{stock.volume.toLocaleString()} mentions</div>
                      </div>
                      <Badge 
                        variant={stock.sentiment >= 60 ? 'default' : 'outline'}
                        className={`${
                          stock.sentiment >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          stock.sentiment >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {stock.sentiment}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center text-sm">
                      {stock.change >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={stock.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {stock.change >= 0 ? '+' : ''}{stock.change}%
                      </span>
                      <span className="text-muted-foreground text-xs ml-2">vs. last week</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Trending Themes</h3>
              <div className="space-y-2">
                {data.alternativeData.socialSentiment.trendingThemes.map((theme, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{theme.theme}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {theme.mentions.toLocaleString()} mentions
                        </Badge>
                        <Badge 
                          variant={theme.sentiment >= 60 ? 'default' : 'outline'}
                          className={getSentimentColor(theme.sentiment)}
                        >
                          {theme.sentiment}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          theme.sentiment >= 60 ? 'bg-green-500' : 
                          theme.sentiment >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${theme.sentiment}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced AI Analytics</h2>
          <p className="text-muted-foreground">
            Cutting-edge AI insights to enhance your investment strategy
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshData}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </>
          )}
        </Button>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="market-regime">
            <Gauge className="w-4 h-4 mr-2" />
            Market Regime
          </TabsTrigger>
          <TabsTrigger value="behavioral">
            <Brain className="w-4 h-4 mr-2" />
            Behavioral Insights
          </TabsTrigger>
          <TabsTrigger value="predictive">
            <LineChartIcon className="w-4 h-4 mr-2" />
            Predictive Analytics
          </TabsTrigger>
          <TabsTrigger value="alternative">
            <BarChart2 className="w-4 h-4 mr-2" />
            Alternative Data
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="market-regime" className="mt-0">
          <MarketRegimeCard />
        </TabsContent>
        
        <TabsContent value="behavioral" className="mt-0">
          <BehavioralInsightsCard />
        </TabsContent>
        
        <TabsContent value="predictive" className="mt-0">
          <PredictiveAnalyticsCard />
        </TabsContent>
        
        <TabsContent value="alternative" className="mt-0">
          <AlternativeDataCard />
        </TabsContent>
      </Tabs>
      
      <div className="p-4 bg-muted/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">AI Insights</h3>
          <p className="text-sm text-muted-foreground">
            Our AI has detected that your portfolio is currently well-positioned for the {data.marketRegime.current.toLowerCase()} market regime. 
            Consider reviewing the optimization suggestions to better align with your risk tolerance 
            and investment horizon.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AIAdvancedAnalytics;
