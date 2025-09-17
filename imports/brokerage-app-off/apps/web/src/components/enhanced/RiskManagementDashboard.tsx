"use client"

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
  Activity, 
  BarChart3,
  PieChart,
  Target,
  Zap,
  Eye,
  Settings,
  RefreshCw,
  DollarSign,
  Info,
  ChevronRight
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
  concentration: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  var95: number;
  beta: number;
  correlation: number;
}

interface StressTest {
  scenario: string;
  impact: number;
  probability: number;
  description: string;
}

const RiskManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    portfolioValue: 1250000,
    totalRisk: 15.2,
    riskLevel: 'MEDIUM',
    var95: 18750,
    var99: 31250,
    sharpeRatio: 1.45,
    beta: 1.12,
    maxDrawdown: 8.5,
    volatility: 12.3
  });

  const [positionRisks] = useState<PositionRisk[]>([
    { symbol: 'AAPL', value: 250000, concentration: 20, riskLevel: 'MEDIUM', var95: 3750, beta: 1.2, correlation: 0.85 },
    { symbol: 'GOOGL', value: 200000, concentration: 16, riskLevel: 'HIGH', var95: 4200, beta: 1.35, correlation: 0.78 },
    { symbol: 'MSFT', value: 180000, concentration: 14.4, riskLevel: 'LOW', var95: 2700, beta: 0.95, correlation: 0.82 },
    { symbol: 'TSLA', value: 150000, concentration: 12, riskLevel: 'CRITICAL', var95: 7500, beta: 2.1, correlation: 0.45 },
    { symbol: 'NVDA', value: 120000, concentration: 9.6, riskLevel: 'HIGH', var95: 4800, beta: 1.8, correlation: 0.65 }
  ]);

  const [stressTests] = useState<StressTest[]>([
    { scenario: 'Market Crash (-20%)', impact: -250000, probability: 5, description: 'Broad market decline scenario' },
    { scenario: 'Interest Rate Spike (+2%)', impact: -87500, probability: 15, description: 'Federal Reserve aggressive tightening' },
    { scenario: 'Sector Rotation', impact: -125000, probability: 25, description: 'Technology sector underperformance' },
    { scenario: 'Geopolitical Crisis', impact: -175000, probability: 10, description: 'Global uncertainty and volatility spike' }
  ]);

  const refreshData = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const getRiskLevelColor = (level: string) => {
    const colors = {
      LOW: 'bg-green-50 text-green-700 border-green-200',
      MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-200', 
      HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
      CRITICAL: 'bg-red-50 text-red-700 border-red-200'
    };
    return colors[level as keyof typeof colors] || colors.MEDIUM;
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW': return <Shield className="w-4 h-4" />;
      case 'MEDIUM': return <Eye className="w-4 h-4" />;
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />;
      case 'CRITICAL': return <Zap className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  if (refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-primary-50)'}}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="body-base">Updating risk metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-primary-50)'}}>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="enhanced-card">
          <div className="enhanced-card-content">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="heading-1 mb-2">Risk Management Dashboard</h1>
                <p className="body-large" style={{color: 'var(--color-primary-600)'}}>Monitor and manage portfolio risk in real-time</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={refreshData}
                  disabled={refreshing}
                  variant="outline" 
                  className="btn-secondary"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" className="btn-secondary">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="enhanced-card hover:shadow-lg transition-all duration-300">
                <div className="enhanced-card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="body-small" style={{color: 'var(--color-primary-500)'}}>Portfolio Value</p>
                      <p className="text-2xl font-bold" style={{color: 'var(--color-primary-900)'}}>
                        ${riskMetrics.portfolioValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--color-secondary-100)'}}>
                      <DollarSign className="w-6 h-6" style={{color: 'var(--color-secondary-600)'}} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Badge className={getRiskLevelColor(riskMetrics.riskLevel)} variant="outline">
                      {getRiskIcon(riskMetrics.riskLevel)}
                      <span className="ml-1">{riskMetrics.riskLevel}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="enhanced-card hover:shadow-lg transition-all duration-300">
                <div className="enhanced-card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="body-small" style={{color: 'var(--color-primary-500)'}}>Value at Risk (95%)</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${riskMetrics.var95.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={(riskMetrics.var95 / riskMetrics.portfolioValue) * 100} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="enhanced-card hover:shadow-lg transition-all duration-300">
                <div className="enhanced-card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="body-small" style={{color: 'var(--color-primary-500)'}}>Sharpe Ratio</p>
                      <p className="text-2xl font-bold" style={{color: 'var(--color-primary-900)'}}>
                        {riskMetrics.sharpeRatio}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={riskMetrics.sharpeRatio * 20} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="enhanced-card hover:shadow-lg transition-all duration-300">
                <div className="enhanced-card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="body-small" style={{color: 'var(--color-primary-500)'}}>Portfolio Beta</p>
                      <p className="text-2xl font-bold" style={{color: 'var(--color-primary-900)'}}>
                        {riskMetrics.beta}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={Math.min(riskMetrics.beta * 50, 100)} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Tabs */}
        <div className="enhanced-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="enhanced-card-header">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  Risk Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="stress" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Stress Testing
                </TabsTrigger>
                <TabsTrigger 
                  value="metrics" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Advanced Metrics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <div className="enhanced-card-content">
                <div className="space-y-6">
                  <div>
                    <h3 className="heading-3 mb-4">Position Risk Analysis</h3>
                    <div className="space-y-4">
                      {positionRisks.map((position, index) => (
                        <div 
                          key={index} 
                          className="group p-4 border rounded-xl hover:shadow-md transition-all duration-200 bg-white"
                          style={{borderColor: 'var(--color-primary-200)'}}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold"
                                   style={{backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)'}}>
                                {position.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <h4 className="font-semibold" style={{color: 'var(--color-primary-900)'}}>{position.symbol}</h4>
                                <p className="body-small">
                                  ${position.value.toLocaleString()} • {position.concentration.toFixed(1)}% of portfolio
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Badge className={getRiskLevelColor(position.riskLevel)} variant="outline">
                                {position.riskLevel}
                              </Badge>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stress" className="space-y-6">
              <div className="enhanced-card-content">
                <div className="space-y-6">
                  <div>
                    <h3 className="heading-3 mb-4">Stress Test Scenarios</h3>
                    <div className="space-y-4">
                      {stressTests.map((test, index) => (
                        <div 
                          key={index}
                          className="p-4 border rounded-xl bg-white"
                          style={{borderColor: 'var(--color-primary-200)'}}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold" style={{color: 'var(--color-primary-900)'}}>{test.scenario}</h4>
                            <Badge variant="outline" style={{color: 'var(--color-primary-600)'}}>
                              {test.probability}% probability
                            </Badge>
                          </div>
                          <p className="body-small mb-3">{test.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="body-base">Estimated Impact:</span>
                            <span className={`text-lg font-semibold ${test.impact < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {test.impact < 0 ? '-' : '+'}${Math.abs(test.impact).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-6">
              <div className="enhanced-card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="heading-3">Risk Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--color-primary-50)'}}>
                        <span className="body-base">Value at Risk (99%)</span>
                        <span className="font-semibold text-red-600">${riskMetrics.var99.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--color-primary-50)'}}>
                        <span className="body-base">Maximum Drawdown</span>
                        <span className="font-semibold text-orange-600">{riskMetrics.maxDrawdown}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--color-primary-50)'}}>
                        <span className="body-base">Volatility (Annualized)</span>
                        <span className="font-semibold" style={{color: 'var(--color-primary-700)'}}>{riskMetrics.volatility}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="heading-3">Portfolio Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--color-primary-50)'}}>
                        <span className="body-base">Sharpe Ratio</span>
                        <span className="font-semibold text-green-600">{riskMetrics.sharpeRatio}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--color-primary-50)'}}>
                        <span className="body-base">Beta</span>
                        <span className="font-semibold" style={{color: 'var(--color-primary-700)'}}>{riskMetrics.beta}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--color-primary-50)'}}>
                        <span className="body-base">Total Risk Score</span>
                        <Badge className={getRiskLevelColor(riskMetrics.riskLevel)} variant="outline">
                          {getRiskIcon(riskMetrics.riskLevel)}
                          <span className="ml-1">{riskMetrics.riskLevel}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RiskManagementDashboard;
