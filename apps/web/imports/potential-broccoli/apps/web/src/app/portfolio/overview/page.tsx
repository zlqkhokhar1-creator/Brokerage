"use client";

import { useEffect, useState } from "react";

interface Metrics {
  totalValue: number;
  dayChange: number;
  dayChangePct: number;
  ytdPct: number;
}

export default function PortfolioOverview() {
  const [metrics, setMetrics] = useState<Metrics>({ totalValue: 0, dayChange: 0, dayChangePct: 0, ytdPct: 0 });

  useEffect(() => {
    let active = true;
    async function fetchSnapshot() {
      try {
        const res = await fetch("/api/v1/portfolio", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        if (res.ok) {
          const data = await res.json();
          if (!active) return;
          setMetrics({
            totalValue: data.data.totalValue ?? 0,
            dayChange: data.data.dayChange ?? 0,
            dayChangePct: data.data.dayChangePercent ?? 0,
            ytdPct: 12.4,
          });
        }
      } catch {}
    }
    fetchSnapshot();

    const id = setInterval(fetchSnapshot, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border p-6"><p className="text-sm text-muted-foreground">Total Value</p><p className="text-3xl font-bold mt-2">${metrics.totalValue.toLocaleString()}</p></div>
        <div className="rounded-xl border p-6"><p className="text-sm text-muted-foreground">Day Change</p><p className={`text-3xl font-bold mt-2 ${metrics.dayChange>=0?"text-emerald-600":"text-red-600"}`}>{metrics.dayChange>=0?"+":""}${metrics.dayChange.toLocaleString()} ({metrics.dayChangePct.toFixed(2)}%)</p></div>
        <div className="rounded-xl border p-6"><p className="text-sm text-muted-foreground">YTD</p><p className="text-3xl font-bold mt-2 text-emerald-600">{metrics.ytdPct.toFixed(1)}%</p></div>
      </div>
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Performance</h2>
        <div className="h-72 bg-muted rounded-md flex items-center justify-center text-muted-foreground">Live chart placeholder</div>
      </div>
    </div>
  );
}



