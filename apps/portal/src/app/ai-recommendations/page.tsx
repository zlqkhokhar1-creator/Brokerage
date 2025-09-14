"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Star,
  Lightbulb,
  Zap
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Shell } from '@/components/shell/Shell';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';

interface Recommendation {
  id: string;
  type: 'asset_allocation' | 'diversification' | 'sector_rotation' | 'security_pick' | 'risk_management' | 'rebalancing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number;
  potentialReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
  actions: RecommendationAction[];
  reason: string;
  status: 'active' | 'implemented' | 'dismissed';
}

interface RecommendationAction {
  action: string;
  symbol?: string;
  quantity?: number;
  targetPrice?: number;
  currentWeight?: string;
  targetWeight?: string;
  reason: string;
}

interface PortfolioAnalysis {
  totalValue: number;
  diversificationScore: number;
  riskScore: number;
  performanceScore: number;
  aiConfidence: number;
  lastUpdated: string;
  sectorAllocation: { [key: string]: number };
  assetAllocation: { [key: string]: number };
  topHoldings: any[];
}

export default function AIRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');

  // Mock data - in production, fetch from backend API
  useEffect(() => {
    fetchRecommendations();
    fetchPortfolioAnalysis();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    // Mock API call - replace with actual backend call
    // const response = await fetch('/api/ai/recommendations');
    // const data = await response.json();
    
    // Mock data
    const mockRecommendations: Recommendation[] = [
      {
        id: '1',
        type: 'asset_allocation',
        priority: 'high',
        title: 'Rebalance Asset Allocation',
        description: 'Your portfolio is overweight in stocks. Consider reducing equity exposure by 15% and increasing bond allocation.',
        confidence: 87,
        potentialReturn: 8.5,
        riskLevel: 'medium',
        timeframe: '1-2 weeks',
        actions: [
          {
            action: 'Reduce equity allocation',
            currentWeight: '85%',
            targetWeight: '70%',
            reason: 'Risk management and diversification'
          },
          {
            action: 'Increase bond allocation',
            currentWeight: '10%',
            targetWeight: '25%',
            reason: 'Portfolio stability and income generation'
          }
        ],
        reason: 'Based on your risk profile and current market conditions, this rebalancing will improve risk-adjusted returns.',
        status: 'active'
      },
      {
        id: '2',
        type: 'security_pick',
        priority: 'high',
        title: 'Buy Microsoft (MSFT)',
        description: 'Strong AI and cloud growth prospects with attractive valuation after recent pullback.',
        confidence: 92,
        potentialReturn: 15.2,
        riskLevel: 'medium',
        timeframe: '3-6 months',
        actions: [
          {
            action: 'Buy MSFT',
            symbol: 'MSFT',
            quantity: 25,
            targetPrice: 420,
            reason: 'AI leadership and strong fundamentals'
          }
        ],
        reason: 'Microsoft shows strong AI momentum with Azure growth and Copilot adoption. Current valuation is attractive.',
        status: 'active'
      },
      {
        id: '3',
        type: 'sector_rotation',
        priority: 'medium',
        title: 'Increase Healthcare Exposure',
        description: 'Healthcare sector is undervalued with strong demographic tailwinds and innovation pipeline.',
        confidence: 78,
        potentialReturn: 12.3,
        riskLevel: 'low',
        timeframe: '6-12 months',
        actions: [
          {
            action: 'Add healthcare ETF exposure',
            currentWeight: '5%',
            targetWeight: '15%',
            reason: 'Demographic trends and defensive characteristics'
          }
        ],
        reason: 'Aging population and breakthrough treatments create long-term growth opportunities.',
        status: 'active'
      },
      {
        id: '4',
        type: 'risk_management',
        priority: 'high',
        title: 'Reduce Tesla Position',
        description: 'TSLA position represents 12% of portfolio, creating concentration risk.',
        confidence: 85,
        potentialReturn: -2.5,
        riskLevel: 'high',
        timeframe: 'Immediate',
        actions: [
          {
            action: 'Trim TSLA position',
            symbol: 'TSLA',
            currentWeight: '12%',
            targetWeight: '6%',
            reason: 'Concentration risk management'
          }
        ],
        reason: 'Single position represents too large a portion of your portfolio, increasing volatility.',
        status: 'active'
      },
      {
        id: '5',
        type: 'diversification',
        priority: 'medium',
        title: 'Add International Exposure',
        description: 'Portfolio lacks geographic diversification. Consider adding emerging market exposure.',
        confidence: 74,
        potentialReturn: 9.8,
        riskLevel: 'medium',
        timeframe: '1-3 months',
        actions: [
          {
            action: 'Add international ETF',
            currentWeight: '2%',
            targetWeight: '20%',
            reason: 'Geographic diversification and currency hedging'
          }
        ],
        reason: 'International diversification reduces correlation risk and provides access to faster-growing markets.',
        status: 'active'
      }
    ];

    setRecommendations(mockRecommendations);
    setLoading(false);
  };

  const fetchPortfolioAnalysis = async () => {
    // Mock portfolio analysis data
    const mockAnalysis: PortfolioAnalysis = {
      totalValue: 125000,
      diversificationScore: 72,
      riskScore: 68,
      performanceScore: 84,
      aiConfidence: 89,
      lastUpdated: new Date().toISOString(),
      sectorAllocation: {
        'Technology': 35,
        'Healthcare': 5,
        'Financials': 20,
        'Consumer Disc.': 15,
        'Industrials': 10,
        'Energy': 8,
        'Utilities': 7
      },
      assetAllocation: {
        'Stocks': 85,
        'Bonds': 10,
        'Cash': 3,
        'Commodities': 2
      },
      topHoldings: [
        { symbol: 'AAPL', weight: 15 },
        { symbol: 'TSLA', weight: 12 },
        { symbol: 'MSFT', weight: 10 },
        { symbol: 'GOOGL', weight: 8 },
        { symbol: 'NVDA', weight: 7 }
      ]
    };

    setPortfolioAnalysis(mockAnalysis);
  };

  const refreshRecommendations = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    await fetchPortfolioAnalysis();
    setRefreshing(false);
  };

  const implementRecommendation = (id: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === id ? { ...rec, status: 'implemented' } : rec
      )
    );
  };

  const dismissRecommendation = (id: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === id ? { ...rec, status: 'dismissed' } : rec
      )
    );
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (selectedTab === 'all') return rec.status === 'active';
    if (selectedTab === 'high') return rec.priority === 'high' && rec.status === 'active';
    if (selectedTab === 'implemented') return rec.status === 'implemented';
    return rec.type === selectedTab && rec.status === 'active';
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-400" />
          <p className="text-lg">AI is analyzing your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <Shell right={<InspectorPanel />} showWorkspaceTabs={false}>
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold mb-2">AI Investment Recommendations</h1>
                <p className="text-gray-400">Personalized insights powered by advanced AI analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={refreshRecommendations} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Analysis
              </Button>
            </div>
          </div>

          {/* AI Performance Metrics */}
          {portfolioAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">AI Confidence</p>
                      <p className={`text-2xl font-bold ${getScoreColor(portfolioAnalysis.aiConfidence)}`}>
                        {portfolioAnalysis.aiConfidence}%
                      </p>
                    </div>
                    <Zap className="h-6 w-6 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Portfolio Score</p>
                      <p className={`text-2xl font-bold ${getScoreColor(portfolioAnalysis.performanceScore)}`}>
                        {portfolioAnalysis.performanceScore}/100
                      </p>
                    </div>
                    <Star className="h-6 w-6 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Diversification</p>
                      <p className={`text-2xl font-bold ${getScoreColor(portfolioAnalysis.diversificationScore)}`}>
                        {portfolioAnalysis.diversificationScore}%
                      </p>
                    </div>
                    <PieChart className="h-6 w-6 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Risk Level</p>
                      <p className={`text-2xl font-bold ${getRiskColor(portfolioAnalysis.riskScore > 70 ? 'high' : portfolioAnalysis.riskScore > 40 ? 'medium' : 'low')}`}>
                        {portfolioAnalysis.riskScore > 70 ? 'High' : portfolioAnalysis.riskScore > 40 ? 'Medium' : 'Low'}
                      </p>
                    </div>
                    <Shield className="h-6 w-6 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Active Alerts</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {recommendations.filter(r => r.priority === 'high' && r.status === 'active').length}
                      </p>
                    </div>
                    <AlertTriangle className="h-6 w-6 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All Active</TabsTrigger>
            <TabsTrigger value="high">High Priority</TabsTrigger>
            <TabsTrigger value="asset_allocation">Asset Allocation</TabsTrigger>
            <TabsTrigger value="security_pick">Stock Picks</TabsTrigger>
            <TabsTrigger value="risk_management">Risk Mgmt</TabsTrigger>
            <TabsTrigger value="implemented">Implemented</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-6">
            {/* Recommendations List */}
            <div className="space-y-4">
              {filteredRecommendations.map((rec) => (
                <Card key={rec.id} className="bg-[#111111] border-[#1E1E1E]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          {rec.type === 'asset_allocation' && <PieChart className="w-5 h-5 text-blue-400" />}
                          {rec.type === 'security_pick' && <TrendingUp className="w-5 h-5 text-green-400" />}
                          {rec.type === 'risk_management' && <Shield className="w-5 h-5 text-red-400" />}
                          {rec.type === 'sector_rotation' && <BarChart3 className="w-5 h-5 text-yellow-400" />}
                          {rec.type === 'diversification' && <Target className="w-5 h-5 text-purple-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{rec.title}</h3>
                            <Badge className={`border ${getPriorityColor(rec.priority)}`}>
                              {rec.priority} priority
                            </Badge>
                            <Badge className="bg-gray-500/20 text-gray-400">
                              {rec.confidence}% confidence
                            </Badge>
                          </div>
                          <p className="text-gray-300 mb-3">{rec.description}</p>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Potential Return:</span>
                              <span className={`ml-2 font-semibold ${rec.potentialReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {rec.potentialReturn > 0 ? '+' : ''}{rec.potentialReturn.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Risk Level:</span>
                              <span className={`ml-2 font-semibold ${getRiskColor(rec.riskLevel)}`}>
                                {rec.riskLevel}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Timeframe:</span>
                              <span className="ml-2 font-semibold text-blue-400">{rec.timeframe}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {rec.status === 'active' && (
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => implementRecommendation(rec.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Implement
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => dismissRecommendation(rec.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                      {rec.status === 'implemented' && (
                        <Badge className="bg-green-500/20 text-green-400">Implemented</Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-gray-400 mb-2">Recommended Actions:</h4>
                      {rec.actions.map((action, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                          <div>
                            <div className="font-medium">{action.action}</div>
                            {action.symbol && (
                              <div className="text-sm text-gray-400">
                                Symbol: {action.symbol} {action.quantity && `• Qty: ${action.quantity}`} 
                                {action.targetPrice && ` • Target: $${action.targetPrice}`}
                              </div>
                            )}
                            {action.currentWeight && action.targetWeight && (
                              <div className="text-sm text-gray-400">
                                {action.currentWeight} → {action.targetWeight}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">{action.reason}</div>
                          </div>
                          {rec.status === 'active' && (
                            <Button size="sm" variant="outline">
                              Execute
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Reasoning */}
                    <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-blue-400 text-sm mb-1">AI Reasoning</div>
                          <div className="text-sm text-gray-300">{rec.reason}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredRecommendations.length === 0 && (
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardContent className="p-12 text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Recommendations</h3>
                  <p className="text-gray-400">
                    {selectedTab === 'implemented' 
                      ? "No recommendations have been implemented yet." 
                      : "Your portfolio is well optimized! Check back later for new insights."
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Portfolio Allocation Charts */}
        {portfolioAnalysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Current Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(portfolioAnalysis.assetAllocation).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {Object.entries(portfolioAnalysis.assetAllocation).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '6px'
                      }} 
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(portfolioAnalysis.sectorAllocation).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#666" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '6px'
                      }} 
                    />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </Shell>
  );
}
