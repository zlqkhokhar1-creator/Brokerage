"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getMarketOverview } from '@/lib/api/market-data';

export default function Markets() {
  const rows = [
    { symbol: "AAPL", name: "Apple Inc.", price: 200.12, change: +1.23 },
    { symbol: "MSFT", name: "Microsoft Corp.", price: 412.45, change: -0.42 },
    { symbol: "GOOGL", name: "Alphabet Inc.", price: 145.66, change: +0.87 },
  ];
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    getMarketOverview()
      .then((data: any) => setMarkets(data.markets || data))
      .catch(() => toast({ title: "Error", description: "Failed to load markets", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Markets</h1>
            <p className="text-muted-foreground">Live market data and trends</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="elevated-card">
              <CardHeader className="pb-2"><CardTitle>Top Movers</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">AAPL +2.1%, TSLA -1.3%, AMZN +0.8%</CardContent>
            </Card>
            <Card className="elevated-card">
              <CardHeader className="pb-2"><CardTitle>Market Breadth</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">Advancers 312 / Decliners 192</CardContent>
            </Card>
            <Card className="elevated-card">
              <CardHeader className="pb-2"><CardTitle>News</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">Fed signals hold; tech leads gains</CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
