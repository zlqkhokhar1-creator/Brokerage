"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { 
  Brain,
  TrendingUp,
  Target,
  Award,
  Calendar,
  BarChart3,
  Zap,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  Lightbulb
} from 'lucide-react';

interface AIAnalyticsProps {
  userFeedback: {
    liked: number[];
    disliked: number[];
    dismissed: number[];
  };
}

const aiPerformanceMetrics = {
  totalRecommendations: 234,
  successfulPicks: 187,
  accuracyRate: 84.2,
  avgReturn: 12.8,
  bestPick: { symbol: 'NVDA', return: 68.4 },
  worstPick: { symbol: 'META', return: -12.3 },
  sectorsAnalyzed: 11,
  dataPointsProcessed: 2.4e6,
  lastUpdated: '2 hours ago'
};

const learningInsights = [
  {
    id: 1,
    type: 'preference',
    title: 'Sector Preference Learning',
    description: 'AI noticed you prefer technology stocks over healthcare based on your feedback',
    confidence: 92,
    impact: 'High',
    timeframe: '2 weeks'
  },
  {
    id: 2,
    type: 'risk',
    title: 'Risk Tolerance Adjustment',
    description: 'Your recent actions suggest higher risk tolerance than initially set',
    confidence: 78,
    impact: 'Medium',
    timeframe: '1 month'
  },
  {
    id: 3,
    type: 'timing',
    title: 'Market Timing Pattern',
    description: 'You tend to invest more during market dips, adjusting recommendations accordingly',
    confidence: 85,
    impact: 'Medium',
    timeframe: '3 weeks'
  },
  {
    id: 4,
    type: 'goal',
    title: 'Investment Goal Refinement',
    description: 'Detected shift towards growth-oriented investments over dividend stocks',
    confidence: 89,
    impact: 'High',
    timeframe: '1 week'
  }
];

const modelUpdates = [
  {
    date: '2024-01-15',
    version: 'v2.3.1',
    improvements: [
      'Enhanced sector rotation analysis',
      'Improved ESG scoring algorithm',
      'Better volatility prediction'
    ],
    performanceGain: '+3.2%'
  },
  {
    date: '2024-01-08',
    version: 'v2.3.0',
    improvements: [
      'Added crypto ETF analysis',
      'Improved technical indicators',
      'Enhanced risk assessment'
    ],
    performanceGain: '+2.8%'
  },
  {
    date: '2024-01-01',
    version: 'v2.2.5',
    improvements: [
      'New earnings prediction model',
      'Better sentiment analysis',
      'Improved portfolio optimization'
    ],
    performanceGain: '+1.9%'
  }
];

export function AIAnalytics({ userFeedback }: AIAnalyticsProps) {
  const [selectedTab, setSelectedTab] = useState<'performance' | 'learning' | 'updates'>('performance');

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success';
    if (confidence >= 75) return 'text-warning';
    return 'text-destructive';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-destructive bg-destructive/10';
      case 'Medium': return 'text-warning bg-warning/10';
      case 'Low': return 'text-success bg-success/10';
      default: return 'text-muted-foreground';
    }
  };

  const renderPerformanceTab = () => (
    <div className="space-y-4">
      {/* Overall Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{aiPerformanceMetrics.accuracyRate}%</div>
              <p className="text-xs text-muted-foreground">Accuracy Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">+{aiPerformanceMetrics.avgReturn}%</div>
              <p className="text-xs text-muted-foreground">Avg Return</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span>Successful Recommendations</span>
              <span className="font-semibold">
                {aiPerformanceMetrics.successfulPicks}/{aiPerformanceMetrics.totalRecommendations}
              </span>
            </div>
            <Progress value={aiPerformanceMetrics.accuracyRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Picks */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-success" />
              <span className="font-medium text-sm">Best Pick</span>
            </div>
            <div className="text-lg font-bold">{aiPerformanceMetrics.bestPick.symbol}</div>
            <div className="text-success font-semibold">+{aiPerformanceMetrics.bestPick.return}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-sm">Learning From</span>
            </div>
            <div className="text-lg font-bold">{aiPerformanceMetrics.worstPick.symbol}</div>
            <div className="text-destructive font-semibold">{aiPerformanceMetrics.worstPick.return}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Processing Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{aiPerformanceMetrics.sectorsAnalyzed}</div>
              <p className="text-xs text-muted-foreground">Sectors Analyzed</p>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">2.4M</div>
              <p className="text-xs text-muted-foreground">Data Points</p>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">24/7</div>
              <p className="text-xs text-muted-foreground">Market Monitoring</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Feedback Impact */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Your Feedback Impact</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="font-semibold">{userFeedback.liked.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Liked</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="font-semibold">{userFeedback.disliked.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Disliked</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{userFeedback.dismissed.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Dismissed</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Your feedback helps improve recommendation accuracy by an estimated 15-20%
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderLearningTab = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Brain className="h-8 w-8 text-primary mx-auto mb-2" />
        <h3 className="font-semibold">AI Learning Insights</h3>
        <p className="text-sm text-muted-foreground">How AI adapts to your behavior</p>
      </div>

      {learningInsights.map((insight) => (
        <Card key={insight.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                {insight.type === 'preference' && <Target className="h-5 w-5 text-primary" />}
                {insight.type === 'risk' && <Zap className="h-5 w-5 text-primary" />}
                {insight.type === 'timing' && <Clock className="h-5 w-5 text-primary" />}
                {insight.type === 'goal' && <Award className="h-5 w-5 text-primary" />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{insight.title}</h4>
                  <Badge className={`text-xs ${getImpactColor(insight.impact)}`}>
                    {insight.impact}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className={`font-semibold ${getConfidenceColor(insight.confidence)}`}>
                      {insight.confidence}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-muted-foreground">{insight.timeframe}</span>
                  </div>
                </div>
                
                <Progress value={insight.confidence} className="h-1 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderUpdatesTab = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
        <h3 className="font-semibold">AI Model Updates</h3>
        <p className="text-sm text-muted-foreground">Recent improvements and enhancements</p>
      </div>

      {modelUpdates.map((update, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">{update.version}</h4>
                <p className="text-xs text-muted-foreground">{update.date}</p>
              </div>
              <Badge variant="outline" className="text-success border-success">
                {update.performanceGain} improvement
              </Badge>
            </div>
            
            <div className="space-y-2">
              {update.improvements.map((improvement, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="h-1 w-1 bg-primary rounded-full"></div>
                  <span className="text-muted-foreground">{improvement}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4 text-center">
          <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
          <h3 className="font-semibold mb-1">Continuous Learning</h3>
          <p className="text-sm text-muted-foreground">
            Our AI models are updated weekly with new market data and user feedback to provide 
            increasingly accurate recommendations tailored to your investment style.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedTab === 'performance' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTab('performance')}
        >
          Performance
        </Button>
        <Button
          variant={selectedTab === 'learning' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTab('learning')}
        >
          Learning
        </Button>
        <Button
          variant={selectedTab === 'updates' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTab('updates')}
        >
          Updates
        </Button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'performance' && renderPerformanceTab()}
      {selectedTab === 'learning' && renderLearningTab()}
      {selectedTab === 'updates' && renderUpdatesTab()}
    </div>
  );
}