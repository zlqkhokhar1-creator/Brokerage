'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Trading
  { key: 'Ctrl + B', description: 'Buy selected stock', category: 'Trading' },
  { key: 'Ctrl + S', description: 'Sell selected stock', category: 'Trading' },
  { key: 'Ctrl + M', description: 'Market order', category: 'Trading' },
  { key: 'Ctrl + L', description: 'Limit order', category: 'Trading' },
  { key: 'Ctrl + T', description: 'Stop order', category: 'Trading' },
  { key: 'Ctrl + Enter', description: 'Submit order', category: 'Trading' },
  { key: 'Escape', description: 'Cancel order', category: 'Trading' },
  
  // Navigation
  { key: 'Ctrl + 1', description: 'Go to Dashboard', category: 'Navigation' },
  { key: 'Ctrl + 2', description: 'Go to Markets', category: 'Navigation' },
  { key: 'Ctrl + 3', description: 'Go to Portfolio', category: 'Navigation' },
  { key: 'Ctrl + 4', description: 'Go to Trading', category: 'Navigation' },
  { key: 'Ctrl + 5', description: 'Go to AI Dashboard', category: 'Navigation' },
  { key: 'Ctrl + /', description: 'Show shortcuts', category: 'Navigation' },
  
  // Chart
  { key: '1', description: '1 Day view', category: 'Chart' },
  { key: '5', description: '5 Day view', category: 'Chart' },
  { key: 'M', description: '1 Month view', category: 'Chart' },
  { key: '3', description: '3 Month view', category: 'Chart' },
  { key: 'Y', description: '1 Year view', category: 'Chart' },
  { key: 'F', description: 'Fullscreen chart', category: 'Chart' },
  
  // General
  { key: 'Ctrl + K', description: 'Command palette', category: 'General' },
  { key: 'Ctrl + D', description: 'Toggle dark mode', category: 'General' },
  { key: 'Ctrl + R', description: 'Refresh data', category: 'General' },
  { key: 'Ctrl + W', description: 'Close current tab', category: 'General' },
];

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(shortcuts.map(s => s.category)))];

  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesSearch = shortcut.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shortcut.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>

          {/* Shortcuts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredShortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="font-medium text-sm">{shortcut.description}</div>
                  <div className="text-xs text-muted-foreground">{shortcut.category}</div>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {shortcut.key}
                </Badge>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> to close
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
