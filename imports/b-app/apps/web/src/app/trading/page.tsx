/**
 * 🏛️ TRADING PAGE - Main Trading Platform Interface
 * 
 * This is the core trading platform where users can:
 * 1. View their portfolio dashboard with real-time data
 * 2. Execute trades using advanced order types
 * 3. Access revolutionary AI features for trading insights
 * 
 * The page uses a tabbed interface to organize different functionalities:
 * - Dashboard: Portfolio overview, positions, news, market data
 * - Trading Interface: Order entry, charts, market analysis
 * - AI Features: 10 revolutionary AI tools for trading optimization
 */

"use client"; // This tells Next.js to render this component on the client side

// Import React and state management
import React, { useState } from 'react';
import { motion } from 'framer-motion'; // For smooth animations

// Import navigation and UI components
import EnhancedNavigation from '@/components/ui/enhanced-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Import main trading components
import { EnhancedTradingInterface } from '../../components/EnhancedTradingInterface';
import { EnhancedTradingDashboard } from '../../components/EnhancedTradingDashboard';
import { AdvancedOrderEntry } from '@/components/trading/AdvancedOrderEntry';

// Import revolutionary AI components
import QuantumPortfolioOptimizer from '@/components/QuantumPortfolioOptimizer';
import PredictiveMarketRegimes from '@/components/PredictiveMarketRegimes';
import BehavioralFinanceAdvisor from '@/components/BehavioralFinanceAdvisor';
import AlternativeDataIntelligence from '@/components/AlternativeDataIntelligence';
import NeuralNetworkPredictor from '@/components/NeuralNetworkPredictor';

// Import icons for the user interface
import { Brain, Atom, TrendingUp, Database, Zap, Sparkles, Activity, Eye } from 'lucide-react';

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic';

/**
 * 🎯 MAIN TRADING PAGE COMPONENT
 * 
 * This component manages the entire trading platform interface.
 * It handles user interactions and displays different sections based on selected tabs.
 */
export default function TradingPage() {
  // 📊 TRADING STATE MANAGEMENT
  // These variables store the current trading parameters
  const [symbol, setSymbol] = useState("AAPL");           // Which stock to trade (default: Apple)
  const [side, setSide] = useState<"buy" | "sell">("buy"); // Buy or sell order
  const [quantity, setQuantity] = useState("100");         // How many shares
  const [orderType, setOrderType] = useState("market");    // Market or limit order
  const [price, setPrice] = useState("175.00");           // Price for limit orders

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <EnhancedNavigation currentPath="/trading" />
      <div className="lg:pl-64 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  Quantum Trading Platform
                </h1>
                <p className="text-gray-300 text-lg">Revolutionary AI-powered trading with quantum optimization and behavioral analysis</p>
              </div>
              <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Live Markets
              </Badge>
            </div>
          </motion.div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="trading">Trading Interface</TabsTrigger>
                <TabsTrigger value="ai-features">AI Features</TabsTrigger>
              </TabsList>
            </motion.div>

            <TabsContent value="dashboard">
              <EnhancedTradingDashboard />
            </TabsContent>

            <TabsContent value="trading" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <EnhancedTradingInterface
                  symbol={symbol}
                  setSymbol={setSymbol}
                  side={side}
                  setSide={setSide}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  orderType={orderType}
                  setOrderType={setOrderType}
                  price={price}
                  setPrice={setPrice}
                />
              </motion.div>

              {/* Advanced Order Entry */}
              <AdvancedOrderEntry />

              <Card>
                <CardHeader>
                  <CardTitle>Market Data - {symbol}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">Last Price</div>
                        <div className="text-2xl font-bold text-green-600">$175.43</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">Change</div>
                        <div className="text-2xl font-bold text-green-600">+$2.34</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Bid</div>
                        <div className="text-lg font-semibold">$175.40</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Ask</div>
                        <div className="text-lg font-semibold">$175.45</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Volume</div>
                        <div className="text-lg font-semibold">2.5M</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Market Cap</div>
                        <div className="text-lg font-semibold">$2.7T</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quantum">
              <QuantumPortfolioOptimizer />
            </TabsContent>

            <TabsContent value="regimes">
              <PredictiveMarketRegimes />
            </TabsContent>

            <TabsContent value="behavioral">
              <BehavioralFinanceAdvisor />
            </TabsContent>

            <TabsContent value="alternative">
              <AlternativeDataIntelligence />
            </TabsContent>

            <TabsContent value="neural">
              <NeuralNetworkPredictor />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}


