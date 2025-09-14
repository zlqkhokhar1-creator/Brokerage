'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent } from '@/components/ui/card';
import { Percent, BarChart3, BookOpen, Globe, Lightbulb } from 'lucide-react';

export const RetirementEducation: React.FC = () => {
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
            Learn More About Retirement Planning
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
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
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <Card className="h-full group cursor-pointer border-2 border-transparent hover:border-green-500">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                      <Icon className="w-6 h-6 text-green-600 group-hover:text-white" />
                    </div>
                    
                    <h3 className="font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors">
                      {content.title}
                    </h3>
                    
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {content.description}
                    </p>
                    
                    <div className="mt-4 flex items-center justify-center text-xs text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <Lightbulb className="w-3 h-3 mr-1" />
                      Learn More
                    </div>
                  </CardContent>
                </Card>
              </motion.a>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};
