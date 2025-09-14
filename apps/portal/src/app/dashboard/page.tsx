'use client';

import { AppLayout } from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, BarChart3, Users } from 'lucide-react';
import { PerformanceChart } from '@/components/PerformanceChart';
import { PositionsTable } from '@/components/PositionsTable';

export default function DashboardPage() {
  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your investment dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="elevated-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-success" />
                Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mono">$52,300</div>
              <Badge variant="default" className="mt-1">+6.6%</Badge>
            </CardContent>
          </Card>

          <Card className="elevated-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Cash Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mono">$8,750</div>
              <p className="text-sm text-muted-foreground">Available to invest</p>
            </CardContent>
          </Card>

          <Card className="elevated-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Today's Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">+$1,240</div>
              <Badge variant="default" className="mt-1">+2.4%</Badge>
            </CardContent>
          </Card>

          <Card className="elevated-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">3</div>
              <p className="text-sm text-muted-foreground">Price alerts triggered</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Card className="elevated-card">
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PerformanceChart currentPrice={175.43} days={90} height={300} />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="elevated-card">
              <CardHeader>
                <CardTitle>Recent Positions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PositionsTable />
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}