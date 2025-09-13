import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EnhancedCard } from '@/components/ui/EnhancedCard';
import { 
  Target, 
  Zap, 
  Brain, 
  PieChart, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Eye,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface StockAnalysis {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  aiScore: number;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  confidence: number;
  reasons: string[];
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

export const AIAnalyticsDemo: React.FC = () => {
  const [selectedStock, setSelectedStock] = useState<string>('TRG');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);

  const stocks = [
    { symbol: 'TRG', name: 'TRG Pakistan Limited' },
    { symbol: 'HBL', name: 'Habib Bank Limited' },
    { symbol: 'ENGRO', name: 'Engro Corporation' },
    { symbol: 'LUCKY', name: 'Lucky Cement' },
    { symbol: 'PSO', name: 'Pakistan State Oil' }
  ];

  const mockAnalyses: Record<string, StockAnalysis> = {
    TRG: {
      symbol: 'TRG',
      name: 'TRG Pakistan Limited',
      price: 142.50,
      change: 7.25,
      changePercent: 5.4,
      aiScore: 8.7,
      recommendation: 'BUY',
      confidence: 87,
      reasons: [
        'Strong quarterly earnings growth of 24%',
        'Positive sentiment in tech sector',
        'Technical indicators show bullish momentum',
        'Low PE ratio compared to industry average'
      ],
      sentiment: 'Bullish'
    },
    HBL: {
      symbol: 'HBL',
      name: 'Habib Bank Limited',
      price: 95.75,
      change: 2.15,
      changePercent: 2.3,
      aiScore: 7.2,
      recommendation: 'HOLD',
      confidence: 72,
      reasons: [
        'Stable dividend yield of 8.5%',
        'Strong capital adequacy ratio',
        'Regulatory challenges in banking sector',
        'Moderate growth prospects'
      ],
      sentiment: 'Neutral'
    },
    ENGRO: {
      symbol: 'ENGRO',
      name: 'Engro Corporation',
      price: 285.00,
      change: -4.25,
      changePercent: -1.5,
      aiScore: 6.8,
      recommendation: 'HOLD',
      confidence: 68,
      reasons: [
        'Diversified business portfolio',
        'Commodity price volatility concerns',
        'Strong management track record',
        'Environmental regulations impact'
      ],
      sentiment: 'Neutral'
    },
    LUCKY: {
      symbol: 'LUCKY',
      name: 'Lucky Cement',
      price: 650.25,
      change: 23.75,
      changePercent: 3.8,
      aiScore: 8.1,
      recommendation: 'BUY',
      confidence: 81,
      reasons: [
        'Infrastructure development boom',
        'Capacity expansion plans',
        'Strong cash flows',
        'Market leadership position'
      ],
      sentiment: 'Bullish'
    },
    PSO: {
      symbol: 'PSO',
      name: 'Pakistan State Oil',
      price: 180.90,
      change: 3.40,
      changePercent: 1.9,
      aiScore: 6.5,
      recommendation: 'HOLD',
      confidence: 65,
      reasons: [
        'Government backing and market share',
        'Oil price volatility risks',
        'Circular debt issues',
        'Potential for operational improvements'
      ],
      sentiment: 'Neutral'
    }
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    
    // Simulate AI analysis with loading time
    setTimeout(() => {
      setAnalysis(mockAnalyses[selectedStock]);
      setIsAnalyzing(false);
    }, 2000);
  };

  useEffect(() => {
    runAnalysis();
  }, [selectedStock]);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'SELL': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'HOLD': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish': return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'Bearish': return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default: return <BarChart3 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">AI-Powered Stock Analysis</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Experience how our artificial intelligence analyzes Pakistani stocks and provides actionable investment insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Stock Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-primary" />
                  Select Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                        selectedStock === stock.symbol 
                          ? 'bg-primary/10 border-primary border' 
                          : 'hover:bg-muted/50 border border-border'
                      }`}
                      onClick={() => setSelectedStock(stock.symbol)}
                    >
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground">{stock.name}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {analysis && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-amber-500" />
                    Quick Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">AI Score:</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-primary h-2.5 rounded-full" 
                            style={{ width: `${analysis.aiScore * 10}%` }}
                          />
                        </div>
                        <span className="font-medium">{analysis.aiScore}/10</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Sentiment:</span>
                      <div className="flex items-center">
                        {getSentimentIcon(analysis.sentiment)}
                        <span className="ml-2">{analysis.sentiment}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="font-medium">{analysis.confidence}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-2">
            <EnhancedCard className="h-full" hover={true} tilt={true}>
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {analysis?.name || 'Stock Analysis'}
                    </h3>
                    {analysis && (
                      <div className="flex items-center mt-1">
                        <span className="text-2xl font-bold mr-2">PKR {analysis.price.toFixed(2)}</span>
                        <span className={`flex items-center text-sm ${
                          analysis.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {analysis.change >= 0 ? '+' : ''}{analysis.change.toFixed(2)} 
                          ({analysis.change >= 0 ? '+' : ''}{analysis.changePercent}%)
                          {analysis.change >= 0 ? (
                            <TrendingUp className="w-4 h-4 ml-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 ml-1" />
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {analysis && (
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${getRecommendationColor(analysis.recommendation)}`}>
                      {analysis.recommendation}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 mb-4">
                      <Brain className="w-full h-full text-primary animate-pulse" />
                    </div>
                    <p className="text-muted-foreground">Analyzing stock data...</p>
                  </div>
                ) : analysis ? (
                    <div className="space-y-6">
                      <div>
                            <h4 className="font-medium mb-3 flex items-center">
                              <PieChart className="w-5 h-5 mr-2 text-primary" />
                              Key Insights
                            </h4>
                            <ul className="space-y-2">
                              {analysis.reasons.map((reason, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="text-primary mr-2">•</span>
                                  <span className="text-muted-foreground">{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-4 border-t">
                            <h4 className="font-medium mb-3 flex items-center">
                              <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                              Performance Metrics
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground">1M Return</div>
                                <div className="text-lg font-semibold text-green-500">+5.2%</div>
                              </div>
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground">Volatility</div>
                                <div className="text-lg font-semibold">Medium</div>
                              </div>
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground">RSI (14)</div>
                                <div className="text-lg font-semibold">62.4</div>
                              </div>
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground">Volume</div>
                                <div className="text-lg font-semibold">2.4M</div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium flex items-center">
                                <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                                Price Chart (1M)
                              </h4>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">1D</Button>
                                <Button variant="outline" size="sm">1W</Button>
                                <Button variant="default" size="sm">1M</Button>
                                <Button variant="outline" size="sm">1Y</Button>
                              </div>
                            </div>
                            <div className="h-64 mt-4 bg-muted/30 rounded-lg flex items-center justify-center">
                              <p className="text-muted-foreground">Interactive chart would be displayed here</p>
                            </div>
                          </div>

                          <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">AI Analysis Summary</h4>
                              <Button variant="outline" size="sm" className="flex items-center">
                                <span>View Full Report</span>
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                            <p className="mt-2 text-muted-foreground">
                              Based on our AI analysis, {analysis.name} shows {analysis.sentiment.toLowerCase()} signals with {analysis.confidence}% confidence. 
                              The stock has an AI score of {analysis.aiScore}/10, indicating {analysis.aiScore > 7 ? 'strong' : analysis.aiScore > 5 ? 'moderate' : 'weak'} potential 
                              for {analysis.recommendation === 'BUY' ? 'investment' : analysis.recommendation === 'SELL' ? 'divesting' : 'holding'}.
                            </p>
                          </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground">52-Week High</p>
                                <p className="font-medium">PKR {(analysis.price * 1.15).toFixed(2)}</p>
                              </div>
                              <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground">52-Week Low</p>
                                <p className="font-medium">PKR {(analysis.price * 0.85).toFixed(2)}</p>
                              </div>
                              <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground">Volume (30d avg)</p>
                                <p className="font-medium">
                                  {Math.floor(Math.random() * 1000) + 500}K
                                </p>
                              </div>
                              <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground">Market Cap</p>
                                <p className="font-medium">
                                  PKR {(analysis.price * (Math.random() * 10 + 1) * 1000).toLocaleString()}M
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium flex items-center">
                                <Eye className="w-5 h-5 mr-2 text-primary" />
                                Price Forecast
                              </h4>
                              <span className="text-sm text-muted-foreground">Next 6 months</span>
                            </div>
                            <div className="mt-4 h-32 bg-gradient-to-r from-blue-500/10 to-primary/10 rounded-lg flex items-center justify-center">
                              <div className="relative w-full h-full p-4">
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-muted-foreground/20"></div>
                                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent"></div>
                                
                                {/* Price line */}
                                <motion.div 
                                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                  initial={{ width: '0%' }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 1, ease: 'easeInOut' }}
                                />
                                
                                {/* Forecast points */}
                                {[0, 1, 2, 3, 4, 5].map((i) => {
                                  const isCurrent = i === 0;
                                  const isLast = i === 5;
                                  const isUp = Math.random() > 0.3;
                                  const height = isCurrent 
                                    ? 0 
                                    : (isUp ? (Math.random() * 30 + 10) : -(Math.random() * 20 + 5));
                                  
                                  return (
                                    <div 
                                      key={i}
                                      className="absolute bottom-0"
                                      style={{ 
                                        left: `${i * 20}%`,
                                        transform: 'translateX(-50%)',
                                        zIndex: 1
                                      }}
                                    >
                                      <motion.div
                                        className={`w-3 h-3 rounded-full ${
                                          isCurrent 
                                            ? 'bg-primary' 
                                            : isUp 
                                              ? 'bg-green-500' 
                                              : 'bg-red-500'
                                        }`}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ 
                                          delay: 0.2 + (i * 0.1),
                                          type: 'spring',
                                          stiffness: 500,
                                          damping: 30
                                        }}
                                      />
                                      {!isCurrent && !isLast && (
                                        <motion.div
                                          className="absolute top-1/2 left-1/2 w-16 h-0.5 -translate-y-1/2"
                                          initial={{ width: 0, x: '-50%' }}
                                          animate={{ width: '80px' }}
                                          transition={{ 
                                            delay: 0.2 + (i * 0.1),
                                            duration: 0.3
                                          }}
                                          style={{
                                            backgroundColor: isUp ? '#10B981' : '#EF4444',
                                            transformOrigin: 'left center'
                                          }}
                                        />
                                      )}
                                      
                                      {/* Price label */}
                                      {!isCurrent && (
                                        <motion.div
                                          className={`absolute left-1/2 -translate-x-1/2 text-xs font-medium ${
                                            isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                          }`}
                                          initial={{ y: -20, opacity: 0 }}
                                          animate={{ y: -30, opacity: 1 }}
                                          transition={{ 
                                            delay: 0.2 + (i * 0.1),
                                            duration: 0.3
                                          }}
                                        >
                                          {isUp ? '+' : ''}{Math.abs(height).toFixed(1)}%
                                        </motion.div>
                                      )}
                                      
                                      {/* Month label */}
                                      <div 
                                        className={`absolute left-1/2 -translate-x-1/2 text-xs text-muted-foreground ${
                                          i % 2 === 0 ? 'top-6' : '-bottom-6'
                                        }`}
                                      >
                                        {i === 0 ? 'Now' : `+${i}M`}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground text-right">
                              <span className="inline-flex items-center">
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                                Forecasted Growth
                              </span>
                              <span className="mx-2">•</span>
                              <span className="inline-flex items-center">
                                <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                                Forecasted Decline
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                    <div className="border-t p-4 bg-muted/10">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground flex items-center">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          <span>Updated {new Date().toLocaleTimeString()}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={runAnalysis}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
                        </Button>
                      </div>
                    </div>
                  </EnhancedCard>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      );
    };
    
    export default AIAnalyticsDemo;
