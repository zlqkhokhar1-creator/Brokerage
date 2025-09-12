import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { 
  Target,
  DollarSign,
  Home,
  GraduationCap,
  Car,
  Plane,
  Heart,
  Building,
  Leaf,
  Factory,
  Fuel,
  Cigarette,
  Shield,
  TrendingUp,
  Calendar,
  ChevronLeft,
  Save,
  Sparkles
} from 'lucide-react';

interface FinancialGoal {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  typicalTimeframe: string;
  suggestedAmount: number;
}

interface EthicalFilter {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  category: 'exclude' | 'include';
}

interface RoboAdvisorProfile {
  goals: Array<{
    goalId: string;
    targetAmount: number;
    timeframe: number; // years
    priority: 'high' | 'medium' | 'low';
  }>;
  riskTolerance: number;
  investmentAmount: number;
  monthlyContribution: number;
  ethicalFilters: string[];
  rebalancingFrequency: 'monthly' | 'quarterly' | 'annually';
  dividendReinvestment: boolean;
  taxLossHarvesting: boolean;
}

const financialGoals: FinancialGoal[] = [
  {
    id: 'retirement',
    name: 'Retirement',
    icon: Target,
    description: 'Build wealth for your golden years',
    typicalTimeframe: '20-40 years',
    suggestedAmount: 500000
  },
  {
    id: 'house',
    name: 'Home Purchase',
    icon: Home,
    description: 'Save for your dream home down payment',
    typicalTimeframe: '3-7 years',
    suggestedAmount: 50000
  },
  {
    id: 'education',
    name: 'Education',
    icon: GraduationCap,
    description: 'Fund education for you or your children',
    typicalTimeframe: '5-15 years',
    suggestedAmount: 100000
  },
  {
    id: 'emergency',
    name: 'Emergency Fund',
    icon: Shield,
    description: 'Build a safety net for unexpected expenses',
    typicalTimeframe: '1-2 years',
    suggestedAmount: 15000
  },
  {
    id: 'travel',
    name: 'Travel & Experiences',
    icon: Plane,
    description: 'Save for adventures and life experiences',
    typicalTimeframe: '1-3 years',
    suggestedAmount: 10000
  },
  {
    id: 'car',
    name: 'Vehicle Purchase',
    icon: Car,
    description: 'Save for a new car or upgrade',
    typicalTimeframe: '2-5 years',
    suggestedAmount: 30000
  }
];

const ethicalFilters: EthicalFilter[] = [
  {
    id: 'no_fossil_fuels',
    name: 'No Fossil Fuels',
    icon: Fuel,
    description: 'Exclude oil, gas, and coal companies',
    category: 'exclude'
  },
  {
    id: 'no_tobacco',
    name: 'No Tobacco',
    icon: Cigarette,
    description: 'Exclude tobacco and related companies',
    category: 'exclude'
  },
  {
    id: 'no_weapons',
    name: 'No Weapons',
    icon: Shield,
    description: 'Exclude defense and weapons manufacturers',
    category: 'exclude'
  },
  {
    id: 'esg_focused',
    name: 'ESG Leaders',
    icon: Leaf,
    description: 'Focus on environmental and social leaders',
    category: 'include'
  },
  {
    id: 'clean_energy',
    name: 'Clean Energy',
    icon: Sparkles,
    description: 'Prioritize renewable energy companies',
    category: 'include'
  },
  {
    id: 'healthcare',
    name: 'Healthcare Innovation',
    icon: Heart,
    description: 'Focus on medical and healthcare advances',
    category: 'include'
  }
];

interface RoboAdvisorOnboardingProps {
  onComplete: (profile: RoboAdvisorProfile) => void;
  onBack: () => void;
}

export function RoboAdvisorOnboarding({ onComplete, onBack }: RoboAdvisorOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  const [profile, setProfile] = useState<RoboAdvisorProfile>({
    goals: [],
    riskTolerance: 5,
    investmentAmount: 10000,
    monthlyContribution: 500,
    ethicalFilters: [],
    rebalancingFrequency: 'quarterly',
    dividendReinvestment: true,
    taxLossHarvesting: true
  });

  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [goalDetails, setGoalDetails] = useState<Record<string, { amount: number; timeframe: number; priority: string }>>({});

  const handleGoalToggle = (goalId: string) => {
    const newSelectedGoals = selectedGoals.includes(goalId)
      ? selectedGoals.filter(id => id !== goalId)
      : [...selectedGoals, goalId];
    
    setSelectedGoals(newSelectedGoals);
    
    if (newSelectedGoals.includes(goalId) && !goalDetails[goalId]) {
      const goal = financialGoals.find(g => g.id === goalId);
      if (goal) {
        setGoalDetails(prev => ({
          ...prev,
          [goalId]: {
            amount: goal.suggestedAmount,
            timeframe: parseInt(goal.typicalTimeframe.split('-')[0]),
            priority: 'medium'
          }
        }));
      }
    }
  };

  const handleEthicalFilterToggle = (filterId: string) => {
    setProfile(prev => ({
      ...prev,
      ethicalFilters: prev.ethicalFilters.includes(filterId)
        ? prev.ethicalFilters.filter(id => id !== filterId)
        : [...prev.ethicalFilters, filterId]
    }));
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

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      const finalProfile: RoboAdvisorProfile = {
        ...profile,
        goals: selectedGoals.map(goalId => ({
          goalId,
          targetAmount: goalDetails[goalId]?.amount || 0,
          timeframe: goalDetails[goalId]?.timeframe || 5,
          priority: goalDetails[goalId]?.priority as 'high' | 'medium' | 'low' || 'medium'
        }))
      };
      onComplete(finalProfile);
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
        <h2 className="text-xl font-semibold mb-2">What are your financial goals?</h2>
        <p className="text-muted-foreground">Select all goals you'd like to work towards</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {financialGoals.map((goal) => {
          const Icon = goal.icon;
          const isSelected = selectedGoals.includes(goal.id);
          
          return (
            <Card
              key={goal.id}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => handleGoalToggle(goal.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-medium">{goal.name}</h3>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Typical timeframe: {goal.typicalTimeframe}
                    </p>
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="ml-auto">
                      Selected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Goal Details</h2>
        <p className="text-muted-foreground">Set target amounts and timeframes for your goals</p>
      </div>

      <div className="space-y-4">
        {selectedGoals.map(goalId => {
          const goal = financialGoals.find(g => g.id === goalId);
          if (!goal) return null;
          
          const Icon = goal.icon;
          const details = goalDetails[goalId] || { amount: goal.suggestedAmount, timeframe: 5, priority: 'medium' };

          return (
            <Card key={goalId}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">{goal.name}</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Target Amount (HKD)</Label>
                    <Input
                      type="number"
                      value={details.amount}
                      onChange={(e) => setGoalDetails(prev => ({
                        ...prev,
                        [goalId]: { ...details, amount: parseInt(e.target.value) || 0 }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Timeframe (years)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[details.timeframe]}
                        onValueChange={(value) => setGoalDetails(prev => ({
                          ...prev,
                          [goalId]: { ...details, timeframe: value[0] }
                        }))}
                        max={40}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1 year</span>
                        <span className="font-medium">{details.timeframe} years</span>
                        <span>40 years</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Priority</Label>
                    <div className="flex gap-2 mt-2">
                      {['high', 'medium', 'low'].map(priority => (
                        <Button
                          key={priority}
                          variant={details.priority === priority ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setGoalDetails(prev => ({
                            ...prev,
                            [goalId]: { ...details, priority }
                          }))}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Risk Assessment</h2>
        <p className="text-muted-foreground">How much risk are you comfortable with?</p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label>Risk Tolerance</Label>
            <div className="text-right">
              <span className={`font-semibold ${getRiskColor(profile.riskTolerance)}`}>
                {getRiskLabel(profile.riskTolerance)}
              </span>
              <p className="text-xs text-muted-foreground">{profile.riskTolerance}/10</p>
            </div>
          </div>
          <Slider
            value={[profile.riskTolerance]}
            onValueChange={(value) => setProfile(prev => ({ ...prev, riskTolerance: value[0] }))}
            max={10}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Very Conservative</span>
            <span>Very Aggressive</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Initial Investment Amount (HKD)</Label>
            <Input
              type="number"
              value={profile.investmentAmount}
              onChange={(e) => setProfile(prev => ({ 
                ...prev, 
                investmentAmount: parseInt(e.target.value) || 0 
              }))}
            />
          </div>

          <div>
            <Label className="mb-2 block">Monthly Contribution (HKD)</Label>
            <Input
              type="number"
              value={profile.monthlyContribution}
              onChange={(e) => setProfile(prev => ({ 
                ...prev, 
                monthlyContribution: parseInt(e.target.value) || 0 
              }))}
            />
          </div>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Risk vs. Return</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-success font-semibold">Low Risk</div>
                <div className="text-xs text-muted-foreground">3-5% returns</div>
              </div>
              <div className="text-center">
                <div className="text-warning font-semibold">Medium Risk</div>
                <div className="text-xs text-muted-foreground">6-10% returns</div>
              </div>
              <div className="text-center">
                <div className="text-destructive font-semibold">High Risk</div>
                <div className="text-xs text-muted-foreground">10-15% returns</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Leaf className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Ethical Investing</h2>
        <p className="text-muted-foreground">Choose your values-based investment preferences</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-3 text-destructive">Exclude from Portfolio</h3>
          <div className="grid grid-cols-1 gap-3">
            {ethicalFilters.filter(filter => filter.category === 'exclude').map(filter => {
              const Icon = filter.icon;
              const isSelected = profile.ethicalFilters.includes(filter.id);
              
              return (
                <Card
                  key={filter.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'border-destructive bg-destructive/5' : 'hover:border-destructive/50'
                  }`}
                  onClick={() => handleEthicalFilterToggle(filter.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-destructive" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{filter.name}</h4>
                        <p className="text-xs text-muted-foreground">{filter.description}</p>
                      </div>
                      <Switch checked={isSelected} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3 text-success">Focus On</h3>
          <div className="grid grid-cols-1 gap-3">
            {ethicalFilters.filter(filter => filter.category === 'include').map(filter => {
              const Icon = filter.icon;
              const isSelected = profile.ethicalFilters.includes(filter.id);
              
              return (
                <Card
                  key={filter.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'border-success bg-success/5' : 'hover:border-success/50'
                  }`}
                  onClick={() => handleEthicalFilterToggle(filter.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-success" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{filter.name}</h4>
                        <p className="text-xs text-muted-foreground">{filter.description}</p>
                      </div>
                      <Switch checked={isSelected} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Advanced Preferences</h2>
        <p className="text-muted-foreground">Fine-tune your investment strategy</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Automatic Rebalancing</Label>
                <p className="text-sm text-muted-foreground">How often should we rebalance your portfolio?</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {['monthly', 'quarterly', 'annually'].map(frequency => (
                <Button
                  key={frequency}
                  variant={profile.rebalancingFrequency === frequency ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProfile(prev => ({ 
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
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Dividend Reinvestment</Label>
                <p className="text-sm text-muted-foreground">Automatically reinvest dividends</p>
              </div>
              <Switch
                checked={profile.dividendReinvestment}
                onCheckedChange={(checked) => setProfile(prev => ({ 
                  ...prev, 
                  dividendReinvestment: checked 
                }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Tax-Loss Harvesting</Label>
                <p className="text-sm text-muted-foreground">Optimize for tax efficiency</p>
              </div>
              <Switch
                checked={profile.taxLossHarvesting}
                onCheckedChange={(checked) => setProfile(prev => ({ 
                  ...prev, 
                  taxLossHarvesting: checked 
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Profile Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Goals:</span>
                <span>{selectedGoals.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span>Risk Level:</span>
                <span className={getRiskColor(profile.riskTolerance)}>
                  {getRiskLabel(profile.riskTolerance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Initial Investment:</span>
                <span>${profile.investmentAmount.toLocaleString()} HKD</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Contribution:</span>
                <span>${profile.monthlyContribution.toLocaleString()} HKD</span>
              </div>
              <div className="flex justify-between">
                <span>Ethical Filters:</span>
                <span>{profile.ethicalFilters.length} applied</span>
              </div>
            </div>
          </CardContent>
        </Card>
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
            <h1 className="font-semibold">Robo-Advisor Setup</h1>
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
          {currentStep === 5 && renderStep5()}
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
            disabled={currentStep === 1 && selectedGoals.length === 0}
          >
            {currentStep === totalSteps ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Complete Setup
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}