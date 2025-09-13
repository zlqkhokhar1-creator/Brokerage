import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { fadeIn, staggerContainer, slideInLeft, slideInRight } from '../../animations';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Clock,
  ArrowRight,
  PieChart,
  BarChart3,
  Info,
  Download,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  BookOpen,
  Globe,
  Percent
} from 'lucide-react';

export const RetirementCalculatorPage: React.FC = () => {
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
    const monthlyInflation = formData.inflationRate / 100 / 12;
    
    // Future value of current savings
    const futureValueCurrentSavings = formData.currentSavings * Math.pow(1 + formData.expectedReturn / 100, yearsToRetirement);
    
    // Future value of monthly contributions (annuity)
    const futureValueContributions = formData.monthlyContribution * 
      ((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn);
    
    const totalSavings = futureValueCurrentSavings + futureValueContributions;
    
    // Monthly income from savings (4% withdrawal rule adjusted for Pakistan)
    const monthlyIncomeAtRetirement = (totalSavings * 0.05) / 12; // 5% withdrawal rate
    
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

  const tips = [
    {
      icon: Target,
      title: 'Start Early (جلدی شروع کریں)',
      description: 'Time is your greatest asset. Starting retirement planning in your 20s or 30s can make a massive difference due to compound interest.',
      urduTip: 'وقت آپ کا سب سے بڑا اثاثہ ہے۔ بیس اور تیس سال کی عمر میں ریٹائرمنٹ پلاننگ شروع کرنا compound interest کے باعث بہت بڑا فرق لا سکتا ہے۔'
    },
    {
      icon: PieChart,
      title: 'Diversify Your Portfolio (اپنے پورٹ فولیو میں تنوع)',
      description: 'Spread your investments across different asset classes to reduce risk while maintaining growth potential.',
      urduTip: 'خطرے کو کم کرنے اور نمو کی صلاحیت کو برقرار رکھنے کے لیے اپنی سرمایہ کاری کو مختلف اثاثہ جاتی کلاسوں میں تقسیم کریں۔'
    },
    {
      icon: TrendingUp,
      title: 'Increase Contributions Regularly (باقاعدگی سے حصہ بڑھائیں)',
      description: 'Try to increase your monthly contributions by 10-15% every year or whenever you get a salary raise.',
      urduTip: 'ہر سال یا جب بھی آپ کو تنخواہ میں اضافہ ملے تو اپنے ماہانہ حصے میں 10-15% اضافہ کرنے کی کوشش کریں۔'
    },
    {
      icon: Clock,
      title: 'Review and Adjust (جائزہ اور تبدیلی)',
      description: 'Review your retirement plan annually and adjust based on life changes, market conditions, and goal updates.',
      urduTip: 'اپنے ریٹائرمنٹ پلان کا سالانہ جائزہ لیں اور زندگی کی تبدیلیوں، مارکیٹ کے حالات، اور اہداف کی تبدیلی کی بنیاد پر اسے ایڈجسٹ کریں۔'
    }
  ];

  const educationalContent = [
    {
      title: 'Understanding Compound Interest',
      description: 'Learn how your money grows exponentially over time through the power of compounding.',
      icon: Percent,
      link: '#compound-interest'
    },
    {
      title: 'Pakistani Market Performance',
      description: 'Historical analysis of KSE-100 returns and inflation trends in Pakistan.',
      icon: BarChart3,
      link: '#market-performance'
    },
    {
      title: 'Retirement Planning Guide',
      description: 'Complete step-by-step guide to retirement planning for Pakistani professionals.',
      icon: BookOpen,
      link: '#retirement-guide'
    },
    {
      title: 'Tax-Efficient Strategies',
      description: 'Maximize your retirement savings through tax-efficient investment strategies.',
      icon: Globe,
      link: '#tax-strategies'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section 
        className="bg-gradient-primary text-white py-20"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center max-w-4xl mx-auto" variants={fadeIn}>
            <motion.div 
              className="inline-flex items-center bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Interactive Financial Planning Tool
            </motion.div>
            
            <h1 className="text-4xl lg:text-5xl font-heading font-bold mb-6">
              Retirement Calculator for 
              <span className="text-secondary">Pakistani Investors</span>
            </h1>
            
            <p className="text-xl text-white/90 mb-8">
              Plan your financial future with our comprehensive retirement calculator. Get personalized projections based on Pakistani market conditions and inflation rates.
            </p>
            
            <motion.div 
              className="flex items-center justify-center space-x-8 text-sm"
              variants={fadeIn}
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
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Input Form */}
            <motion.div variants={slideInLeft}>
              <h2 className="text-3xl font-heading font-bold text-primary mb-8">Your Information</h2>
              
              <div className="space-y-6">
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Personal Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Current Age: {formData.currentAge} years
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="65"
                        value={formData.currentAge}
                        onChange={(e) => handleInputChange('currentAge', parseInt(e.target.value))}
                        className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Retirement Age: {formData.retirementAge} years
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="70"
                        value={formData.retirementAge}
                        onChange={(e) => handleInputChange('retirementAge', parseInt(e.target.value))}
                        className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </CardContent>
                </AnimatedCard>
                
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Financial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Current Savings: {formatCurrency(formData.currentSavings)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10000000"
                        step="50000"
                        value={formData.currentSavings}
                        onChange={(e) => handleInputChange('currentSavings', parseInt(e.target.value))}
                        className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Monthly Contribution: {formatCurrency(formData.monthlyContribution)}
                      </label>
                      <input
                        type="range"
                        min="1000"
                        max="200000"
                        step="1000"
                        value={formData.monthlyContribution}
                        onChange={(e) => handleInputChange('monthlyContribution', parseInt(e.target.value))}
                        className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Desired Monthly Income: {formatCurrency(formData.desiredIncome)}
                      </label>
                      <input
                        type="range"
                        min="20000"
                        max="500000"
                        step="5000"
                        value={formData.desiredIncome}
                        onChange={(e) => handleInputChange('desiredIncome', parseInt(e.target.value))}
                        className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </CardContent>
                </AnimatedCard>
                
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Investment Assumptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Expected Annual Return: {formData.expectedReturn}%
                      </label>
                      <input
                        type="range"
                        min="6"
                        max="20"
                        step="0.5"
                        value={formData.expectedReturn}
                        onChange={(e) => handleInputChange('expectedReturn', parseFloat(e.target.value))}
                        className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="text-xs text-muted mt-1">
                        Historical KSE-100 average: 11-13%
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Inflation Rate: {formData.inflationRate}%
                      </label>
                      <input
                        type="range"
                        min="4"
                        max="15"
                        step="0.5"
                        value={formData.inflationRate}
                        onChange={(e) => handleInputChange('inflationRate', parseFloat(e.target.value))}
                        className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="text-xs text-muted mt-1">
                        Pakistan average inflation: 7-9%
                      </div>
                    </div>
                  </CardContent>
                </AnimatedCard>
              </div>
            </motion.div>
            
            {/* Results */}
            <motion.div variants={slideInRight}>
              <h2 className="text-3xl font-heading font-bold text-primary mb-8">Your Retirement Projection</h2>
              
              <div className="space-y-6">
                <AnimatedCard className="bg-gradient-secondary text-white">
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
                </AnimatedCard>
                
                <div className="grid grid-cols-2 gap-4">
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted">Monthly Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-secondary">
                        {formatCurrency(results.monthlyIncomeAtRetirement)}
                      </div>
                      <div className="text-xs text-muted">From your savings</div>
                    </CardContent>
                  </AnimatedCard>
                  
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted">Goal Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(results.inflationAdjustedIncome)}
                      </div>
                      <div className="text-xs text-muted">Inflation-adjusted</div>
                    </CardContent>
                  </AnimatedCard>
                </div>
                
                {results.shortfall > 0 ? (
                  <AnimatedCard className="border-red-200 bg-red-50">
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
                        <div className="text-sm font-medium text-foreground mb-2">
                          Recommended Monthly Contribution:
                        </div>
                        <div className="text-xl font-bold text-secondary">
                          {formatCurrency(results.recommendedContribution)}
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>
                ) : (
                  <AnimatedCard className="border-secondary bg-secondary/5">
                    <CardHeader>
                      <CardTitle className="text-secondary flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Goal Achieved!
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-secondary">
                        Congratulations! Your current savings plan will meet your retirement income goal.
                      </div>
                    </CardContent>
                  </AnimatedCard>
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
          </div>
        </div>
      </motion.section>

      {/* Investment Scenarios */}
      <motion.section 
        className="py-20 bg-background-alt"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Investment Scenarios
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Compare different investment strategies and their potential impact on your retirement savings.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {scenarios.map((scenario, index) => {
              const scenarioResults = {
                ...formData,
                expectedReturn: scenario.return
              };
              
              const yearsToRetirement = formData.retirementAge - formData.currentAge;
              const futureValue = formData.currentSavings * Math.pow(1 + scenario.return / 100, yearsToRetirement) +
                formData.monthlyContribution * ((Math.pow(1 + scenario.return / 100 / 12, yearsToRetirement * 12) - 1) / (scenario.return / 100 / 12));
              
              return (
                <AnimatedCard key={index} className={`group ${
                  scenario.return === formData.expectedReturn ? 'ring-2 ring-secondary border-secondary' : ''
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
                    <p className="text-muted mb-6">{scenario.description}</p>
                    
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-secondary mb-2">
                        {formatCurrency(Math.round(futureValue))}
                      </div>
                      <div className="text-sm text-muted">Total at Retirement</div>
                    </div>
                    
                    <Button 
                      variant={scenario.return === formData.expectedReturn ? 'primary' : 'outline'}
                      className="w-full"
                      onClick={() => handleInputChange('expectedReturn', scenario.return)}
                    >
                      {scenario.return === formData.expectedReturn ? 'Current Selection' : 'Select Scenario'}
                    </Button>
                  </CardContent>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Retirement Planning Tips */}
      <motion.section 
        className="py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Retirement Planning Tips
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Expert advice to maximize your retirement savings and secure your financial future.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {tips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <AnimatedCard key={index} className="text-center group">
                  <CardContent className="pt-6">
                    <motion.div 
                      className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary group-hover:text-white transition-all duration-300"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon className="w-8 h-8 text-secondary group-hover:text-white" />
                    </motion.div>
                    
                    <h3 className="text-lg font-heading font-bold text-primary mb-3 group-hover:text-secondary transition-colors">
                      {tip.title}
                    </h3>
                    
                    <p className="text-muted text-sm leading-relaxed mb-4">
                      {tip.description}
                    </p>
                    
                    <div className="bg-background-alt p-3 rounded-lg text-xs text-muted leading-relaxed">
                      <strong>Urdu:</strong> {tip.urduTip}
                    </div>
                  </CardContent>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Educational Resources */}
      <motion.section 
        className="py-20 bg-background-alt"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Learn More About Retirement Planning
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Expand your knowledge with our comprehensive educational resources.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {educationalContent.map((content, index) => {
              const Icon = content.icon;
              return (
                <motion.a 
                  key={index}
                  href={content.link}
                  className="block"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatedCard className="h-full group cursor-pointer border-2 border-transparent hover:border-secondary">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary group-hover:text-white transition-all duration-300">
                        <Icon className="w-6 h-6 text-secondary group-hover:text-white" />
                      </div>
                      
                      <h3 className="font-heading font-bold text-primary mb-2 group-hover:text-secondary transition-colors">
                        {content.title}
                      </h3>
                      
                      <p className="text-sm text-muted leading-relaxed">
                        {content.description}
                      </p>
                      
                      <div className="mt-4 flex items-center justify-center text-xs text-secondary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <Lightbulb className="w-3 h-3 mr-1" />
                        Learn More
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </motion.a>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 bg-gradient-primary text-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
      >
        <div className="container mx-auto px-4 text-center">
          <motion.div variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-6">
              Ready to Start Your Retirement Journey?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Take the first step towards financial security. Start investing with Pakistan's most trusted platform.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={staggerContainer}
            >
              <motion.div variants={fadeIn}>
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  <Target className="w-5 h-5 mr-2" />
                  Create Investment Plan
                </Button>
              </motion.div>
              <motion.div variants={fadeIn}>
                <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
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