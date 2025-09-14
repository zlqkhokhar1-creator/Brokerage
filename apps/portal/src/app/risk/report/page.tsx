'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { HeatMapChart } from '@/components/HeatMapChart'; // Stub, create later with Recharts

type RiskStatus = 'good' | 'medium' | 'high';

const mockRiskData: Array<{ metric: string; value: string; confidence: string; status: RiskStatus }> = [
  { metric: 'Value at Risk (VaR)', value: '-$2,450', confidence: '95%', status: 'high' },
  { metric: 'Beta', value: '1.25', confidence: 'N/A', status: 'medium' },
  { metric: 'Sharpe Ratio', value: '1.15', confidence: 'N/A', status: 'good' },
  { metric: 'Max Drawdown', value: '-12.3%', confidence: 'N/A', status: 'medium' },
  { metric: 'Stress Test (Crash)', value: '-25.8%', confidence: 'N/A', status: 'high' },
  { metric: 'Position Concentration', value: '35%', confidence: 'N/A', status: 'high' },
];

const statusVariants: Record<RiskStatus, 'default' | 'secondary' | 'destructive'> = {
  good: 'default',
  medium: 'secondary',
  high: 'destructive',
};

export default function RiskReportPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          Risk Report
        </h1>
        <p className="text-muted-foreground">Comprehensive risk assessment for your portfolio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="elevated-card">
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRiskData.map((item, index) => (
                  <motion.tr
                    key={item.metric}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <TableCell>{item.metric}</TableCell>
                    <TableCell className="font-mono">{item.value}</TableCell>
                    <TableCell>{item.confidence}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[item.status]}>
                        {item.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="elevated-card">
          <CardHeader>
            <CardTitle>Risk Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatMapChart /> {/* Stub for correlation heatmap */}
          </CardContent>
        </Card>
      </div>

      <Card className="elevated-card">
        <CardHeader>
          <CardTitle>Stress Test Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Market Crash (2008)</h3>
              <div className="text-2xl font-bold text-destructive">-45.2%</div>
              <p className="text-sm text-muted-foreground">Portfolio loss</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Recession (2020)</h3>
              <div className="text-2xl font-bold text-destructive">-28.7%</div>
              <p className="text-sm text-muted-foreground">Portfolio loss</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Inflation Spike</h3>
              <div className="text-2xl font-bold text-warning">-8.4%</div>
              <p className="text-sm text-muted-foreground">Portfolio loss</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}