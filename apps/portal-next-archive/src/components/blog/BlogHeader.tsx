"use client";
'use client';

import React, { useState } from 'react';
import { motion } from '@/components/MotionWrappers';
import { 
  BookOpen, 
  TrendingUp, 
  User, 
  Search,
  Flame
} from 'lucide-react';

interface BlogHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const BlogHeader: React.FC<BlogHeaderProps> = ({ searchQuery, onSearchChange }) => {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const slideInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const marketInsights = {
    kse100: '+2.3%',
    usdPkr: '278.50',
    inflation: '8.2%',
    goldRate: '₨215,400/tola'
  };

  return (
    <motion.section 
      className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white py-20"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4">
        <motion.div className="text-center max-w-4xl mx-auto" variants={fadeIn}>
          <motion.div 
            className="inline-flex items-center bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded-full text-sm font-medium mb-6"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Flame className="w-4 h-4 mr-2" />
            Latest Market Insights & Analysis
          </motion.div>
          
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Investment Insights & 
            <span className="text-yellow-400"> Market Analysis</span>
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Stay ahead of Pakistani markets with expert analysis, investment strategies, and actionable insights from our team of financial professionals and market researchers.
          </p>
          
          {/* Search Bar */}
          <motion.div 
            className="relative max-w-2xl mx-auto mb-8"
            variants={slideInUp}
          >
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search articles, topics, or authors..." 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
            />
          </motion.div>
          
          {/* Market Indicators */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            variants={staggerContainer}
          >
            <motion.div 
              className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
              variants={fadeIn}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-xs text-white/70">KSE-100</div>
              <div className="text-lg font-bold text-yellow-400">{marketInsights.kse100}</div>
            </motion.div>
            <motion.div 
              className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
              variants={fadeIn}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-xs text-white/70">USD/PKR</div>
              <div className="text-lg font-bold text-yellow-400">{marketInsights.usdPkr}</div>
            </motion.div>
            <motion.div 
              className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
              variants={fadeIn}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-xs text-white/70">Inflation</div>
              <div className="text-lg font-bold text-yellow-400">{marketInsights.inflation}</div>
            </motion.div>
            <motion.div 
              className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
              variants={fadeIn}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-xs text-white/70">Gold</div>
              <div className="text-sm font-bold text-yellow-400">{marketInsights.goldRate}</div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="flex items-center justify-center space-x-8 text-sm"
            variants={fadeIn}
          >
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              50+ Articles
            </div>
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              Expert Authors
            </div>
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Daily Updates
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
};
