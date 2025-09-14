'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Download, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';

interface Results {
  totalSavings: number;
  monthlyIncomeAtRetirement: number;
  inflationAdjustedIncome: number;
  shortfall: number;
  recommendedContribution: number;
}

interface RetirementResultsProps {
  results: Results;
  formData: {
    retirementAge: number;
  };
  formatCurrency: (amount: number) => string;
}

export const RetirementResults: React.FC<RetirementResultsProps> = ({
  results,
  formData,
  formatCurrency
}) => {
  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Your Retirement Projection</h2>
      
      <div className="space-y-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Total Retirement Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="text-4xl font-bold mb-2"
                key={results.totalSavings}
                initial={{ scale: 1.1, color: '#16FFB9' }}
                animate={{ scale: 1, color: '#FFFFFF' }}
                transition={{ duration: 0.5 }}
              >
                {formatCurrency(results.totalSavings)}
              </motion.div>
              <div className="text-white/90 text-sm">
                Projected value at age {formData.retirementAge}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Monthly Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(results.monthlyIncomeAtRetirement)}
                </div>
                <div className="text-xs text-slate-500">From your savings</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Goal Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(results.inflationAdjustedIncome)}
                </div>
                <div className="text-xs text-slate-500">Inflation-adjusted</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        {results.shortfall > 0 ? (
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Income Shortfall
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700 mb-2">
                  {formatCurrency(results.shortfall)}
                </div>
                <div className="text-sm text-red-600 mb-4">
                  You'll need an additional {formatCurrency(results.shortfall)} per month to meet your goal.
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    Recommended Monthly Contribution:
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(results.recommendedContribution)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Goal Achieved!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-green-700">
                  Congratulations! Your current savings plan will meet your retirement income goal.
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        <motion.div 
          className="flex space-x-4"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Button className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button variant="outline" className="flex-1">
            Start Investing
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
