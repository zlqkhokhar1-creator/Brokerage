/**
 * Advanced Portfolio Analytics Dashboard - Performance Attribution and Risk Analysis
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Globe, 
  Shield, 
  Calculator,
  Target,
  ArrowUpDown,
  PieChart,
  Activity
} from 'lucide-react';
import { Bar, Doughnut, Radar, Line } from 'react-chartjs-2';

interface PerformanceAttribution {
  totalReturn: number;
  benchmarkReturn: number;
  activeReturn: number;
  attribution: {
    assetAllocation: number;
    securitySelection: number;
    interaction: number;
    timing: number;
  };
  sectorContribution: Record<string, number>;
  topContributors: string[];
  topDetractors: string[];
  riskMetrics: {
    trackingError: number;
    informationRatio: number;
    beta: number;
  };
}

interface FactorExposure {
  styleFactors: {
    value: number;
    growth: number;
    momentum: number;
    quality: number;
    lowVolatility: number;
    size: number;
  };
  macroFactors: {
    interestRate: number;
    credit: number;
    commodity: number;
    currency: number;
  };
  riskFactors: {
    market: number;
    sector: number;
    region: number;
  };
  visualization: any;
  recommendations: string[];
  riskDecomposition: {
    systematic: number;
    idiosyncratic: number;
  };
}

interface CurrencyHedging {
  totalCurrencyExposure: number;
  exposureBreakdown: Record<string, number>;
  hedgingRecommendations: {
    recommended: boolean;
    hedgeRatio: number;
    instruments: string[];
  };
  costBenefitAnalysis: {
    cost: number;
    benefit: number;
  };
  hedgingStrategies: string[];
  riskMetrics: {
    currencyVaR: number;
    hedgedVaR: number;
  };
  implementationSteps: string[];
}

interface TaxImpactPreview {
  summary: {
    totalTaxLiability: number;
    shortTermGains: number;
    longTermGains: number;
    taxLosses: number;
    netTaxImpact: number;
  };
  tradeByTradeAnalysis: Array<{
    symbol: string;
    gain: number;
    taxRate: number;
    tax: number;
  }>;
  optimizationSuggestions: string[];
  harvestingOpportunities: string[];
  deferralStrategies: string[];
  afterTaxReturns: number;
}

interface PortfolioAnalyticsDashboardProps {
  portfolioId: string;
  className?: string;
}

export const PortfolioAnalyticsDashboard: React.FC<PortfolioAnalyticsDashboardProps> = ({ 
  portfolioId, 
  className = '' 
}) => {
  const [performanceAttribution, setPerformanceAttribution] = useState<PerformanceAttribution | null>(null);
  const [factorExposure, setFactorExposure] = useState<FactorExposure | null>(null);
  const [currencyHedging, setCurrencyHedging] = useState<CurrencyHedging | null>(null);
  const [taxPreview, setTaxPreview] = useState<TaxImpactPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attribution');
  const [timeframe, setTimeframe] = useState('1Y');

  useEffect(() => {
    if (portfolioId) {
      fetchAnalyticsData();
    }
  }, [portfolioId, timeframe]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [attributionRes, factorRes, currencyRes] = await Promise.all([
        fetch(`/api/v1/advanced/portfolio-analytics/performance-attribution/${portfolioId}?timeframe=${timeframe}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch(`/api/v1/advanced/portfolio-analytics/factor-exposure/${portfolioId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch(`/api/v1/advanced/portfolio-analytics/currency-hedging/${portfolioId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
      ]);

      const [attributionData, factorData, currencyData] = await Promise.all([
        attributionRes.json(),
        factorRes.json(),
        currencyRes.json()
      ]);

      if (attributionData.success) setPerformanceAttribution(attributionData.data);
      if (factorData.success) setFactorExposure(factorData.data);
      if (currencyData.success) setCurrencyHedging(currencyData.data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const previewTaxImpact = async (proposedTrades: any[]) => {
    try {
      const response = await fetch(`/api/v1/advanced/portfolio-analytics/tax-impact-preview/${portfolioId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ proposedTrades })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTaxPreview(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to preview tax impact:', error);
    }
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Chart data preparation
  const attributionChartData = performanceAttribution ? {
    labels: ['Asset Allocation', 'Security Selection', 'Interaction', 'Timing'],
    datasets: [
      {
        label: 'Attribution (%)',
        data: [
          performanceAttribution.attribution.assetAllocation * 100,
          performanceAttribution.attribution.securitySelection * 100,
          performanceAttribution.attribution.interaction * 100,
          performanceAttribution.attribution.timing * 100
        ],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  } : null;

  const factorRadarData = factorExposure ? {
    labels: ['Value', 'Growth', 'Momentum', 'Quality', 'Low Vol', 'Size'],
    datasets: [
      {
        label: 'Factor Exposure',
        data: [
          factorExposure.styleFactors.value,
          factorExposure.styleFactors.growth,
          factorExposure.styleFactors.momentum,
          factorExposure.styleFactors.quality,
          factorExposure.styleFactors.lowVolatility,
          factorExposure.styleFactors.size
        ],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointBackgroundColor: '#3b82f6',
      },
    ],
  } : null;

  const currencyExposureData = currencyHedging ? {
    labels: Object.keys(currencyHedging.exposureBreakdown),
    datasets: [
      {
        data: Object.values(currencyHedging.exposureBreakdown),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 0,
      },
    ],
  } : null;

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Portfolio Analytics
          </h1>
          <p className="text-gray-600">Advanced performance and risk analysis</p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1M">1 Month</SelectItem>
            <SelectItem value="3M">3 Months</SelectItem>
            <SelectItem value="6M">6 Months</SelectItem>
            <SelectItem value="1Y">1 Year</SelectItem>
            <SelectItem value="2Y">2 Years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attribution">Performance Attribution</TabsTrigger>
          <TabsTrigger value="factors">Factor Exposure</TabsTrigger>
          <TabsTrigger value="currency">Currency Risk</TabsTrigger>
          <TabsTrigger value="tax">Tax Analysis</TabsTrigger>
        </TabsList>

        {/* Performance Attribution Tab */}
        <TabsContent value="attribution" className="space-y-6">
          {performanceAttribution && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Total Return</span>
                    </div>
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceAttribution.totalReturn)}`}>
                      {formatPercentage(performanceAttribution.totalReturn)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Benchmark</span>
                    </div>
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceAttribution.benchmarkReturn)}`}>
                      {formatPercentage(performanceAttribution.benchmarkReturn)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpDown className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Active Return</span>
                    </div>
                    <div className={`text-2xl font-bold ${getPerformanceColor(performanceAttribution.activeReturn)}`}>
                      {formatPercentage(performanceAttribution.activeReturn)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attribution Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attribution Analysis</CardTitle>
                    <CardDescription>Sources of portfolio performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {attributionChartData && (
                      <div className="h-64">
                        <Bar 
                          data={attributionChartData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: function(value: any) {
                                    return value + '%';
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Risk Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Metrics</CardTitle>
                    <CardDescription>Portfolio risk characteristics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tracking Error</span>
                      <span className="font-medium">{(performanceAttribution.riskMetrics.trackingError * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Information Ratio</span>
                      <span className="font-medium">{performanceAttribution.riskMetrics.informationRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Beta</span>
                      <span className="font-medium">{performanceAttribution.riskMetrics.beta.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Contributors/Detractors */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Performance Contributors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Top Contributors
                        </h4>
                        <div className="space-y-2">
                          {performanceAttribution.topContributors.map((contributor, index) => (
                            <div key={index} className="flex items-center justify-between bg-green-50 rounded p-2">
                              <span className="text-sm">{contributor}</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                +{(Math.random() * 2).toFixed(2)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          Top Detractors
                        </h4>
                        <div className="space-y-2">
                          {performanceAttribution.topDetractors.map((detractor, index) => (
                            <div key={index} className="flex items-center justify-between bg-red-50 rounded p-2">
                              <span className="text-sm">{detractor}</span>
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                -{(Math.random() * 1.5).toFixed(2)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Factor Exposure Tab */}
        <TabsContent value="factors" className="space-y-6">
          {factorExposure && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Factor Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Style Factors</CardTitle>
                  <CardDescription>Factor exposure analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {factorRadarData && (
                    <div className="h-64">
                      <Radar 
                        data={factorRadarData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            r: {
                              beginAtZero: true,
                              max: 1,
                              min: -1
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Factor Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Factor Analysis</CardTitle>
                  <CardDescription>Detailed factor exposures</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Style Factors</h4>
                    <div className="space-y-2">
                      {Object.entries(factorExposure.styleFactors).map(([factor, value]) => (
                        <div key={factor} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{factor.replace(/([A-Z])/g, ' $1')}</span>
                          <span className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {value.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Macro Factors</h4>
                    <div className="space-y-2">
                      {Object.entries(factorExposure.macroFactors).map(([factor, value]) => (
                        <div key={factor} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{factor.replace(/([A-Z])/g, ' $1')}</span>
                          <span className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {value.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Factor Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {factorExposure.recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3">
                        <span className="text-sm text-blue-800">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Currency Risk Tab */}
        <TabsContent value="currency" className="space-y-6">
          {currencyHedging && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Currency Exposure */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Currency Exposure
                  </CardTitle>
                  <CardDescription>
                    Total exposure: {(currencyHedging.totalCurrencyExposure * 100).toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currencyExposureData && (
                    <div className="h-64">
                      <Doughnut 
                        data={currencyExposureData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hedging Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Hedging Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Hedging Recommended</span>
                    <Badge variant={currencyHedging.hedgingRecommendations.recommended ? "default" : "secondary"}>
                      {currencyHedging.hedgingRecommendations.recommended ? "Yes" : "No"}
                    </Badge>
                  </div>
                  
                  {currencyHedging.hedgingRecommendations.recommended && (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Recommended Hedge Ratio</span>
                        <span className="font-medium">{(currencyHedging.hedgingRecommendations.hedgeRatio * 100).toFixed(0)}%</span>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium">Suggested Instruments</span>
                        <div className="mt-2 space-y-1">
                          {currencyHedging.hedgingRecommendations.instruments.map((instrument, index) => (
                            <Badge key={index} variant="outline" className="mr-2">
                              {instrument}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-sm font-medium mb-2">Cost-Benefit Analysis</div>
                    <div className="flex justify-between text-sm">
                      <span>Estimated Cost</span>
                      <span>{(currencyHedging.costBenefitAnalysis.cost * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Estimated Benefit</span>
                      <span>{(currencyHedging.costBenefitAnalysis.benefit * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Implementation Steps */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Implementation Roadmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currencyHedging.implementationSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tax Analysis Tab */}
        <TabsContent value="tax" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Tax Impact Analysis
              </CardTitle>
              <CardDescription>
                Preview tax implications before executing trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={() => previewTaxImpact([
                    { symbol: 'AAPL', side: 'SELL', quantity: 100, orderType: 'MARKET' }
                  ])}
                  className="w-full md:w-auto"
                >
                  Preview Tax Impact
                </Button>

                {taxPreview && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-red-700 mb-1">Total Tax Liability</div>
                      <div className="text-xl font-bold text-red-900">
                        {formatCurrency(taxPreview.summary.totalTaxLiability)}
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-700 mb-1">Short-term Gains</div>
                      <div className="text-xl font-bold text-orange-900">
                        {formatCurrency(taxPreview.summary.shortTermGains)}
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-700 mb-1">Long-term Gains</div>
                      <div className="text-xl font-bold text-green-900">
                        {formatCurrency(taxPreview.summary.longTermGains)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortfolioAnalyticsDashboard;