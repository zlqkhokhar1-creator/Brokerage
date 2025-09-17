import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { PreferencesSetup, UserPreferences } from './PreferencesSetup';
import { PortfolioRecommendations } from './PortfolioRecommendations';
import { AIAnalytics } from './AIAnalytics';
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  Star,
  ThumbsUp,
  ThumbsDown,
  X,
  ShoppingCart,
  AlertCircle,
  Info,
  Zap,
  Target,
  Award,
  ChevronRight,
  Filter,
  Sparkles,
  Settings
} from 'lucide-react';

interface AIRecommendationsPageProps {
  onNavigate: (page: string) => void;
}

const aiRecommendations = [
  {
    id: 1,
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    type: 'Stock',
    price: 875.50,
    change: 15.25,
    changePercent: 1.77,
    aiScore: 92,
    rationale: 'Strong AI/ML growth potential with expanding data center revenues',
    tags: ['AI Growth', 'Tech Leader', 'High Momentum'],
    targetPrice: 950,
    confidence: 'High',
    timeHorizon: '6-12 months',
    riskLevel: 'Medium-High',
    reasons: [
      'AI chip demand surging',
      'Data center revenue up 200%+',
      'Strong market positioning',
      'Solid financial metrics'
    ]
  },
  {
    id: 2,
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    type: 'ETF',
    price: 267.45,
    change: 2.10,
    changePercent: 0.79,
    aiScore: 88,
    rationale: 'Diversified exposure with low fees, ideal for long-term growth',
    tags: ['Low Cost', 'Diversified', 'Passive Income'],
    targetPrice: 285,
    confidence: 'High',
    timeHorizon: '12+ months',
    riskLevel: 'Low-Medium',
    reasons: [
      'Broad market diversification',
      'Ultra-low expense ratio (0.03%)',
      'Consistent long-term returns',
      'Tax-efficient structure'
    ]
  },
  {
    id: 3,
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    type: 'Stock',
    price: 195.75,
    change: -3.20,
    changePercent: -1.61,
    aiScore: 78,
    rationale: 'EV market leadership despite recent volatility',
    tags: ['EV Pioneer', 'Innovation', 'Volatile'],
    targetPrice: 250,
    confidence: 'Medium',
    timeHorizon: '12-18 months',
    riskLevel: 'High',
    reasons: [
      'EV market expansion',
      'Energy storage growth',
      'Autonomous driving potential',
      'Manufacturing scaling'
    ]
  },
  {
    id: 4,
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    type: 'ETF',
    price: 82.15,
    change: 0.45,
    changePercent: 0.55,
    aiScore: 85,
    rationale: 'Quality dividend stocks with consistent income generation',
    tags: ['Dividend Growth', 'Quality', 'Income'],
    targetPrice: 90,
    confidence: 'High',
    timeHorizon: '6+ months',
    riskLevel: 'Low',
    reasons: [
      'Strong dividend yield (3.5%)',
      'Quality dividend growers',
      'Reasonable valuation',
      'Low volatility profile'
    ]
  }
];

const recommendationCategories = [
  { id: 'growth', name: 'Growth Stocks', count: 12 },
  { id: 'dividend', name: 'Dividend Stocks', count: 8 },
  { id: 'etfs', name: 'ETFs', count: 15 },
  { id: 'crypto', name: 'Crypto ETFs', count: 5 },
  { id: 'international', name: 'International', count: 7 }
];

const defaultUserPreferences: UserPreferences = {
  riskTolerance: 5,
  investmentGoal: 'growth',
  timeHorizon: '7-15 years',
  sectors: ['technology', 'healthcare', 'energy'],
  investmentAmount: 50000,
  dividendFocus: false,
  esgFocus: false,
  internationalExposure: true,
  cryptoInterest: false,
  maxPositionSize: 5,
  rebalanceFrequency: 'quarterly'
};

export function AIRecommendationsPage({ onNavigate }: AIRecommendationsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dismissedRecommendations, setDismissedRecommendations] = useState<number[]>([]);
  const [likedRecommendations, setLikedRecommendations] = useState<number[]>([]);
  const [dislikedRecommendations, setDislikedRecommendations] = useState<number[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [showPreferencesSetup, setShowPreferencesSetup] = useState(false);

  const handleLike = (id: number) => {
    setLikedRecommendations(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setDislikedRecommendations(prev => prev.filter(x => x !== id));
  };

  const handleDislike = (id: number) => {
    setDislikedRecommendations(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setLikedRecommendations(prev => prev.filter(x => x !== id));
  };

  const handleDismiss = (id: number) => {
    setDismissedRecommendations(prev => [...prev, id]);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'text-success';
      case 'medium': return 'text-warning';
      case 'low': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskColor = (risk: string) => {
    if (risk.includes('Low')) return 'text-success';
    if (risk.includes('Medium')) return 'text-warning';
    if (risk.includes('High')) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const handleSavePreferences = (newPreferences: UserPreferences) => {
    setUserPreferences(newPreferences);
    setShowPreferencesSetup(false);
    // Here you would typically save to backend/localStorage
    localStorage.setItem('ai_preferences', JSON.stringify(newPreferences));
  };

  const getRiskToleranceLabel = (risk: number) => {
    if (risk <= 2) return 'Very Low';
    if (risk <= 4) return 'Low';
    if (risk <= 6) return 'Medium';
    if (risk <= 8) return 'High';
    return 'Very High';
  };

  const getInvestmentGoalLabel = (goal: string) => {
    const goals: Record<string, string> = {
      'growth': 'Long-term Growth',
      'income': 'Income Generation',
      'preservation': 'Capital Preservation',
      'balanced': 'Balanced Growth'
    };
    return goals[goal] || goal;
  };

  const filteredRecommendations = aiRecommendations.filter(rec => 
    !dismissedRecommendations.includes(rec.id)
  );

  if (showPreferencesSetup) {
    return (
      <PreferencesSetup
        onBack={() => setShowPreferencesSetup(false)}
        onSave={handleSavePreferences}
        currentPreferences={userPreferences}
      />
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 m-4 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">AI Recommendations</h1>
            <p className="text-muted-foreground">Personalized investment suggestions</p>
          </div>
        </div>
        
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">Your Profile:</span>
            <span>{getRiskToleranceLabel(userPreferences.riskTolerance)} Risk</span>
            <span className="text-muted-foreground">•</span>
            <span>{userPreferences.timeHorizon}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="recommendations" className="px-4">
        <TabsList className="grid w-full grid-cols-4 text-xs">
          <TabsTrigger value="recommendations">Stocks</TabsTrigger>
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="preferences">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4 mt-6">
          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {recommendationCategories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name} ({category.count})
              </Button>
            ))}
          </div>

          {/* AI Recommendations */}
          <div className="space-y-4">
            {filteredRecommendations.map((rec) => (
              <Card key={rec.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{rec.symbol}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {rec.type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="text-xs border-primary/50 text-primary"
                        >
                          AI Score: {rec.aiScore}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.name}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold">${rec.price}</span>
                        <span className={`flex items-center gap-1 ${
                          rec.change >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {rec.change >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {rec.change >= 0 ? '+' : ''}{rec.change} ({rec.changePercent >= 0 ? '+' : ''}{rec.changePercent}%)
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(rec.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* AI Rationale */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">AI Analysis</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{rec.rationale}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {rec.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Target Price</span>
                      <p className="font-semibold text-success">${rec.targetPrice}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence</span>
                      <p className={`font-semibold ${getConfidenceColor(rec.confidence)}`}>
                        {rec.confidence}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time Horizon</span>
                      <p className="font-semibold">{rec.timeHorizon}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Risk Level</span>
                      <p className={`font-semibold ${getRiskColor(rec.riskLevel)}`}>
                        {rec.riskLevel}
                      </p>
                    </div>
                  </div>

                  {/* Key Reasons */}
                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Key Investment Reasons
                    </h4>
                    <div className="space-y-1">
                      {rec.reasons.map((reason, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="h-1 w-1 bg-primary rounded-full"></div>
                          <span className="text-muted-foreground">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1"
                      onClick={() => onNavigate('trade')}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Now
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant={likedRecommendations.includes(rec.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleLike(rec.id)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={dislikedRecommendations.includes(rec.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleDislike(rec.id)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feedback Section */}
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Help Improve AI Recommendations</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your feedback helps our AI learn your preferences and provide better suggestions.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4 text-success" />
                      <span>{likedRecommendations.length} Liked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsDown className="h-4 w-4 text-destructive" />
                      <span>{dislikedRecommendations.length} Disliked</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolios" className="space-y-4 mt-6">
          <PortfolioRecommendations 
            userPreferences={userPreferences}
            onInvest={(portfolioId) => {
              // Handle portfolio investment
              console.log('Investing in portfolio:', portfolioId);
              onNavigate('trade');
            }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-6">
          <AIAnalytics 
            userFeedback={{
              liked: likedRecommendations,
              disliked: dislikedRecommendations,
              dismissed: dismissedRecommendations
            }}
          />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Investment Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Risk Tolerance</label>
                  <p className="text-sm text-muted-foreground">{getRiskToleranceLabel(userPreferences.riskTolerance)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Time Horizon</label>
                  <p className="text-sm text-muted-foreground">{userPreferences.timeHorizon}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Investment Goal</label>
                  <p className="text-sm text-muted-foreground">{getInvestmentGoalLabel(userPreferences.investmentGoal)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Investment Amount</label>
                  <p className="text-sm text-muted-foreground">${userPreferences.investmentAmount.toLocaleString()} HKD</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Preferred Sectors</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userPreferences.sectors.map(sector => (
                      <Badge key={sector} variant="secondary" className="capitalize">{sector}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Dividend Focus</span>
                  <Badge variant={userPreferences.dividendFocus ? 'default' : 'secondary'} className="text-xs">
                    {userPreferences.dividendFocus ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>ESG Focus</span>
                  <Badge variant={userPreferences.esgFocus ? 'default' : 'secondary'} className="text-xs">
                    {userPreferences.esgFocus ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>International</span>
                  <Badge variant={userPreferences.internationalExposure ? 'default' : 'secondary'} className="text-xs">
                    {userPreferences.internationalExposure ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Crypto Interest</span>
                  <Badge variant={userPreferences.cryptoInterest ? 'default' : 'secondary'} className="text-xs">
                    {userPreferences.cryptoInterest ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <Button className="w-full" onClick={() => setShowPreferencesSetup(true)}>
                <Filter className="h-4 w-4 mr-2" />
                Update Preferences
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Recommendation Accuracy</span>
                  <span className="font-semibold text-success">84.2%</span>
                </div>
                <Progress value={84.2} className="h-2" />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Successful Picks</span>
                    <p className="font-semibold">127 / 151</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg. Return</span>
                    <p className="font-semibold text-success">+12.8%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}