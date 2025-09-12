import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { AnimatedCard } from '../ui/AnimatedCard';
import { Button } from '../ui/Button';
import { fadeIn, staggerContainer } from '../../animations';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  PieChart,
  BarChart3,
  Zap,
  Award,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Calculator
} from 'lucide-react';

interface SimulationParams {
  initialAmount: number;
  monthlyContribution: number;
  investmentPeriod: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  investmentType: 'stocks' | 'mutualFunds' | 'mixed';
}

interface SimulationResult {
  finalAmount: number;
  totalContributions: number;
  totalReturns: number;
  annualizedReturn: number;
  bestCase: number;
  worstCase: number;
}

export const InvestmentSimulator: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>({
    initialAmount: 10000,
    monthlyContribution: 5000,
    investmentPeriod: 5,
    riskLevel: 'moderate',
    investmentType: 'mixed'
  });

  const [results, setResults] = useState<SimulationResult>({
    finalAmount: 0,
    totalContributions: 0,
    totalReturns: 0,
    annualizedReturn: 0,
    bestCase: 0,
    worstCase: 0
  });

  const [isSimulating, setIsSimulating] = useState(false);

  const riskProfiles = {
    conservative: { expectedReturn: 8, volatility: 5, name: 'Conservative' },
    moderate: { expectedReturn: 12, volatility: 10, name: 'Moderate' },
    aggressive: { expectedReturn: 16, volatility: 15, name: 'Aggressive' }
  };

  const investmentTypes = {
    stocks: { name: 'Individual Stocks', multiplier: 1.1, risk: 'High' },
    mutualFunds: { name: 'Mutual Funds', multiplier: 0.95, risk: 'Medium' },
    mixed: { name: 'Mixed Portfolio', multiplier: 1.0, risk: 'Balanced' }
  };

  const calculateReturns = () => {
    const profile = riskProfiles[params.riskLevel];
    const type = investmentTypes[params.investmentType];
    
    const adjustedReturn = profile.expectedReturn * type.multiplier;
    const monthlyReturn = adjustedReturn / 100 / 12;
    const months = params.investmentPeriod * 12;
    
    // Future value of initial amount
    const futureValueInitial = params.initialAmount * Math.pow(1 + adjustedReturn / 100, params.investmentPeriod);
    
    // Future value of monthly contributions (annuity)
    const futureValueContributions = params.monthlyContribution * 
      ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);
    
    const finalAmount = futureValueInitial + futureValueContributions;
    const totalContributions = params.initialAmount + (params.monthlyContribution * months);
    const totalReturns = finalAmount - totalContributions;
    
    // Best and worst case scenarios
    const bestCaseReturn = adjustedReturn + profile.volatility;
    const worstCaseReturn = Math.max(0, adjustedReturn - profile.volatility);
    
    const bestCase = params.initialAmount * Math.pow(1 + bestCaseReturn / 100, params.investmentPeriod) +
      params.monthlyContribution * ((Math.pow(1 + bestCaseReturn / 100 / 12, months) - 1) / (bestCaseReturn / 100 / 12));
    
    const worstCase = params.initialAmount * Math.pow(1 + worstCaseReturn / 100, params.investmentPeriod) +
      params.monthlyContribution * ((Math.pow(1 + worstCaseReturn / 100 / 12, months) - 1) / (worstCaseReturn / 100 / 12));
    
    return {
      finalAmount: Math.round(finalAmount),
      totalContributions: Math.round(totalContributions),
      totalReturns: Math.round(totalReturns),
      annualizedReturn: adjustedReturn,
      bestCase: Math.round(bestCase),
      worstCase: Math.round(worstCase)
    };
  };

  const runSimulation = () => {
    setIsSimulating(true);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const newResults = calculateReturns();
      setResults(newResults);
      setIsSimulating(false);
    }, 1500);
  };

  useEffect(() => {
    const newResults = calculateReturns();
    setResults(newResults);
  }, [params]);

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const getReturnColor = (returns: number) => {
    if (returns > 0) return 'text-green-600';
    if (returns < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <motion.section 
      className="py-20"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-16" variants={fadeIn}>
          <div className="inline-flex items-center bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Calculator className="w-4 h-4 mr-2" />
            Interactive Investment Tool
          </div>
          <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
            Investment Return Simulator
          </h2>
          <p className="text-xl text-muted max-w-3xl mx-auto">
            Project your investment growth with different strategies, risk levels, and time horizons based on Pakistani market conditions.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Input Parameters */}
          <motion.div variants={fadeIn}>
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Simulation Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Initial Amount */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Initial Investment: {formatCurrency(params.initialAmount)}
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="1000000"
                    step="1000"
                    value={params.initialAmount}
                    onChange={(e) => setParams(prev => ({ ...prev, initialAmount: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Monthly Contribution */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Monthly Contribution: {formatCurrency(params.monthlyContribution)}
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="50000"
                    step="500"
                    value={params.monthlyContribution}
                    onChange={(e) => setParams(prev => ({ ...prev, monthlyContribution: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Investment Period */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Investment Period: {params.investmentPeriod} years
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={params.investmentPeriod}
                    onChange={(e) => setParams(prev => ({ ...prev, investmentPeriod: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Risk Level */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Risk Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(riskProfiles).map(([key, profile]) => (
                      <button
                        key={key}
                        onClick={() => setParams(prev => ({ ...prev, riskLevel: key as any }))}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          params.riskLevel === key 
                            ? 'bg-secondary text-white' 
                            : 'bg-background-alt text-foreground hover:bg-secondary/10'
                        }`}
                      >
                        {profile.name}
                        <div className="text-xs opacity-80">
                          {profile.expectedReturn}% return
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Investment Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Investment Type
                  </label>
                  <div className="space-y-2">
                    {Object.entries(investmentTypes).map(([key, type]) => (
                      <label key={key} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="investmentType"
                          value={key}
                          checked={params.investmentType === key}
                          onChange={(e) => setParams(prev => ({ ...prev, investmentType: e.target.value as any }))}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{type.name}</div>
                          <div className="text-sm text-muted">Risk: {type.risk}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={runSimulation} 
                  className="w-full" 
                  disabled={isSimulating}
                >
                  {isSimulating ? (
                    <>
                      <motion.div 
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Run Advanced Simulation
                    </>
                  )}
                </Button>
              </CardContent>
            </AnimatedCard>
          </motion.div>

          {/* Results */}
          <motion.div variants={fadeIn}>
            <div className="space-y-6">
              {/* Main Result */}
              <AnimatedCard className="bg-gradient-secondary text-white">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Projected Investment Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="text-4xl font-bold mb-2"
                    key={results.finalAmount}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {formatCurrency(results.finalAmount)}
                  </motion.div>
                  <div className="text-white/90 text-sm">
                    After {params.investmentPeriod} years with {riskProfiles[params.riskLevel].name.toLowerCase()} risk strategy
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <AnimatedCard>
                  <CardContent className="p-4">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(results.totalContributions)}
                    </div>
                    <div className="text-sm text-muted">Total Invested</div>
                  </CardContent>
                </AnimatedCard>
                
                <AnimatedCard>
                  <CardContent className="p-4">
                    <div className={`text-lg font-bold ${getReturnColor(results.totalReturns)}`}>
                      {formatCurrency(results.totalReturns)}
                    </div>
                    <div className="text-sm text-muted">Total Returns</div>
                  </CardContent>
                </AnimatedCard>
              </div>

              {/* Performance Metrics */}
              <AnimatedCard>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Annualized Return</span>
                    <span className="font-semibold text-secondary">
                      {results.annualizedReturn.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Return Multiple</span>
                    <span className="font-semibold">
                      {(results.finalAmount / results.totalContributions).toFixed(1)}x
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Monthly Growth</span>
                    <span className="font-semibold">
                      {(results.annualizedReturn / 12).toFixed(2)}%
                    </span>
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* Scenario Analysis */}
              <AnimatedCard>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Scenario Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-muted mb-1">Best Case</div>
                      <div className="font-bold text-green-600">
                        {formatCurrency(results.bestCase)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted mb-1">Expected</div>
                      <div className="font-bold text-secondary">
                        {formatCurrency(results.finalAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted mb-1">Worst Case</div>
                      <div className="font-bold text-orange-600">
                        {formatCurrency(results.worstCase)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-background-alt p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-muted">
                        <strong>Disclaimer:</strong> These projections are based on historical Pakistani market data and should not be considered as guaranteed returns. Actual results may vary based on market conditions, economic factors, and individual investment choices.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <Button className="flex-1">
                  Start This Strategy
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="flex-1">
                  Get Detailed Report
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};