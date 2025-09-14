"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export type KpiTrend = 'up' | 'down' | 'flat';

export function KpiCard({
  title,
  value,
  delta,
  trend = 'flat',
  icon,
}: {
  title: string;
  value: string | number;
  delta?: string;
  trend?: KpiTrend;
  icon?: ReactNode;
}) {
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="elevated-card h-full">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm text-muted-foreground font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {delta && <div className={`text-sm ${trendColor}`}>{delta}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}


