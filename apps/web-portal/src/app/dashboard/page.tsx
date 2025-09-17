'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { NewsFeed } from '@/components/dashboard/news-feed';
import { WatchlistPanel } from '@/components/dashboard/watchlist-panel';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Invest Pro Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Welcome to Invest Pro. Here's your comprehensive financial overview.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Market Overview */}
          <div className="lg:col-span-2 space-y-6">
            <MarketOverview />
            <PortfolioSummary />
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="space-y-6">
            <WatchlistPanel />
            <NewsFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}