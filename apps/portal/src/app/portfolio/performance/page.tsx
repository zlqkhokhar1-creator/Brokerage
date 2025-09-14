'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { PerformanceChart } from '@/components/PerformanceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateEnhancedChartData } from '@/lib/chartData';

const mockData = generateEnhancedChartData(175.43, 365); // 1 year data for AAPL-like

export default function PortfolioPerformancePage() {
  const totalReturn = ((mockData[mockData.length - 1].close - mockData[0].open) / mockData[0].open * 100).toFixed(2);
  const volatility = '15.2%'; // Mock
  const sharpeRatio = '1.25'; // Mock

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Portfolio Performance</h1>
        <p className="text-muted-foreground">Track your investment performance over time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="elevated-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Return (1Y)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{totalReturn}%</div>
            <p className="text-sm text-muted-foreground">Since inception</p>
          </CardContent>
        </Card>

        <Card className="elevated-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volatility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{volatility}</div>
            <p className="text-sm text-muted-foreground">Annualized</p>
          </CardContent>
        </Card>

        <Card className="elevated-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sharpe Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-info">{sharpeRatio}</div>
            <p className="text-sm text-muted-foreground">Risk-adjusted return</p>
          </CardContent>
        </Card>
      </div>

      <Card className="elevated-card">
        <CardHeader>
          <CardTitle>Performance Chart</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PerformanceChart currentPrice={parseFloat(mockData[mockData.length - 1].close.toFixed(2))} days={365} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
