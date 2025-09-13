'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter 
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
import { 
  Progress 
} from '@/components/ui/progress';
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
  PieChart,
  LineChart,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

// Mock data for portfolio recommendations
const portfolioData = {
  current: {
    stocks: 65,
    bonds: 20,
    cash: 10,
    alternatives: 5,
    riskScore: 7.2,
    diversification: 6.8,
    performance: 8.1
  },
  recommended: {
    stocks: 55,
    bonds: 25,
    cash: 10,
    alternatives: 10,
    riskScore: 6.5,
    diversification: 8.2,
    performance: 8.7
  },
  riskProfile: {
    level: 'Moderately Aggressive',
    score: 7.2,
    description: 'You are comfortable with moderate risk for potentially higher returns.'
  },
  opportunities: [
    {
      id: 1,
      type: 'sector',
      name: 'Technology',
      current: 35,
      recommended: 25,
      action: 'Reduce',
      reason: 'Overweight position increases risk',
      impact: 'High',
      confidence: 85
    },
    {
      id: 2,
      type: 'asset',
      name: 'Emerging Markets',
      current: 5,
      recommended: 12,
      action: 'Increase',
      reason: 'Underexposed to high-growth markets',
      impact: 'Medium',
      confidence: 78
    },
    {
      id: 3,
      type: 'holding',
      name: 'AAPL',
      current: 15,
      recommended: 8,
      action: 'Reduce',
      reason: 'Concentration risk',
      impact: 'High',
      confidence: 92
    }
  ]
};

// Mock performance data
const performanceData = [
  { month: 'Jan', current: 100, recommended: 100 },
  { month: 'Feb', current: 102, recommended: 101 },
  { month: 'Mar', current: 105, recommended: 103 },
  { month: 'Apr', current: 108, recommended: 106 },
  { month: 'May', current: 112, recommended: 110 },
  { month: 'Jun', current: 115, recommended: 116 },
  { month: 'Jul', current: 118, recommended: 122 },
  { month: 'Aug', current: 120, recommended: 128 },
  { month: 'Sep', current: 122, recommended: 135 }
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export function AIPortfolioRecommendations() {
  const [riskTolerance, setRiskTolerance] = useState(7);
  const [timeHorizon, setTimeHorizon] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSimulation, setShowSimulation] = useState(false);

  const handleOptimize = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setShowSimulation(true);
    }, 1500);
  };

  const renderPortfolioHealth = () => {
    const healthScore = Math.round(
      (portfolioData.current.riskScore * 0.4) + 
      (portfolioData.current.diversification * 0.3) + 
      (portfolioData.current.performance * 0.3)
    );

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portfolio Health Score</CardTitle>
              <CardDescription>Based on risk, diversification, and performance metrics</CardDescription>
            </div>
            <Badge className="text-lg px-4 py-1.5" variant="outline">
              {healthScore}/10
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Risk Level</span>
                <span>{portfolioData.current.riskScore.toFixed(1)}/10</span>
              </div>
              <Progress value={portfolioData.current.riskScore * 10} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Diversification</span>
                <span>{portfolioData.current.diversification.toFixed(1)}/10</span>
              </div>
              <Progress value={portfolioData.current.diversification * 10} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Performance</span>
                <span>{portfolioData.current.performance.toFixed(1)}/10</span>
              </div>
              <Progress value={portfolioData.current.performance * 10} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAllocationChart = () => {
    const currentData = [
      { name: 'Stocks', value: portfolioData.current.stocks },
      { name: 'Bonds', value: portfolioData.current.bonds },
      { name: 'Cash', value: portfolioData.current.cash },
      { name: 'Alternatives', value: portfolioData.current.alternatives }
    ];

    const recommendedData = [
      { name: 'Stocks', value: portfolioData.recommended.stocks },
      { name: 'Bonds', value: portfolioData.recommended.bonds },
      { name: 'Cash', value: portfolioData.recommended.cash },
      { name: 'Alternatives', value: portfolioData.recommended.alternatives }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Allocation</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={currentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {currentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value) => [`${value}%`, 'Allocation']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recommended Allocation</CardTitle>
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Optimized
            </Badge>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={recommendedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {recommendedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value) => [`${value}%`, 'Allocation']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformanceComparison = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Performance Comparison</CardTitle>
        <CardDescription>Projected growth based on current vs. recommended allocation</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis dataKey="month" />
            <YAxis />
            <RechartsTooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                padding: '8px 12px'
              }}
            />
            <Legend />
            <Bar dataKey="current" name="Current Portfolio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recommended" name="Recommended" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const renderOptimizationOpportunities = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Optimization Opportunities</CardTitle>
            <CardDescription>AI-powered suggestions to improve your portfolio</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Target className="w-3 h-3" />
            {portfolioData.opportunities.length} Actions
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {portfolioData.opportunities.map((opp) => (
            <div key={opp.id} className="flex items-start p-4 border rounded-lg">
              <div className="flex-shrink-0 p-2 rounded-full bg-primary/10 text-primary">
                {opp.action === 'Increase' ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {opp.action} {opp.type} allocation: <span className="font-bold">{opp.name}</span>
                  </h4>
                  <Badge 
                    variant={opp.impact === 'High' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {opp.impact} Impact
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{opp.reason}</p>
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <span>Confidence: {opp.confidence}%</span>
                  <span className="mx-2">•</span>
                  <span>Current: {opp.current}%</span>
                  <ArrowRight className="w-3 h-3 mx-1" />
                  <span>Recommended: {opp.recommended}%</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="ml-4">
                Apply
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderRiskProfile = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Your Risk Profile</CardTitle>
        <CardDescription>Based on your investment preferences and behavior</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Risk Tolerance</span>
              <span className="text-sm text-muted-foreground">
                {riskTolerance}/10
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">Conservative</span>
              <Slider 
                value={[riskTolerance]} 
                onValueChange={([value]) => setRiskTolerance(value)}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">Aggressive</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Time Horizon</span>
              <span className="text-sm text-muted-foreground">
                {timeHorizon} {timeHorizon === 1 ? 'Year' : 'Years'}
              </span>
            </div>
            <Slider 
              value={[timeHorizon]} 
              onValueChange={([value]) => setTimeHorizon(value)}
              min={1}
              max={20}
              step={1}
              className="mt-2"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">1 Year</span>
              <span className="text-xs text-muted-foreground">20+ Years</span>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start">
              <Info className="w-4 h-4 mt-0.5 text-muted-foreground mr-2 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Based on your risk tolerance of {riskTolerance}/10 and a {timeHorizon}-year investment horizon, 
                we recommend a {riskTolerance >= 7 ? 'moderately aggressive' : riskTolerance >= 4 ? 'moderate' : 'conservative'} 
                asset allocation.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Portfolio Recommendations</h2>
          <p className="text-muted-foreground">
            Intelligent insights to optimize your investment portfolio
          </p>
        </div>
        <Button 
          onClick={handleOptimize}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Optimize Portfolio
            </>
          )}
        </Button>
      </div>

      {showSimulation ? (
        <>
          {renderPortfolioHealth()}
          {renderAllocationChart()}
          {renderPerformanceComparison()}
          {renderOptimizationOpportunities()}
          {renderRiskProfile()}
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Optimize Your Portfolio</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get AI-powered recommendations to improve your portfolio's risk-adjusted returns based on your investment goals and risk tolerance.
            </p>
            <Button onClick={handleOptimize} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AIPortfolioRecommendations;
