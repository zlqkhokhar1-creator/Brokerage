"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
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
    fetch("/api/v1/market-data")
      .then((res) => res.json())
      .then((data) => setMarkets(data.markets))
      .catch(() => toast({ title: "Error", description: "Failed to load markets", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#f7ff00] flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-4xl mx-auto text-center py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-2 animate-fade-in">Markets</h1>
        <p className="text-lg md:text-xl text-[#f7ff00] font-medium mb-6 animate-fade-in-delay">Live market data and trends.</p>
      </header>
      <main className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white/30 animate-fade-in-delay">
          <h3 className="text-lg font-bold text-white mb-2">Top Movers</h3>
          <p className="text-white/80">AAPL +2.1%, TSLA -1.3%, AMZN +0.8%</p>
        </div>
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white/30 animate-fade-in-delay">
          <h3 className="text-lg font-bold text-white mb-2">Market News</h3>
          <p className="text-white/80">Fed announces rate hike. Tech stocks rally.</p>
        </div>
      </main>
      <footer className="w-full max-w-4xl mx-auto text-center py-8 mt-16 text-white/70 animate-fade-in-delay">
        &copy; {new Date().getFullYear()} InvestPro. All rights reserved.
      </footer>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        .animate-fade-in-delay { animation: fade-in 1.5s ease-out; }
      `}</style>
    </div>
  );
}



