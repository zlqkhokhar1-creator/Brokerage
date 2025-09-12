'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, DollarSign, TrendingUp } from 'lucide-react';

interface FormData {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
  inflationRate: number;
  desiredIncome: number;
}

interface RetirementCalculatorFormProps {
  formData: FormData;
  onInputChange: (field: string, value: number) => void;
  formatCurrency: (amount: number) => string;
}

export const RetirementCalculatorForm: React.FC<RetirementCalculatorFormProps> = ({
  formData,
  onInputChange,
  formatCurrency
}) => {
  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Your Information</h2>
      
      <div className="space-y-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Age: {formData.currentAge} years
                </label>
                <input
                  type="range"
                  min="20"
                  max="65"
                  value={formData.currentAge}
                  onChange={(e) => onInputChange('currentAge', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Retirement Age: {formData.retirementAge} years
                </label>
                <input
                  type="range"
                  min="50"
                  max="70"
                  value={formData.retirementAge}
                  onChange={(e) => onInputChange('retirementAge', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Savings: {formatCurrency(formData.currentSavings)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10000000"
                  step="50000"
                  value={formData.currentSavings}
                  onChange={(e) => onInputChange('currentSavings', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monthly Contribution: {formatCurrency(formData.monthlyContribution)}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="200000"
                  step="1000"
                  value={formData.monthlyContribution}
                  onChange={(e) => onInputChange('monthlyContribution', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Desired Monthly Income: {formatCurrency(formData.desiredIncome)}
                </label>
                <input
                  type="range"
                  min="20000"
                  max="500000"
                  step="5000"
                  value={formData.desiredIncome}
                  onChange={(e) => onInputChange('desiredIncome', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Investment Assumptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expected Annual Return: {formData.expectedReturn}%
                </label>
                <input
                  type="range"
                  min="6"
                  max="20"
                  step="0.5"
                  value={formData.expectedReturn}
                  onChange={(e) => onInputChange('expectedReturn', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="text-xs text-slate-500 mt-1">
                  Historical KSE-100 average: 11-13%
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Inflation Rate: {formData.inflationRate}%
                </label>
                <input
                  type="range"
                  min="4"
                  max="15"
                  step="0.5"
                  value={formData.inflationRate}
                  onChange={(e) => onInputChange('inflationRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="text-xs text-slate-500 mt-1">
                  Pakistan average inflation: 7-9%
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
