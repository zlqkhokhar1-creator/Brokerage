"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  PieChart,
  TrendingUp,
  Target,
  DollarSign,
  Shield,
  Zap,
  Award,
  Info,
  Star,
  ShoppingCart,
  BarChart3,
  Timer,
  Globe
} from 'lucide-react';

interface PortfolioRecommendation {
  id: string;
  name: string;
  description: string;
  riskLevel: string;
  expectedReturn: number;
  minimumInvestment: number;
  timeHorizon: string;
  allocations: Array<{
    symbol: string;
    name: string;
    percentage: number;
    type: 'stock' | 'etf' | 'crypto';
  }>;
  features: string[];
  aiScore: number;
  historicalReturn: number;
  volatility: number;
  sharpeRatio: number;
}

const portfolioRecommendations: PortfolioRecommendation[] = [
  {
    id: 'growth-tech',
    name: 'AI-Powered Growth Portfolio',
    description: 'Technology-focused portfolio optimized for long-term capital appreciation',
    riskLevel: 'Medium-High',
    expectedReturn: 12.8,
    minimumInvestment: 10000,
    timeHorizon: '5+ years',
    aiScore: 94,
    historicalReturn: 15.2,
    volatility: 18.5,
    sharpeRatio: 0.82,
    allocations: [
      { symbol: 'NVDA', name: 'NVIDIA Corp', percentage: 25, type: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft Corp', percentage: 20, type: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc', percentage: 15, type: 'stock' },
      { symbol: 'VGT', name: 'Technology ETF', percentage: 20, type: 'etf' },
      { symbol: 'ARKK', name: 'Innovation ETF', percentage: 12, type: 'etf' },
      { symbol: 'VTI', name: 'Total Market ETF', percentage: 8, type: 'etf' }
    ],
    features: ['AI/ML Focus', 'Growth Oriented', 'Tech Heavy', 'High Potential']
  },
  {
    id: 'balanced-dividend',
    name: 'Balanced Income Portfolio',
    description: 'Diversified portfolio balancing growth and income generation',
    riskLevel: 'Medium',
    expectedReturn: 8.5,
    minimumInvestment: 5000,
    timeHorizon: '3+ years',
    aiScore: 88,
    historicalReturn: 9.1,
    volatility: 12.3,
    sharpeRatio: 0.74,
    allocations: [
      { symbol: 'SCHD', name: 'Dividend ETF', percentage: 30, type: 'etf' },
      { symbol: 'VYM', name: 'Dividend Appreciation', percentage: 25, type: 'etf' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', percentage: 15, type: 'stock' },
      { symbol: 'PG', name: 'Procter & Gamble', percentage: 10, type: 'stock' },
      { symbol: 'VTI', name: 'Total Market ETF', percentage: 15, type: 'etf' },
      { symbol: 'BND', name: 'Bond ETF', percentage: 5, type: 'etf' }
    ],
    features: ['Regular Income', 'Stable Growth', 'Lower Volatility', 'Diversified']
  },
  {
    id: 'conservative-esg',
    name: 'ESG Conservative Portfolio',
    description: 'Environmentally and socially responsible investments with capital preservation',
    riskLevel: 'Low-Medium',
    expectedReturn: 6.2,
    minimumInvestment: 3000,
    timeHorizon: '2+ years',
    aiScore: 85,
    historicalReturn: 7.8,
    volatility: 8.9,
    sharpeRatio: 0.87,
    allocations: [
      { symbol: 'ESG', name: 'ESG ETF', percentage: 40, type: 'etf' },
      { symbol: 'ICLN', name: 'Clean Energy ETF', percentage: 25, type: 'etf' },
      { symbol: 'TSLA', name: 'Tesla Inc', percentage: 15, type: 'stock' },
      { symbol: 'NEE', name: 'NextEra Energy', percentage: 10, type: 'stock' },
      { symbol: 'BND', name: 'Bond ETF', percentage: 10, type: 'etf' }
    ],
    features: ['ESG Compliant', 'Sustainable', 'Lower Risk', 'Socially Responsible']
  },
  {
    id: 'crypto-aggressive',
    name: 'Crypto-Enhanced Growth',
    description: 'High-growth portfolio with cryptocurrency exposure for aggressive investors',
    riskLevel: 'High',
    expectedReturn: 18.5,
    minimumInvestment: 15000,
    timeHorizon: '7+ years',
    aiScore: 78,
    historicalReturn: 22.3,
    volatility: 28.7,
    sharpeRatio: 0.78,
    allocations: [
      { symbol: 'QQQ', name: 'NASDAQ ETF', percentage: 35, type: 'etf' },
      { symbol: 'ARKK', name: 'Innovation ETF', percentage: 25, type: 'etf' },
      { symbol: 'BITO', name: 'Bitcoin ETF', percentage: 15, type: 'crypto' },
      { symbol: 'NVDA', name: 'NVIDIA Corp', percentage: 15, type: 'stock' },
      { symbol: 'COIN', name: 'Coinbase', percentage: 10, type: 'stock' }
    ],
    features: ['Crypto Exposure', 'High Growth', 'Tech Heavy', 'Aggressive']
  }
];

interface PortfolioRecommendationsProps {
  userPreferences: any;
  onInvest: (portfolioId: string) => void;
}

export function PortfolioRecommendations({ userPreferences, onInvest }: PortfolioRecommendationsProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);

  const getRiskColor = (risk: string) => {
    if (risk.includes('Low')) return 'text-success bg-success/10';
    if (risk.includes('Medium')) return 'text-warning bg-warning/10';
    if (risk.includes('High')) return 'text-destructive bg-destructive/10';
    return 'text-muted-foreground';
  };

  const getMatchScore = (portfolio: PortfolioRecommendation) => {
    // Simple matching algorithm based on user preferences
    let score = 0;
    
    // Risk tolerance matching
    const userRisk = userPreferences.riskTolerance;
    if (portfolio.riskLevel.includes('Low') && userRisk <= 4) score += 30;
    else if (portfolio.riskLevel.includes('Medium') && userRisk >= 4 && userRisk <= 7) score += 30;
    else if (portfolio.riskLevel.includes('High') && userRisk >= 7) score += 30;
    else score += 10;

    // Investment goal matching
    if (userPreferences.investmentGoal === 'growth' && portfolio.expectedReturn > 10) score += 25;
    if (userPreferences.investmentGoal === 'income' && portfolio.features.includes('Regular Income')) score += 25;
    if (userPreferences.investmentGoal === 'preservation' && portfolio.riskLevel.includes('Low')) score += 25;

    // Special preferences
    if (userPreferences.esgFocus && portfolio.features.includes('ESG Compliant')) score += 20;
    if (userPreferences.cryptoInterest && portfolio.features.includes('Crypto Exposure')) score += 15;

    return Math.min(score, 100);
  };

  const sortedPortfolios = portfolioRecommendations
    .map(portfolio => ({
      ...portfolio,
      matchScore: getMatchScore(portfolio)
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <PieChart className="h-6 w-6 text-primary" />
        <div>
          <h2 className="font-semibold">AI Portfolio Recommendations</h2>
          <p className="text-sm text-muted-foreground">Diversified portfolios tailored to your preferences</p>
        </div>
      </div>

      {sortedPortfolios.map((portfolio) => (
        <Card key={portfolio.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                    {portfolio.matchScore}% Match
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    AI Score: {portfolio.aiScore}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{portfolio.description}</p>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="font-semibold text-success">+{portfolio.expectedReturn}%</span>
                    <span className="text-muted-foreground">expected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    <span>{portfolio.timeHorizon}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Risk and Performance Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <span className="text-muted-foreground">Risk Level</span>
                <p className={`font-semibold ${getRiskColor(portfolio.riskLevel)}`}>
                  {portfolio.riskLevel}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Min Investment</span>
                <p className="font-semibold">${portfolio.minimumInvestment.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Sharpe Ratio</span>
                <p className="font-semibold">{portfolio.sharpeRatio}</p>
              </div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-1 mb-4">
              {portfolio.features.map(feature => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>

            {/* Portfolio Allocation */}
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Portfolio Allocation
              </h4>
              <div className="space-y-2">
                {portfolio.allocations.map((allocation, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-12 text-xs font-medium text-right">
                      {allocation.percentage}%
                    </div>
                    <div className="flex-1">
                      <Progress value={allocation.percentage} className="h-2" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium text-sm">{allocation.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {allocation.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historical Performance */}
            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Historical Return</span>
                  <p className="font-semibold text-success">+{portfolio.historicalReturn}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Volatility</span>
                  <p className="font-semibold">{portfolio.volatility}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Risk-Adjusted</span>
                  <p className="font-semibold text-primary">Excellent</p>
                </div>
              </div>
            </div>

            {/* Expandable Details */}
            {selectedPortfolio === portfolio.id && (
              <div className="mb-4 space-y-3">
                <div className="bg-primary/5 rounded-lg p-3">
                  <h5 className="font-medium text-sm mb-2">Why this portfolio matches you:</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Aligns with your {userPreferences.investmentGoal} investment goal</li>
                    <li>• Suitable for your risk tolerance level</li>
                    <li>• Matches your {userPreferences.timeHorizon} time horizon</li>
                    {userPreferences.esgFocus && portfolio.features.includes('ESG Compliant') && (
                      <li>• Includes ESG-focused investments as requested</li>
                    )}
                    {userPreferences.cryptoInterest && portfolio.features.includes('Crypto Exposure') && (
                      <li>• Includes cryptocurrency exposure</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                className="flex-1"
                onClick={() => onInvest(portfolio.id)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Invest Now
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedPortfolio(
                  selectedPortfolio === portfolio.id ? null : portfolio.id
                )}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Performance Disclaimer */}
      <Card className="bg-gradient-to-r from-warning/5 to-accent/5 border-warning/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Investment Disclaimer</h3>
              <p className="text-sm text-muted-foreground">
                Past performance does not guarantee future results. All investments carry risk of loss. 
                Portfolio recommendations are based on AI analysis and should not be considered as financial advice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}