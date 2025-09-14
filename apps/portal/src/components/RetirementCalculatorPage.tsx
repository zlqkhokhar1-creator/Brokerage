"use client";
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from '@/components/MotionWrappers';
import { Button } from '@/components/ui/button';
import { Calculator, DollarSign, BarChart3, Target, BookOpen } from 'lucide-react';
import { RetirementCalculatorForm } from './retirement/RetirementCalculatorForm';
import { RetirementResults } from './retirement/RetirementResults';
import { InvestmentScenarios } from './retirement/InvestmentScenarios';
import { RetirementTips } from './retirement/RetirementTips';
import { RetirementEducation } from './retirement/RetirementEducation';

interface RetirementCalculatorPageProps {
  onNavigate?: (page: string) => void;
}

export const RetirementCalculatorPage: React.FC<RetirementCalculatorPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    currentAge: 30,
    retirementAge: 60,
    currentSavings: 500000,
    monthlyContribution: 25000,
    expectedReturn: 12,
    inflationRate: 8,
    desiredIncome: 100000
  });

  const [results, setResults] = useState({
    totalSavings: 0,
    monthlyIncomeAtRetirement: 0,
    inflationAdjustedIncome: 0,
    shortfall: 0,
    recommendedContribution: 0
  });

  const calculateRetirement = () => {
    const yearsToRetirement = formData.retirementAge - formData.currentAge;
    const monthsToRetirement = yearsToRetirement * 12;
    const monthlyReturn = formData.expectedReturn / 100 / 12;
    
    // Future value of current savings
    const futureValueCurrentSavings = formData.currentSavings * Math.pow(1 + formData.expectedReturn / 100, yearsToRetirement);
    
    // Future value of monthly contributions (annuity)
    const futureValueContributions = formData.monthlyContribution * 
      ((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn);
    
    const totalSavings = futureValueCurrentSavings + futureValueContributions;
    
    // Monthly income from savings (5% withdrawal rule)
    const monthlyIncomeAtRetirement = (totalSavings * 0.05) / 12;
    
    // Inflation-adjusted desired income
    const inflationAdjustedIncome = formData.desiredIncome * Math.pow(1 + formData.inflationRate / 100, yearsToRetirement);
    
    // Shortfall calculation
    const shortfall = Math.max(0, inflationAdjustedIncome - monthlyIncomeAtRetirement);
    
    // Recommended monthly contribution to meet goal
    const requiredSavings = (inflationAdjustedIncome * 12) / 0.05;
    const requiredFromContributions = requiredSavings - futureValueCurrentSavings;
    const recommendedContribution = Math.max(0, requiredFromContributions / 
      ((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn));
    
    setResults({
      totalSavings: Math.round(totalSavings),
      monthlyIncomeAtRetirement: Math.round(monthlyIncomeAtRetirement),
      inflationAdjustedIncome: Math.round(inflationAdjustedIncome),
      shortfall: Math.round(shortfall),
      recommendedContribution: Math.round(recommendedContribution)
    });
  };

  useEffect(() => {
    calculateRetirement();
  }, [formData]);

  const handleInputChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section 
        className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div 
              className="inline-flex items-center bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Interactive Financial Planning Tool
            </motion.div>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Retirement Calculator for 
              <span className="text-yellow-300">Pakistani Investors</span>
            </h1>
            
            <p className="text-xl text-white/90 mb-8">
              Plan your financial future with our comprehensive retirement calculator. Get personalized projections based on Pakistani market conditions and inflation rates.
            </p>
            
            <motion.div 
              className="flex items-center justify-center space-x-8 text-sm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                PKR-based calculations
              </div>
              <div className="flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Real-time projections
              </div>
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Goal-based planning
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Calculator Section */}
      <motion.section 
        className="py-20"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Input Form */}
            <RetirementCalculatorForm
              formData={formData}
              onInputChange={handleInputChange}
              formatCurrency={formatCurrency}
            />
            
            {/* Results */}
            <RetirementResults
              results={results}
              formData={formData}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>
      </motion.section>

      {/* Investment Scenarios */}
      <InvestmentScenarios
        formData={formData}
        onInputChange={handleInputChange}
        formatCurrency={formatCurrency}
      />

      {/* Retirement Planning Tips */}
      <RetirementTips />

      {/* Educational Resources */}
      <RetirementEducation />

      {/* CTA Section */}
      <motion.section 
        className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Start Your Retirement Journey?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Take the first step towards financial security. Start investing with Pakistan's most trusted platform.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  className="text-lg px-8 bg-white text-blue-600 hover:bg-gray-100"
                  onClick={() => onNavigate?.('robo-advisor')}
                >
                  <Target className="w-5 h-5 mr-2" />
                  Create Investment Plan
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 border-white text-white hover:bg-white hover:text-blue-600"
                  onClick={() => onNavigate?.('blog')}
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Download Planning Guide
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};
