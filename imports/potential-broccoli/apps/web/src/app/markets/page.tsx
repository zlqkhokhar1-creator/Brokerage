"use client";

import PortalShell from '@/components/PortalShell';
import RealTimeMarketData from '@/components/RealTimeMarketData';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function Markets() {
  return (
    <PortalShell currentPath="/markets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Markets</h1>
          <Link href="/screener" className="text-sm underline underline-offset-4">Open Screener</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RealTimeMarketData />
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Movers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">AAPL +2.1%, TSLA -1.3%, AMZN +0.8%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Market News</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Fed announces rate hike. Tech stocks rally.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}



