"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from '@/components/MotionWrappers';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { LogIn, User, Sun, Moon, Bell, Search } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', exact: true },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'Trading', href: '/trading' },
  { name: 'Markets', href: '/markets' },
  { name: 'Orders', href: '/orders' },
  { name: 'Risk', href: '/risk-management' },
  { name: 'Notifications', href: '/notifications' },
  { name: 'AI', href: '/ai-recommendations' },
  { name: 'Social', href: '/social-trading' },
  { name: 'Advanced Orders', href: '/advanced-orders' },
  { name: 'International', href: '/international-markets' },
  { name: 'Payments', href: '/payments' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Global search logic
    console.log('Search:', searchQuery);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 w-full bg-primary text-primary-foreground z-50"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover-lift">
          <div className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-amber-400 bg-clip-text text-transparent">
            InvestPro
          </div>
        </Link>

        {/* Desktop Nav Removed to avoid duplication */}
        <div />

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Global Search */}
          <form onSubmit={handleSearch} className="hidden md:flex">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search securities..."
                className="pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-[calc(var(--radius))] text-foreground placeholder:text-muted-foreground w-64 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </form>

          {/* Notification Bell */}
          <Button variant="ghost" size="sm" className="relative hover:bg-accent/20">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Theme Toggle */}
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="hover:bg-accent/20">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Auth Buttons */}
          <div className="hidden md:flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                <User className="mr-2 h-4 w-4" />
                Sign Up
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Mobile Menu Removed */}
    </motion.header>
  );
}
