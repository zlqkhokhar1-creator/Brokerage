"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { 
  Target,
  TrendingUp,
  Shield,
  Clock,
  DollarSign,
  Building2,
  Zap,
  Globe,
  Coins,
  Award,
  ChevronLeft,
  Save,
  RefreshCw
} from 'lucide-react';

interface PreferencesSetupProps {
  onBack: () => void;
  onSave: (preferences: UserPreferences) => void;
  currentPreferences?: UserPreferences;
}

export interface UserPreferences {
  riskTolerance: number; // 1-10 scale
  investmentGoal: string;
  timeHorizon: string;
  sectors: string[];
  investmentAmount: number;
  dividendFocus: boolean;
  esgFocus: boolean;
  internationalExposure: boolean;
  cryptoInterest: boolean;
  maxPositionSize: number;
  rebalanceFrequency: string;
}

const investmentGoals = [
  { id: 'growth', label: 'Long-term Growth', icon: TrendingUp, description: 'Capital appreciation over time' },
  { id: 'income', label: 'Income Generation', icon: DollarSign, description: 'Regular dividend income' },
  { id: 'preservation', label: 'Capital Preservation', icon: Shield, description: 'Protect and maintain wealth' },
  { id: 'balanced', label: 'Balanced Growth', icon: Target, description: 'Mix of growth and income' }
];

const timeHorizons = [
  { id: 'short', label: '1-3 years', value: '1-3 years' },
  { id: 'medium', label: '3-7 years', value: '3-7 years' },
  { id: 'long', label: '7-15 years', value: '7-15 years' },
  { id: 'verylong', label: '15+ years', value: '15+ years' }
];

const sectors = [
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'healthcare', label: 'Healthcare', emoji: '🏥' },
  { id: 'finance', label: 'Financial Services', emoji: '🏦' },
  { id: 'energy', label: 'Energy', emoji: '⚡' },
  { id: 'consumer', label: 'Consumer Goods', emoji: '🛍️' },
  { id: 'industrials', label: 'Industrials', emoji: '🏭' },
  { id: 'reits', label: 'Real Estate', emoji: '🏠' },
  { id: 'utilities', label: 'Utilities', emoji: '💡' },
  { id: 'materials', label: 'Materials', emoji: '⚒️' },
  { id: 'telecom', label: 'Telecommunications', emoji: '📡' }
];

const rebalanceOptions = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'semiannual', label: 'Semi-annually' },
  { id: 'annual', label: 'Annually' }
];

export function PreferencesSetup({ onBack, onSave, currentPreferences }: PreferencesSetupProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(currentPreferences || {
    riskTolerance: 5,
    investmentGoal: 'growth',
    timeHorizon: '7-15 years',
    sectors: ['technology', 'healthcare'],
    investmentAmount: 10000,
    dividendFocus: false,
    esgFocus: false,
    internationalExposure: true,
    cryptoInterest: false,
    maxPositionSize: 5,
    rebalanceFrequency: 'quarterly'
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleSectorToggle = (sectorId: string) => {
    setPreferences(prev => ({
      ...prev,
      sectors: prev.sectors.includes(sectorId)
        ? prev.sectors.filter(s => s !== sectorId)
        : [...prev.sectors, sectorId]
    }));
  };

  const getRiskLabel = (risk: number) => {
    if (risk <= 2) return 'Very Low';
    if (risk <= 4) return 'Low';
    if (risk <= 6) return 'Medium';
    if (risk <= 8) return 'High';
    return 'Very High';
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 2) return 'text-success';
    if (risk <= 4) return 'text-success';
    if (risk <= 6) return 'text-warning';
    if (risk <= 8) return 'text-destructive';
    return 'text-destructive';
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onSave(preferences);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-8 rounded-full transition-colors ${
            i + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Target className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Investment Goals</h2>
        <p className="text-muted-foreground">What are you hoping to achieve?</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {investmentGoals.map((goal) => {
          const Icon = goal.icon;
          return (
            <Card
              key={goal.id}
              className={`cursor-pointer transition-colors ${
                preferences.investmentGoal === goal.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setPreferences(prev => ({ ...prev, investmentGoal: goal.id }))}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-medium">{goal.label}</h3>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4" />
            Investment Time Horizon
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {timeHorizons.map((horizon) => (
              <Button
                key={horizon.id}
                variant={preferences.timeHorizon === horizon.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreferences(prev => ({ ...prev, timeHorizon: horizon.value }))}
              >
                {horizon.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Risk Profile</h2>
        <p className="text-muted-foreground">How much risk are you comfortable with?</p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label>Risk Tolerance</Label>
            <div className="text-right">
              <span className={`font-semibold ${getRiskColor(preferences.riskTolerance)}`}>
                {getRiskLabel(preferences.riskTolerance)}
              </span>
              <p className="text-xs text-muted-foreground">{preferences.riskTolerance}/10</p>
            </div>
          </div>
          <Slider
            value={[preferences.riskTolerance]}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, riskTolerance: value[0] }))}
            max={10}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Maximum Position Size (%)</Label>
          <Slider
            value={[preferences.maxPositionSize]}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, maxPositionSize: value[0] }))}
            max={20}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>1%</span>
            <span className="font-medium">{preferences.maxPositionSize}%</span>
            <span>20%</span>
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Investment Amount (HKD)</Label>
          <div className="grid grid-cols-3 gap-2">
            {[5000, 10000, 25000, 50000, 100000, 250000].map((amount) => (
              <Button
                key={amount}
                variant={preferences.investmentAmount === amount ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreferences(prev => ({ ...prev, investmentAmount: amount }))}
              >
                ${amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sector Preferences</h2>
        <p className="text-muted-foreground">Which industries interest you?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sectors.map((sector) => (
          <Card
            key={sector.id}
            className={`cursor-pointer transition-colors ${
              preferences.sectors.includes(sector.id)
                ? 'border-primary bg-primary/5'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleSectorToggle(sector.id)}
          >
            <CardContent className="p-3">
              <div className="text-center">
                <div className="text-2xl mb-1">{sector.emoji}</div>
                <p className="text-sm font-medium">{sector.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted/30 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Selected: {preferences.sectors.length} sectors
          {preferences.sectors.length < 3 && ' (Select at least 3 for diversification)'}
        </p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Award className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Advanced Preferences</h2>
        <p className="text-muted-foreground">Fine-tune your investment strategy</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Dividend Focus</Label>
              <p className="text-sm text-muted-foreground">Prioritize dividend-paying stocks</p>
            </div>
            <Switch
              checked={preferences.dividendFocus}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, dividendFocus: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">ESG Focus</Label>
              <p className="text-sm text-muted-foreground">Environmental, Social, Governance</p>
            </div>
            <Switch
              checked={preferences.esgFocus}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, esgFocus: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">International Exposure</Label>
              <p className="text-sm text-muted-foreground">Include global markets</p>
            </div>
            <Switch
              checked={preferences.internationalExposure}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, internationalExposure: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Crypto Interest</Label>
              <p className="text-sm text-muted-foreground">Include crypto ETFs</p>
            </div>
            <Switch
              checked={preferences.cryptoInterest}
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, cryptoInterest: checked }))}
            />
          </div>
        </div>

        <Separator />

        <div>
          <Label className="mb-3 block">Rebalance Frequency</Label>
          <div className="grid grid-cols-2 gap-2">
            {rebalanceOptions.map((option) => (
              <Button
                key={option.id}
                variant={preferences.rebalanceFrequency === option.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreferences(prev => ({ ...prev, rebalanceFrequency: option.id }))}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Setup Preferences</h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </div>

        {/* Progress */}
        {renderStepIndicator()}

        {/* Content */}
        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="flex-1"
          >
            {currentStep === 1 ? 'Back' : 'Previous'}
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1"
            disabled={currentStep === 3 && preferences.sectors.length < 2}
          >
            {currentStep === totalSteps ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>

        {/* Summary */}
        {currentStep === totalSteps && (
          <Card className="mt-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Preference Summary</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Goal: {investmentGoals.find(g => g.id === preferences.investmentGoal)?.label}</p>
                <p>Risk: {getRiskLabel(preferences.riskTolerance)}</p>
                <p>Time: {preferences.timeHorizon}</p>
                <p>Sectors: {preferences.sectors.length} selected</p>
                <p>Amount: ${preferences.investmentAmount.toLocaleString()} HKD</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}