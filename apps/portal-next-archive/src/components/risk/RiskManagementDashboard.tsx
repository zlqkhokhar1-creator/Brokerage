"use client";
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  AlertTriangle, 
  BarChart2, 
  Bell, 
  Clock, 
  Download, 
  Filter, 
  Gauge,
  LineChart, 
  PieChart, 
  RefreshCw, 
  Settings, 
  Shield, 
  Sliders, 
  TrendingDown, 
  TrendingUp, 
  Zap 
} from 'lucide-react';
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Line, 
  Pie, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { AdvancedRiskMetrics } from './AdvancedRiskMetrics';

// Mock data for risk metrics
const riskMetrics = {
  var95: 1250.50,
  var99: 1850.75,
  cvar95: 1450.25,
  maxDrawdown: 8.5,
  sharpeRatio: 1.8,
  sortinoRatio: 2.1,
  beta: 1.2,
  alpha: 0.05,
  volatility: 15.7,
};

// Mock data for stress test scenarios
const stressScenarios = [
  { name: 'Market Crash (-20%)', value: -18500 },
  { name: 'Rate Hike (+2%)', value: -7500 },
  { name: 'Sector Rotation', value: -3200 },
  { name: 'Volatility Spike', value: -5200 },
  { name: 'Liquidity Crunch', value: -8900 },
];

// Mock data for risk exposure
const exposureData = [
  { name: 'Equities', value: 45, color: '#3b82f6' },
  { name: 'Fixed Income', value: 25, color: '#10b981' },
  { name: 'Commodities', value: 15, color: '#f59e0b' },
  { name: 'Crypto', value: 10, color: '#8b5cf6' },
  { name: 'Cash', value: 5, color: '#6b7280' },
];

// Mock data for risk alerts
const riskAlerts = [
  { id: 1, severity: 'high', message: 'Concentration risk in Tech sector exceeds threshold', time: '5m ago' },
  { id: 2, severity: 'medium', message: 'Portfolio beta increased to 1.3', time: '1h ago' },
  { id: 3, severity: 'low', message: 'Liquidity coverage ratio below target', time: '3h ago' },
];

export function RiskManagementDashboard() {
  const [timeframe, setTimeframe] = useState('1M');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock function to simulate data refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Calculate risk metrics summary
  const riskMetricsSummary = useMemo(() => [
    { 
      name: 'VaR (95%)', 
      value: `$${riskMetrics.var95.toLocaleString()}`, 
      change: -2.3,
      icon: <TrendingDown className="h-4 w-4 text-red-500" />
    },
    { 
      name: 'Expected Shortfall', 
      value: `$${riskMetrics.cvar95.toLocaleString()}`, 
      change: -1.8,
      icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />
    },
    { 
      name: 'Max Drawdown', 
      value: `${riskMetrics.maxDrawdown}%`, 
      change: 0.5,
      icon: <BarChart2 className="h-4 w-4 text-blue-500" />
    },
    { 
      name: 'Sharpe Ratio', 
      value: riskMetrics.sharpeRatio.toFixed(2), 
      change: 0.2,
      icon: <TrendingUp className="h-4 w-4 text-green-500" />
    },
  ], []);

  // Render risk metric cards
  const renderRiskMetrics = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {riskMetricsSummary.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
            <div className="h-4 w-4">{metric.icon}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className={`text-xs ${metric.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metric.change >= 0 ? '+' : ''}{metric.change}% from last period
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render stress test results
  const renderStressTests = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scenario Analysis</CardTitle>
            <CardDescription>Estimated impact of stress scenarios on portfolio value</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1D">1 Day</SelectItem>
                <SelectItem value="1W">1 Week</SelectItem>
                <SelectItem value="1M">1 Month</SelectItem>
                <SelectItem value="3M">3 Months</SelectItem>
                <SelectItem value="1Y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stressScenarios}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip 
                formatter={(value) => [`$${Math.abs(Number(value)).toLocaleString()}`, 'Impact']}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="value" fill="#8884d8">
                {stressScenarios.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value < 0 ? '#ef4444' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  // Render portfolio exposure
  const renderPortfolioExposure = () => (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Exposure</CardTitle>
        <CardDescription>Asset class allocation and risk contribution</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={exposureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {exposureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Risk Contribution</h4>
              <div className="space-y-2">
                {exposureData.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span>{Math.round(item.value * 1.5)}% of risk</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${item.value * 1.5}%`, 
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Concentration Risk</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Top 5 Holdings</span>
                  <span className="font-medium">42% of portfolio</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: '42%' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {riskAlerts[0].message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render risk alerts
  const renderRiskAlerts = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Risk Alerts</CardTitle>
            <CardDescription>Active risk notifications and warnings</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Bell className="mr-2 h-4 w-4" />
            Alert Settings
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {riskAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className="flex items-start p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div className={`flex-shrink-0 mt-0.5 mr-3 ${
                alert.severity === 'high' ? 'text-red-500' : 
                alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
              }`}>
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {alert.time} • {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)} Priority
                </p>
              </div>
              <Button variant="ghost" size="sm" className="ml-2">
                View
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Render risk controls
  const renderRiskControls = () => (
    <Card>
      <CardHeader>
        <CardTitle>Risk Controls</CardTitle>
        <CardDescription>Active risk management settings and limits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Position Limits</h4>
            <div className="space-y-4">
              {[
                { name: 'Max Position Size', value: '10%', current: '8.2%' },
                { name: 'Max Sector Exposure', value: '25%', current: '18.5%' },
                { name: 'Max Single Asset', value: '5%', current: '4.1%' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.name}</span>
                    <span className="font-medium">{item.current} / {item.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ 
                        width: `${(parseFloat(item.current) / parseFloat(item.value)) * 100}%`,
                        backgroundColor: parseFloat(item.current) > parseFloat(item.value) * 0.9 
                          ? '#ef4444' 
                          : parseFloat(item.current) > parseFloat(item.value) * 0.7 
                            ? '#f59e0b' 
                            : '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Risk Parameters</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: 'Max Daily Loss', value: '2.0%', current: '0.8%' },
                { name: 'Max Drawdown', value: '10.0%', current: '3.2%' },
                { name: 'Liquidity Coverage', value: '30 Days', current: '45 Days' },
                { name: 'VaR Limit (95%)', value: '$10,000', current: '$8,250' },
              ].map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">{item.name}</div>
                  <div className="flex items-baseline mt-1">
                    <span className="text-lg font-semibold">{item.current}</span>
                    <span className="ml-2 text-sm text-muted-foreground">/ {item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Automated Risk Controls</h4>
                <p className="text-sm text-muted-foreground">
                  Automatic position adjustments based on risk parameters
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Risk Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage portfolio risk in real-time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button>
            <Shield className="mr-2 h-4 w-4" />
            Run Risk Analysis
          </Button>
        </div>
      </div>

      <AdvancedRiskMetrics />
      
      <div className="pt-6">
        <h3 className="text-lg font-medium mb-4">Risk Analysis & Monitoring</h3>
        {renderRiskMetrics()}
      </div>
      
      <Tabs defaultValue="exposure" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exposure">Portfolio Exposure</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
          <TabsTrigger value="controls">Risk Controls</TabsTrigger>
        </TabsList>
        
        <TabsContent value="exposure" className="space-y-4">
          {renderPortfolioExposure()}
        </TabsContent>
        
        <TabsContent value="scenarios" className="space-y-4">
          {renderStressTests()}
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          {renderRiskAlerts()}
        </TabsContent>
        
        <TabsContent value="controls" className="space-y-4">
          {renderRiskControls()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RiskManagementDashboard;
