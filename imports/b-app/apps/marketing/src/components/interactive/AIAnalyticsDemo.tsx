import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { MotionWrapper } from '../animations/MotionWrapper';
import { EnhancedCard } from '../ui/EnhancedCard';
import { BrandedLoader } from '../ui/LoadingSpinner';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Target,
  Zap,
  Eye,
  RefreshCw
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
      case 'BUY': return 'text-green-600 bg-green-100';
      case 'SELL': return 'text-red-600 bg-red-100';
      case 'HOLD': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'Bearish': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <BarChart3 className="w-4 h-4 text-yellow-600" />;
    }
  };

  return (
    <section className="py-20 bg-background-alt">
      <div className="container mx-auto px-4">
        <MotionWrapper>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              AI Analytics in Action
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Experience how our artificial intelligence analyzes Pakistani stocks and provides actionable investment insights.
            </p>
          </div>
        </MotionWrapper>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Stock Selection */}
          <div className="lg:col-span-1">
            <MotionWrapper>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-secondary" />
                    Select Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stocks.map((stock) => (
                      <motion.div
                        key={stock.symbol}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                          selectedStock === stock.symbol 
                            ? 'bg-secondary text-white' 
                            : 'hover:bg-background-alt border border-border'
                        }`}
                        onClick={() => setSelectedStock(stock.symbol)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="font-semibold">{stock.symbol}</div>
                        <div className={`text-sm ${
                          selectedStock === stock.symbol ? 'text-white/80' : 'text-muted'
                        }`}>
                          {stock.name}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full mt-6" 
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <BrandedLoader />
                        <span className="ml-2">Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Run AI Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </MotionWrapper>
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-2">
            {isAnalyzing ? (
              <MotionWrapper>
                <EnhancedCard className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4"
                      animate={{
                        scale: [1, 1.1, 1],
                        rotateY: [0, 180, 360]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Brain className="w-8 h-8 text-secondary" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      AI is analyzing {selectedStock}...
                    </h3>
                    <p className="text-muted">
                      Processing market data, financial metrics, and sentiment analysis
                    </p>
                    <BrandedLoader />
                  </div>
                </EnhancedCard>
              </MotionWrapper>
            ) : analysis ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {/* Main Analysis Card */}
                <EnhancedCard hover glow>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-primary">{analysis.symbol}</h3>
                      <p className="text-muted">{analysis.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        PKR {analysis.price.toFixed(2)}
                      </div>
                      <div className={`text-sm font-medium ${
                        analysis.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analysis.change >= 0 ? '+' : ''}{analysis.change.toFixed(2)} 
                        ({analysis.changePercent >= 0 ? '+' : ''}{analysis.changePercent.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-secondary mb-2">
                        {analysis.aiScore}/10
                      </div>
                      <div className="text-sm text-muted">AI Score</div>
                    </div>
                    <div className="text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${
                        getRecommendationColor(analysis.recommendation)
                      }`}>
                        {analysis.recommendation}
                      </div>
                      <div className="text-sm text-muted mt-2">Recommendation</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        {getSentimentIcon(analysis.sentiment)}
                        <span className="ml-2 font-medium">{analysis.sentiment}</span>
                      </div>
                      <div className="text-sm text-muted">Market Sentiment</div>
                    </div>
                  </div>
                  
                  <div className="bg-background-alt rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Brain className="w-4 h-4 mr-2 text-secondary" />
                      AI Analysis Insights
                    </h4>
                    <div className="space-y-2">
                      {analysis.reasons.map((reason, index) => (
                        <motion.div
                          key={index}
                          className="flex items-start"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-sm text-foreground">{reason}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center text-sm text-muted">
                      <Eye className="w-4 h-4 mr-1" />
                      Confidence: {analysis.confidence}%
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <Zap className="w-4 h-4 mr-1" />
                      Analysis updated real-time
                    </div>
                  </div>
                </EnhancedCard>
                
                {/* Additional Metrics */}
                <div className="grid md:grid-cols-2 gap-6">
                  <EnhancedCard hover>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <PieChart className="w-5 h-5 mr-2 text-secondary" />
                        Risk Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Volatility Risk</span>
                          <span className="text-sm font-medium">Medium</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Liquidity Risk</span>
                          <span className="text-sm font-medium">Low</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Credit Risk</span>
                          <span className="text-sm font-medium">Low</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Market Risk</span>
                          <span className="text-sm font-medium">Medium</span>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                  
                  <EnhancedCard hover>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <BarChart3 className="w-5 h-5 mr-2 text-secondary" />
                        Key Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">P/E Ratio</span>
                          <span className="text-sm font-medium">12.5</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Market Cap</span>
                          <span className="text-sm font-medium">PKR 45.2B</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Dividend Yield</span>
                          <span className="text-sm font-medium">6.2%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">52W High/Low</span>
                          <span className="text-sm font-medium">156/89</span>
                        </div>
                      </div>
                    </CardContent>
                  </EnhancedCard>
                </div>
              </motion.div>
            ) : (
              <MotionWrapper>
                <EnhancedCard className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="w-16 h-16 text-secondary/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-muted mb-2">
                      Select a stock to see AI analysis
                    </h3>
                  </div>
                </EnhancedCard>
              </MotionWrapper>
            )}
          </div>
        </div>
        
        <MotionWrapper className="mt-16">
          <div className="text-center">
            <p className="text-muted mb-6">
              This is a demonstration of InvestPro's AI analytics capabilities. 
              Real-time analysis includes 50+ data points and machine learning models.
            </p>
            <Button size="lg">
              Experience Full AI Analytics
              <Brain className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </MotionWrapper>
      </div>
    </section>
  );
};