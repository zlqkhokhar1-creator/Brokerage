import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { MotionWrapper, StaggerWrapper } from '../animations/MotionWrapper';
import { EnhancedCard } from '../ui/EnhancedCard';
import { 
  BookOpen, 
  TrendingUp, 
  Shield, 
  Target, 
  ChevronRight, 
  CheckCircle,
  ArrowRight,
  Play,
  Users,
  Clock,
  Award
} from 'lucide-react';

export const InvestmentGuide: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState(0);
  const [completedChapters, setCompletedChapters] = useState<number[]>([]);

  const chapters = [
    {
      id: 1,
      title: 'Investment Basics for Pakistanis',
      duration: '15 min read',
      description: 'Understanding the fundamentals of investing in the Pakistani market',
      topics: [
        'What is investing and why it matters',
        'Pakistani Stock Exchange (PSX) overview',
        'Types of investments available in Pakistan',
        'Risk and return relationship',
        'Setting investment goals'
      ],
      level: 'Beginner',
      icon: BookOpen
    },
    {
      id: 2,
      title: 'Understanding Stocks and Shares',
      duration: '20 min read',
      description: 'Deep dive into equity investments and stock analysis',
      topics: [
        'What are stocks and how they work',
        'Reading company financial statements',
        'Fundamental vs technical analysis',
        'Pakistani blue-chip stocks',
        'Dividend investing strategies'
      ],
      level: 'Beginner',
      icon: TrendingUp
    },
    {
      id: 3,
      title: 'Mutual Funds and ETFs',
      duration: '18 min read',
      description: 'Professional portfolio management and diversification',
      topics: [
        'How mutual funds work in Pakistan',
        'Types of mutual funds available',
        'Understanding NAV and expense ratios',
        'SIP (Systematic Investment Plan) benefits',
        'Choosing the right fund manager'
      ],
      level: 'Intermediate',
      icon: Users
    },
    {
      id: 4,
      title: 'Risk Management and Portfolio Building',
      duration: '25 min read',
      description: 'Building a balanced investment portfolio',
      topics: [
        'Asset allocation strategies',
        'Diversification principles',
        'Risk tolerance assessment',
        'Portfolio rebalancing',
        'Emergency fund planning'
      ],
      level: 'Intermediate',
      icon: Shield
    },
    {
      id: 5,
      title: 'Shariah-Compliant Investing',
      duration: '22 min read',
      description: 'Islamic investing principles and halal investment options',
      topics: [
        'Shariah investment principles',
        'Halal vs Haram investments',
        'Islamic banking and sukuk',
        'Shariah-compliant mutual funds',
        'Zakat on investments'
      ],
      level: 'Intermediate',
      icon: Award
    },
    {
      id: 6,
      title: 'Advanced Strategies and AI Investing',
      duration: '30 min read',
      description: 'Modern investing techniques and technology',
      topics: [
        'Dollar-cost averaging in PKR context',
        'Tax-loss harvesting strategies',
        'AI-powered investment insights',
        'Robo-advisor benefits',
        'Advanced portfolio optimization'
      ],
      level: 'Advanced',
      icon: Target
    }
  ];

  const markChapterComplete = (chapterId: number) => {
    if (!completedChapters.includes(chapterId)) {
      setCompletedChapters([...completedChapters, chapterId]);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-green-100 text-green-700';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'Advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <MotionWrapper>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Investment Education Center
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Master the art of investing with our comprehensive guide designed specifically for Pakistani investors.
            </p>
          </div>
        </MotionWrapper>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chapter List */}
          <div className="lg:col-span-1">
            <MotionWrapper>
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-secondary" />
                    Learning Path
                  </CardTitle>
                  <div className="text-sm text-muted">
                    {completedChapters.length} of {chapters.length} completed
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {chapters.map((chapter, index) => {
                      const IconComponent = chapter.icon;
                      const isCompleted = completedChapters.includes(chapter.id);
                      const isActive = activeChapter === index;
                      
                      return (
                        <motion.div
                          key={chapter.id}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                            isActive ? 'bg-secondary text-white' : 'hover:bg-background-alt'
                          }`}
                          onClick={() => setActiveChapter(index)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                                isCompleted ? 'bg-success text-white' : isActive ? 'bg-white/20' : 'bg-secondary/10'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <IconComponent className={`w-4 h-4 ${
                                    isActive ? 'text-white' : 'text-secondary'
                                  }`} />
                                )}
                              </div>
                              <div>
                                <div className={`font-medium text-sm ${
                                  isActive ? 'text-white' : 'text-foreground'
                                }`}>
                                  {chapter.title}
                                </div>
                                <div className={`text-xs ${
                                  isActive ? 'text-white/80' : 'text-muted'
                                }`}>
                                  {chapter.duration}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 ${
                              isActive ? 'text-white' : 'text-muted'
                            }`} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary mb-2">
                        {Math.round((completedChapters.length / chapters.length) * 100)}%
                      </div>
                      <div className="text-sm text-muted">Progress Complete</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionWrapper>
          </div>

          {/* Chapter Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeChapter}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <EnhancedCard hover glow className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        getLevelColor(chapters[activeChapter].level)
                      }`}>
                        {chapters[activeChapter].level}
                      </div>
                      <div className="flex items-center ml-4 text-muted text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        {chapters[activeChapter].duration}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => markChapterComplete(chapters[activeChapter].id)}
                      disabled={completedChapters.includes(chapters[activeChapter].id)}
                    >
                      {completedChapters.includes(chapters[activeChapter].id) ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Learning
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <h3 className="text-2xl font-heading font-bold text-primary mb-4">
                    {chapters[activeChapter].title}
                  </h3>
                  
                  <p className="text-muted text-lg mb-6 leading-relaxed">
                    {chapters[activeChapter].description}
                  </p>
                  
                  <div className="bg-background-alt rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">What you'll learn:</h4>
                    <StaggerWrapper className="space-y-3">
                      {chapters[activeChapter].topics.map((topic, index) => (
                        <div key={index} className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-secondary mr-3 flex-shrink-0" />
                          <span className="text-foreground">{topic}</span>
                        </div>
                      ))}
                    </StaggerWrapper>
                  </div>
                  
                  <div className="flex items-center justify-between mt-8">
                    <Button
                      variant="outline"
                      disabled={activeChapter === 0}
                      onClick={() => setActiveChapter(Math.max(0, activeChapter - 1))}
                    >
                      Previous Chapter
                    </Button>
                    <Button
                      disabled={activeChapter === chapters.length - 1}
                      onClick={() => setActiveChapter(Math.min(chapters.length - 1, activeChapter + 1))}
                    >
                      Next Chapter
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </EnhancedCard>
              </motion.div>
            </AnimatePresence>
            
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <StaggerWrapper>
                <EnhancedCard hover className="text-center">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">50,000+</div>
                  <div className="text-muted text-sm">Students Educated</div>
                </EnhancedCard>
                
                <EnhancedCard hover className="text-center">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">6</div>
                  <div className="text-muted text-sm">Comprehensive Chapters</div>
                </EnhancedCard>
                
                <EnhancedCard hover className="text-center">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Award className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">98%</div>
                  <div className="text-muted text-sm">Completion Rate</div>
                </EnhancedCard>
              </StaggerWrapper>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};