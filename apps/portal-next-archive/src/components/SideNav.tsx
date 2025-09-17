"use client";
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from '@/components/MotionWrappers';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, User, LogOut, ChevronLeft, ChevronRight, BarChart3, TrendingUp, Bell, Brain, Users, DollarSign, Globe, Shield, CreditCard } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Portfolio', href: '/portfolio', icon: TrendingUp },
  { name: 'Trading', href: '/trading', icon: DollarSign },
  { name: 'Markets', href: '/markets', icon: Globe },
  { name: 'Orders', href: '/orders', icon: TrendingUp },
  { name: 'Risk Management', href: '/risk-management', icon: Shield },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'AI Insights', href: '/ai-insights', icon: Brain },
  { name: 'Social Trading', href: '/social-trading', icon: Users },
  { name: 'Advanced Orders', href: '/advanced-orders', icon: DollarSign },
  { name: 'International Markets', href: '/international-markets', icon: Globe },
  { name: 'Payments', href: '/payments', icon: CreditCard },
];

export function SideNav({ isOpen = true }: { isOpen?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(isOpen);
  const { data: session } = useSession();
  const { theme } = useTheme();

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  return (
    <>
      {/* Desktop SideNav */}
      <AnimatePresence mode="wait">
        <motion.aside
          key="desktop"
          initial={false}
          animate={{ width: isExpanded ? 256 : 72 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed left-0 top-0 h-full bg-card border-r border-border z-40 hidden lg:block"
        >
          <div className="flex h-full flex-col gap-2">
            <div className="flex h-14 items-center px-4">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleExpanded}>
                {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="ml-2 overflow-hidden"
                  >
                    <div className="text-lg font-semibold">InvestPro</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <nav className="flex-1 px-2">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="group flex w-full items-center rounded-md border border-transparent px-2.5 py-2 text-sm font-medium hover:bg-accent/20 hover:text-accent transition-colors"
                      >
                        <Icon className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                        <AnimatePresence mode="wait">
                          {isExpanded && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="overflow-hidden"
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-auto p-4">
              {session && (
                <div className="space-y-2">
                  <div className={`text-sm ${isExpanded ? 'block' : 'hidden'}`}>
                    <p className="text-xs font-medium">User</p>
                    <p className="truncate">{session.user?.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className={isExpanded ? 'inline' : 'hidden'}>Log out</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Mobile SideNav */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0 bg-card">
          <div className="flex h-full flex-col gap-2">
            <div className="flex h-14 items-center px-4">
              <div className="text-lg font-semibold">InvestPro</div>
            </div>
            <nav className="flex-1 px-2">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="group flex w-full items-center rounded-md border border-transparent px-2.5 py-2 text-sm font-medium hover:bg-accent/20 hover:text-accent transition-colors"
                      >
                        <Icon className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-auto p-4">
              {session && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <p className="text-xs font-medium">User</p>
                    <p className="truncate">{session.user?.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}