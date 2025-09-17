import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { AnimatedCard } from '../ui/AnimatedCard';
import { Button } from '../ui/Button';
import { fadeIn, staggerContainer, slideInRight } from '../../animations';
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  Target,
  PieChart,
  BarChart3,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Award,
  Clock,
  DollarSign
} from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: {
    text: string;
    score: number;
    explanation?: string;
  }[];
  category: 'timeHorizon' | 'riskTolerance' | 'experience' | 'goals' | 'financialSituation';
}

interface RiskProfile {
  score: number;
  level: 'conservative' | 'moderate' | 'balanced' | 'aggressive';
  title: string;
  description: string;
  recommendedAllocation: {
    stocks: number;
    bonds: number;
    cash: number;
  };
  expectedReturn: string;
  volatility: string;
  suitableProducts: string[];
}

export const RiskAssessmentQuiz: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions: Question[] = [
    {
      id: 1,
      question: "What is your primary investment time horizon?",
      category: "timeHorizon",
      options: [
        { text: "Less than 1 year", score: 1, explanation: "Short-term goals require conservative investments" },
        { text: "1-3 years", score: 2, explanation: "Short to medium-term horizon with limited risk capacity" },
        { text: "3-7 years", score: 3, explanation: "Medium-term allows for moderate risk taking" },
        { text: "7-15 years", score: 4, explanation: "Long-term horizon enables higher risk tolerance" },
        { text: "More than 15 years", score: 5, explanation: "Very long-term allows maximum growth potential" }
      ]
    },
    {
      id: 2,
      question: "How would you react if your portfolio lost 20% of its value in a month?",
      category: "riskTolerance",
      options: [
        { text: "Sell everything immediately", score: 1, explanation: "Very low risk tolerance" },
        { text: "Sell some positions to reduce risk", score: 2, explanation: "Low risk tolerance" },
        { text: "Hold and wait for recovery", score: 3, explanation: "Moderate risk tolerance" },
        { text: "Buy more at lower prices", score: 4, explanation: "High risk tolerance" },
        { text: "Completely comfortable, it's normal", score: 5, explanation: "Very high risk tolerance" }
      ]
    },
    {
      id: 3,
      question: "What is your investment experience level?",
      category: "experience",
      options: [
        { text: "Complete beginner", score: 1, explanation: "Start with conservative, diversified options" },
        { text: "Some experience with basic investments", score: 2, explanation: "Can handle slightly more complexity" },
        { text: "Moderate experience with various assets", score: 3, explanation: "Comfortable with moderate risk strategies" },
        { text: "Experienced investor", score: 4, explanation: "Can manage higher risk investments" },
        { text: "Professional/Expert level", score: 5, explanation: "Capable of sophisticated strategies" }
      ]
    },
    {
      id: 4,
      question: "What percentage of your monthly income can you invest?",
      category: "financialSituation",
      options: [
        { text: "Less than 5%", score: 1, explanation: "Limited capacity suggests conservative approach" },
        { text: "5-10%", score: 2, explanation: "Modest investment capacity" },
        { text: "10-20%", score: 3, explanation: "Good investment capacity for balanced approach" },
        { text: "20-30%", score: 4, explanation: "Strong investment capacity enables growth focus" },
        { text: "More than 30%", score: 5, explanation: "High investment capacity for aggressive growth" }
      ]
    },
    {
      id: 5,
      question: "What is your primary investment goal?",
      category: "goals",
      options: [
        { text: "Capital preservation", score: 1, explanation: "Focus on protecting your money" },
        { text: "Steady income generation", score: 2, explanation: "Regular returns with stability" },
        { text: "Balanced growth and income", score: 3, explanation: "Mix of growth and income" },
        { text: "Long-term wealth building", score: 4, explanation: "Growth-focused strategy" },
        { text: "Maximum growth potential", score: 5, explanation: "Aggressive growth strategy" }
      ]
    },
    {
      id: 6,
      question: "How important is it to have access to your invested money?",
      category: "timeHorizon",
      options: [
        { text: "I need access anytime", score: 1, explanation: "High liquidity needs limit investment options" },
        { text: "Access within 6 months", score: 2, explanation: "Moderate liquidity requirements" },
        { text: "Access within 1-2 years", score: 3, explanation: "Some flexibility for medium-term investments" },
        { text: "Access within 3-5 years", score: 4, explanation: "Good flexibility for growth investments" },
        { text: "Don't need access for 5+ years", score: 5, explanation: "Maximum flexibility for long-term growth" }
      ]
    }
  ];

  const riskProfiles: Record<string, RiskProfile> = {
    conservative: {
      score: 6-12,
      level: 'conservative',
      title: 'Conservative Investor',
      description: 'You prioritize capital preservation and steady returns over high growth. Your portfolio should focus on stable, low-risk investments.',
      recommendedAllocation: { stocks: 20, bonds: 60, cash: 20 },
      expectedReturn: '6-8%',
      volatility: 'Low',
      suitableProducts: ['Government Bonds', 'Fixed Deposits', 'Conservative Mutual Funds', 'Islamic Bonds (Sukuk)']
    },
    moderate: {
      score: 13-18,
      level: 'moderate',
      title: 'Moderate Investor',
      description: 'You seek a balance between growth and stability. You can tolerate some market fluctuations for potentially higher returns.',
      recommendedAllocation: { stocks: 40, bonds: 40, cash: 20 },
      expectedReturn: '8-12%',
      volatility: 'Medium',
      suitableProducts: ['Balanced Mutual Funds', 'Blue Chip Stocks', 'Corporate Bonds', 'Dividend Stocks']
    },
    balanced: {
      score: 19-24,
      level: 'balanced',
      title: 'Balanced Investor',
      description: 'You are comfortable with market volatility and seek good growth potential while maintaining some stability.',
      recommendedAllocation: { stocks: 60, bonds: 30, cash: 10 },
      expectedReturn: '10-14%',
      volatility: 'Medium-High',
      suitableProducts: ['Equity Mutual Funds', 'Growth Stocks', 'REITs', 'Index Funds']
    },
    aggressive: {
      score: 25-30,
      level: 'aggressive',
      title: 'Aggressive Investor',
      description: 'You are willing to accept high volatility for the potential of superior long-term returns. You have a long investment horizon.',
      recommendedAllocation: { stocks: 80, bonds: 15, cash: 5 },
      expectedReturn: '12-18%',
      volatility: 'High',
      suitableProducts: ['Growth Stocks', 'Tech Stocks', 'Small Cap Funds', 'Emerging Market Funds']
    }
  };

  const calculateRiskProfile = (): RiskProfile => {
    const totalScore = Object.values(answers).reduce((sum, score) => sum + score, 0);
    
    if (totalScore <= 12) return riskProfiles.conservative;
    if (totalScore <= 18) return riskProfiles.moderate;
    if (totalScore <= 24) return riskProfiles.balanced;
    return riskProfiles.aggressive;
  };

  const handleAnswer = (score: number) => {
    setAnswers(prev => ({ ...prev, [questions[currentQuestion].id]: score }));
    
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        setShowResults(true);
        setIsSubmitting(false);
      }, 2000);
    }
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showResults) {
    const profile = calculateRiskProfile();
    
    return (
      <motion.section 
        className="py-20"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Your Risk Assessment Results
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Based on your responses, here's your personalized investment profile and recommendations.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Profile Summary */}
            <motion.div variants={fadeIn}>
              <AnimatedCard className="text-center">
                <CardContent className="pt-8">
                  <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Award className="w-10 h-10 text-secondary" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-primary mb-4">
                    {profile.title}
                  </h3>
                  <p className="text-lg text-muted mb-6 leading-relaxed">
                    {profile.description}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-background-alt p-4 rounded-lg">
                      <div className="text-lg font-bold text-secondary">{profile.expectedReturn}</div>
                      <div className="text-sm text-muted">Expected Return</div>
                    </div>
                    <div className="bg-background-alt p-4 rounded-lg">
                      <div className="text-lg font-bold text-primary">{profile.volatility}</div>
                      <div className="text-sm text-muted">Risk Level</div>
                    </div>
                    <div className="bg-background-alt p-4 rounded-lg md:col-span-1 col-span-2">
                      <div className="text-lg font-bold text-secondary">
                        {Object.values(answers).reduce((sum, score) => sum + score, 0)}/30
                      </div>
                      <div className="text-sm text-muted">Risk Score</div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
            </motion.div>

            {/* Recommended Allocation */}
            <motion.div variants={fadeIn}>
              <AnimatedCard>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="w-5 h-5 mr-2" />
                    Recommended Portfolio Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Stocks/Equity</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-background-alt rounded-full h-2">
                          <div 
                            className="bg-secondary h-2 rounded-full" 
                            style={{ width: `${profile.recommendedAllocation.stocks}%` }}
                          />
                        </div>
                        <span className="font-semibold w-12">{profile.recommendedAllocation.stocks}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Bonds/Fixed Income</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-background-alt rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${profile.recommendedAllocation.bonds}%` }}
                          />
                        </div>
                        <span className="font-semibold w-12">{profile.recommendedAllocation.bonds}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Cash/Money Market</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-background-alt rounded-full h-2">
                          <div 
                            className="bg-gray-400 h-2 rounded-full" 
                            style={{ width: `${profile.recommendedAllocation.cash}%` }}
                          />
                        </div>
                        <span className="font-semibold w-12">{profile.recommendedAllocation.cash}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
            </motion.div>

            {/* Suitable Products */}
            <motion.div variants={fadeIn}>
              <AnimatedCard>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Recommended Investment Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {profile.suitableProducts.map((product, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-background-alt rounded-lg">
                        <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                        <span className="text-foreground">{product}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>
            </motion.div>

            {/* Action Buttons */}
            <motion.div className="flex flex-col sm:flex-row gap-4" variants={fadeIn}>
              <Button className="flex-1">
                <TrendingUp className="w-4 h-4 mr-2" />
                Start Investing with This Profile
              </Button>
              <Button variant="outline" className="flex-1">
                <DollarSign className="w-4 h-4 mr-2" />
                Get Detailed Investment Plan
              </Button>
              <Button variant="outline" onClick={resetQuiz}>
                Retake Assessment
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>
    );
  }

  if (isSubmitting) {
    return (
      <motion.section 
        className="py-20"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div 
              className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full mx-auto mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <h3 className="text-2xl font-heading font-bold text-primary mb-4">
              Analyzing Your Risk Profile...
            </h3>
            <p className="text-muted">
              Our AI is processing your responses to create a personalized investment strategy.
            </p>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section 
      className="py-20"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-16" variants={fadeIn}>
          <div className="inline-flex items-center bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4 mr-2" />
            Risk Assessment Questionnaire
          </div>
          <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
            Discover Your Investment Profile
          </h2>
          <p className="text-xl text-muted max-w-3xl mx-auto">
            Answer a few questions to get personalized investment recommendations based on your risk tolerance and financial goals.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {/* Progress Bar */}
          <motion.div className="mb-8" variants={fadeIn}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">Question {currentQuestion + 1} of {questions.length}</span>
              <span className="text-sm text-muted">{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-background-alt rounded-full h-2">
              <motion.div 
                className="bg-secondary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              variants={slideInRight}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.3 }}
            >
              <AnimatedCard>
                <CardHeader>
                  <CardTitle className="text-xl">
                    {questions[currentQuestion].question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {questions[currentQuestion].options.map((option, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswer(option.score)}
                      className="w-full p-4 text-left rounded-lg border border-border hover:border-secondary hover:bg-secondary/5 transition-all duration-200 group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-foreground group-hover:text-secondary transition-colors">
                          {option.text}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted group-hover:text-secondary opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                      {option.explanation && (
                        <div className="text-sm text-muted mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {option.explanation}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </CardContent>
              </AnimatedCard>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {currentQuestion > 0 && (
            <motion.div className="mt-6" variants={fadeIn}>
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous Question
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
};