'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  BookOpen, 
  Calendar, 
  User, 
  ArrowRight,
  Eye,
  Star,
  Heart,
  MessageCircle
} from 'lucide-react';

export interface BlogPost {
  title: string;
  excerpt: string;
  author: string;
  authorTitle: string;
  date: string;
  readTime: string;
  category: string;
  views: string;
  likes: string;
  comments: string;
  featured: boolean;
  trending: boolean;
}

interface ArticleCardProps {
  post: BlogPost;
  onCategoryClick?: (category: string) => void;
  index?: number;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ post, onCategoryClick, index = 0 }) => {
  const slideInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <motion.div
      variants={slideInUp}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="group h-full hover:shadow-lg transition-all duration-300">
        <motion.div 
          className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden"
          whileHover={{ scale: 1.02 }}
        >
          <BookOpen className="w-12 h-12 text-blue-600" />
          {post.featured && (
            <div className="absolute top-2 right-2">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
            </div>
          )}
          {post.trending && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
              HOT
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            {post.readTime}
          </div>
        </motion.div>
        
        <CardHeader>
          <div className="flex items-center space-x-3 mb-3">
            <motion.span 
              className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              onClick={() => onCategoryClick?.(post.category)}
            >
              {post.category}
            </motion.span>
            <div className="flex items-center text-gray-500 text-xs space-x-2">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {post.date}
              </div>
              <div className="flex items-center">
                <Eye className="w-3 h-3 mr-1" />
                {post.views}
              </div>
            </div>
          </div>
          
          <CardTitle className="text-lg group-hover:text-blue-600 transition-colors cursor-pointer">
            {post.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">{post.author}</div>
                <div className="text-xs">{post.authorTitle}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-sm text-gray-500">
              <motion.div 
                className="flex items-center cursor-pointer hover:text-red-500 transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <Heart className="w-4 h-4 mr-1" />
                {post.likes}
              </motion.div>
              <motion.div 
                className="flex items-center cursor-pointer hover:text-blue-500 transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {post.comments}
              </motion.div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button className="w-full group-hover:bg-blue-600 transition-colors">
              Read Article
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
