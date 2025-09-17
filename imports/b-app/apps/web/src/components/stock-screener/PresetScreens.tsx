import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import type { PresetScreen, FilterChangeHandler } from './types';

interface PresetScreensProps {
  presets: PresetScreen[];
  onApply: (preset: PresetScreen) => void;
  activePreset?: string;
}

export const PresetScreens: React.FC<PresetScreensProps> = ({
  presets,
  onApply,
  activePreset,
}) => {
  const getPresetIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'growth stocks':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'value stocks':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case 'dividend stocks':
        return <Star className="h-4 w-4 text-yellow-500" />;
      default:
        return <Zap className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-3">Preset Screens</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.name}
              variant={activePreset === preset.name ? 'default' : 'outline'}
              size="sm"
              className="h-auto py-2 px-3 text-xs"
              onClick={() => onApply(preset.filters)}
            >
              <div className="flex items-center gap-2">
                {getPresetIcon(preset.name)}
                <span>{preset.name}</span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

PresetScreens.displayName = 'PresetScreens';
