import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Satellite, 
  CreditCard, 
  Briefcase, 
  Lightbulb,
  Truck,
  Leaf,
  Cloud,
  TrendingUp,
  BarChart3,
  Globe,
  Zap,
  Database,
  RefreshCw,
  Target
} from 'lucide-react';

interface AltDataInsight {
  satellite: {
    economicActivity: number;
    retailFootfall: number;
    industrialProduction: number;
    signals: string[];
  };
  creditCard: {
    consumerSpending: number;
    categoryTrends: { [category: string]: number };
    geographicTrends: { [region: string]: number };
    signals: string[];
  };
  jobPostings: {
    hiringTrends: number;
    skillDemand: { [skill: string]: number };
    salaryTrends: number;
    signals: string[];
  };
  patents: {
    innovationIndex: number;
    technologyTrends: { [tech: string]: number };
    competitiveAdvantage: number;
    signals: string[];
  };
  logistics: {
    supplyChainHealth: number;
    shippingVolumes: number;
    disruptions: string[];
    signals: string[];
  };
  esg: {
    environmentalScore: number;
    socialScore: number;
    governanceScore: number;
    sustainabilityTrends: { [metric: string]: number };
    signals: string[];
  };
  weather: {
    commodityImpact: { [commodity: string]: number };
    agriculturalOutlook: number;
    energyDemand: number;
    signals: string[];
  };
}

interface AltDataAnalysis {
  insights: AltDataInsight;
  compositeScore: number;
  tradingSignals: Array<{
    symbol: string;
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    dataSource: string;
    reasoning: string;
  }>;
  dataQuality: { [source: string]: number };
  lastUpdated: string;
}

const AlternativeDataIntelligence: React.FC = () => {
  const [analysis, setAnalysis] = useState<AltDataAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState(['AAPL', 'TSLA', 'AMZN', 'GOOGL']);

  const dataSourceIcons = {
    satellite: Satellite,
    creditCard: CreditCard,
    jobPostings: Briefcase,
    patents: Lightbulb,
    logistics: Truck,
    esg: Leaf,
    weather: Cloud
  };

  const runAltDataAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/v1/ai/alternative-data-intelligence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols: selectedSymbols })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.data);
      }
    } catch (error) {
      console.error('Alternative data analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'bg-green-500';
      case 'SELL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    runAltDataAnalysis();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8 text-cyan-500" />
            Alternative Data Intelligence
          </h1>
          <p className="text-muted-foreground">Advanced insights from satellite, credit card, and unconventional data sources</p>
        </div>
        <Button 
          onClick={runAltDataAnalysis} 
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Refresh Analysis
            </>
          )}
        </Button>
      </div>

      {analysis && (
        <>
          {/* Composite Score */}
          <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Alternative Data Composite Score</h3>
                  <p className="text-muted-foreground">Aggregated signal from all data sources</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-cyan-600">
                    {(analysis.compositeScore * 100).toFixed(0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Market Strength</p>
                </div>
              </div>
              <div className="mt-4">
                <Progress value={analysis.compositeScore * 100} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Data Source Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(dataSourceIcons).map(([source, Icon]) => (
              <Card key={source} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-6 h-6 text-cyan-500" />
                      <span className="font-medium capitalize">{source.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getScoreColor(analysis.dataQuality[source] || 0.8)}
                    >
                      {((analysis.dataQuality[source] || 0.8) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="insights" className="space-y-4">
            <TabsList>
              <TabsTrigger value="insights">Data Insights</TabsTrigger>
              <TabsTrigger value="signals">Trading Signals</TabsTrigger>
              <TabsTrigger value="satellite">Satellite Data</TabsTrigger>
              <TabsTrigger value="alternative">Alternative Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Economic Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Satellite className="w-5 h-5 mr-2 text-blue-500" />
                      Economic Activity (Satellite)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Economic Activity</span>
                        <span className="font-semibold text-blue-600">
                          {(analysis.insights.satellite.economicActivity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={analysis.insights.satellite.economicActivity * 100} />
                      
                      <div className="flex justify-between items-center">
                        <span>Retail Footfall</span>
                        <span className="font-semibold text-green-600">
                          {(analysis.insights.satellite.retailFootfall * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={analysis.insights.satellite.retailFootfall * 100} />
                      
                      <div className="flex justify-between items-center">
                        <span>Industrial Production</span>
                        <span className="font-semibold text-purple-600">
                          {(analysis.insights.satellite.industrialProduction * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={analysis.insights.satellite.industrialProduction * 100} />
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="font-semibold">Key Signals:</h5>
                      {analysis.insights.satellite.signals.map((signal, index) => (
                        <div key={index} className="text-sm p-2 bg-blue-50 rounded">
                          {signal}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Consumer Spending */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-green-500" />
                      Consumer Spending
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Overall Spending</span>
                        <span className="font-semibold text-green-600">
                          +{(analysis.insights.creditCard.consumerSpending * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.abs(analysis.insights.creditCard.consumerSpending) * 100} />
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2">Category Trends:</h5>
                      <div className="space-y-2">
                        {Object.entries(analysis.insights.creditCard.categoryTrends).map(([category, trend]) => (
                          <div key={category} className="flex justify-between text-sm">
                            <span className="capitalize">{category}</span>
                            <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
                              {trend > 0 ? '+' : ''}{(trend * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="font-semibold">Key Signals:</h5>
                      {analysis.insights.creditCard.signals.map((signal, index) => (
                        <div key={index} className="text-sm p-2 bg-green-50 rounded">
                          {signal}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Labor Market */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Briefcase className="w-5 h-5 mr-2 text-orange-500" />
                      Labor Market Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Hiring Trends</span>
                        <span className="font-semibold text-orange-600">
                          +{(analysis.insights.jobPostings.hiringTrends * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.abs(analysis.insights.jobPostings.hiringTrends) * 100} />
                      
                      <div className="flex justify-between items-center">
                        <span>Salary Trends</span>
                        <span className="font-semibold text-blue-600">
                          +{(analysis.insights.jobPostings.salaryTrends * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.abs(analysis.insights.jobPostings.salaryTrends) * 100} />
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2">In-Demand Skills:</h5>
                      <div className="space-y-2">
                        {Object.entries(analysis.insights.jobPostings.skillDemand).slice(0, 5).map(([skill, demand]) => (
                          <div key={skill} className="flex justify-between text-sm">
                            <span>{skill}</span>
                            <span className="text-orange-600">+{(demand * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ESG Intelligence */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Leaf className="w-5 h-5 mr-2 text-green-600" />
                      ESG Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Environmental</p>
                        <p className="text-lg font-bold text-green-600">
                          {(analysis.insights.esg.environmentalScore * 100).toFixed(0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Social</p>
                        <p className="text-lg font-bold text-blue-600">
                          {(analysis.insights.esg.socialScore * 100).toFixed(0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Governance</p>
                        <p className="text-lg font-bold text-purple-600">
                          {(analysis.insights.esg.governanceScore * 100).toFixed(0)}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2">Sustainability Trends:</h5>
                      <div className="space-y-2">
                        {Object.entries(analysis.insights.esg.sustainabilityTrends).map(([metric, trend]) => (
                          <div key={metric} className="flex justify-between text-sm">
                            <span className="capitalize">{metric.replace('_', ' ')}</span>
                            <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
                              {trend > 0 ? '+' : ''}{(trend * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="signals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Alternative Data Trading Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.tradingSignals.map((signal, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Badge 
                            className={`${getSignalColor(signal.signal)} text-white min-w-[60px] justify-center`}
                          >
                            {signal.signal}
                          </Badge>
                          <div>
                            <p className="font-semibold text-lg">{signal.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              Source: {signal.dataSource.charAt(0).toUpperCase() + signal.dataSource.slice(1)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Confidence:</span>
                            <Badge variant="outline">
                              {(signal.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            {signal.reasoning}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="satellite" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Satellite Imagery Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                      <h4 className="font-semibold mb-2">Economic Activity Heatmap</h4>
                      <p className="text-sm text-muted-foreground">
                        Real-time economic activity detected from satellite imagery showing increased industrial activity in key regions.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Manufacturing Zones</span>
                        <span className="text-green-600 font-semibold">+15% Activity</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping Ports</span>
                        <span className="text-blue-600 font-semibold">+8% Volume</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retail Centers</span>
                        <span className="text-purple-600 font-semibold">+12% Footfall</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Weather Impact Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h5 className="font-semibold mb-2">Commodity Impact:</h5>
                      <div className="space-y-2">
                        {Object.entries(analysis.insights.weather.commodityImpact).map(([commodity, impact]) => (
                          <div key={commodity} className="flex justify-between text-sm">
                            <span className="capitalize">{commodity}</span>
                            <span className={impact > 0 ? 'text-green-600' : 'text-red-600'}>
                              {impact > 0 ? '+' : ''}{(impact * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-sm text-muted-foreground">Agricultural Outlook</p>
                        <p className="text-lg font-bold text-green-600">
                          {(analysis.insights.weather.agriculturalOutlook * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded">
                        <p className="text-sm text-muted-foreground">Energy Demand</p>
                        <p className="text-lg font-bold text-orange-600">
                          +{(analysis.insights.weather.energyDemand * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="alternative" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                      Patent & Innovation Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Innovation Index</span>
                        <span className="font-semibold text-yellow-600">
                          {(analysis.insights.patents.innovationIndex * 100).toFixed(0)}
                        </span>
                      </div>
                      <Progress value={analysis.insights.patents.innovationIndex * 100} />
                      
                      <div className="flex justify-between items-center">
                        <span>Competitive Advantage</span>
                        <span className="font-semibold text-purple-600">
                          {(analysis.insights.patents.competitiveAdvantage * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={analysis.insights.patents.competitiveAdvantage * 100} />
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2">Technology Trends:</h5>
                      <div className="space-y-2">
                        {Object.entries(analysis.insights.patents.technologyTrends).map(([tech, trend]) => (
                          <div key={tech} className="flex justify-between text-sm">
                            <span>{tech}</span>
                            <span className="text-yellow-600">+{(trend * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Truck className="w-5 h-5 mr-2 text-indigo-500" />
                      Supply Chain Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Supply Chain Health</span>
                        <span className="font-semibold text-indigo-600">
                          {(analysis.insights.logistics.supplyChainHealth * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={analysis.insights.logistics.supplyChainHealth * 100} />
                      
                      <div className="flex justify-between items-center">
                        <span>Shipping Volumes</span>
                        <span className="font-semibold text-blue-600">
                          +{(analysis.insights.logistics.shippingVolumes * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.abs(analysis.insights.logistics.shippingVolumes) * 100} />
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-2">Current Disruptions:</h5>
                      <div className="space-y-2">
                        {analysis.insights.logistics.disruptions.map((disruption, index) => (
                          <div key={index} className="text-sm p-2 bg-red-50 border-l-2 border-red-200 rounded">
                            {disruption}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!analysis && !isAnalyzing && (
        <Card className="border-dashed border-2 border-cyan-200">
          <CardContent className="text-center py-12">
            <Database className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Alternative Data Analysis Ready</h3>
            <p className="text-muted-foreground mb-4">
              Harness satellite imagery, credit card data, and unconventional sources for trading insights
            </p>
            <Button 
              onClick={runAltDataAnalysis}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              <Database className="w-4 h-4 mr-2" />
              Start Alternative Data Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlternativeDataIntelligence;
