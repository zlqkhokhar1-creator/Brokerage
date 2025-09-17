'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { 
  TrendingUp, 
  Calendar, 
  User, 
  ArrowRight,
  Eye,
  Star,
  Heart,
  Share2,
  Bookmark,
  Flame
} from 'lucide-react';
import { BlogPost } from './ArticleCard';

interface FeaturedArticleProps {
  article: BlogPost;
}

export const FeaturedArticle: React.FC<FeaturedArticleProps> = ({ article }) => {
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

  return (
    <motion.section 
      className="py-20"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
    >
      <div className="container mx-auto px-4">
        <motion.div className="mb-12" variants={fadeIn}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Star className="w-6 h-6 mr-2 text-yellow-400 fill-current" />
              Featured Article
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Flame className="w-4 h-4 text-red-500" />
              <span>Trending Now</span>
            </div>
          </div>
          
          <Card className="group overflow-hidden border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all duration-300">
            <div className="grid lg:grid-cols-2 gap-8">
              <motion.div 
                className="aspect-video lg:aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <TrendingUp className="w-16 h-16 text-blue-600" />
                <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  TRENDING
                </div>
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {article.readTime}
                </div>
              </motion.div>
              
              <div className="p-6 lg:p-8">
                <div className="flex items-center space-x-4 mb-4">
                  <motion.span 
                    className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {article.category}
                  </motion.span>
                  <div className="flex items-center text-gray-500 text-sm space-x-3">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {article.date}
                    </div>
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {article.views}
                    </div>
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-1" />
                      {article.likes}
                    </div>
                  </div>
                </div>
                
                <motion.h3 
                  className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors cursor-pointer"
                  whileHover={{ x: 4 }}
                >
                  {article.title}
                </motion.h3>
                
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  {article.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <motion.div 
                      className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <User className="w-6 h-6 text-blue-600" />
                    </motion.div>
                    <div>
                      <div className="font-semibold text-gray-900">{article.author}</div>
                      <div className="text-sm text-gray-600">{article.authorTitle}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <motion.button 
                      className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Bookmark className="w-4 h-4" />
                    </motion.button>
                    <motion.button 
                      className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Share2 className="w-4 h-4" />
                    </motion.button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Read Article
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
};
