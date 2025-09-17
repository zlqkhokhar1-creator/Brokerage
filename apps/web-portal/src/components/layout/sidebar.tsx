'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Newspaper,
  Star,
  Settings,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Client-side only component to prevent hydration mismatch
function MarketStatusFooter() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Set initial time
    setCurrentTime(new Date().toLocaleTimeString());

    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-xs text-gray-400">
      <p>Market Status: <span className="text-green-400">Open</span></p>
      <p>Last Update: {currentTime}</p>
    </div>
  );
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Markets', href: '/dashboard/markets', icon: TrendingUp },
  { name: 'Portfolio', href: '/dashboard/portfolio', icon: PieChart },
  { name: 'Trading', href: '/dashboard/trading', icon: BarChart3 },
  { name: 'AI Dashboard', href: '/dashboard/ai', icon: TrendingUp },
  { name: 'Robo Advisor', href: '/dashboard/robo-advisor', icon: PieChart },
  { name: 'AI Trading', href: '/dashboard/ai-trading', icon: BarChart3 },
  { name: 'Mutual Funds', href: '/dashboard/mutual-funds', icon: PieChart },
  { name: 'News', href: '/dashboard/news', icon: Newspaper },
  { name: 'Watchlists', href: '/dashboard/watchlists', icon: Star },
  { name: 'Social', href: '/dashboard/social', icon: Star },
  { name: 'Education', href: '/dashboard/education', icon: Settings },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#0f0f0f] border-r border-gray-700 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
              <span className="text-black font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-lg">Invest Pro</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-green-500 text-black"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    )}
                    onClick={() => onClose()}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <MarketStatusFooter />
        </div>
      </div>
    </>
  );
}