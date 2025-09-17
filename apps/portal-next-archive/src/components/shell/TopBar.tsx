"use client";

import { useEffect, useState } from 'react';
import { CommandBar } from '@/components/command/CommandBar';
import { TickerTape } from '@/components/market/TickerTape';
import { Bell, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const [showCommand, setShowCommand] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommand(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="h-14 px-3 lg:px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => setShowCommand(true)}
            className="group w-full md:w-[46vw] max-w-2xl hidden md:flex items-center gap-2 px-3 h-9 rounded-md border border-input bg-input text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors"
            aria-label="Open command bar"
          >
            <span className="text-xs">Search, jump, or ask AI…</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-border">⌘K</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <User className="h-4 w-4 mr-2" />
            Account
          </Button>
        </div>
      </div>
      <div className="border-t border-border">
        <TickerTape />
      </div>
      <CommandBar open={showCommand} onOpenChange={setShowCommand} />
    </div>
  );
}


