"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingDown, TrendingUp, Shield, Calculator, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface RiskMetrics {
  portfolioValue: number;
  totalRisk: number;
  varDaily: number;
  var30Day: number;
  sharpeRatio: number;
  beta: number;
  maxDrawdown: number;
  concentrationRisk: number;
}

interface PositionRisk {
  symbol: string;
  value: number;
  allocation: number;
  var: number;
  beta: number;
  riskContribution: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

interface StressTestResult {
  scenario: string;
  portfolioImpact: number;
  impactPercent: number;
  description: string;
}

export default function RiskManagementPage() {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    portfolioValue: 125000,
    totalRisk: 8.5,
    varDaily: -2450,
    var30Day: -15200,
    sharpeRatio: 1.34,
    beta: 1.12,
    maxDrawdown: -12.3,
    concentrationRisk: 23.5
  });

  const [positionRisks, setPositionRisks] = useState<PositionRisk[]>([
    { symbol: 'AAPL', value: 35000, allocation: 28, var: -980, beta: 1.2, riskContribution: 32, riskLevel: 'Medium' },
    { symbol: 'MSFT', value: 28000, allocation: 22.4, var: -720, beta: 0.9, riskContribution: 25, riskLevel: 'Low' },
    { symbol: 'TSLA', value: 15000, allocation: 12, var: -1200, beta: 2.1, riskContribution: 35, riskLevel: 'High' },
    { symbol: 'GOOGL', value: 20000, allocation: 16, var: -600, beta: 1.1, riskContribution: 22, riskLevel: 'Medium' },
    { symbol: 'NVDA', value: 12000, allocation: 9.6, var: -850, beta: 1.8, riskContribution: 28, riskLevel: 'High' },
  ]);

  const [stressTestResults, setStressTestResults] = useState<StressTestResult[]>([]);
  const [isRunningStressTest, setIsRunningStressTest] = useState(false);
  const [positionSizeCalc, setPositionSizeCalc] = useState({
    symbol: '',
    riskTolerance: 2,
    accountEquity: 125000,
    recommendedSize: 0
  });

  const stressScenarios = [
    { name: 'Market Crash -20%', description: 'Broad market decline of 20%' },
    { name: 'Tech Sector -30%', description: 'Technology sector decline of 30%' },
    { name: 'Interest Rate +2%', description: 'Interest rates increase by 2%' },
    { name: 'Volatility Spike', description: 'VIX spikes to 40+' },
    { name: 'Currency Crisis', description: 'USD strengthens 15%' }
  ];

  const riskHistoryData = [
    { date: '2024-01', var: -2100, risk: 7.8 },
    { date: '2024-02', var: -2300, risk: 8.1 },
    { date: '2024-03', var: -1950, risk: 7.2 },
    { date: '2024-04', var: -2450, risk: 8.5 },
    { date: '2024-05', var: -2200, risk: 8.0 },
    { date: '2024-06', var: -2600, risk: 9.1 }
  ];

  const runStressTest = async () => {
    setIsRunningStressTest(true);
    try {
      // Mock stress test results
      const results: StressTestResult[] = [
        { scenario: 'Market Crash -20%', portfolioImpact: -25000, impactPercent: -20, description: 'Broad market decline' },
        { scenario: 'Tech Sector -30%', portfolioImpact: -18900, impactPercent: -15.1, description: 'Technology decline' },
        { scenario: 'Interest Rate +2%', portfolioImpact: -8750, impactPercent: -7, description: 'Rate environment change' },
        { scenario: 'Volatility Spike', portfolioImpact: -15000, impactPercent: -12, description: 'Market volatility increase' },
        { scenario: 'Currency Crisis', portfolioImpact: -6250, impactPercent: -5, description: 'USD strengthening' }
      ];
      setStressTestResults(results);
    } catch (error) {
      console.error('Stress test failed:', error);
    }
    setIsRunningStressTest(false);
  };

  const calculatePositionSize = async () => {
    try {
      const response = await fetch('/api/v1/risk/position-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: positionSizeCalc.symbol,
          riskTolerance: positionSizeCalc.riskTolerance
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPositionSizeCalc(prev => ({ ...prev, recommendedSize: data.data.recommendedShares }));
      }
    } catch (error) {
      // Mock calculation
      const riskAmount = (positionSizeCalc.accountEquity * positionSizeCalc.riskTolerance) / 100;
      const mockPrice = 175; // Mock stock price
      const mockVolatility = 0.25; // 25% annual volatility
      const recommendedSize = Math.floor(riskAmount / (mockPrice * mockVolatility));
      setPositionSizeCalc(prev => ({ ...prev, recommendedSize }));
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-400 bg-green-400/10';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'High': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <AppLayout>
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Risk Management</h1>
          <p className="text-gray-400">Monitor and manage your portfolio risk exposure</p>
        </div>

        {/* Risk Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="elevated-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Portfolio VaR (Daily)</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(riskMetrics.varDaily)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-xs text-gray-500 mt-2">99% confidence, 1-day horizon</p>
            </CardContent>
          </Card>

          <Card className="elevated-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Sharpe Ratio</p>
                  <p className="text-2xl font-bold text-success">{riskMetrics.sharpeRatio}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Risk-adjusted return</p>
            </CardContent>
          </Card>

          <Card className="elevated-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Portfolio Beta</p>
                  <p className="text-2xl font-bold text-accent">{riskMetrics.beta}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-accent" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Market correlation</p>
            </CardContent>
          </Card>

          <Card className="elevated-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Max Drawdown</p>
                  <p className="text-2xl font-bold text-destructive">{riskMetrics.maxDrawdown}%</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Largest peak-to-trough decline</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Risk History Chart */}
          <Card className="elevated-card">
            <CardHeader>
              <CardTitle>Risk History</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={riskHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-card)', 
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px'
                    }} 
                  />
                  <Line type="monotone" dataKey="var" stroke="#ef4444" strokeWidth={2} name="VaR" />
                  <Line type="monotone" dataKey="risk" stroke="var(--color-accent)" strokeWidth={2} name="Risk %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Position Risk Breakdown */}
          <Card className="elevated-card">
            <CardHeader>
              <CardTitle>Position Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {positionRisks.map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold">{position.symbol}</div>
                        <div className="text-sm text-gray-400">{position.allocation}% allocation</div>
                      </div>
                      <Badge className={getRiskLevelColor(position.riskLevel)}>
                        {position.riskLevel}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(position.var)}</div>
                      <div className="text-xs text-gray-400">β: {position.beta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stress Testing */}
          <Card className="elevated-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Stress Testing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={runStressTest} 
                  disabled={isRunningStressTest}
                  className="w-full"
                >
                  {isRunningStressTest ? 'Running Tests...' : 'Run Stress Tests'}
                </Button>

                {stressTestResults.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Stress Test Results</h4>
                    {stressTestResults.map((result, index) => (
                      <div key={index} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{result.scenario}</span>
                          <span className={`font-bold ${result.impactPercent < -10 ? 'text-red-400' : result.impactPercent < -5 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {result.impactPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mb-2">{result.description}</div>
                        <div className="text-sm">Impact: {formatCurrency(result.portfolioImpact)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Position Size Calculator */}
          <Card className="elevated-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Position Size Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Stock Symbol</label>
                  <Input
                    value={positionSizeCalc.symbol}
                    onChange={(e) => setPositionSizeCalc(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    placeholder="e.g., AAPL"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Risk Tolerance (%)</label>
                  <Input
                    type="number"
                    value={positionSizeCalc.riskTolerance}
                    onChange={(e) => setPositionSizeCalc(prev => ({ ...prev, riskTolerance: Number(e.target.value) }))}
                    min="0.5"
                    max="10"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Account Equity</label>
                  <Input
                    type="number"
                    value={positionSizeCalc.accountEquity}
                    onChange={(e) => setPositionSizeCalc(prev => ({ ...prev, accountEquity: Number(e.target.value) }))}
                  />
                </div>

                <Button onClick={calculatePositionSize} className="w-full">
                  Calculate Position Size
                </Button>

                {positionSizeCalc.recommendedSize > 0 && (
                  <div className="p-4 border border-border rounded-lg bg-background">
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-1">Recommended Position Size</div>
                      <div className="text-2xl font-bold text-green-400">
                        {positionSizeCalc.recommendedSize} shares
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Risk Amount: {formatCurrency((positionSizeCalc.accountEquity * positionSizeCalc.riskTolerance) / 100)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
