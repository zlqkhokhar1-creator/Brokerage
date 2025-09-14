"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  RefreshCw,
  Brain,
  Activity,
  Clock,
  Target,
  BarChart3,
  Zap,
  Eye
} from 'lucide-react';

interface MarketRegime {
  regime: string;
  confidence: number;
  characteristics: {
    volatility: string;
    trend: string;
    duration: string;
  };
  transitionProbabilities: { [key: string]: number };
  recommendedStrategy: {
    name: string;
    description: string;
    allocation: { [asset: string]: number };
    riskLevel: string;
  };
  timeToNextRegime: number;
}

const PredictiveMarketRegimes: React.FC = () => {
  const [currentRegime, setCurrentRegime] = useState<MarketRegime | null>(null);
  const [historicalRegimes, setHistoricalRegimes] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [regimeHistory, setRegimeHistory] = useState<any[]>([]);

  const regimeColors = {
    'bull_market': 'bg-green-500',
    'bear_market': 'bg-red-500',
    'sideways_market': 'bg-yellow-500',
    'crisis_mode': 'bg-red-700',
    'recovery_phase': 'bg-blue-500'
  };

  const regimeIcons = {
    'bull_market': TrendingUp,
    'bear_market': TrendingDown,
    'sideways_market': Minus,
    'crisis_mode': AlertTriangle,
    'recovery_phase': RefreshCw
  };

  const analyzeMarketRegime = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/v1/ai/market-regime-detection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentRegime(data.data);
        setHistoricalRegimes(data.historical || []);
        setRegimeHistory(data.regimeHistory || []);
      }
    } catch (error) {
      console.error('Market regime analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    analyzeMarketRegime();
    const interval = setInterval(analyzeMarketRegime, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getRegimeIcon = (regime: string) => {
    const Icon = regimeIcons[regime as keyof typeof regimeIcons] || Activity;
    return Icon;
  };

  const formatRegimeName = (regime: string) => {
    return regime.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-500" />
            Predictive Market Regimes
          </h1>
          <p className="text-muted-foreground">AI-powered market regime detection and prediction</p>
        </div>
        <Button 
          onClick={analyzeMarketRegime} 
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Analyze Regime
            </>
          )}
        </Button>
      </div>

      {currentRegime && (
        <>
          {/* Current Regime Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="col-span-2 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {React.createElement(getRegimeIcon(currentRegime.regime), {
                      className: "w-8 h-8 text-blue-600"
                    })}
                    <div>
                      <h3 className="text-2xl font-bold">{formatRegimeName(currentRegime.regime)}</h3>
                      <p className="text-muted-foreground">Current Market Regime</p>
                    </div>
                  </div>
                  <Badge 
                    className={`${regimeColors[currentRegime.regime as keyof typeof regimeColors]} text-white px-3 py-1`}
                  >
                    {(currentRegime.confidence * 100).toFixed(0)}% Confidence
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Volatility</p>
                    <p className="font-semibold capitalize">{currentRegime.characteristics.volatility}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Trend</p>
                    <p className="font-semibold capitalize">{currentRegime.characteristics.trend}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold capitalize">{currentRegime.characteristics.duration}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Time to Next Regime</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {currentRegime.timeToNextRegime} days
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Strategy Risk</p>
                    <p className="text-2xl font-bold text-green-600 capitalize">
                      {currentRegime.recommendedStrategy.riskLevel}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="transitions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="transitions">Regime Transitions</TabsTrigger>
              <TabsTrigger value="strategy">Recommended Strategy</TabsTrigger>
              <TabsTrigger value="history">Historical Analysis</TabsTrigger>
              <TabsTrigger value="predictions">Future Predictions</TabsTrigger>
            </TabsList>

            <TabsContent value="transitions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transition Probabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(currentRegime.transitionProbabilities).map(([regime, probability]) => (
                      <div key={regime} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            {React.createElement(getRegimeIcon(regime), {
                              className: "w-4 h-4"
                            })}
                            <span className="font-medium">{formatRegimeName(regime)}</span>
                          </div>
                          <span className="text-sm font-semibold">{(probability * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={probability * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Regime-Optimized Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <h4 className="font-semibold text-lg mb-2">{currentRegime.recommendedStrategy.name}</h4>
                      <p className="text-muted-foreground">{currentRegime.recommendedStrategy.description}</p>
                    </div>

                    <div>
                      <h5 className="font-semibold mb-3">Recommended Allocation</h5>
                      <div className="space-y-3">
                        {Object.entries(currentRegime.recommendedStrategy.allocation).map(([asset, allocation]) => (
                          <div key={asset} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{asset}</span>
                              <span>{(allocation * 100).toFixed(1)}%</span>
                            </div>
                            <Progress value={allocation * 100} className="h-3" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Expected Return</p>
                        <p className="text-xl font-bold text-green-600">12.5%</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Max Drawdown</p>
                        <p className="text-xl font-bold text-blue-600">-8.2%</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                        <p className="text-xl font-bold text-purple-600">1.85</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Historical Regime Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {regimeHistory.map((period, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {React.createElement(getRegimeIcon(period.regime), {
                            className: "w-5 h-5"
                          })}
                          <div>
                            <p className="font-medium">{formatRegimeName(period.regime)}</p>
                            <p className="text-sm text-muted-foreground">
                              {period.startDate} - {period.endDate}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{period.duration} days</p>
                          <p className="text-sm text-muted-foreground">
                            Return: {period.return > 0 ? '+' : ''}{period.return.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Next 30 Days Forecast</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Most Likely Regime</p>
                            <p className="text-sm text-muted-foreground">Bull Market Continuation</p>
                          </div>
                          <Badge className="bg-green-500 text-white">75%</Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Alternative Scenario</p>
                            <p className="text-sm text-muted-foreground">Sideways Market</p>
                          </div>
                          <Badge className="bg-yellow-500 text-white">20%</Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-r from-red-100 to-pink-100 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Low Probability</p>
                            <p className="text-sm text-muted-foreground">Bear Market</p>
                          </div>
                          <Badge className="bg-red-500 text-white">5%</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Regime Indicators</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>VIX Level</span>
                          <span className="font-medium text-green-600">Low (Bullish)</span>
                        </div>
                        <Progress value={25} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Yield Curve</span>
                          <span className="font-medium text-blue-600">Normal (Neutral)</span>
                        </div>
                        <Progress value={60} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Credit Spreads</span>
                          <span className="font-medium text-green-600">Tight (Bullish)</span>
                        </div>
                        <Progress value={20} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Economic Momentum</span>
                          <span className="font-medium text-green-600">Strong (Bullish)</span>
                        </div>
                        <Progress value={80} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!currentRegime && !isAnalyzing && (
        <Card className="border-dashed border-2 border-blue-200">
          <CardContent className="text-center py-12">
            <Brain className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Market Regime Analysis Ready</h3>
            <p className="text-muted-foreground mb-4">
              Use advanced AI to detect current market regime and predict transitions
            </p>
            <Button 
              onClick={analyzeMarketRegime}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Brain className="w-4 h-4 mr-2" />
              Start Regime Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PredictiveMarketRegimes;
