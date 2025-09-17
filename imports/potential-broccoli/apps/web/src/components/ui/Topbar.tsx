"use client";

import React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Search, Bell, Sun, Moon, User2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Topbar() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="sticky top-0 z-40 h-14 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-3 py-1 rounded-md">
        Skip to content
      </a>
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input placeholder="Search symbols, pages…" className="pl-9 h-9" aria-label="Search" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link href="/notifications" aria-label="Notifications" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent">
            <Bell className="h-4 w-4" />
          </Link>
          <Link href="/account" aria-label="Account" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
            <User2 className="h-4 w-4 text-primary" />
          </Link>
        </div>
      </div>
    </div>
  );
}

