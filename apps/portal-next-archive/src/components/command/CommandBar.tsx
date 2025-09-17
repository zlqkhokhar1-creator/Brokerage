"use client";

import * as React from 'react';
import { Command } from 'cmdk';

export function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      onClick={() => onOpenChange(false)}
    >
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`relative mx-auto mt-24 w-full max-w-2xl px-3 ${open ? '' : 'opacity-0 translate-y-2'} transition-all`} onClick={(e) => e.stopPropagation()}>
        <Command className="rounded-lg border border-border bg-card text-foreground shadow-xl">
          <Command.Input placeholder="Type a command or search…" className="h-12 px-4 border-b border-border bg-transparent outline-none" />
          <Command.List className="max-h-[60vh] overflow-auto">
            <Command.Empty className="p-4 text-sm text-muted-foreground">No results found.</Command.Empty>
            <Command.Group heading="Navigation">
              <Command.Item onSelect={() => (window.location.href = '/dashboard')}>Go to Dashboard</Command.Item>
              <Command.Item onSelect={() => (window.location.href = '/portfolio')}>Open Portfolio</Command.Item>
              <Command.Item onSelect={() => (window.location.href = '/trading')}>Open Trading</Command.Item>
              <Command.Item onSelect={() => (window.location.href = '/ai-insights')}>AI Insights</Command.Item>
            </Command.Group>
            <Command.Group heading="Actions">
              <Command.Item onSelect={() => onOpenChange(false)}>Create Alert</Command.Item>
              <Command.Item onSelect={() => onOpenChange(false)}>New Watchlist</Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}


