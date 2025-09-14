"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from '@/components/MotionWrappers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Atom, 
  TrendingUp, 
  Shield, 
  Zap, 
  Globe, 
  Smartphone, 
  BarChart3,
  Target,
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle,
  Star,
  Users,
  Award,
  Rocket,
  Eye,
  Database,
  Activity,
  Lock,
  Layers,
  ChevronDown
} from 'lucide-react';

interface WorldClassLandingPageProps {
  onNavigate: (page: string) => void;
}

export const WorldClassLandingPage: React.FC<WorldClassLandingPageProps> = ({ onNavigate }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const aiRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true });
  const featuresInView = useInView(featuresRef, { once: true });
  const aiInView = useInView(aiRef, { once: true });

  // Parallax effects
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Mouse tracking for interactive elements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Revolutionary AI features data
  const aiFeatures = [
    {
      icon: Atom,
      title: "Quantum Portfolio Optimization",
      description: "Harness quantum computing principles for portfolio optimization that surpasses classical methods",
      color: "from-purple-500 to-pink-500",
      delay: 0.1
    },
    {
      icon: Brain,
      title: "Predictive Market Regimes",
      description: "AI-powered market regime detection with transition probabilities and adaptive strategies",
      color: "from-blue-500 to-cyan-500",
      delay: 0.2
    },
    {
      icon: Eye,
      title: "Behavioral Finance AI",
      description: "Detect and correct trading biases with personalized behavioral interventions",
      color: "from-green-500 to-emerald-500",
      delay: 0.3
    },
    {
      icon: Database,
      title: "Alternative Data Intelligence",
      description: "Satellite imagery, credit card data, and unconventional sources for unique insights",
      color: "from-orange-500 to-red-500",
      delay: 0.4
    },
    {
      icon: Zap,
      title: "Neural Network Predictor",
      description: "Deep LSTM networks for price prediction with uncertainty quantification",
      color: "from-indigo-500 to-purple-500",
      delay: 0.5
    },
    {
      icon: Activity,
      title: "Automated Strategy Generator",
      description: "Genetic algorithms evolve and optimize trading strategies automatically",
      color: "from-teal-500 to-blue-500",
      delay: 0.6
    }
  ];

  const stats = [
    { value: "99.9%", label: "Uptime", icon: Shield },
    { value: "<1ms", label: "Execution Speed", icon: Zap },
    { value: "150+", label: "Global Markets", icon: Globe },
    { value: "24/7", label: "AI Monitoring", icon: Brain }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Quantitative Analyst",
      company: "Goldman Sachs",
      content: "The quantum optimization features are revolutionary. Nothing else comes close.",
      rating: 5,
      avatar: "SC"
    },
    {
      name: "Michael Rodriguez",
      role: "Portfolio Manager",
      company: "BlackRock",
      content: "Alternative data integration gives us insights we never had before.",
      rating: 5,
      avatar: "MR"
    },
    {
      name: "Dr. Emily Watson",
      role: "AI Research Director",
      company: "Two Sigma",
      content: "The behavioral finance AI is a game-changer for institutional trading.",
      rating: 5,
      avatar: "EW"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-teal-900/20" />
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                QuantumTrade AI
              </span>
            </motion.div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#ai" className="text-gray-300 hover:text-white transition-colors">AI Technology</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <Button 
                onClick={() => onNavigate('login')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-6">
        <motion.div 
          className="max-w-6xl mx-auto text-center z-10"
          style={{ y, opacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <Badge className="mb-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30">
              <Sparkles className="w-4 h-4 mr-2" />
              World's Most Advanced Trading Platform
            </Badge>
          </motion.div>

          <motion.h1 
            className="text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent leading-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.4 }}
          >
            Quantum-Powered
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Trading
            </span>
          </motion.h1>

          <motion.p 
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.6 }}
          >
            Revolutionary platform combining quantum computing, behavioral AI, and alternative data intelligence. 
            Surpass traditional brokerages with institutional-grade technology.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16"
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <Button 
              size="lg"
              onClick={() => onNavigate('signup')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 py-4 rounded-xl shadow-2xl shadow-purple-500/25"
            >
              Start Trading Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setIsVideoPlaying(true)}
              className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-4 rounded-xl"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 1 }}
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                className="text-center"
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="w-6 h-6 text-purple-400 mr-2" />
                  <span className="text-3xl font-bold text-white">{stat.value}</span>
                </div>
                <p className="text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </motion.div>
      </section>

      {/* Revolutionary AI Features */}
      <section ref={aiRef} id="ai" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            animate={aiInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
          >
            <Badge className="mb-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30">
              <Brain className="w-4 h-4 mr-2" />
              Revolutionary AI Technology
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Beyond Traditional Trading
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our AI features surpass any existing brokerage platform, combining quantum computing, 
              behavioral analysis, and alternative data for unprecedented trading insights.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {aiFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={aiInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: feature.delay }}
                whileHover={{ scale: 1.05, rotateY: 5 }}
                className="group"
              >
                <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border-gray-800 backdrop-blur-xl h-full overflow-hidden">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Institutional-Grade Platform
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need for professional trading, powered by cutting-edge technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <div className="space-y-8">
                {[
                  { icon: Shield, title: "Advanced Risk Management", desc: "AI-powered risk assessment with real-time monitoring" },
                  { icon: Zap, title: "Ultra-Low Latency", desc: "Sub-millisecond execution with direct market access" },
                  { icon: Globe, title: "Global Markets", desc: "Trade 150+ markets worldwide with unified interface" },
                  { icon: Lock, title: "Bank-Grade Security", desc: "Multi-layer encryption and regulatory compliance" }
                ].map((item, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-start space-x-4"
                    whileHover={{ x: 10 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-gray-300">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-3xl p-8 backdrop-blur-xl border border-purple-500/20">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-500/20 rounded-xl p-4 text-center">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-400">+247%</div>
                    <div className="text-sm text-gray-300">AI Returns</div>
                  </div>
                  <div className="bg-blue-500/20 rounded-xl p-4 text-center">
                    <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-400">94.7%</div>
                    <div className="text-sm text-gray-300">Accuracy</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">$2.1B+</div>
                  <div className="text-gray-300">Assets Under Management</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Trusted by Professionals
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border-gray-800 backdrop-blur-xl h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold mr-4">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-white">{testimonial.name}</div>
                        <div className="text-sm text-gray-400">{testimonial.role}, {testimonial.company}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Ready to Transform Your Trading?
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Join thousands of professional traders using quantum-powered AI to achieve superior returns.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                size="lg"
                onClick={() => onNavigate('signup')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-12 py-6 rounded-xl shadow-2xl shadow-purple-500/25"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => onNavigate('login')}
                className="border-white/20 text-white hover:bg-white/10 text-lg px-12 py-6 rounded-xl"
              >
                Sign In
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
            onClick={() => setIsVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-gray-900 rounded-2xl p-8 max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video bg-gradient-to-br from-purple-900 to-pink-900 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-16 h-16 text-white mb-4 mx-auto" />
                  <p className="text-white text-xl">Demo Video Coming Soon</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
