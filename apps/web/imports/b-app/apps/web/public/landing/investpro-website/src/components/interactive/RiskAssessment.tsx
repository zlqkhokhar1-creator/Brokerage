import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { MotionWrapper } from '../animations/MotionWrapper';
import { EnhancedCard } from '../ui/EnhancedCard';
import { AnimatedProgress } from '../ui/LoadingSpinner';
import { 
  Target, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  PieChart
} from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: { value: number; label: string; description: string }[];
}

interface RiskProfile {
  type: 'Conservative' | 'Moderate' | 'Aggressive';
  score: number;
  description: string;
  allocation: {
    stocks: number;
    bonds: number;
    cash: number;
  };
  expectedReturn: string;
  maxDrawdown: string;
  recommendations: string[];
}

export const RiskAssessment: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);

  const questions: Question[] = [
    {
      id: 1,
      question: "What is your age group?",
      options: [
        { value: 1, label: "Under 30", description: "Long investment horizon" },
        { value: 2, label: "30-40", description: "Building wealth phase" },
        { value: 3, label: "40-50", description: "Peak earning years" },
        { value: 4, label: "50-60", description: "Pre-retirement planning" },
        { value: 5, label: "Over 60", description: "Retirement focused" }
      ]
    },
    {
      id: 2,
      question: "What is your investment experience?",
      options: [
        { value: 1, label: "Beginner", description: "New to investing" },
        { value: 2, label: "Some Experience", description: "1-3 years of investing" },
        { value: 3, label: "Experienced", description: "3-5 years of investing" },
        { value: 4, label: "Very Experienced", description: "5+ years of investing" },
        { value: 5, label: "Professional", description: "Financial professional" }
      ]
    },
    {
      id: 3,
      question: "What is your investment time horizon?",
      options: [
        { value: 1, label: "Less than 2 years", description: "Short-term goals" },
        { value: 2, label: "2-5 years", description: "Medium-term goals" },
        { value: 3, label: "5-10 years", description: "Long-term goals" },
        { value: 4, label: "10-20 years", description: "Very long-term" },
        { value: 5, label: "Over 20 years", description: "Retirement planning" }
      ]
    },
    {
      id: 4,
      question: "How would you react to a 20% drop in your portfolio?",
      options: [
        { value: 1, label: "Sell everything", description: "Cannot tolerate losses" },
        { value: 2, label: "Sell some holdings", description: "Very uncomfortable" },
        { value: 3, label: "Hold and wait", description: "Somewhat comfortable" },
        { value: 4, label: "Buy more", description: "See it as opportunity" },
        { value: 5, label: "Confident in strategy", description: "Stick to long-term plan" }
      ]
    },
    {
      id: 5,
      question: "What percentage of your income do you save/invest?",
      options: [
        { value: 1, label: "Less than 5%", description: "Limited savings" },
        { value: 2, label: "5-10%", description: "Modest savings" },
        { value: 3, label: "10-20%", description: "Good savings rate" },
        { value: 4, label: "20-30%", description: "High savings rate" },
        { value: 5, label: "Over 30%", description: "Very high savings rate" }
      ]
    },
    {
      id: 6,
      question: "What is your primary investment goal?",
      options: [
        { value: 1, label: "Capital preservation", description: "Protect my money" },
        { value: 2, label: "Income generation", description: "Regular dividends" },
        { value: 3, label: "Balanced growth", description: "Steady appreciation" },
        { value: 4, label: "Capital appreciation", description: "Grow my wealth" },
        { value: 5, label: "Aggressive growth", description: "Maximum returns" }
      ]
    }
  ];

  const calculateRiskProfile = (answers: number[]): RiskProfile => {
    const totalScore = answers.reduce((sum, answer) => sum + answer, 0);
    const averageScore = totalScore / answers.length;

    if (averageScore <= 2.5) {
      return {
        type: 'Conservative',
        score: Math.round(averageScore * 10) / 10,
        description: 'You prefer stability and capital preservation over high returns.',
        allocation: { stocks: 30, bonds: 60, cash: 10 },
        expectedReturn: '6-8%',
        maxDrawdown: '5-10%',
        recommendations: [
          'Focus on government bonds and fixed deposits',
          'Consider dividend-paying blue-chip stocks',
          'Maintain 6-month emergency fund',
          'Regular SIP in conservative mutual funds'
        ]
      };
    } else if (averageScore <= 3.5) {
      return {
        type: 'Moderate',
        score: Math.round(averageScore * 10) / 10,
        description: 'You seek balanced growth with moderate risk tolerance.',
        allocation: { stocks: 60, bonds: 35, cash: 5 },
        expectedReturn: '8-12%',
        maxDrawdown: '10-20%',
        recommendations: [
          'Diversified portfolio across sectors',
          'Mix of growth and value stocks',
          'Consider robo-advisor for optimization',
          'Regular portfolio rebalancing'
        ]
      };
    } else {
      return {
        type: 'Aggressive',
        score: Math.round(averageScore * 10) / 10,
        description: 'You are comfortable with higher risk for potentially higher returns.',
        allocation: { stocks: 85, bonds: 10, cash: 5 },
        expectedReturn: '12-18%',
        maxDrawdown: '20-35%',
        recommendations: [
          'Growth stocks and emerging sectors',
          'International diversification',
          'Consider small and mid-cap funds',
          'Dollar-cost averaging strategy'
        ]
      };
    }
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const profile = calculateRiskProfile(newAnswers);
      setRiskProfile(profile);
      setIsComplete(true);
    }
  };

  const resetAssessment = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setIsComplete(false);
    setRiskProfile(null);
  };

  const getRiskColor = (type: string) => {
    switch (type) {
      case 'Conservative': return 'text-green-600 bg-green-100';
      case 'Moderate': return 'text-yellow-600 bg-yellow-100';
      case 'Aggressive': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isComplete && riskProfile) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4">
          <MotionWrapper>
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
                Your Risk Profile Results
              </h2>
              <p className="text-xl text-muted max-w-3xl mx-auto">
                Based on your responses, here's your personalized investment profile and recommendations.
              </p>
            </div>
          </MotionWrapper>

          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <EnhancedCard hover glow className="mb-8">
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center px-6 py-3 rounded-full text-xl font-bold mb-4 ${
                    getRiskColor(riskProfile.type)
                  }`}>
                    {riskProfile.type} Investor
                  </div>
                  <h3 className="text-2xl font-bold text-primary mb-4">
                    Risk Score: {riskProfile.score}/5.0
                  </h3>
                  <p className="text-lg text-muted max-w-2xl mx-auto">
                    {riskProfile.description}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-secondary" />
                    </div>
                    <div className="text-2xl font-bold text-primary mb-2">
                      {riskProfile.expectedReturn}
                    </div>
                    <div className="text-muted">Expected Annual Return</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="text-2xl font-bold text-primary mb-2">
                      {riskProfile.maxDrawdown}
                    </div>
                    <div className="text-muted">Maximum Drawdown</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PieChart className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-primary mb-2">
                      {riskProfile.allocation.stocks}%
                    </div>
                    <div className="text-muted">Equity Allocation</div>
                  </div>
                </div>

                <div className="bg-background-alt rounded-lg p-6 mb-8">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-secondary" />
                    Recommended Asset Allocation
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Stocks/Equity</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <motion.div
                            className="bg-secondary h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${riskProfile.allocation.stocks}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                        </div>
                        <span className="font-medium">{riskProfile.allocation.stocks}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Bonds/Fixed Income</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <motion.div
                            className="bg-blue-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${riskProfile.allocation.bonds}%` }}
                            transition={{ duration: 1, delay: 0.4 }}
                          />
                        </div>
                        <span className="font-medium">{riskProfile.allocation.bonds}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Cash/Money Market</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <motion.div
                            className="bg-gray-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${riskProfile.allocation.cash}%` }}
                            transition={{ duration: 1, delay: 0.6 }}
                          />
                        </div>
                        <span className="font-medium">{riskProfile.allocation.cash}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/5 rounded-lg p-6">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-secondary" />
                    Personalized Recommendations
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {riskProfile.recommendations.map((recommendation, index) => (
                      <motion.div
                        key={index}
                        className="flex items-start"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-foreground text-sm">{recommendation}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Button size="lg">
                    Build My Portfolio
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={resetAssessment}>
                    Retake Assessment
                  </Button>
                </div>
              </EnhancedCard>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <MotionWrapper>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Risk Assessment Questionnaire
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Answer a few questions to get personalized investment recommendations based on your risk tolerance.
            </p>
          </div>
        </MotionWrapper>

        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <MotionWrapper className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-sm text-muted">
                {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
              </span>
            </div>
            <AnimatedProgress 
              progress={((currentQuestion + 1) / questions.length) * 100}
              className="mb-2"
            />
          </MotionWrapper>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <EnhancedCard hover className="mb-8">
                <CardHeader>
                  <CardTitle className="text-xl text-center">
                    {questions[currentQuestion].question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {questions[currentQuestion].options.map((option, index) => (
                      <motion.button
                        key={index}
                        className="w-full p-4 text-left border border-border rounded-lg hover:border-secondary hover:bg-secondary/5 transition-all duration-300"
                        onClick={() => handleAnswer(option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="font-medium text-foreground mb-1">
                          {option.label}
                        </div>
                        <div className="text-sm text-muted">
                          {option.description}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </EnhancedCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};