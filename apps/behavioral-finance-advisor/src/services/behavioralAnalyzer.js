const Redis = require('ioredis');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const ML = require('ml-matrix');
const { KMeans } = require('ml-kmeans');
const { HierarchicalClustering } = require('ml-hierarchical-clustering');
const PCA = require('ml-pca');
const { RandomForestClassifier } = require('ml-random-forest');
const { SVM } = require('ml-svm');
const { NaiveBayes } = require('ml-naive-bayes');
const { KNN } = require('ml-knn');
const { DecisionTreeClassifier } = require('ml-decision-tree');
const { LogisticRegression } = require('ml-logistic-regression');
const { NeuralNetwork } = require('ml-neural-network');

class BehavioralAnalyzer {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.models = {};
    this.profiles = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load existing behavioral profiles
      await this.loadProfiles();
      
      // Initialize ML models
      await this.initializeModels();
      
      this._initialized = true;
      logger.info('BehavioralAnalyzer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize BehavioralAnalyzer:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('BehavioralAnalyzer closed');
    } catch (error) {
      logger.error('Error closing BehavioralAnalyzer:', error);
    }
  }

  async analyzeBehavior(userId, tradingData, timeRange) {
    try {
      logger.info('Analyzing behavior', { userId, timeRange });

      // Extract behavioral features
      const features = await this.extractBehavioralFeatures(tradingData, timeRange);
      
      // Detect biases
      const biases = await this.detectBiases(features);
      
      // Analyze patterns
      const patterns = await this.analyzePatterns(features);
      
      // Calculate risk tolerance
      const riskTolerance = await this.calculateRiskTolerance(features);
      
      // Analyze emotional state
      const emotionalState = await this.analyzeEmotionalState(features);
      
      // Generate insights
      const insights = await this.generateInsights(features, biases, patterns);
      
      // Create behavioral profile
      const profile = {
        userId,
        timestamp: new Date().toISOString(),
        timeRange,
        features,
        biases,
        patterns,
        riskTolerance,
        emotionalState,
        insights,
        score: this.calculateBehavioralScore(features, biases, patterns)
      };

      // Store profile
      await this.storeProfile(profile);
      
      // Update user's behavioral profile
      await this.updateUserProfile(userId, profile);

      logger.info('Behavior analysis completed', { userId, score: profile.score });
      return profile;

    } catch (error) {
      logger.error('Error analyzing behavior:', error);
      throw error;
    }
  }

  async extractBehavioralFeatures(tradingData, timeRange) {
    try {
      const features = {
        // Trading frequency and timing
        tradingFrequency: this.calculateTradingFrequency(tradingData),
        averageHoldingPeriod: this.calculateAverageHoldingPeriod(tradingData),
        tradingTimePatterns: this.analyzeTradingTimePatterns(tradingData),
        
        // Risk-related features
        positionSizing: this.analyzePositionSizing(tradingData),
        riskPerTrade: this.calculateRiskPerTrade(tradingData),
        diversification: this.calculateDiversification(tradingData),
        
        // Performance-related features
        winRate: this.calculateWinRate(tradingData),
        averageWin: this.calculateAverageWin(tradingData),
        averageLoss: this.calculateAverageLoss(tradingData),
        profitFactor: this.calculateProfitFactor(tradingData),
        
        // Emotional indicators
        drawdownBehavior: this.analyzeDrawdownBehavior(tradingData),
        recoveryBehavior: this.analyzeRecoveryBehavior(tradingData),
        volatilityTolerance: this.calculateVolatilityTolerance(tradingData),
        
        // Decision-making patterns
        decisionSpeed: this.analyzeDecisionSpeed(tradingData),
        informationProcessing: this.analyzeInformationProcessing(tradingData),
        marketTiming: this.analyzeMarketTiming(tradingData),
        
        // Social and external factors
        socialTrading: this.analyzeSocialTrading(tradingData),
        newsReaction: this.analyzeNewsReaction(tradingData),
        marketSentimentReaction: this.analyzeMarketSentimentReaction(tradingData)
      };

      return features;
    } catch (error) {
      logger.error('Error extracting behavioral features:', error);
      throw error;
    }
  }

  async detectBiases(features) {
    try {
      const biases = {
        // Cognitive biases
        confirmationBias: this.detectConfirmationBias(features),
        overconfidence: this.detectOverconfidence(features),
        anchoring: this.detectAnchoring(features),
        availabilityHeuristic: this.detectAvailabilityHeuristic(features),
        representativeness: this.detectRepresentativeness(features),
        
        // Emotional biases
        lossAversion: this.detectLossAversion(features),
        regretAversion: this.detectRegretAversion(features),
        endowmentEffect: this.detectEndowmentEffect(features),
        statusQuoBias: this.detectStatusQuoBias(features),
        
        // Social biases
        herdMentality: this.detectHerdMentality(features),
        socialProof: this.detectSocialProof(features),
        authorityBias: this.detectAuthorityBias(features),
        
        // Temporal biases
        presentBias: this.detectPresentBias(features),
        hyperbolicDiscounting: this.detectHyperbolicDiscounting(features),
        timeInconsistency: this.detectTimeInconsistency(features)
      };

      return biases;
    } catch (error) {
      logger.error('Error detecting biases:', error);
      throw error;
    }
  }

  async analyzePatterns(features) {
    try {
      const patterns = {
        // Trading patterns
        tradingStyle: this.classifyTradingStyle(features),
        marketRegimePreference: this.analyzeMarketRegimePreference(features),
        sectorPreference: this.analyzeSectorPreference(features),
        
        // Behavioral patterns
        stressResponse: this.analyzeStressResponse(features),
        successResponse: this.analyzeSuccessResponse(features),
        failureResponse: this.analyzeFailureResponse(features),
        
        // Learning patterns
        adaptationSpeed: this.analyzeAdaptationSpeed(features),
        learningCurve: this.analyzeLearningCurve(features),
        strategyEvolution: this.analyzeStrategyEvolution(features)
      };

      return patterns;
    } catch (error) {
      logger.error('Error analyzing patterns:', error);
      throw error;
    }
  }

  async calculateRiskTolerance(features) {
    try {
      // Calculate risk tolerance based on multiple factors
      const riskFactors = {
        positionSizing: features.positionSizing.riskLevel,
        drawdownTolerance: features.drawdownBehavior.tolerance,
        volatilityPreference: features.volatilityTolerance.level,
        diversification: features.diversification.level,
        leverage: features.positionSizing.leverage
      };

      // Weighted risk tolerance score
      const weights = {
        positionSizing: 0.25,
        drawdownTolerance: 0.25,
        volatilityPreference: 0.20,
        diversification: 0.15,
        leverage: 0.15
      };

      let riskScore = 0;
      for (const [factor, weight] of Object.entries(weights)) {
        riskScore += riskFactors[factor] * weight;
      }

      // Classify risk tolerance
      let riskLevel;
      if (riskScore >= 0.8) riskLevel = 'very_high';
      else if (riskScore >= 0.6) riskLevel = 'high';
      else if (riskScore >= 0.4) riskLevel = 'medium';
      else if (riskScore >= 0.2) riskLevel = 'low';
      else riskLevel = 'very_low';

      return {
        score: riskScore,
        level: riskLevel,
        factors: riskFactors,
        recommendation: this.getRiskToleranceRecommendation(riskLevel)
      };
    } catch (error) {
      logger.error('Error calculating risk tolerance:', error);
      throw error;
    }
  }

  async analyzeEmotionalState(features) {
    try {
      // Analyze emotional indicators from trading behavior
      const emotionalIndicators = {
        stress: this.calculateStressLevel(features),
        confidence: this.calculateConfidenceLevel(features),
        fear: this.calculateFearLevel(features),
        greed: this.calculateGreedLevel(features),
        patience: this.calculatePatienceLevel(features),
        discipline: this.calculateDisciplineLevel(features)
      };

      // Determine dominant emotional state
      const dominantEmotion = this.getDominantEmotion(emotionalIndicators);
      
      // Calculate emotional stability
      const stability = this.calculateEmotionalStability(emotionalIndicators);

      return {
        indicators: emotionalIndicators,
        dominantEmotion,
        stability,
        recommendation: this.getEmotionalStateRecommendation(dominantEmotion, stability)
      };
    } catch (error) {
      logger.error('Error analyzing emotional state:', error);
      throw error;
    }
  }

  async generateInsights(features, biases, patterns) {
    try {
      const insights = [];

      // Generate insights based on detected biases
      for (const [biasName, biasData] of Object.entries(biases)) {
        if (biasData.detected) {
          insights.push({
            type: 'bias',
            category: biasName,
            severity: biasData.severity,
            description: biasData.description,
            recommendation: biasData.recommendation,
            impact: biasData.impact
          });
        }
      }

      // Generate insights based on patterns
      for (const [patternName, patternData] of Object.entries(patterns)) {
        if (patternData.significant) {
          insights.push({
            type: 'pattern',
            category: patternName,
            description: patternData.description,
            recommendation: patternData.recommendation,
            confidence: patternData.confidence
          });
        }
      }

      // Generate performance insights
      const performanceInsights = this.generatePerformanceInsights(features);
      insights.push(...performanceInsights);

      // Generate risk insights
      const riskInsights = this.generateRiskInsights(features);
      insights.push(...riskInsights);

      // Sort insights by importance
      insights.sort((a, b) => (b.impact || 0) - (a.impact || 0));

      return insights;
    } catch (error) {
      logger.error('Error generating insights:', error);
      throw error;
    }
  }

  // Helper methods for feature extraction
  calculateTradingFrequency(tradingData) {
    const trades = tradingData.trades || [];
    const timeSpan = this.getTimeSpan(tradingData);
    return trades.length / timeSpan; // trades per day
  }

  calculateAverageHoldingPeriod(tradingData) {
    const trades = tradingData.trades || [];
    if (trades.length === 0) return 0;
    
    const holdingPeriods = trades.map(trade => {
      const entry = new Date(trade.entryTime);
      const exit = new Date(trade.exitTime);
      return (exit - entry) / (1000 * 60 * 60 * 24); // days
    });
    
    return holdingPeriods.reduce((sum, period) => sum + period, 0) / holdingPeriods.length;
  }

  analyzeTradingTimePatterns(tradingData) {
    const trades = tradingData.trades || [];
    const timePatterns = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };
    
    trades.forEach(trade => {
      const hour = new Date(trade.entryTime).getHours();
      if (hour >= 6 && hour < 12) timePatterns.morning++;
      else if (hour >= 12 && hour < 18) timePatterns.afternoon++;
      else if (hour >= 18 && hour < 24) timePatterns.evening++;
      else timePatterns.night++;
    });
    
    return timePatterns;
  }

  analyzePositionSizing(tradingData) {
    const trades = tradingData.trades || [];
    if (trades.length === 0) return { average: 0, consistency: 0, riskLevel: 'low' };
    
    const sizes = trades.map(trade => trade.positionSize);
    const average = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    const variance = sizes.reduce((sum, size) => sum + Math.pow(size - average, 2), 0) / sizes.length;
    const consistency = 1 - (Math.sqrt(variance) / average);
    
    let riskLevel = 'low';
    if (average > 0.1) riskLevel = 'high';
    else if (average > 0.05) riskLevel = 'medium';
    
    return {
      average,
      consistency,
      riskLevel,
      leverage: this.calculateLeverage(trades)
    };
  }

  calculateRiskPerTrade(tradingData) {
    const trades = tradingData.trades || [];
    if (trades.length === 0) return 0;
    
    const risks = trades.map(trade => {
      const entryPrice = trade.entryPrice;
      const stopLoss = trade.stopLoss;
      if (!stopLoss) return 0;
      return Math.abs(entryPrice - stopLoss) / entryPrice;
    });
    
    return risks.reduce((sum, risk) => sum + risk, 0) / risks.length;
  }

  calculateDiversification(tradingData) {
    const trades = tradingData.trades || [];
    if (trades.length === 0) return { level: 'low', count: 0 };
    
    const symbols = new Set(trades.map(trade => trade.symbol));
    const symbolCount = symbols.size;
    
    let level = 'low';
    if (symbolCount >= 10) level = 'high';
    else if (symbolCount >= 5) level = 'medium';
    
    return {
      level,
      count: symbolCount,
      symbols: Array.from(symbols)
    };
  }

  calculateWinRate(tradingData) {
    const trades = tradingData.trades || [];
    if (trades.length === 0) return 0;
    
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    return winningTrades.length / trades.length;
  }

  calculateAverageWin(tradingData) {
    const trades = tradingData.trades || [];
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    if (winningTrades.length === 0) return 0;
    
    return winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length;
  }

  calculateAverageLoss(tradingData) {
    const trades = tradingData.trades || [];
    const losingTrades = trades.filter(trade => trade.pnl < 0);
    if (losingTrades.length === 0) return 0;
    
    return losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length;
  }

  calculateProfitFactor(tradingData) {
    const averageWin = this.calculateAverageWin(tradingData);
    const averageLoss = Math.abs(this.calculateAverageLoss(tradingData));
    
    if (averageLoss === 0) return averageWin > 0 ? Infinity : 0;
    return averageWin / averageLoss;
  }

  // Bias detection methods
  detectConfirmationBias(features) {
    // Analyze if user tends to seek information that confirms their existing beliefs
    const confirmationScore = this.calculateConfirmationScore(features);
    return {
      detected: confirmationScore > 0.7,
      severity: confirmationScore,
      description: 'Tendency to seek information that confirms existing beliefs',
      recommendation: 'Actively seek contradictory information before making decisions',
      impact: 'high'
    };
  }

  detectOverconfidence(features) {
    // Analyze if user overestimates their trading abilities
    const overconfidenceScore = this.calculateOverconfidenceScore(features);
    return {
      detected: overconfidenceScore > 0.6,
      severity: overconfidenceScore,
      description: 'Overestimation of trading abilities and market knowledge',
      recommendation: 'Maintain realistic expectations and track actual performance',
      impact: 'high'
    };
  }

  detectLossAversion(features) {
    // Analyze if user is more sensitive to losses than gains
    const lossAversionScore = this.calculateLossAversionScore(features);
    return {
      detected: lossAversionScore > 0.5,
      severity: lossAversionScore,
      description: 'Greater sensitivity to losses than equivalent gains',
      recommendation: 'Focus on long-term performance rather than individual trade outcomes',
      impact: 'medium'
    };
  }

  // Pattern analysis methods
  classifyTradingStyle(features) {
    const frequency = features.tradingFrequency;
    const holdingPeriod = features.averageHoldingPeriod;
    
    if (frequency > 5 && holdingPeriod < 1) return 'scalping';
    if (frequency > 1 && holdingPeriod < 7) return 'day_trading';
    if (frequency > 0.1 && holdingPeriod < 30) return 'swing_trading';
    return 'position_trading';
  }

  analyzeMarketRegimePreference(features) {
    // Analyze which market conditions the user performs best in
    const volatilityTolerance = features.volatilityTolerance.level;
    const drawdownBehavior = features.drawdownBehavior;
    
    if (volatilityTolerance === 'high' && drawdownBehavior.tolerance === 'high') {
      return 'volatile_markets';
    } else if (volatilityTolerance === 'low' && drawdownBehavior.tolerance === 'low') {
      return 'stable_markets';
    }
    return 'mixed_markets';
  }

  // Risk tolerance calculation
  calculateRiskTolerance(features) {
    const riskFactors = {
      positionSizing: features.positionSizing.riskLevel,
      drawdownTolerance: features.drawdownBehavior.tolerance,
      volatilityPreference: features.volatilityTolerance.level,
      diversification: features.diversification.level
    };

    const weights = {
      positionSizing: 0.3,
      drawdownTolerance: 0.3,
      volatilityPreference: 0.2,
      diversification: 0.2
    };

    let riskScore = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      riskScore += this.normalizeRiskFactor(riskFactors[factor]) * weight;
    }

    return {
      score: riskScore,
      level: this.classifyRiskLevel(riskScore),
      factors: riskFactors
    };
  }

  // Emotional state analysis
  analyzeEmotionalState(features) {
    const emotionalIndicators = {
      stress: this.calculateStressLevel(features),
      confidence: this.calculateConfidenceLevel(features),
      fear: this.calculateFearLevel(features),
      greed: this.calculateGreedLevel(features)
    };

    return {
      indicators: emotionalIndicators,
      dominantEmotion: this.getDominantEmotion(emotionalIndicators),
      stability: this.calculateEmotionalStability(emotionalIndicators)
    };
  }

  // Utility methods
  getTimeSpan(tradingData) {
    const trades = tradingData.trades || [];
    if (trades.length === 0) return 1;
    
    const firstTrade = new Date(trades[0].entryTime);
    const lastTrade = new Date(trades[trades.length - 1].entryTime);
    return (lastTrade - firstTrade) / (1000 * 60 * 60 * 24); // days
  }

  calculateBehavioralScore(features, biases, patterns) {
    // Calculate overall behavioral score (0-100)
    let score = 100;
    
    // Deduct points for biases
    for (const bias of Object.values(biases)) {
      if (bias.detected) {
        score -= bias.severity * 10;
      }
    }
    
    // Deduct points for poor patterns
    for (const pattern of Object.values(patterns)) {
      if (pattern.negative) {
        score -= pattern.impact * 5;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  async storeProfile(profile) {
    try {
      const key = `behavioral_profile:${profile.userId}`;
      await this.redis.hset(key, {
        data: JSON.stringify(profile),
        timestamp: profile.timestamp
      });
      await this.redis.expire(key, 86400 * 30); // 30 days
    } catch (error) {
      logger.error('Error storing profile:', error);
    }
  }

  async updateUserProfile(userId, profile) {
    try {
      this.profiles.set(userId, profile);
      
      // Store in database
      const query = `
        INSERT INTO behavioral_profiles (user_id, profile_data, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          profile_data = EXCLUDED.profile_data,
          updated_at = EXCLUDED.updated_at
      `;
      
      await pool.query(query, [
        userId,
        JSON.stringify(profile),
        new Date(),
        new Date()
      ]);
    } catch (error) {
      logger.error('Error updating user profile:', error);
    }
  }

  async getBehavioralProfile(userId) {
    try {
      // Check cache first
      if (this.profiles.has(userId)) {
        return this.profiles.get(userId);
      }
      
      // Load from Redis
      const key = `behavioral_profile:${userId}`;
      const profileData = await this.redis.hget(key, 'data');
      
      if (profileData) {
        const profile = JSON.parse(profileData);
        this.profiles.set(userId, profile);
        return profile;
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting behavioral profile:', error);
      return null;
    }
  }

  async loadProfiles() {
    try {
      // Load profiles from database
      const query = 'SELECT user_id, profile_data FROM behavioral_profiles';
      const result = await pool.query(query);
      
      for (const row of result.rows) {
        const profile = JSON.parse(row.profile_data);
        this.profiles.set(row.user_id, profile);
      }
      
      logger.info(`Loaded ${this.profiles.size} behavioral profiles`);
    } catch (error) {
      logger.error('Error loading profiles:', error);
    }
  }

  async initializeModels() {
    try {
      // Initialize ML models for pattern recognition
      this.models = {
        clustering: new KMeans({ k: 5 }),
        classification: new RandomForestClassifier({ nEstimators: 100 }),
        regression: new NeuralNetwork({ hiddenLayers: [10, 5] })
      };
      
      logger.info('ML models initialized');
    } catch (error) {
      logger.error('Error initializing models:', error);
    }
  }

  async cleanupOldData() {
    try {
      // Clean up old profiles from Redis
      const keys = await this.redis.keys('behavioral_profile:*');
      const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      for (const key of keys) {
        const timestamp = await this.redis.hget(key, 'timestamp');
        if (timestamp && new Date(timestamp).getTime() < cutoff) {
          await this.redis.del(key);
        }
      }
      
      logger.info('Old behavioral data cleaned up');
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  async updateAllProfiles() {
    try {
      // Update all user profiles with latest data
      const userIds = Array.from(this.profiles.keys());
      
      for (const userId of userIds) {
        try {
          // Get latest trading data and update profile
          // This would typically fetch from the main database
          logger.info(`Updating profile for user ${userId}`);
        } catch (error) {
          logger.error(`Error updating profile for user ${userId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating all profiles:', error);
    }
  }
}

module.exports = BehavioralAnalyzer;
