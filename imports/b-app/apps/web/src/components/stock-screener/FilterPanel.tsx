import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import type { FilterPanelProps, FilterChangeHandler, StockFilters } from './types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: 'compact'
  }).format(value);
};

export const FilterPanel: React.FC<FilterPanelProps> = React.memo(({
  filters,
  sectors,
  exchanges,
  onFilterChange,
  onReset,
}) => {
  const handleRangeChange = useCallback((key: keyof StockFilters, value: number[]) => {
    onFilterChange(key, { min: value[0], max: value[1] } as any);
  }, [onFilterChange]);

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Filters</CardTitle>
        <button
          onClick={onReset}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center"
          aria-label="Reset filters"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Reset
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="sector">Sector</Label>
            <Select
              value={filters.sector}
              onValueChange={(value) => onFilterChange('sector', value)}
            >
              <SelectTrigger id="sector">
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="exchange">Exchange</Label>
            <Select
              value={filters.exchange}
              onValueChange={(value) => onFilterChange('exchange', value)}
            >
              <SelectTrigger id="exchange">
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exchanges</SelectItem>
                {exchanges.map((exchange) => (
                  <SelectItem key={exchange} value={exchange}>
                    {exchange}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Market Cap: {formatCurrency(filters.marketCap.min)} - {formatCurrency(filters.marketCap.max)}</Label>
            <Slider
              min={0}
              max={1000000000000}
              step={1000000000}
              value={[filters.marketCap.min, filters.marketCap.max]}
              onValueChange={(value) => handleRangeChange('marketCap', value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>P/E Ratio: {filters.pe.min} - {filters.pe.max}</Label>
            <Slider
              min={0}
              max={100}
              step={0.1}
              value={[filters.pe.min, filters.pe.max]}
              onValueChange={(value) => handleRangeChange('pe', value)}
              className="mt-2"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FilterPanel.displayName = 'FilterPanel';
