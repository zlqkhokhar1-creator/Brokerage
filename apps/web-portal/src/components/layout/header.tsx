'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bell, User, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden hover:bg-accent"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks, news..."
              className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-accent">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-accent">
            <User className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
  );
}