import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { StockCard } from './StockCard';
import { StockData } from './types';

interface ResultsListProps {
  results: StockData[];
  loading: boolean;
  totalResults: number;
  onSave: (symbol: string) => void;
  savedScreens: string[];
  onRefresh: () => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({
  results,
  loading,
  totalResults,
  onSave,
  savedScreens,
  onRefresh,
}) => {
  const handleExportCSV = (data: StockData[]) => {
    const csvContent = [
      ['Symbol', 'Name', 'Price', 'Change', 'Change %', 'Market Cap', 'P/E', 'Sector', 'Exchange'],
      ...data.map(stock => [
        `"${stock.symbol}"`,
        `"${stock.name}"`,
        stock.price.toFixed(2),
        stock.change.toFixed(2),
        stock.changePercent.toFixed(2) + '%',
        stock.marketCap.toLocaleString(),
        stock.peRatio?.toFixed(2) || 'N/A',
        `"${stock.sector}"`,
        `"${stock.exchange}"`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stocks-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Results: {results.length} of {totalResults} stocks
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={results.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No stocks match your current filters. Try adjusting your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((stock) => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                onSave={onSave}
                isSaved={savedScreens.includes(stock.symbol)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ResultsList.displayName = 'ResultsList';
