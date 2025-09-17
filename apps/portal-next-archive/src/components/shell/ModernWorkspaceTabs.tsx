"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Globe,
  Bell,
  Brain,
  PieChart,
  Activity,
  Target,
  Briefcase,
  Sparkles
} from 'lucide-react';

const workspaceTabs = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Overview & Analytics'
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: PieChart,
    description: 'Holdings & Performance'
  },
  {
    name: 'Trading',
    href: '/trading',
    icon: DollarSign,
    description: 'Orders & Execution'
  },
  {
    name: 'Markets',
    href: '/markets',
    icon: Globe,
    description: 'Data & Research'
  },
  {
    name: 'AI Insights',
    href: '/ai-insights',
    icon: Brain,
    description: 'Smart Recommendations',
    badge: 'AI'
  }
];

export function ModernWorkspaceTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/50 bg-card-secondary/30 backdrop-blur-sm">
      <div className="px-6">
        <div className="flex items-center space-x-1">
          {workspaceTabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                  <span className="hidden md:block">{tab.name}</span>
                  {tab.badge && (
                    <Badge
                      variant={tab.badge === 'AI' ? 'default' : 'secondary'}
                      className="text-xs h-5"
                    >
                      {tab.badge}
                    </Badge>
                  )}
                </div>

                {/* Tooltip for mobile */}
                <div className="md:hidden absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-card text-card-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {tab.description}
                </div>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full"
                    layoutId="activeTabIndicator"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}