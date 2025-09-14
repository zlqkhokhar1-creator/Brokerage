"use client";
'use client';

import React, { useState } from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BrainCircuit, 
  Activity, 
  BarChart3, 
  PieChart as PieChartIcon,
  Zap,
  ArrowUpRight,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// Sample data for demonstration
const portfolioOptimizationData = [
  { name: 'Current', stocks: 40, bonds: 30, crypto: 20, cash: 10 },
  { name: 'Optimized', stocks: 55, bonds: 20, crypto: 15, cash: 10 },
];

const marketRegimeData = [
  { 
    date: 'Jan', 
    value: 100, 
    regime: 'Bull',
    probability: 85,
    indicators: {
      volatility: 12,
      momentum: 78,
      volume: 1450000
    }
  },
  { 
    date: 'Feb', 
    value: 115, 
    regime: 'Bull',
    probability: 82,
    indicators: {
      volatility: 10,
      momentum: 82,
      volume: 1560000
    }
  },
  { 
    date: 'Mar', 
    value: 105, 
    regime: 'Correction',
    probability: 45,
    indicators: {
      volatility: 25,
      momentum: 40,
      volume: 2100000
    }
  },
  { 
    date: 'Apr', 
    value: 95, 
    regime: 'Bear',
    probability: 68,
    indicators: {
      volatility: 30,
      momentum: 35,
      volume: 1980000
    }
  },
  { 
    date: 'May', 
    value: 110, 
    regime: 'Recovery',
    probability: 72,
    indicators: {
      volatility: 18,
      momentum: 65,
      volume: 1750000
    }
  },
  { 
    date: 'Jun', 
    value: 125, 
    regime: 'Bull',
    probability: 88,
    indicators: {
      volatility: 8,
      momentum: 85,
      volume: 1620000
    }
  },
];

const behavioralInsights = [
  {
    id: 1,
    title: 'Loss Aversion Detected',
    description: 'You tend to hold losing positions 30% longer than winning ones',
    impact: 'High',
    recommendation: 'Consider setting stop-loss orders to limit potential losses',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  {
    id: 2,
    title: 'Recency Bias',
    description: 'Recent market movements are influencing 45% of your decisions',
    impact: 'Medium',
    recommendation: 'Review your investment thesis regardless of recent performance',
    icon: Lightbulb,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    id: 3,
    title: 'Confirmation Bias',
    description: 'You primarily consume news that confirms your existing positions',
    impact: 'Medium',
    recommendation: 'Diversify your news sources to avoid echo chambers',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  }
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

const getRegimeColor = (regime: string) => {
  switch(regime.toLowerCase()) {
    case 'bull': return '#10b981';
    case 'bear': return '#ef4444';
    case 'recovery': return '#3b82f6';
    case 'correction': return '#f59e0b';
    default: return '#6b7280';
  }
};

export const AIInsightsDashboard = () => {
  const [activeTab, setActiveTab] = useState('portfolio');

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold flex items-center">
          <BrainCircuit className="h-6 w-6 mr-2 text-primary" />
          AI-Powered Insights
        </h2>
        <p className="text-muted-foreground">
          Advanced analytics and machine learning to enhance your investment decisions
        </p>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="portfolio">Portfolio AI</TabsTrigger>
          <TabsTrigger value="market">Market Regimes</TabsTrigger>
          <TabsTrigger value="behavioral">Behavioral Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Portfolio Optimization</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Quantum-powered optimization for maximum returns with controlled risk
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={portfolioOptimizationData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="stocks" fill="#3b82f6" name="Stocks" />
                      <Bar dataKey="bonds" fill="#10b981" name="Bonds" />
                      <Bar dataKey="crypto" fill="#f59e0b" name="Crypto" />
                      <Bar dataKey="cash" fill="#6366f1" name="Cash" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-medium flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-amber-500" />
                    AI Recommendation
                  </h4>
                  <p className="text-sm mt-1">
                    Based on current market conditions and your risk profile, we recommend increasing your 
                    allocation to <span className="font-medium">growth stocks</span> and reducing exposure 
                    to <span className="font-medium">bonds</span> for higher returns.
                  </p>
                  <div className="mt-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Impact</p>
                      <p className="font-medium">+2.4% Annual Return</p>
                    </div>
                    <Button size="sm">Apply Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Advanced risk metrics and stress testing scenarios
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Portfolio Beta</span>
                    <span className="text-sm font-mono">1.24</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" 
                      style={{ width: '75%' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your portfolio is 24% more volatile than the market
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Value at Risk (95%)</span>
                    <span className="text-sm font-mono">-8.2%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full" 
                      style={{ width: '45%' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    There's a 5% chance of losing more than 8.2% in a month
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Diversification Score</span>
                    <span className="text-sm font-mono">78/100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" 
                      style={{ width: '78%' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Good diversification across sectors and asset classes
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Regime Detection</CardTitle>
              <p className="text-sm text-muted-foreground">
                AI-powered detection of current and predicted market conditions
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marketRegimeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background p-3 border rounded-lg shadow-lg">
                              <p className="font-medium">{label}</p>
                              <p className="text-sm" style={{ color: getRegimeColor(data.regime) }}>
                                {data.regime} Market ({data.probability}% confidence)
                              </p>
                              <div className="mt-2 space-y-1">
                                <p className="text-xs">
                                  <span className="text-muted-foreground">Volatility:</span>{' '}
                                  <span className="font-mono">{data.indicators.volatility}%</span>
                                </p>
                                <p className="text-xs">
                                  <span className="text-muted-foreground">Momentum:</span>{' '}
                                  <span className="font-mono">{data.indicators.momentum}/100</span>
                                </p>
                                <p className="text-xs">
                                  <span className="text-muted-foreground">Volume:</span>{' '}
                                  <span className="font-mono">
                                    {(data.indicators.volume / 1000000).toFixed(1)}M
                                  </span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: '#3b82f6',
                        stroke: '#fff',
                        strokeWidth: 2,
                      }}
                    />
                    {marketRegimeData.map((data, index) => (
                      <rect
                        key={index}
                        x={index * (100 / marketRegimeData.length) + '%'}
                        y="0"
                        width={100 / marketRegimeData.length + '%'}
                        height="100%"
                        fill={getRegimeColor(data.regime)}
                        fillOpacity={0.1}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {['Bull', 'Bear', 'Recovery', 'Correction'].map((regime) => (
                  <div 
                    key={regime}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: `${getRegimeColor(regime)}10`,
                      borderColor: `${getRegimeColor(regime)}30`
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getRegimeColor(regime) }}
                      />
                      <span 
                        className="text-sm font-medium"
                        style={{ color: getRegimeColor(regime) }}
                      >
                        {regime} Market
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {regime === 'Bull' && 'Strong upward trend with increasing prices'}
                      {regime === 'Bear' && 'Sustained decline in market prices'}
                      {regime === 'Recovery' && 'Market rebounding from a decline'}
                      {regime === 'Correction' && 'Short-term decline during an uptrend'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                <h4 className="font-medium flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2 text-blue-500" />
                  Current Market Insight
                </h4>
                <p className="mt-1 text-sm">
                  The market is currently in a <span className="font-medium" style={{ color: getRegimeColor(marketRegimeData[marketRegimeData.length - 1].regime) }}>
                    {marketRegimeData[marketRegimeData.length - 1].regime.toLowerCase()}
                  </span> regime with{' '}
                  <span className="font-medium">{marketRegimeData[marketRegimeData.length - 1].probability}% confidence</span>.
                  {marketRegimeData[marketRegimeData.length - 1].regime === 'Bull' && 
                    ' Consider taking some profits and rebalancing your portfolio.'}
                  {marketRegimeData[marketRegimeData.length - 1].regime === 'Bear' && 
                    ' This may be a good time to look for buying opportunities in quality assets.'}
                  {marketRegimeData[marketRegimeData.length - 1].regime === 'Recovery' && 
                    ' Focus on quality growth stocks that were oversold during the downturn.'}
                  {marketRegimeData[marketRegimeData.length - 1].regime === 'Correction' && 
                    ' Stay disciplined with your investment strategy and avoid panic selling.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavioral" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Behavioral Insights</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Analysis of your trading behavior and potential biases
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {behavioralInsights.map((insight) => {
                    const Icon = insight.icon;
                    return (
                      <div 
                        key={insight.id} 
                        className="p-4 rounded-lg border"
                      >
                        <div className="flex items-start">
                          <div className={`p-2 rounded-lg ${insight.bgColor} mr-3`}>
                            <Icon className={`h-5 w-5 ${insight.color}`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{insight.title}</h4>
                            <p className="text-sm text-muted-foreground">{insight.description}</p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                {insight.impact} Impact
                              </span>
                            </div>
                            <p className="mt-2 text-sm">
                              <span className="font-medium">Recommendation:</span>{' '}
                              {insight.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trading Psychology</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your emotional state and its impact on trading decisions
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Emotional State</h4>
                    <div className="h-40 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-yellow-500/10 to-green-500/10 rounded-lg" />
                      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
                      <div className="relative h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl font-bold">Neutral</div>
                          <div className="text-sm text-muted-foreground">Balanced emotional state</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Common Biases</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Loss Aversion', value: 70 },
                        { name: 'Confirmation Bias',  value: 60 },
                        { name: 'Recency Bias', value: 45 },
                        { name: 'Overconfidence', value: 35 },
                        { name: 'Herd Mentality', value: 30 },
                      ].map((bias) => (
                        <div key={bias.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{bias.name}</span>
                            <span className="font-mono">{bias.value}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                bias.value > 60 ? 'bg-red-500' : 
                                bias.value > 40 ? 'bg-amber-500' : 'bg-green-500'
                              }`} 
                              style={{ width: `${bias.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-muted/20 rounded-lg">
                    <h4 className="font-medium text-sm">Tips to Improve</h4>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Stick to your trading plan to avoid emotional decisions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Review losing trades for learning opportunities</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Take breaks during volatile market conditions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIInsightsDashboard;
