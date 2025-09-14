"use client";

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/shell/Shell';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Robo-advisor data
const riskProfiles = [
  { id: 'conservative', name: 'Conservative', description: 'Low risk, stable returns', allocation: { stocks: 30, bonds: 50, cash: 20 } },
  { id: 'moderate', name: 'Moderate', description: 'Balanced risk and return', allocation: { stocks: 60, bonds: 30, cash: 10 } },
  { id: 'aggressive', name: 'Aggressive', description: 'High risk, high potential returns', allocation: { stocks: 80, bonds: 15, cash: 5 } },
  { id: 'very_aggressive', name: 'Very Aggressive', description: 'Maximum risk, maximum potential', allocation: { stocks: 95, bonds: 3, cash: 2 } }
];

const investmentGoals = [
  { id: 'retirement', name: 'Retirement', description: 'Long-term retirement savings' },
  { id: 'wealth_building', name: 'Wealth Building', description: 'Grow your net worth' },
  { id: 'income', name: 'Income Generation', description: 'Generate regular income' },
  { id: 'education', name: 'Education', description: 'Save for education expenses' }
];

const timeHorizons = [
  { id: 'short', name: 'Short-term (1-3 years)', multiplier: 0.8 },
  { id: 'medium', name: 'Medium-term (3-7 years)', multiplier: 1.0 },
  { id: 'long', name: 'Long-term (7+ years)', multiplier: 1.2 }
];

const samplePortfolio = [
  { name: 'US Large Cap', value: 45, color: '#00E6B8' },
  { name: 'International', value: 25, color: '#FFB300' },
  { name: 'Bonds', value: 20, color: '#7FB3FF' },
  { name: 'Cash', value: 10, color: '#A855F7' }
];

const performanceData = [
  { month: 'Jan', conservative: 101.2, moderate: 102.8, aggressive: 104.5 },
  { month: 'Feb', conservative: 101.8, moderate: 103.2, aggressive: 105.1 },
  { month: 'Mar', conservative: 102.1, moderate: 103.9, aggressive: 106.2 },
  { month: 'Apr', conservative: 102.7, moderate: 104.5, aggressive: 107.8 },
  { month: 'May', conservative: 103.2, moderate: 105.1, aggressive: 109.2 },
  { month: 'Jun', conservative: 103.8, moderate: 105.8, aggressive: 110.5 }
];

export default function RoboAdvisorPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [riskProfile, setRiskProfile] = useState('');
  const [investmentGoal, setInvestmentGoal] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);

  const [recommendedPortfolio, setRecommendedPortfolio] = useState(samplePortfolio);
  const [projectedValue, setProjectedValue] = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(0);

  // Calculate recommendations based on user inputs
  useEffect(() => {
    if (riskProfile && investmentGoal && timeHorizon) {
      const profile = riskProfiles.find(p => p.id === riskProfile);
      if (profile) {
        setRecommendedPortfolio([
          { name: 'US Large Cap', value: profile.allocation.stocks, color: '#00E6B8' },
          { name: 'International', value: 20, color: '#FFB300' },
          { name: 'Bonds', value: profile.allocation.bonds, color: '#7FB3FF' },
          { name: 'Cash', value: profile.allocation.cash, color: '#A855F7' }
        ]);

        // Calculate expected return based on risk profile
        const baseReturn = profile.id === 'conservative' ? 0.04 :
                          profile.id === 'moderate' ? 0.06 :
                          profile.id === 'aggressive' ? 0.08 : 0.10;

        const timeMultiplier = timeHorizons.find(t => t.id === timeHorizon)?.multiplier || 1;
        setExpectedReturn(baseReturn * timeMultiplier);

        // Calculate projected value
        const years = timeHorizon === 'short' ? 2 : timeHorizon === 'medium' ? 5 : 10;
        const monthlyRate = expectedReturn / 12;
        const months = years * 12;

        let futureValue = initialInvestment;
        for (let i = 0; i < months; i++) {
          futureValue = (futureValue + monthlyContribution) * (1 + monthlyRate);
        }
        setProjectedValue(Math.round(futureValue));
      }
    }
  }, [riskProfile, investmentGoal, timeHorizon, initialInvestment, monthlyContribution]);

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, 4));
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1));

  return (
    <Shell right={<InspectorPanel />} showWorkspaceTabs={false}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 lg:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                🤖 Robo-Advisor
              </h1>
              <p className="text-muted-foreground mt-2">
                AI-powered portfolio management tailored to your goals
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                AI Powered
              </Badge>
              <Badge variant="outline">
                SECP Compliant
              </Badge>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">{currentStep}/4 steps</span>
          </div>
          <Progress value={(currentStep / 4) * 100} className="h-2" />
        </div>

        {/* Main Content */}
        <Tabs value={`step-${currentStep}`} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="step-1" disabled={currentStep < 1}>Risk Profile</TabsTrigger>
            <TabsTrigger value="step-2" disabled={currentStep < 2}>Goals & Timeline</TabsTrigger>
            <TabsTrigger value="step-3" disabled={currentStep < 3}>Investment Plan</TabsTrigger>
            <TabsTrigger value="step-4" disabled={currentStep < 4}>Portfolio Review</TabsTrigger>
          </TabsList>

          {/* Step 1: Risk Profile */}
          <TabsContent value="step-1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Choose Your Risk Profile</CardTitle>
                <p className="text-muted-foreground">
                  Select the risk level that matches your comfort with market volatility
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {riskProfiles.map((profile) => (
                    <Card
                      key={profile.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        riskProfile === profile.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setRiskProfile(profile.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{profile.name}</h3>
                          {riskProfile === profile.id && <Badge>Selected</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{profile.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Stocks</span>
                            <span>{profile.allocation.stocks}%</span>
                          </div>
                          <Progress value={profile.allocation.stocks} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Goals & Timeline */}
          <TabsContent value="step-2" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Investment Goals & Timeline</CardTitle>
                <p className="text-muted-foreground">
                  Tell us about your financial objectives and time horizon
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="goal">Primary Investment Goal</Label>
                  <Select value={investmentGoal} onValueChange={setInvestmentGoal}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select your primary goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {investmentGoals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="horizon">Investment Time Horizon</Label>
                  <Select value={timeHorizon} onValueChange={setTimeHorizon}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="How long do you plan to invest?" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeHorizons.map((horizon) => (
                        <SelectItem key={horizon.id} value={horizon.id}>
                          {horizon.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: Investment Plan */}
          <TabsContent value="step-3" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Investment Plan</CardTitle>
                <p className="text-muted-foreground">
                  Set your initial investment and contribution amounts
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="initial">Initial Investment Amount</Label>
                  <Input
                    id="initial"
                    type="number"
                    value={initialInvestment}
                    onChange={(e) => setInitialInvestment(Number(e.target.value))}
                    className="mt-2 text-lg font-mono"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <Label htmlFor="monthly">Monthly Contribution</Label>
                  <Input
                    id="monthly"
                    type="number"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                    className="mt-2 text-lg font-mono"
                    placeholder="500"
                  />
                </div>

                {expectedReturn > 0 && (
                  <Alert>
                    <div>📊</div>
                    <AlertDescription>
                      <div className="font-medium mb-2">AI Projection Summary</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Expected Annual Return:</span>
                          <div className="font-semibold text-green-600">
                            {(expectedReturn * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Projected Value:</span>
                          <div className="font-semibold font-mono">
                            ${projectedValue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4: Portfolio Review */}
          <TabsContent value="step-4" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Recommended Allocation */}
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Recommended Portfolio</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={recommendedPortfolio}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {recommendedPortfolio.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {recommendedPortfolio.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>📈 Risk-Adjusted Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="conservative"
                        stroke="#7FB3FF"
                        strokeWidth={2}
                        name="Conservative"
                      />
                      <Line
                        type="monotone"
                        dataKey="moderate"
                        stroke="#00E6B8"
                        strokeWidth={2}
                        name="Moderate"
                      />
                      <Line
                        type="monotone"
                        dataKey="aggressive"
                        stroke="#FFB300"
                        strokeWidth={2}
                        name="Aggressive"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Final Summary */}
            <Card>
              <CardHeader>
                <CardTitle>✅ Ready to Start Investing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Risk Profile</div>
                      <div className="font-semibold">
                        {riskProfiles.find(p => p.id === riskProfile)?.name}
                      </div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Expected Return</div>
                      <div className="font-semibold text-green-600">
                        {(expectedReturn * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <div>🤖</div>
                    <AlertDescription>
                      <strong>AI Recommendation:</strong> This portfolio allocation is optimized for your risk profile and investment goals. The AI model predicts a {((expectedReturn * 100).toFixed(1))}% annual return with moderate volatility.
                    </AlertDescription>
                  </Alert>

                  <div className="flex space-x-4">
                    <Button size="lg" className="flex-1">
                      🚀 Start Investing
                    </Button>
                    <Button variant="outline" size="lg">
                      📋 Save Plan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          <Button
            onClick={nextStep}
            disabled={currentStep === 4}
          >
            Next Step
          </Button>
        </div>
      </div>
    </Shell>
  );
}