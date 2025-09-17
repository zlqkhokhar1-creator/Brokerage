'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { NewsFeed } from '@/components/dashboard/news-feed';
import { WatchlistPanel } from '@/components/dashboard/watchlist-panel';
import { Card, Text, Group, Badge, SimpleGrid, Alert, Select, Button } from '@mantine/core';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Users, Activity, Crown, Zap, Star, Shield, CheckCircle, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [activeIndicators, setActiveIndicators] = useState(['sma', 'rsi']);

  const toggleIndicator = (indicator: string) => {
    setActiveIndicators(prev =>
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setShowWelcome(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="content-spacing section-spacing">
          {/* Clean Skeleton Header */}
          <div className="space-y-4">
            <div className="skeleton-text h-12 w-96"></div>
            <div className="skeleton-text h-6 w-80"></div>
          </div>

          {/* Clean Skeleton Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card card-spacing">
                <div className="flex items-center gap-4">
                  <div className="skeleton-text h-12 w-12 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="skeleton-text h-4 w-20"></div>
                    <div className="skeleton-text h-6 w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Clean Skeleton Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="skeleton-card card-spacing">
                <div className="space-y-4">
                  <div className="skeleton-text h-6 w-48"></div>
                  <div className="skeleton-text h-4 w-full"></div>
                  <div className="skeleton-text h-4 w-3/4"></div>
                </div>
              </div>
              <div className="skeleton-card card-spacing">
                <div className="space-y-4">
                  <div className="skeleton-text h-6 w-40"></div>
                  <div className="skeleton-text h-32 w-full"></div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="skeleton-card card-spacing">
                <div className="space-y-3">
                  <div className="skeleton-text h-5 w-32"></div>
                  <div className="skeleton-text h-4 w-full"></div>
                  <div className="skeleton-text h-4 w-5/6"></div>
                </div>
              </div>
              <div className="skeleton-card card-spacing">
                <div className="space-y-3">
                  <div className="skeleton-text h-5 w-28"></div>
                  <div className="skeleton-text h-4 w-full"></div>
                  <div className="skeleton-text h-4 w-4/5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="content-spacing section-spacing">
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Clean Page Header */}
          <motion.div
            className="text-center lg:text-left"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-heading-1 text-primary mb-3">
              Invest Pro Dashboard
            </h1>
            <p className="text-body-large text-secondary max-w-2xl">
              Welcome to Invest Pro. Here's your comprehensive financial overview with professional insights and real-time data.
            </p>
          </motion.div>

          {/* Welcome Alert */}
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Alert
                icon={<CheckCircle className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />}
                title="Welcome Back!"
                color="green"
                variant="light"
                className="card-clean"
                styles={{
                  root: {
                    backgroundColor: 'hsl(var(--success) / 0.1)',
                    borderColor: 'hsl(var(--success) / 0.2)',
                    color: 'hsl(var(--foreground))'
                  }
                }}
              >
                Your portfolio is performing well today. All systems are operational and your data is up to date.
              </Alert>
            </motion.div>
          )}

          {/* Clean Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
              <Card className="card-clean hover-clean">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--success) / 0.1)' }}>
                    <TrendingUp className="h-6 w-6" style={{ color: 'hsl(var(--success))' }} />
                  </div>
                  <div>
                    <Text size="sm" className="text-muted-foreground text-caption">Portfolio Value</Text>
                    <Text size="xl" fw={700} style={{ color: 'hsl(var(--success))' }}>$125,430</Text>
                  </div>
                </div>
              </Card>

              <Card className="card-clean hover-clean">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
                    <BarChart3 className="h-6 w-6" style={{ color: 'hsl(var(--primary))' }} />
                  </div>
                  <div>
                    <Text size="sm" className="text-muted-foreground text-caption">Today's P&L</Text>
                    <Text size="xl" fw={700} style={{ color: 'hsl(var(--success))' }}>+$2,340</Text>
                  </div>
                </div>
              </Card>

              <Card className="card-clean hover-clean">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--warning) / 0.1)' }}>
                    <Zap className="h-6 w-6" style={{ color: 'hsl(var(--warning))' }} />
                  </div>
                  <div>
                    <Text size="sm" className="text-muted-foreground text-caption">AI Signals</Text>
                    <Text size="xl" fw={700} style={{ color: 'hsl(var(--warning))' }}>12 Active</Text>
                  </div>
                </div>
              </Card>

              <Card className="card-clean hover-clean">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--muted))' }}>
                    <Shield className="h-6 w-6" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  </div>
                  <div>
                    <Text size="sm" className="text-muted-foreground text-caption">Risk Score</Text>
                    <Text size="xl" fw={700} style={{ color: 'hsl(var(--success))' }}>Low</Text>
                  </div>
                </div>
              </Card>
            </SimpleGrid>
          </motion.div>


          {/* Main Content Grid */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* Left Column - Market Overview */}
            <motion.div
              className="lg:col-span-2 space-y-8"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <MarketOverview />
              <PortfolioSummary />
            </motion.div>

            {/* Right Column - Sidebar Widgets */}
            <motion.div
              className="space-y-8"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <WatchlistPanel />
              <NewsFeed />

              {/* Clean Premium Feature Card */}
              <Card className="card-elevated">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4" style={{ backgroundColor: 'hsl(var(--warning) / 0.1)' }}>
                    <Crown className="h-6 w-6" style={{ color: 'hsl(var(--warning))' }} />
                  </div>
                  <Text size="sm" fw={600} className="text-primary" mb="xs">Premium Features</Text>
                  <Text size="xs" className="text-muted-foreground" mb="md">
                    Unlock AI insights, advanced analytics, and priority support
                  </Text>
                  <button className="w-full px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-md" style={{ backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }}>
                    Upgrade Now
                  </button>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Clean Floating Action Button */}
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 1.0, type: "spring" }}
          >
            <button
              className="px-6 py-3 rounded-lg font-medium text-white shadow-soft hover-lift transition-all duration-200"
              style={{
                backgroundColor: 'hsl(var(--primary))',
                borderColor: 'hsl(var(--primary))'
              }}
            >
              <Zap className="h-5 w-5 mr-2" />
              Quick Trade
            </button>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}