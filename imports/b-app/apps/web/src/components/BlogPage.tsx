'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Filter, ArrowRight, ArrowLeft } from 'lucide-react';

// Animation Components
import { 
  MotionWrapper, 
  StaggerWrapper, 
  Floating, 
  PageTransition 
} from './animations/MotionWrapper';
import { CountUp } from './animations/CountUp';
import { EnhancedCard, MagneticButton } from './ui/EnhancedCard';
import { EnhancedArrow, CTAButton } from './ui/EnhancedArrow';
import { BlogHeader } from './blog/BlogHeader';
import { FeaturedArticle } from './blog/FeaturedArticle';
import { ArticleCard, BlogPost } from './blog/ArticleCard';
import { BlogSidebar } from './blog/BlogSidebar';

interface BlogPageProps {
  onNavigate?: (page: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState('All Posts');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredArticle: BlogPost = {
    title: 'AI in Pakistani Stock Market: How Machine Learning is Revolutionizing Investment Decisions',
    excerpt: 'Discover how artificial intelligence and machine learning algorithms are transforming the way Pakistani investors make decisions in the stock market, with real examples and performance data from leading Pakistani tech companies.',
    author: 'Dr. Sarah Ahmed',
    authorTitle: 'AI Investment Research Lead',
    date: '2025-01-15',
    readTime: '8 min read',
    category: 'AI & Technology',
    views: '15,420',
    likes: '1,247',
    comments: '89',
    featured: true,
    trending: true
  };

  const blogPosts: BlogPost[] = [
    {
      title: 'Complete Guide to Mutual Fund Investing in Pakistan 2025',
      excerpt: 'Everything you need to know about investing in mutual funds in Pakistan, from basics to advanced strategies, tax implications, and fund selection criteria.',
      author: 'Ahmed Khan',
      authorTitle: 'Mutual Fund Specialist',
      date: '2025-01-12',
      readTime: '12 min read',
      category: 'Mutual Funds',
      views: '8,230',
      likes: '567',
      comments: '34',
      featured: false,
      trending: false
    },
    {
      title: 'Shariah-Compliant Investing: Building Wealth the Halal Way',
      excerpt: 'A comprehensive guide to Islamic investing principles and how to build a Shariah-compliant portfolio with Pakistani Islamic banks and funds.',
      author: 'Fatima Ali',
      authorTitle: 'Islamic Finance Expert',
      date: '2025-01-10',
      readTime: '10 min read',
      category: 'Islamic Finance',
      views: '12,150',
      likes: '892',
      comments: '67',
      featured: true,
      trending: true
    },
    {
      title: 'PSX Performance Analysis: Top Stocks to Watch in 2025',
      excerpt: 'Market analysis and predictions for Pakistani stocks with highest growth potential this year, including detailed company financials and sector analysis.',
      author: 'Ali Raza',
      authorTitle: 'Senior Market Analyst',
      date: '2025-01-08',
      readTime: '15 min read',
      category: 'Market Analysis',
      views: '18,960',
      likes: '1,456',
      comments: '123',
      featured: true,
      trending: true
    },
    {
      title: 'Retirement Planning for Pakistani Millennials: Start Early, Retire Rich',
      excerpt: 'How young professionals in Pakistan can build substantial retirement wealth through smart investing, compound interest, and systematic investment plans.',
      author: 'Dr. Sarah Ahmed',
      authorTitle: 'AI Investment Research Lead',
      date: '2025-01-05',
      readTime: '9 min read',
      category: 'Retirement Planning',
      views: '6,890',
      likes: '445',
      comments: '28',
      featured: false,
      trending: false
    },
    {
      title: 'Understanding Dollar-Cost Averaging in Pakistani Markets',
      excerpt: 'Learn how systematic investment plans can reduce risk and maximize returns in volatile markets, with examples from KSE-100 historical data.',
      author: 'Hassan Sheikh',
      authorTitle: 'Investment Strategist',
      date: '2025-01-03',
      readTime: '7 min read',
      category: 'Investment Strategy',
      views: '9,340',
      likes: '623',
      comments: '45',
      featured: false,
      trending: false
    },
    {
      title: 'KSE-100 Crosses 50,000: Historical Milestone Analysis',
      excerpt: 'Deep dive into Pakistan stock exchange crossing the 50,000 mark, what it means for retail investors, and future market predictions.',
      author: 'Muhammad Tariq',
      authorTitle: 'Market Research Director',
      date: '2025-01-14',
      readTime: '13 min read',
      category: 'Market Analysis',
      views: '22,450',
      likes: '1,678',
      comments: '156',
      featured: true,
      trending: true
    }
  ];

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

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All Posts' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <BlogHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Featured Article */}
      <FeaturedArticle article={featuredArticle} />

      {/* Blog Posts Grid */}
      <MotionWrapper className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Latest Articles</h2>
                <div className="flex items-center space-x-2">
                  <MagneticButton variant="default" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </MagneticButton>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Most Recent</option>
                    <option>Most Popular</option>
                    <option>Most Viewed</option>
                    <option>Most Liked</option>
                  </select>
                </div>
              </div>
              
              <StaggerWrapper className="grid md:grid-cols-2 gap-8">
                {filteredPosts.map((post, index) => (
                  <div key={post.id}>
                    <ArticleCard 
                      article={post} 
                      onClick={() => console.log('Navigate to article:', post.id)}
                    />
                  </div>
                ))}
              </StaggerWrapper>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <BlogSidebar 
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
            </div>
          </div>
        </div>
      </MotionWrapper>

      {/* CTA Section */}
      <MotionWrapper className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start Your Investment Journey?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of Pakistani investors who trust InvestPro for their financial future
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <CTAButton 
                size="lg" 
                className="text-lg px-8 bg-white text-blue-900 hover:bg-blue-50"
                onClick={() => onNavigate?.('signup')}
              >
                Start Investing Today
              </CTAButton>
              <MagneticButton 
                size="lg" 
                variant="default"
                className="text-lg px-8 border-white text-white hover:bg-white hover:text-blue-900"
                onClick={() => onNavigate?.('retirement-calculator')}
              >
                Try Retirement Calculator
              </MagneticButton>
            </div>
          </div>
        </div>
      </MotionWrapper>
    </div>
    </PageTransition>
  );
};
