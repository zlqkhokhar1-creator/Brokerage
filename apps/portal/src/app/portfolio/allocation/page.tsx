'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const allocationData = [
  { name: 'Stocks', value: 60, color: '#00E6B8' },
  { name: 'Bonds', value: 20, color: '#FFB300' },
  { name: 'Cash', value: 10, color: '#6B7280' },
  { name: 'Crypto', value: 10, color: '#10B981' },
];

const COLORS = allocationData.map(d => d.color);

const renderCustomizedLabel = (props: any) => {
  const { name, percent } = props;
  return `${name} ${(percent * 100).toFixed(0)}%`;
};

export default function PortfolioAllocationPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Portfolio Allocation</h1>
        <p className="text-muted-foreground">View your asset allocation across different categories</p>
      </div>

      <Card className="elevated-card">
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                label={renderCustomizedLabel}
                labelLine={false}
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`, 'Allocation']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {allocationData.map((item, index) => (
          <Card key={item.name} className="elevated-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}%</div>
              <p className="text-sm text-muted-foreground">of total portfolio</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
