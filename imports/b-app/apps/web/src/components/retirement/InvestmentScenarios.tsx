'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FormData {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
}

interface InvestmentScenariosProps {
  formData: FormData;
  onInputChange: (field: string, value: number) => void;
  formatCurrency: (amount: number) => string;
}

export const InvestmentScenarios: React.FC<InvestmentScenariosProps> = ({
  formData,
  onInputChange,
  formatCurrency
}) => {
  const scenarios = [
    {
      name: 'Conservative',
      return: 8,
      description: 'Low-risk investments like government bonds and fixed deposits',
      riskLevel: 'Low',
      color: 'green'
    },
    {
      name: 'Moderate',
      return: 12,
      description: 'Balanced portfolio of stocks, bonds, and mutual funds',
      riskLevel: 'Medium',
      color: 'yellow'
    },
    {
      name: 'Aggressive',
      return: 16,
      description: 'Growth-focused equity investments and stock market',
      riskLevel: 'High',
      color: 'red'
    }
  ];

  return (
    <motion.section 
      className="py-20 bg-slate-50"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Investment Scenarios
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Compare different investment strategies and their potential impact on your retirement savings.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {scenarios.map((scenario, index) => {
            const yearsToRetirement = formData.retirementAge - formData.currentAge;
            const futureValue = formData.currentSavings * Math.pow(1 + scenario.return / 100, yearsToRetirement) +
              formData.monthlyContribution * ((Math.pow(1 + scenario.return / 100 / 12, yearsToRetirement * 12) - 1) / (scenario.return / 100 / 12));
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className={`group h-full ${
                  scenario.return === formData.expectedReturn ? 'ring-2 ring-blue-500 border-blue-500' : ''
                }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <CardTitle className="text-xl">{scenario.name}</CardTitle>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        scenario.color === 'green' ? 'bg-green-100 text-green-700' :
                        scenario.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {scenario.return}% Return
                      </div>
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                      scenario.color === 'green' ? 'bg-green-50 text-green-600' :
                      scenario.color === 'yellow' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {scenario.riskLevel} Risk
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-6">{scenario.description}</p>
                    
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {formatCurrency(Math.round(futureValue))}
                      </div>
                      <div className="text-sm text-slate-500">Total at Retirement</div>
                    </div>
                    
                    <Button 
                      variant={scenario.return === formData.expectedReturn ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => onInputChange('expectedReturn', scenario.return)}
                    >
                      {scenario.return === formData.expectedReturn ? 'Current Selection' : 'Select Scenario'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};
