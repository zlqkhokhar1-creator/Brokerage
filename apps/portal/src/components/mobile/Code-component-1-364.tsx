"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  Info
} from 'lucide-react';

interface RoboInvestPageProps {
  onNavigate: (page: string) => void;
}

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
      </div>

      <Tabs defaultValue="portfolios" className="px-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

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