'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { TradeTable } from '@/components/TradeTable';

export default function TradesPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Trade History</h1>
        <p className="text-muted-foreground">View your past trades and order history</p>
      </div>

      <Card className="elevated-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Trades</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Trade
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TradeTable />
        </CardContent>
      </Card>
    </motion.div>
  );
}