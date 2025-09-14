'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  BookOpen, 
  TrendingUp, 
  User, 
  Tag,
  Clock,
  Eye,
  Flame,
  Award,
  Zap,
  Target,
  DollarSign,
  PieChart
} from 'lucide-react';

export interface Category {
  name: string;
  count: number;
  active: boolean;
  icon: any;
}

export interface TrendingTopic {
  name: string;
  posts: number;
  trend: string;
}

export interface RecentPost {
  title: string;
  date: string;
  views: string;
  category: string;
}

interface BlogSidebarProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export const BlogSidebar: React.FC<BlogSidebarProps> = ({ selectedCategory, onCategorySelect }) => {
  const categories: Category[] = [
    { name: 'All Posts', count: 52, active: selectedCategory === 'All Posts', icon: BookOpen },
    { name: 'Market Analysis', count: 15, active: selectedCategory === 'Market Analysis', icon: TrendingUp },
    { name: 'Investment Strategy', count: 12, active: selectedCategory === 'Investment Strategy', icon: Target },
    { name: 'AI & Technology', count: 8, active: selectedCategory === 'AI & Technology', icon: Zap },
    { name: 'Islamic Finance', count: 9, active: selectedCategory === 'Islamic Finance', icon: Award },
    { name: 'Retirement Planning', count: 6, active: selectedCategory === 'Retirement Planning', icon: Clock },
    { name: 'Mutual Funds', count: 4, active: selectedCategory === 'Mutual Funds', icon: PieChart }
  ];

  const trendingTopics: TrendingTopic[] = [
    { name: 'KSE-100 Bull Run', posts: 12, trend: '+15%' },
    { name: 'AI Trading Algorithms', posts: 8, trend: '+32%' },
    { name: 'Islamic Banking', posts: 15, trend: '+8%' },
    { name: 'Tech Stocks Rally', posts: 6, trend: '+45%' },
    { name: 'Retirement Planning', posts: 9, trend: '+12%' }
  ];

  const recentPosts: RecentPost[] = [
    {
      title: 'KSE-100 Crosses 50,000: What It Means for Investors',
      date: '2025-01-14',
      views: '3,240',
      category: 'Market Analysis'
    },
    {
      title: 'New SECP Regulations: Impact on Retail Investors',
      date: '2025-01-13',
      views: '2,180',
      category: 'Regulations'
    },
    {
      title: 'Tech Stocks Rally: Opportunities in Pakistani IT Sector',
      date: '2025-01-11',
      views: '4,560',
      category: 'Technology'
    },
    {
      title: 'Inflation Hedge: Best Investment Options in Pakistan',
      date: '2025-01-09',
      views: '7,890',
      category: 'Investment Strategy'
    },
    {
      title: 'Q4 Earnings Season: Top Performers Analysis',
      date: '2025-01-07',
      views: '5,670',
      category: 'Earnings'
    }
  ];

  const newsletter = {
    subscribers: '28,500+',
    description: 'Get weekly market insights, investment tips, and exclusive analysis delivered to your inbox.',
    features: ['Market Updates', 'Stock Picks', 'Economic Analysis', 'Investment Tips']
  };

  return (
    <div className="space-y-8">
      {/* Categories */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="w-5 h-5 mr-2" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.div 
                  key={index} 
                  className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                    category.active ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => onCategorySelect(category.name)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <span className="text-xs opacity-80">({category.count})</span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Trending Topics */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Flame className="w-5 h-5 mr-2 text-red-500" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trendingTopics.map((topic, index) => (
              <motion.div 
                key={index} 
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                whileHover={{ x: 2 }}
              >
                <div>
                  <div className="font-medium text-sm">{topic.name}</div>
                  <div className="text-xs text-gray-500">{topic.posts} articles</div>
                </div>
                <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                  {topic.trend}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Posts */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Recent Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPosts.map((post, index) => (
              <motion.div 
                key={index} 
                className="border-b border-gray-200 last:border-0 pb-4 last:pb-0 cursor-pointer group"
                whileHover={{ x: 2 }}
              >
                <h4 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors text-sm leading-relaxed">
                  {post.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <span>{post.date}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {post.category}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {post.views}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Newsletter Signup */}
      <Card className="bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Stay Updated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/90 text-sm mb-4">
            {newsletter.description}
          </p>
          
          <div className="space-y-2 mb-4">
            {newsletter.features.map((feature, index) => (
              <div key={index} className="flex items-center text-xs text-white/80">
                <div className="w-1 h-1 bg-white rounded-full mr-2"></div>
                {feature}
              </div>
            ))}
          </div>
          
          <div className="space-y-3">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-sm"
            />
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-blue-600">
                Subscribe Now
              </Button>
            </motion.div>
          </div>
          <div className="flex items-center justify-center mt-4 text-xs text-white/80">
            <User className="w-3 h-3 mr-1" />
            {newsletter.subscribers} subscribers
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
