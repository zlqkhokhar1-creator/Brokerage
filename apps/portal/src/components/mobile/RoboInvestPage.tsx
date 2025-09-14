"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { RoboAdvisorOnboarding } from './RoboAdvisorOnboarding';
import { GoalTrackingDashboard } from './GoalTrackingDashboard';
import { PortfolioCustomizer } from './PortfolioCustomizer';
import { 
  Bot, 
  TrendingUp, 
  Shield, 
  Zap, 
  PieChart, 
  ArrowRight,
  DollarSign,
  Target,
  BarChart3,
  Info,
  Settings,
  Play,
  Pause,
  Edit3,
  Plus
} from 'lucide-react';

interface RoboInvestPageProps {
  onNavigate: (page: string) => void;
}

type ViewMode = 'dashboard' | 'onboarding' | 'goals' | 'portfolio-customizer' | 'portfolios' | 'performance';

const roboPortfolios = [
  {
    id: 1,
    name: "Conservative Growth",
    description: "Low-risk portfolio focused on stable returns",
    expectedReturn: "5-8%",
    risk: "Low",
    allocation: {
      bonds: 60,
      stocks: 30,
      commodities: 10
    },
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  {
    id: 2,
    name: "Balanced Portfolio",
    description: "Moderate risk with balanced growth potential",
    expectedReturn: "8-12%",
    risk: "Medium",
    allocation: {
      stocks: 50,
      bonds: 35,
      commodities: 15
    },
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  {
    id: 3,
    name: "Aggressive Growth",
    description: "High-growth potential with higher volatility",
    expectedReturn: "12-18%",
    risk: "High",
    allocation: {
      stocks: 70,
      bonds: 20,
      commodities: 10
    },
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  }
];

const performanceData = [
  { period: "1M", value: "+2.1%" },
  { period: "3M", value: "+6.8%" },
  { period: "6M", value: "+12.3%" },
  { period: "1Y", value: "+18.7%" },
  { period: "3Y", value: "+45.2%" }
];

export function RoboInvestPage({ onNavigate }: RoboInvestPageProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isManualMode, setIsManualMode] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [roboProfile, setRoboProfile] = useState<any>(null);

  const handleOnboardingComplete = (profile: any) => {
    setRoboProfile(profile);
    setHasCompletedOnboarding(true);
    setCurrentView('dashboard');
    // Save to localStorage or backend
    localStorage.setItem('robo_profile', JSON.stringify(profile));
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
  };

  // Show onboarding if not completed
  if (currentView === 'onboarding') {
    return (
      <RoboAdvisorOnboarding
        onComplete={handleOnboardingComplete}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  // Show goals dashboard
  if (currentView === 'goals') {
    return (
      <div className="pb-4">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('dashboard')}>
            <ArrowRight className="h-4 w-4 rotate-180" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Goal Tracking</h1>
            <p className="text-sm text-muted-foreground">Monitor your progress</p>
          </div>
        </div>
        <div className="px-4">
          <GoalTrackingDashboard
            onEditGoal={(goalId) => console.log('Edit goal:', goalId)}
            onAddGoal={() => console.log('Add new goal')}
          />
        </div>
      </div>
    );
  }

  // Show portfolio customizer
  if (currentView === 'portfolio-customizer') {
    return (
      <div className="pb-4">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('dashboard')}>
            <ArrowRight className="h-4 w-4 rotate-180" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Portfolio Customizer</h1>
            <p className="text-sm text-muted-foreground">Customize your investment strategy</p>
          </div>
        </div>
        <div className="px-4">
          <PortfolioCustomizer
            onSettingsChange={(settings) => {
              console.log('Settings changed:', settings);
              setCurrentView('dashboard');
            }}
            onPreview={(settings) => console.log('Preview:', settings)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 m-4 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Robo Advisor</h1>
            <p className="text-muted-foreground">Automated investing made simple</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="h-4 w-4 text-success" />
              <span className="font-semibold">Secure</span>
            </div>
            <p className="text-xs text-muted-foreground">Bank-level security</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-4 w-4 text-warning" />
              <span className="font-semibold">Automated</span>
            </div>
            <p className="text-xs text-muted-foreground">24/7 rebalancing</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-semibold">Optimized</span>
            </div>
            <p className="text-xs text-muted-foreground">AI-powered</p>
          </div>
        </div>
        
        {/* Management Mode Toggle */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Portfolio Management</Label>
              <p className="text-xs text-muted-foreground">
                {isManualMode ? 'Manual control enabled' : 'Automated management active'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Auto</span>
              <Switch
                checked={isManualMode}
                onCheckedChange={setIsManualMode}
              />
              <span className="text-xs text-muted-foreground">Manual</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setCurrentView('goals')}
          >
            <Target className="h-4 w-4" />
            Track Goals
          </Button>
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setCurrentView(hasCompletedOnboarding ? 'portfolio-customizer' : 'onboarding')}
          >
            {hasCompletedOnboarding ? (
              <>
                <Settings className="h-4 w-4" />
                Customize
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Get Started
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={hasCompletedOnboarding ? "dashboard" : "portfolios"} className="px-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-6">
          {hasCompletedOnboarding ? (
            <>
              {/* Portfolio Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Portfolio Status
                    <Badge variant={isManualMode ? "secondary" : "default"} className="ml-auto">
                      {isManualMode ? (
                        <>
                          <Pause className="h-3 w-3 mr-1" />
                          Manual
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Active
                        </>
                      )}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-muted-foreground text-sm">Total Value</span>
                      <p className="text-2xl font-bold text-success">$85,420</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Total Return</span>
                      <p className="text-2xl font-bold text-success">+12.8%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Risk Level</span>
                      <span className="font-medium">Moderate</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Rebalanced</span>
                      <span className="font-medium">3 days ago</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Next Rebalancing</span>
                      <span className="font-medium">In 27 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Goals Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Active Goals
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentView('goals')}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Retirement Fund</span>
                        <span>17%</span>
                      </div>
                      <Progress value={17} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Home Down Payment</span>
                        <span>40%</span>
                      </div>
                      <Progress value={40} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Emergency Fund</span>
                        <span>74%</span>
                      </div>
                      <Progress value={74} className="h-2" />
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => setCurrentView('goals')}
                  >
                    View All Goals
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-success rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">Portfolio rebalanced</p>
                        <p className="text-xs text-muted-foreground">3 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">Monthly contribution received</p>
                        <p className="text-xs text-muted-foreground">1 week ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-warning rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">Goal progress milestone reached</p>
                        <p className="text-xs text-muted-foreground">2 weeks ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Onboarding CTA */
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <Bot className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Get Started with Robo-Advisor</h3>
                <p className="text-muted-foreground mb-4">
                  Complete our personalized setup to create your custom investment strategy based on your goals and preferences.
                </p>
                <Button onClick={() => setCurrentView('onboarding')}>
                  <Target className="h-4 w-4 mr-2" />
                  Start Setup
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="portfolios" className="space-y-4 mt-6">
          <div className="space-y-4">
            {roboPortfolios.map((portfolio) => (
              <Card 
                key={portfolio.id}
                className={`transition-all duration-200 cursor-pointer ${
                  selectedPortfolio === portfolio.id 
                    ? `${portfolio.borderColor} border-2 ${portfolio.bgColor}` 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedPortfolio(
                  selectedPortfolio === portfolio.id ? null : portfolio.id
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {portfolio.description}
                      </p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`${portfolio.color} ${portfolio.bgColor}`}
                    >
                      {portfolio.risk} Risk
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Expected Return</span>
                    </div>
                    <span className={`font-semibold ${portfolio.color}`}>
                      {portfolio.expectedReturn}
                    </span>
                  </div>

                  {/* Asset Allocation */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PieChart className="h-4 w-4" />
                      <span>Asset Allocation</span>
                    </div>
                    
                    {Object.entries(portfolio.allocation).map(([asset, percentage]) => (
                      <div key={asset}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{asset}</span>
                          <span>{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    ))}
                  </div>

                  {selectedPortfolio === portfolio.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('funding');
                        }}
                      >
                        Start Investing
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">How It Works</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• AI analyzes market conditions 24/7</li>
                    <li>• Automatic rebalancing keeps you on track</li>
                    <li>• Diversified portfolios reduce risk</li>
                    <li>• Low fees maximize your returns</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Historical Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {performanceData.map((data) => (
                  <div key={data.period} className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">
                      {data.period}
                    </div>
                    <div className="font-semibold text-success">
                      {data.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total Assets Under Management</span>
                  <span className="font-semibold">$2.4B</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average Portfolio Size</span>
                  <span className="font-semibold">$12,500</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Management Fee</span>
                  <span className="font-semibold">0.25% annually</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Minimum Investment</span>
                  <span className="font-semibold">$100</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full"
            onClick={() => onNavigate('funding')}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Start Your Investment Journey
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}