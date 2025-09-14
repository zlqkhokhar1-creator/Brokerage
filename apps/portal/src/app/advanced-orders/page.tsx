'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, TrendingUp, TrendingDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shell } from '@/components/shell/Shell';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';

type OrderStatus = 'available' | 'limited' | 'unavailable';

const mockOrderTypes: { type: string; description: string; status: OrderStatus }[] = [
  { type: 'Limit Order', description: 'Buy or sell at a specific price or better', status: 'available' },
  { type: 'Stop Order', description: 'Buy or sell when price reaches a stop price', status: 'available' },
  { type: 'Stop Limit Order', description: 'Buy or sell with stop and limit prices', status: 'available' },
  { type: 'Trailing Stop', description: 'Follows favorable price movement by a set %', status: 'available' },
  { type: 'One Cancels Other (OCO)', description: 'Two orders, one cancels the other', status: 'available' },
  { type: 'Bracket Order', description: 'Parent order with attached take-profit/stop-loss', status: 'available' },
];

const statusVariants = {
  available: 'secondary' as const,
  limited: 'outline' as const,
  unavailable: 'destructive' as const,
} as const;

export default function AdvancedOrdersPage() {
  return (
    <Shell right={<InspectorPanel />} showWorkspaceTabs={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Advanced Order Types</h1>
        <p className="text-muted-foreground">Explore advanced order types for sophisticated trading strategies</p>
      </div>

      <Card className="elevated-card">
        <CardHeader>
          <CardTitle>Available Order Types</CardTitle>
          <p className="text-sm text-muted-foreground">Click on any order type to learn more and place an order</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOrderTypes.map((orderType, index) => (
                <motion.tr
                  key={orderType.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-t border-border hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{orderType.type}</TableCell>
                  <TableCell>{orderType.description}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[orderType.status]}>
                      {orderType.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Place Order
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="elevated-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Limit Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Buy or sell at a specific price or better</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Price Control</span>
                <Badge variant="outline">Exact or better</Badge>
              </div>
              <div className="flex justify-between">
                <span>Execution</span>
                <Badge variant="outline">Immediate or queued</Badge>
              </div>
              <div className="flex justify-between">
                <span>Best for</span>
                <Badge variant="secondary">Price targeting</Badge>
              </div>
            </div>
            <Button className="mt-4 w-full">
              Learn More
            </Button>
          </CardContent>
        </Card>

        <Card className="elevated-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Stop Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Buy or sell when price reaches a stop price</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Trigger</span>
                <Badge variant="outline">Stop price</Badge>
              </div>
              <div className="flex justify-between">
                <span>Execution</span>
                <Badge variant="outline">Market price</Badge>
              </div>
              <div className="flex justify-between">
                <span>Best for</span>
                <Badge variant="secondary">Risk management</Badge>
              </div>
            </div>
            <Button className="mt-4 w-full">
              Learn More
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="elevated-card">
        <CardHeader>
          <CardTitle>Advanced Order Settings</CardTitle>
          <p className="text-sm text-muted-foreground">Configure your advanced order preferences</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Order Type</label>
              <select className="w-full p-2 border border-border rounded-md bg-muted text-foreground">
                <option>Market</option>
                <option>Limit</option>
                <option>Stop</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trailing Stop %</label>
              <select className="w-full p-2 border border-border rounded-md bg-muted text-foreground">
                <option>5%</option>
                <option>10%</option>
                <option>15%</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Large Orders</label>
              <select className="w-full p-2 border border-border rounded-md bg-muted text-foreground">
                <option>$10,000+</option>
                <option>$25,000+</option>
                <option>$50,000+</option>
              </select>
            </div>
          </div>
          <Button className="mt-4">
            <Settings className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
      </motion.div>
    </Shell>
  );
}
