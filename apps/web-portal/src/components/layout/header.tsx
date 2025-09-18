'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Bell, 
  User, 
  Menu, 
  Settings, 
  LogOut,
  ChevronDown,
  Monitor
} from 'lucide-react';
import { useThemeStore } from '@/lib/stores/theme-store';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { currentTheme, setTheme, availableThemes } = useThemeStore();

  return (
    <header className="bg-card border-b border-border px-6 py-4 shadow-sm sticky top-0 z-30">
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
          
          {/* Desktop Logo */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-lg text-foreground">Invest Pro</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg mx-4 md:mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks, news, or symbols..."
              className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary/20 w-full"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Theme Selector */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-accent"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
            >
              <Monitor className="h-5 w-5 text-muted-foreground" />
            </Button>
            
            {showThemeMenu && (
              <div className="absolute right-0 top-12 w-48 bg-card border border-border rounded-lg shadow-lg p-2 z-50">
                <div className="space-y-1">
                  {availableThemes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setTheme(theme.id);
                        setShowThemeMenu(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        currentTheme.id === theme.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.preview.primary }}
                      />
                      <span>{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="hover:bg-accent relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <Badge 
              variant="destructive" 
              size="sm" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="hover:bg-accent gap-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="hidden md:block text-sm font-medium">John Doe</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 w-56 bg-card border border-border rounded-lg shadow-lg p-2 z-50">
                <div className="space-y-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">John Doe</p>
                    <p className="text-xs text-muted-foreground">john.doe@example.com</p>
                  </div>
                  
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Profile</span>
                  </button>
                  
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </button>
                  
                  <div className="border-t border-border my-1" />
                  
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-destructive">
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}