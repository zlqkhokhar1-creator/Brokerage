'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, PieChart, BarChart3, Target, Calendar, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';

interface PortfolioMetrics {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  dividendYield: number;
}

interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  change: number;
  color: string;
}

interface PerformanceData {
  date: string;
  portfolio: number;
  benchmark: number;
  alpha: number;
}

interface HoldingAnalysis {
  symbol: string;
  value: number;
  allocation: number;
  return: number;
  returnPercent: number;
  contribution: number;
  risk: number;
  beta: number;
  pe: number;
  dividend: number;
}

export default function PortfolioAnalyticsPage() {
  const [timeframe, setTimeframe] = useState('1Y');
  const [benchmark, setBenchmark] = useState('SPY');
  
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalValue: 125000,
    dayChange: 1250,
    dayChangePercent: 1.01,
    totalReturn: 25000,
    totalReturnPercent: 25.0,
    annualizedReturn: 12.5,
    sharpeRatio: 1.34,
    volatility: 18.5,
    maxDrawdown: -12.3,
    beta: 1.12,
    alpha: 2.8,
    dividendYield: 1.85
  });

  const [sectorAllocations, setSectorAllocations] = useState<SectorAllocation[]>([
    { sector: 'Technology', value: 45000, percentage: 36, change: 2.3, color: '#3b82f6' },
    { sector: 'Healthcare', value: 25000, percentage: 20, change: -0.8, color: '#10b981' },
    { sector: 'Financials', value: 20000, percentage: 16, change: 1.5, color: '#f59e0b' },
    { sector: 'Consumer Disc.', value: 15000, percentage: 12, change: 0.9, color: '#ef4444' },
    { sector: 'Industrials', value: 12500, percentage: 10, change: -1.2, color: '#8b5cf6' },
    { sector: 'Energy', value: 7500, percentage: 6, change: 3.4, color: '#06b6d4' }
  ]);

  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([
    { date: '2024-01', portfolio: 100000, benchmark: 100000, alpha: 0 },
    { date: '2024-02', portfolio: 102500, benchmark: 101200, alpha: 1.3 },
    { date: '2024-03', portfolio: 105800, benchmark: 103800, alpha: 2.0 },
    { date: '2024-04', portfolio: 108200, benchmark: 105100, alpha: 3.1 },
    { date: '2024-05', portfolio: 112500, benchmark: 107800, alpha: 4.7 },
    { date: '2024-06', portfolio: 115800, benchmark: 110200, alpha: 5.6 },
    { date: '2024-07', portfolio: 119200, benchmark: 112800, alpha: 6.4 },
    { date: '2024-08', portfolio: 122100, benchmark: 114500, alpha: 7.6 },
    { date: '2024-09', portfolio: 125000, benchmark: 116800, alpha: 8.2 }
  ]);

  const [holdings, setHoldings] = useState<HoldingAnalysis[]>([
    {
      symbol: 'AAPL',
      value: 35000,
      allocation: 28.0,
      return: 8750,
      returnPercent: 33.3,
      contribution: 7.0,
      risk: 22.5,
      beta: 1.2,
      pe: 28.5,
      dividend: 0.52
    },
    {
      symbol: 'MSFT',
      value: 28000,
      allocation: 22.4,
      return: 5600,
      returnPercent: 25.0,
      contribution: 4.5,
      risk: 18.7,
      beta: 0.9,
      pe: 31.2,
      dividend: 0.89
    },
    {
      symbol: 'GOOGL',
      value: 20000,
      allocation: 16.0,
      return: 2000,
      returnPercent: 11.1,
      contribution: 1.6,
      risk: 25.3,
      beta: 1.1,
      pe: 22.8,
      dividend: 0.0
    },
    {
      symbol: 'TSLA',
      value: 15000,
      allocation: 12.0,
      return: 3750,
      returnPercent: 33.3,
      contribution: 3.0,
      risk: 45.2,
      beta: 2.1,
      pe: 85.4,
      dividend: 0.0
    },
    {
      symbol: 'NVDA',
      value: 12000,
      allocation: 9.6,
      return: 4800,
      returnPercent: 66.7,
      contribution: 3.8,
      risk: 38.9,
      beta: 1.8,
      pe: 65.2,
      dividend: 0.16
    }
  ]);

  const riskMetrics = [
    { name: 'Volatility', value: metrics.volatility, benchmark: 16.2, unit: '%' },
    { name: 'Sharpe Ratio', value: metrics.sharpeRatio, benchmark: 1.15, unit: '' },
    { name: 'Max Drawdown', value: metrics.maxDrawdown, benchmark: -10.5, unit: '%' },
    { name: 'Beta', value: metrics.beta, benchmark: 1.0, unit: '' },
    { name: 'Alpha', value: metrics.alpha, benchmark: 0.0, unit: '%' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const generateReport = () => {
    // Mock report generation
    console.log('Generating portfolio report...');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Portfolio Analytics</h1>
              <p className="text-gray-400">Advanced performance analysis and insights</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1M">1 Month</SelectItem>
                  <SelectItem value="3M">3 Months</SelectItem>
                  <SelectItem value="6M">6 Months</SelectItem>
                  <SelectItem value="1Y">1 Year</SelectItem>
                  <SelectItem value="3Y">3 Years</SelectItem>
                  <SelectItem value="5Y">5 Years</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generateReport}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Portfolio Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p>
                  <p className={`text-sm flex items-center gap-1 ${getChangeColor(metrics.dayChange)}`}>
                    {metrics.dayChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatCurrency(Math.abs(metrics.dayChange))} ({formatPercent(metrics.dayChangePercent)}) today
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Return</p>
                  <p className="text-2xl font-bold text-green-400">{formatPercent(metrics.totalReturnPercent)}</p>
                  <p className="text-sm text-gray-400">{formatCurrency(metrics.totalReturn)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Annualized Return</p>
                  <p className="text-2xl font-bold text-purple-400">{formatPercent(metrics.annualizedReturn)}</p>
                  <p className="text-sm text-gray-400">vs {benchmark}: +{metrics.alpha}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1E1E1E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Sharpe Ratio</p>
                  <p className="text-2xl font-bold text-orange-400">{metrics.sharpeRatio}</p>
                  <p className="text-sm text-gray-400">Risk-adjusted return</p>
                </div>
                <Target className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Portfolio vs Benchmark</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333',
                          borderRadius: '6px'
                        }} 
                      />
                      <Line type="monotone" dataKey="portfolio" stroke="#3b82f6" strokeWidth={2} name="Portfolio" />
                      <Line type="monotone" dataKey="benchmark" stroke="#6b7280" strokeWidth={2} name={benchmark} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Alpha Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333',
                          borderRadius: '6px'
                        }} 
                      />
                      <Area type="monotone" dataKey="alpha" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Sector Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={sectorAllocations}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {sectorAllocations.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333',
                          borderRadius: '6px'
                        }} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Sector Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectorAllocations.map((sector, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: sector.color }}
                          />
                          <div>
                            <div className="font-semibold">{sector.sector}</div>
                            <div className="text-sm text-gray-400">{sector.percentage}% allocation</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(sector.value)}</div>
                          <div className={`text-sm ${getChangeColor(sector.change)}`}>
                            {formatPercent(sector.change)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="holdings" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Holdings Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1E1E1E]">
                        <th className="text-left py-3">Symbol</th>
                        <th className="text-right py-3">Value</th>
                        <th className="text-right py-3">Allocation</th>
                        <th className="text-right py-3">Return</th>
                        <th className="text-right py-3">Contribution</th>
                        <th className="text-right py-3">Beta</th>
                        <th className="text-right py-3">P/E</th>
                        <th className="text-right py-3">Dividend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((holding, index) => (
                        <tr key={index} className="border-b border-[#1E1E1E]/50">
                          <td className="py-3 font-semibold">{holding.symbol}</td>
                          <td className="py-3 text-right">{formatCurrency(holding.value)}</td>
                          <td className="py-3 text-right">{holding.allocation.toFixed(1)}%</td>
                          <td className={`py-3 text-right ${getChangeColor(holding.return)}`}>
                            {formatPercent(holding.returnPercent)}
                          </td>
                          <td className="py-3 text-right">{holding.contribution.toFixed(1)}%</td>
                          <td className="py-3 text-right">{holding.beta.toFixed(2)}</td>
                          <td className="py-3 text-right">{holding.pe.toFixed(1)}</td>
                          <td className="py-3 text-right">{holding.dividend.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {riskMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-[#1E1E1E] rounded-lg">
                        <div>
                          <div className="font-semibold">{metric.name}</div>
                          <div className="text-sm text-gray-400">vs Benchmark: {metric.benchmark}{metric.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{metric.value}{metric.unit}</div>
                          <div className={`text-sm ${
                            metric.value > metric.benchmark ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {metric.value > metric.benchmark ? '↑' : '↓'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Risk Decomposition</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={holdings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="symbol" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333',
                          borderRadius: '6px'
                        }} 
                      />
                      <Bar dataKey="risk" fill="#ef4444" name="Risk %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attribution" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Performance Attribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Asset Allocation Effect</h4>
                    <div className="space-y-3">
                      {sectorAllocations.slice(0, 3).map((sector, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{sector.sector}</span>
                          <span className={getChangeColor(sector.change)}>
                            {formatPercent(sector.change / 2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-4">Security Selection Effect</h4>
                    <div className="space-y-3">
                      {holdings.slice(0, 3).map((holding, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{holding.symbol}</span>
                          <span className={getChangeColor(holding.contribution)}>
                            {formatPercent(holding.contribution / 3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
