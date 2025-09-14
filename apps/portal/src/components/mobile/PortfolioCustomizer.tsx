"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  PieChart,
  BarChart3,
  TrendingUp,
  Shield,
  DollarSign,
  Globe,
  Building,
  Coins,
  Leaf,
  Zap,
  RefreshCw,
  Eye,
  Settings,
  Target,
  Info
} from 'lucide-react';

interface AssetClass {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  defaultAllocation: number;
  minAllocation: number;
  maxAllocation: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
}

interface PortfolioSettings {
  riskLevel: number;
  assetAllocations: Record<string, number>;
  rebalancingFrequency: 'monthly' | 'quarterly' | 'annually';
  dividendReinvestment: boolean;
  taxLossHarvesting: boolean;
  esgFocused: boolean;
  internationalExposure: boolean;
  cryptoAllocation: boolean;
  activeManagement: boolean;
}

const assetClasses: AssetClass[] = [
  {
    id: 'domestic_stocks',
    name: 'Domestic Stocks',
    description: 'Hong Kong and domestic equities',
    icon: Building,
    defaultAllocation: 40,
    minAllocation: 0,
    maxAllocation: 80,
    riskLevel: 'medium',
    expectedReturn: 8.5
  },
  {
    id: 'international_stocks',
    name: 'International Stocks',
    description: 'Global developed market equities',
    icon: Globe,
    defaultAllocation: 25,
    minAllocation: 0,
    maxAllocation: 60,
    riskLevel: 'medium',
    expectedReturn: 9.2
  },
  {
    id: 'bonds',
    name: 'Bonds',
    description: 'Government and corporate bonds',
    icon: Shield,
    defaultAllocation: 20,
    minAllocation: 0,
    maxAllocation: 70,
    riskLevel: 'low',
    expectedReturn: 3.8
  },
  {
    id: 'emerging_markets',
    name: 'Emerging Markets',
    description: 'Developing market equities',
    icon: TrendingUp,
    defaultAllocation: 10,
    minAllocation: 0,
    maxAllocation: 30,
    riskLevel: 'high',
    expectedReturn: 11.5
  },
  {
    id: 'real_estate',
    name: 'Real Estate (REITs)',
    description: 'Real estate investment trusts',
    icon: Building,
    defaultAllocation: 5,
    minAllocation: 0,
    maxAllocation: 25,
    riskLevel: 'medium',
    expectedReturn: 7.2
  },
  {
    id: 'commodities',
    name: 'Commodities',
    description: 'Gold, oil, and other commodities',
    icon: Coins,
    defaultAllocation: 0,
    minAllocation: 0,
    maxAllocation: 15,
    riskLevel: 'high',
    expectedReturn: 6.8
  }
];

interface PortfolioCustomizerProps {
  initialSettings?: PortfolioSettings;
  onSettingsChange: (settings: PortfolioSettings) => void;
  onPreview: (settings: PortfolioSettings) => void;
}

export function PortfolioCustomizer({ 
  initialSettings, 
  onSettingsChange, 
  onPreview 
}: PortfolioCustomizerProps) {
  const [settings, setSettings] = useState<PortfolioSettings>(initialSettings || {
    riskLevel: 5,
    assetAllocations: {
      domestic_stocks: 40,
      international_stocks: 25,
      bonds: 20,
      emerging_markets: 10,
      real_estate: 5,
      commodities: 0
    },
    rebalancingFrequency: 'quarterly',
    dividendReinvestment: true,
    taxLossHarvesting: true,
    esgFocused: false,
    internationalExposure: true,
    cryptoAllocation: false,
    activeManagement: false
  });

  const [activeTab, setActiveTab] = useState<'allocations' | 'settings' | 'preview'>('allocations');

  const updateAllocation = (assetId: string, value: number) => {
    const newAllocations = { ...settings.assetAllocations };
    const oldValue = newAllocations[assetId];
    const difference = value - oldValue;
    
    newAllocations[assetId] = value;
    
    // Redistribute the difference among other assets
    const otherAssets = Object.keys(newAllocations).filter(id => id !== assetId);
    const totalOther = otherAssets.reduce((sum, id) => sum + newAllocations[id], 0);
    
    if (totalOther > 0) {
      otherAssets.forEach(id => {
        const proportion = newAllocations[id] / totalOther;
        newAllocations[id] = Math.max(0, newAllocations[id] - (difference * proportion));
      });
    }
    
    // Ensure total equals 100%
    const total = Object.values(newAllocations).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      const factor = 100 / total;
      Object.keys(newAllocations).forEach(id => {
        newAllocations[id] *= factor;
      });
    }
    
    const newSettings = { ...settings, assetAllocations: newAllocations };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const updateRiskLevel = (risk: number) => {
    // Auto-adjust allocations based on risk level
    let newAllocations = { ...settings.assetAllocations };
    
    if (risk <= 3) {
      // Conservative
      newAllocations = {
        domestic_stocks: 20,
        international_stocks: 15,
        bonds: 50,
        emerging_markets: 5,
        real_estate: 10,
        commodities: 0
      };
    } else if (risk <= 7) {
      // Moderate
      newAllocations = {
        domestic_stocks: 35,
        international_stocks: 25,
        bonds: 25,
        emerging_markets: 10,
        real_estate: 5,
        commodities: 0
      };
    } else {
      // Aggressive
      newAllocations = {
        domestic_stocks: 45,
        international_stocks: 30,
        bonds: 10,
        emerging_markets: 10,
        real_estate: 5,
        commodities: 0
      };
    }
    
    const newSettings = { ...settings, riskLevel: risk, assetAllocations: newAllocations };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const calculatePortfolioMetrics = () => {
    const allocations = settings.assetAllocations;
    const expectedReturn = Object.entries(allocations).reduce((sum, [assetId, allocation]) => {
      const asset = assetClasses.find(a => a.id === assetId);
      return sum + (asset ? asset.expectedReturn * allocation / 100 : 0);
    }, 0);
    
    const riskScore = Object.entries(allocations).reduce((sum, [assetId, allocation]) => {
      const asset = assetClasses.find(a => a.id === assetId);
      const riskValue = asset?.riskLevel === 'low' ? 1 : asset?.riskLevel === 'medium' ? 2 : 3;
      return sum + (riskValue * allocation / 100);
    }, 0);
    
    return { expectedReturn: expectedReturn.toFixed(1), riskScore };
  };

  const getRiskLabel = (risk: number) => {
    if (risk <= 2) return 'Very Conservative';
    if (risk <= 4) return 'Conservative';
    if (risk <= 6) return 'Moderate';
    if (risk <= 8) return 'Aggressive';
    return 'Very Aggressive';
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 2) return 'text-success';
    if (risk <= 4) return 'text-success';
    if (risk <= 6) return 'text-warning';
    if (risk <= 8) return 'text-destructive';
    return 'text-destructive';
  };

  const totalAllocation = Object.values(settings.assetAllocations).reduce((sum, val) => sum + val, 0);
  const metrics = calculatePortfolioMetrics();

  const renderAllocationsTab = () => (
    <div className="space-y-6">
      {/* Risk Level Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Risk Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Risk Tolerance</Label>
              <div className="text-right">
                <span className={`font-semibold ${getRiskColor(settings.riskLevel)}`}>
                  {getRiskLabel(settings.riskLevel)}
                </span>
                <p className="text-xs text-muted-foreground">{settings.riskLevel}/10</p>
              </div>
            </div>
            <Slider
              value={[settings.riskLevel]}
              onValueChange={(value) => updateRiskLevel(value[0])}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Asset Allocation
            <Badge variant="outline" className={totalAllocation === 100 ? 'border-success text-success' : 'border-destructive text-destructive'}>
              {totalAllocation.toFixed(0)}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assetClasses.map((asset) => {
              const Icon = asset.icon;
              const allocation = settings.assetAllocations[asset.id] || 0;
              
              return (
                <div key={asset.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="font-medium">{asset.name}</Label>
                        <p className="text-xs text-muted-foreground">{asset.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{allocation.toFixed(1)}%</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs ${
                          asset.riskLevel === 'low' ? 'border-success text-success' :
                          asset.riskLevel === 'medium' ? 'border-warning text-warning' :
                          'border-destructive text-destructive'
                        }`}
                      >
                        {asset.riskLevel}
                      </Badge>
                    </div>
                  </div>
                  <Slider
                    value={[allocation]}
                    onValueChange={(value) => updateAllocation(asset.id, value[0])}
                    max={asset.maxAllocation}
                    min={asset.minAllocation}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{asset.minAllocation}%</span>
                    <span>Expected: {asset.expectedReturn}%</span>
                    <span>{asset.maxAllocation}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateRiskLevel(2)}
            >
              Conservative
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateRiskLevel(5)}
            >
              Balanced
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateRiskLevel(8)}
            >
              Growth
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Portfolio Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Automatic Rebalancing</Label>
              <p className="text-sm text-muted-foreground">How often to rebalance portfolio</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['monthly', 'quarterly', 'annually'].map(frequency => (
              <Button
                key={frequency}
                variant={settings.rebalancingFrequency === frequency ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  rebalancingFrequency: frequency as 'monthly' | 'quarterly' | 'annually'
                }))}
              >
                {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Dividend Reinvestment</Label>
              <p className="text-sm text-muted-foreground">Automatically reinvest dividends</p>
            </div>
            <Switch
              checked={settings.dividendReinvestment}
              onCheckedChange={(checked) => setSettings(prev => ({ 
                ...prev, 
                dividendReinvestment: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Tax-Loss Harvesting</Label>
              <p className="text-sm text-muted-foreground">Optimize for tax efficiency</p>
            </div>
            <Switch
              checked={settings.taxLossHarvesting}
              onCheckedChange={(checked) => setSettings(prev => ({ 
                ...prev, 
                taxLossHarvesting: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">ESG Focused</Label>
              <p className="text-sm text-muted-foreground">Environmental, Social, Governance focus</p>
            </div>
            <Switch
              checked={settings.esgFocused}
              onCheckedChange={(checked) => setSettings(prev => ({ 
                ...prev, 
                esgFocused: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">International Exposure</Label>
              <p className="text-sm text-muted-foreground">Include global markets</p>
            </div>
            <Switch
              checked={settings.internationalExposure}
              onCheckedChange={(checked) => setSettings(prev => ({ 
                ...prev, 
                internationalExposure: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Crypto Allocation</Label>
              <p className="text-sm text-muted-foreground">Include cryptocurrency ETFs</p>
            </div>
            <Switch
              checked={settings.cryptoAllocation}
              onCheckedChange={(checked) => setSettings(prev => ({ 
                ...prev, 
                cryptoAllocation: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Active Management</Label>
              <p className="text-sm text-muted-foreground">Allow active fund managers</p>
            </div>
            <Switch
              checked={settings.activeManagement}
              onCheckedChange={(checked) => setSettings(prev => ({ 
                ...prev, 
                activeManagement: checked 
              }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">+{metrics.expectedReturn}%</div>
              <p className="text-xs text-muted-foreground">Expected Annual Return</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getRiskColor(settings.riskLevel)}`}>
                {getRiskLabel(settings.riskLevel)}
              </div>
              <p className="text-xs text-muted-foreground">Risk Level</p>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(settings.assetAllocations)
              .filter(([_, allocation]) => allocation > 0)
              .sort(([_, a], [__, b]) => b - a)
              .map(([assetId, allocation]) => {
                const asset = assetClasses.find(a => a.id === assetId);
                if (!asset) return null;
                
                const Icon = asset.icon;
                
                return (
                  <div key={assetId} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{asset.name}</span>
                        <span className="font-semibold">{allocation.toFixed(1)}%</span>
                      </div>
                      <Progress value={allocation} className="h-2" />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Active Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'dividendReinvestment', label: 'Dividend Reinvestment' },
              { key: 'taxLossHarvesting', label: 'Tax-Loss Harvesting' },
              { key: 'esgFocused', label: 'ESG Focused' },
              { key: 'internationalExposure', label: 'International' },
              { key: 'cryptoAllocation', label: 'Crypto Allocation' },
              { key: 'activeManagement', label: 'Active Management' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  settings[key as keyof PortfolioSettings] ? 'bg-success' : 'bg-muted'
                }`} />
                <span className={`text-sm ${
                  settings[key as keyof PortfolioSettings] ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rebalancing */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Rebalancing Frequency</Label>
              <p className="text-sm text-muted-foreground">
                Portfolio will be rebalanced {settings.rebalancingFrequency}
              </p>
            </div>
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => onPreview(settings)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Detailed Preview
        </Button>
        <Button 
          className="flex-1"
          onClick={() => onSettingsChange(settings)}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Start Investing
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="mt-6">
          {renderAllocationsTab()}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          {renderSettingsTab()}
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          {renderPreviewTab()}
        </TabsContent>
      </Tabs>

      {/* Portfolio Health Indicator */}
      <Card className={`${
        totalAllocation === 100 ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Info className={`h-5 w-5 ${totalAllocation === 100 ? 'text-success' : 'text-warning'}`} />
            <div>
              <h3 className="font-semibold">Portfolio Status</h3>
              <p className="text-sm text-muted-foreground">
                {totalAllocation === 100 
                  ? 'Portfolio is properly allocated and ready for investment'
                  : `Allocation total is ${totalAllocation.toFixed(0)}%. Adjust to reach 100%`
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}