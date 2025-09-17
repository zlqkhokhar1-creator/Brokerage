"use client";
'use client';

import { useState, useCallback } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type SearchResult = {
  id: string;
  type: 'stock' | 'etf' | 'crypto' | 'strategy' | 'insight';
  title: string;
  description: string;
  relevance: number;
  metadata?: Record<string, any>;
};

type SearchQuery = {
  text: string;
  filters?: {
    assetType?: string[];
    sector?: string[];
    riskLevel?: string[];
  };
};

export function AdvancedSemanticSearch() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeFilters, setActiveFilters] = useState({
    assetType: [] as string[],
    sector: [] as string[],
    riskLevel: [] as string[],
  });

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      // Simulate API call to semantic search backend
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock results - in a real app, this would come from your search API
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'stock',
          title: 'Tech Stocks with Strong Buy Ratings',
          description: 'Technology sector stocks with 80%+ buy ratings from analysts',
          relevance: 0.95,
          metadata: { sector: 'Technology', rating: 'Strong Buy' }
        },
        {
          id: '2',
          type: 'strategy',
          title: 'Tax-Loss Harvesting Opportunities',
          description: 'Potential tax-saving opportunities in your portfolio',
          relevance: 0.88,
          metadata: { strategyType: 'Tax Optimization' }
        },
        {
          id: '3',
          type: 'insight',
          title: 'Market Sentiment Analysis',
          description: 'Current sentiment trends across major market sectors',
          relevance: 0.82,
          metadata: { updateFrequency: 'Real-time' }
        }
      ];
      
      setResults(mockResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const handleFilterToggle = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(v => v !== value)
        : [...prev[filterType], value]
    }));
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Powered Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for stocks, strategies, or ask a question..."
              className="pl-10 pr-24"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button 
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8"
              onClick={() => handleSearch(query)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : 'Search'}
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-muted-foreground self-center">Try:</span>
            {[
              'Show me undervalued tech stocks',
              'Tax-loss harvesting opportunities',
              'High dividend ETFs'
            ].map((suggestion) => (
              <Badge 
                key={suggestion}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => {
                  setQuery(suggestion);
                  handleSearch(suggestion);
                }}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium">Results</h3>
            <ScrollArea className="h-96 rounded-md border p-4">
              <div className="space-y-4">
                {results.map((result) => (
                  <div 
                    key={result.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.title}</span>
                          <Badge variant="secondary">
                            {result.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.description}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(result.relevance * 100)}% match
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
