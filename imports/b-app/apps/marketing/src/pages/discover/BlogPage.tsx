import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { fadeIn, staggerContainer, slideInUp } from '../../animations';
import { 
  BookOpen, 
  TrendingUp, 
  Calendar, 
  User, 
  ArrowRight,
  Search,
  Tag,
  Clock,
  Eye,
  Star,
  Filter,
  Heart,
  Share2,
  Bookmark,
  MessageCircle,
  Flame,
  Award,
  Globe,
  Zap,
  Target,
  DollarSign,
  PieChart
} from 'lucide-react';

export const BlogPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All Posts');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredArticle = {
    title: 'AI in Pakistani Stock Market: How Machine Learning is Revolutionizing Investment Decisions',
    excerpt: 'Discover how artificial intelligence and machine learning algorithms are transforming the way Pakistani investors make decisions in the stock market, with real examples and performance data from leading Pakistani tech companies.',
    author: 'Dr. Sarah Ahmed',
    authorTitle: 'AI Investment Research Lead',
    date: '2025-01-15',
    readTime: '8 min read',
    image: '/images/ai-stock-market.jpg',
    category: 'AI & Technology',
    views: '15,420',
    likes: '1,247',
    comments: '89',
    featured: true,
    trending: true
  };

  const blogPosts = [
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
      title: 'Tax-Efficient Investing Strategies for Pakistani Investors',
      excerpt: 'Maximize your after-tax returns with these proven tax optimization strategies and techniques, including capital gains tax planning.',
      author: 'Ayesha Khan',
      authorTitle: 'Tax Planning Consultant',
      date: '2025-01-01',
      readTime: '11 min read',
      category: 'Tax Planning',
      views: '5,670',
      likes: '334',
      comments: '19',
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
    },
    {
      title: 'Cryptocurrency in Pakistan: Legal Status and Investment Guide',
      excerpt: 'Complete guide to cryptocurrency investing in Pakistan, including legal considerations, tax implications, and recommended platforms.',
      author: 'Zain Abbas',
      authorTitle: 'Crypto Investment Analyst',
      date: '2025-01-11',
      readTime: '14 min read',
      category: 'Cryptocurrency',
      views: '16,780',
      likes: '1,234',
      comments: '89',
      featured: false,
      trending: true
    }
  ];

  const categories = [
    { name: 'All Posts', count: 52, active: selectedCategory === 'All Posts', icon: BookOpen },
    { name: 'Market Analysis', count: 15, active: selectedCategory === 'Market Analysis', icon: TrendingUp },
    { name: 'Investment Strategy', count: 12, active: selectedCategory === 'Investment Strategy', icon: Target },
    { name: 'AI & Technology', count: 8, active: selectedCategory === 'AI & Technology', icon: Zap },
    { name: 'Islamic Finance', count: 9, active: selectedCategory === 'Islamic Finance', icon: Award },
    { name: 'Retirement Planning', count: 6, active: selectedCategory === 'Retirement Planning', icon: Clock },
    { name: 'Tax Planning', count: 5, active: selectedCategory === 'Tax Planning', icon: DollarSign },
    { name: 'Mutual Funds', count: 4, active: selectedCategory === 'Mutual Funds', icon: PieChart },
    { name: 'Cryptocurrency', count: 3, active: selectedCategory === 'Cryptocurrency', icon: Globe }
  ];

  const trendingTopics = [
    { name: 'KSE-100 Bull Run', posts: 12, trend: '+15%' },
    { name: 'AI Trading Algorithms', posts: 8, trend: '+32%' },
    { name: 'Islamic Banking', posts: 15, trend: '+8%' },
    { name: 'Tech Stocks Rally', posts: 6, trend: '+45%' },
    { name: 'Retirement Planning', posts: 9, trend: '+12%' }
  ];

  const recentPosts = [
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

  const marketInsights = {
    kse100: '+2.3%',
    usdPkr: '278.50',
    inflation: '8.2%',
    goldRate: '₨215,400/tola'
  };

  const newsletter = {
    subscribers: '28,500+',
    description: 'Get weekly market insights, investment tips, and exclusive analysis delivered to your inbox.',
    features: ['Market Updates', 'Stock Picks', 'Economic Analysis', 'Investment Tips']
  };

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All Posts' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              <Flame className="w-4 h-4 mr-2" />
              Latest Market Insights & Analysis
            </motion.div>
            
            <h1 className="text-4xl lg:text-5xl font-heading font-bold mb-6">
              Investment Insights & 
              <span className="text-secondary">Market Analysis</span>
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all duration-300"
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
                <div className="text-lg font-bold text-secondary">{marketInsights.kse100}</div>
              </motion.div>
              <motion.div 
                className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
                variants={fadeIn}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-xs text-white/70">USD/PKR</div>
                <div className="text-lg font-bold text-secondary">{marketInsights.usdPkr}</div>
              </motion.div>
              <motion.div 
                className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
                variants={fadeIn}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-xs text-white/70">Inflation</div>
                <div className="text-lg font-bold text-secondary">{marketInsights.inflation}</div>
              </motion.div>
              <motion.div 
                className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
                variants={fadeIn}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-xs text-white/70">Gold</div>
                <div className="text-sm font-bold text-secondary">{marketInsights.goldRate}</div>
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

      {/* Featured Article */}
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
              <h2 className="text-2xl font-heading font-bold text-primary flex items-center">
                <Star className="w-6 h-6 mr-2 text-yellow-400 fill-current" />
                Featured Article
              </h2>
              <div className="flex items-center space-x-2 text-sm text-muted">
                <Flame className="w-4 h-4 text-red-500" />
                <span>Trending Now</span>
              </div>
            </div>
            
            <AnimatedCard className="group overflow-hidden border-2 border-transparent hover:border-secondary">
              <div className="grid lg:grid-cols-2 gap-8">
                <motion.div 
                  className="aspect-video lg:aspect-square bg-gradient-to-br from-secondary/20 to-primary/20 rounded-lg flex items-center justify-center relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <TrendingUp className="w-16 h-16 text-secondary" />
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    TRENDING
                  </div>
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {featuredArticle.readTime}
                  </div>
                </motion.div>
                
                <div className="p-6 lg:p-8">
                  <div className="flex items-center space-x-4 mb-4">
                    <motion.span 
                      className="bg-secondary text-white px-3 py-1 rounded-full text-sm font-medium"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {featuredArticle.category}
                    </motion.span>
                    <div className="flex items-center text-muted text-sm space-x-3">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {featuredArticle.date}
                      </div>
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {featuredArticle.views}
                      </div>
                      <div className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {featuredArticle.likes}
                      </div>
                    </div>
                  </div>
                  
                  <motion.h3 
                    className="text-2xl lg:text-3xl font-heading font-bold text-primary mb-4 group-hover:text-secondary transition-colors cursor-pointer"
                    whileHover={{ x: 4 }}
                  >
                    {featuredArticle.title}
                  </motion.h3>
                  
                  <p className="text-muted text-lg mb-6 leading-relaxed">
                    {featuredArticle.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <motion.div 
                        className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mr-3"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <User className="w-6 h-6 text-secondary" />
                      </motion.div>
                      <div>
                        <div className="font-semibold text-foreground">{featuredArticle.author}</div>
                        <div className="text-sm text-muted">{featuredArticle.authorTitle}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <motion.button 
                        className="p-2 rounded-lg bg-background-alt text-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Bookmark className="w-4 h-4" />
                      </motion.button>
                      <motion.button 
                        className="p-2 rounded-lg bg-background-alt text-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Share2 className="w-4 h-4" />
                      </motion.button>
                      <Button>
                        Read Article
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        </div>
      </motion.section>

      {/* Blog Posts Grid */}
      <motion.section 
        className="pb-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <motion.div 
                className="flex items-center justify-between mb-8"
                variants={fadeIn}
              >
                <h2 className="text-2xl font-heading font-bold text-primary">Latest Articles</h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                  <select className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary">
                    <option>Most Recent</option>
                    <option>Most Popular</option>
                    <option>Most Viewed</option>
                    <option>Most Liked</option>
                  </select>
                </div>
              </motion.div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {filteredPosts.map((post, index) => (
                  <motion.div
                    key={index}
                    variants={slideInUp}
                    transition={{ delay: index * 0.1 }}
                  >
                    <AnimatedCard className="group h-full">
                      <motion.div 
                        className="aspect-video bg-gradient-to-br from-secondary/10 to-primary/10 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden"
                        whileHover={{ scale: 1.02 }}
                      >
                        <BookOpen className="w-12 h-12 text-secondary" />
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
                            className="bg-secondary/10 text-secondary px-2 py-1 rounded text-xs font-medium cursor-pointer hover:bg-secondary hover:text-white transition-colors"
                            whileHover={{ scale: 1.05 }}
                            onClick={() => setSelectedCategory(post.category)}
                          >
                            {post.category}
                          </motion.span>
                          <div className="flex items-center text-muted text-xs space-x-2">
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
                        
                        <CardTitle className="text-lg group-hover:text-secondary transition-colors cursor-pointer">
                          {post.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-muted mb-4 leading-relaxed line-clamp-3">
                          {post.excerpt}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-muted">
                            <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center mr-2">
                              <User className="w-4 h-4 text-secondary" />
                            </div>
                            <div>
                              <div className="font-medium">{post.author}</div>
                              <div className="text-xs">{post.authorTitle}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm text-muted">
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
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                ))}
              </div>
              
              {/* Load More */}
              <motion.div 
                className="text-center mt-12"
                variants={fadeIn}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="outline" size="lg">
                    Load More Articles
                  </Button>
                </motion.div>
              </motion.div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              {/* Categories */}
              <AnimatedCard>
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
                            category.active ? 'bg-secondary text-white' : 'hover:bg-background-alt'
                          }`}
                          onClick={() => setSelectedCategory(category.name)}
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
              </AnimatedCard>
              
              {/* Trending Topics */}
              <AnimatedCard>
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
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background-alt cursor-pointer transition-colors"
                        whileHover={{ x: 2 }}
                      >
                        <div>
                          <div className="font-medium text-sm">{topic.name}</div>
                          <div className="text-xs text-muted">{topic.posts} articles</div>
                        </div>
                        <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          {topic.trend}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>
              
              {/* Recent Posts */}
              <AnimatedCard>
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
                        className="border-b border-border last:border-0 pb-4 last:pb-0 cursor-pointer group"
                        whileHover={{ x: 2 }}
                      >
                        <h4 className="font-medium text-foreground mb-2 group-hover:text-secondary transition-colors text-sm leading-relaxed">
                          {post.title}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-muted">
                          <div className="flex items-center space-x-2">
                            <span>{post.date}</span>
                            <span className="px-2 py-1 bg-background-alt rounded text-xs">
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
              </AnimatedCard>
              
              {/* Newsletter Signup */}
              <AnimatedCard className="bg-gradient-secondary text-white">
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
                      <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-secondary">
                        Subscribe Now
                      </Button>
                    </motion.div>
                  </div>
                  <div className="flex items-center justify-center mt-4 text-xs text-white/80">
                    <User className="w-3 h-3 mr-1" />
                    {newsletter.subscribers} subscribers
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 bg-gradient-primary text-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4 text-center">
          <motion.div variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-6">
              Ready to Put Knowledge into Action?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Start implementing these investment strategies with Pakistan's most advanced trading platform and AI-powered investment tools.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={staggerContainer}
            >
              <motion.div variants={slideInUp}>
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Investing Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              <motion.div variants={slideInUp}>
                <Link to="/discover/retirement-calculator">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
                    Try Retirement Calculator
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};