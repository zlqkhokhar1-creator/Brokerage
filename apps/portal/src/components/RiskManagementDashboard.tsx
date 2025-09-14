"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  BarChart3, 
  PieChart, 
  Activity,
  Target,
  Zap,
  RefreshCw
} from 'lucide-react';

interface RiskMetrics {
  portfolioValue: number;
  totalRisk: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  var95: number;
  var99: number;
  sharpeRatio: number;
  beta: number;
  maxDrawdown: number;
  volatility: number;
}

interface PositionRisk {
  symbol: string;
  value: number;
  riskContribution: number;
  var95: number;
  beta: number;
  concentration: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface StressTestScenario {
  name: string;
  description: string;
  marketShock: number;
  sectorShock: number;
  portfolioImpact: number;
  worstCaseValue: number;
}

const RiskManagementDashboard: React.FC = () => {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [positionRisks, setPositionRisks] = useState<PositionRisk[]>([]);
  const [stressTests, setStressTests] = useState<StressTestScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      
      // Fetch portfolio risk metrics
      const riskResponse = await fetch('/api/v1/risk/portfolio', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const riskData = await riskResponse.json();
      
      if (riskData.success) {
        setRiskMetrics(riskData.data);
      }

      // Fetch position risks
      const positionsResponse = await fetch('/api/v1/portfolio/positions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const positionsData = await positionsResponse.json();
      
      if (positionsData.success) {
        // Calculate risk for each position
        const risks = await Promise.all(
          positionsData.data.map(async (position: any) => {
            const riskResponse = await fetch(`/api/v1/risk/position/${position.id}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const riskData = await riskResponse.json();
            return riskData.success ? riskData.data : null;
          })
        );
        setPositionRisks(risks.filter(Boolean));
      }

    } catch (error) {
      console.error('Error fetching risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runStressTest = async () => {
    try {
      setRefreshing(true);
      
      const scenarios = [
        { name: 'Market Crash', marketShock: -0.20, sectorShock: -0.15 },
        { name: 'Interest Rate Spike', marketShock: -0.10, sectorShock: -0.25 },
        { name: 'Sector Rotation', marketShock: -0.05, sectorShock: -0.30 },
        { name: 'Black Swan Event', marketShock: -0.35, sectorShock: -0.40 }
      ];

      const response = await fetch('/api/v1/risk/stress-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ scenarios })
      });

      const data = await response.json();
      if (data.success) {
        setStressTests(data.data);
      }
    } catch (error) {
      console.error('Error running stress test:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW': return <Shield className="w-4 h-4" />;
      case 'MEDIUM': return <Activity className="w-4 h-4" />;
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />;
      case 'CRITICAL': return <Zap className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading risk analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risk Management</h1>
          <p className="text-muted-foreground">Monitor and manage your portfolio risk exposure</p>
        </div>
        <Button onClick={fetchRiskData} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Risk Overview Cards */}
      {riskMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio Value</p>
                  <p className="text-2xl font-bold">${riskMetrics.portfolioValue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <Badge className={getRiskColor(riskMetrics.riskLevel)}>
                    {getRiskIcon(riskMetrics.riskLevel)}
                    <span className="ml-1">{riskMetrics.riskLevel}</span>
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">VaR (95%)</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${Math.abs(riskMetrics.var95).toLocaleString()}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-2xl font-bold">{riskMetrics.sharpeRatio.toFixed(2)}</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Position Risk</TabsTrigger>
          <TabsTrigger value="stress-test">Stress Testing</TabsTrigger>
          <TabsTrigger value="metrics">Advanced Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {riskMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Market Risk</span>
                        <span>{(riskMetrics.beta * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={riskMetrics.beta * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Volatility</span>
                        <span>{(riskMetrics.volatility * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={riskMetrics.volatility * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Max Drawdown</span>
                        <span>{(Math.abs(riskMetrics.maxDrawdown) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.abs(riskMetrics.maxDrawdown) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {riskMetrics.riskLevel === 'HIGH' || riskMetrics.riskLevel === 'CRITICAL' ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Portfolio risk level is {riskMetrics.riskLevel.toLowerCase()}. Consider rebalancing.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  
                  {riskMetrics.var95 > riskMetrics.portfolioValue * 0.1 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Value at Risk exceeds 10% of portfolio value.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  
                  {Math.abs(riskMetrics.maxDrawdown) > 0.15 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Maximum drawdown is high. Review position sizing.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Position Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {positionRisks.map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-semibold">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          ${position.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Risk Contribution</p>
                        <p className="font-semibold">{(position.riskContribution * 100).toFixed(1)}%</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Beta</p>
                        <p className="font-semibold">{position.beta.toFixed(2)}</p>
                      </div>
                      
                      <Badge className={getRiskColor(position.riskLevel)}>
                        {position.riskLevel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Stress Testing
                <Button onClick={runStressTest} disabled={refreshing} className="flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Run Tests
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stressTests.map((test, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{test.name}</h4>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Portfolio Impact</p>
                        <p className={`font-bold ${test.portfolioImpact < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(test.portfolioImpact * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Market Shock: </span>
                        <span className="font-semibold">{(test.marketShock * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Worst Case Value: </span>
                        <span className="font-semibold">${test.worstCaseValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {riskMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-lg font-semibold">{riskMetrics.sharpeRatio.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Beta</p>
                      <p className="text-lg font-semibold">{riskMetrics.beta.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Volatility</p>
                      <p className="text-lg font-semibold">{(riskMetrics.volatility * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-lg font-semibold">{(Math.abs(riskMetrics.maxDrawdown) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Value at Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">VaR 95%</p>
                      <p className="text-lg font-semibold text-red-600">
                        ${Math.abs(riskMetrics.var95).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">VaR 99%</p>
                      <p className="text-lg font-semibold text-red-600">
                        ${Math.abs(riskMetrics.var99).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>VaR represents the maximum expected loss over a 1-day period at the given confidence level.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskManagementDashboard;
