"use client";

import PortalShell from '@/components/PortalShell';
import AdvancedOrderEntry from '@/components/trading/AdvancedOrderEntry';
import OrderBook from '@/components/trading/OrderBook';
import StockChart from '@/components/StockChart';

export const dynamic = 'force-dynamic';

export default function TradePage() {
  return (
    <PortalShell currentPath="/trade">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <StockChart />
          <OrderBook />
        </div>
        <div>
          <AdvancedOrderEntry />
        </div>
      </div>
    </PortalShell>
  );
}

