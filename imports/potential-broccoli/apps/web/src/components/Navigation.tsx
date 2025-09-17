'use client';

import Link from "next/link";
import { Award, BarChart3, DollarSign, Users, Shield, Search, Bell, Settings, TrendingUp, AlertTriangle, Target, Globe, PieChart, Brain } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg border-b border-slate-200 dark:border-slate-800">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-2xl text-blue-700 dark:text-blue-300 tracking-tight">
          <Award className="w-6 h-6 text-yellow-500" />
          InvestPro
        </Link>
        <div className="flex gap-6 items-center text-lg">
          <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
            <BarChart3 className="w-5 h-5" /> Dashboard
          </Link>
          <Link href="/trade" className="hover:text-green-600 flex items-center gap-1">
            <DollarSign className="w-5 h-5" /> Trade
          </Link>
          <Link href="/options" className="hover:text-orange-600 flex items-center gap-1">
            <Target className="w-5 h-5" /> Options
          </Link>
          <Link href="/ai-recommendations" className="hover:text-cyan-600 flex items-center gap-1">
            <Brain className="w-5 h-5" /> AI Insights
          </Link>
          <div className="relative">
            <button 
              className="hover:text-purple-600 flex items-center gap-1"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <PieChart className="w-5 h-5" /> Analytics
            </button>
            {dropdownOpen && (
              <div 
                className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <Link href="/portfolio-analytics" className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Portfolio Analytics
                </Link>
                <Link href="/screener" className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                  <Search className="w-4 h-4" /> Stock Screener
                </Link>
                <Link href="/risk-management" className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Risk Management
                </Link>
                <Link href="/news" className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Market News
                </Link>
              </div>
            )}
          </div>
          <Link href="/notifications" className="hover:text-yellow-600 flex items-center gap-1">
            <Bell className="w-5 h-5" /> Alerts
          </Link>
          <Link href="/orders" className="hover:text-indigo-600 flex items-center gap-1">
            <Settings className="w-5 h-5" /> Orders
          </Link>
          <Link href="/compliance" className="hover:text-red-600 flex items-center gap-1">
            <Shield className="w-5 h-5" /> Compliance
          </Link>
          <Link href="/account" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
            Account
          </Link>
        </div>
      </nav>
    </header>
  );
}
