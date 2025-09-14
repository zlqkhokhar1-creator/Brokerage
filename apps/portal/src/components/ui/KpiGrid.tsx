"use client";

import { KpiCard } from '@/components/ui/KpiCard';
import { TrendingUp, DollarSign, Activity, Bell } from 'lucide-react';

export function KpiGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Portfolio Value" value="$1,254,320" delta="+1.8%" trend="up" icon={<DollarSign className="h-4 w-4" />} />
      <KpiCard title="Day P/L" value="+$12,430" delta="+0.9%" trend="up" icon={<TrendingUp className="h-4 w-4" />} />
      <KpiCard title="Volatility" value="12.4%" delta="-0.3%" trend="down" icon={<Activity className="h-4 w-4" />} />
      <KpiCard title="Active Alerts" value="7" delta="+2" trend="up" icon={<Bell className="h-4 w-4" />} />
    </div>
  );
}


