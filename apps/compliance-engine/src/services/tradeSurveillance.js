const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class TradeSurveillance extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.surveillanceRules = new Map();
    this.alerts = new Map();
    this.trades = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadSurveillanceRules();
      logger.info('Trade Surveillance initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Trade Surveillance:', error);
      throw error;
    }
  }

  async loadSurveillanceRules() {
    try {
      const rules = [
        {
          id: 'unusual_volume',
          name: 'Unusual Volume',
          description: 'Detect unusual trading volume patterns',
          category: 'volume',
          severity: 'medium',
          enabled: true,
          conditions: {
            volumeThreshold: 3.0, // 3x average volume
            timeWindow: 60, // 60 minutes
            minVolume: 1000 // Minimum volume to consider
          }
        },
        {
          id: 'price_manipulation',
          name: 'Price Manipulation',
          description: 'Detect potential price manipulation',
          category: 'price',
          severity: 'high',
          enabled: true,
          conditions: {
            priceChangeThreshold: 0.10, // 10% price change
            timeWindow: 30, // 30 minutes
            minPrice: 1.0 // Minimum price to consider
          }
        },
        {
          id: 'wash_trading',
          name: 'Wash Trading',
          description: 'Detect wash trading patterns',
          category: 'pattern',
          severity: 'high',
          enabled: true,
          conditions: {
            sameAccountThreshold: 0.8, // 80% of trades between same accounts
            timeWindow: 300, // 5 minutes
            minTradeCount: 5 // Minimum number of trades
          }
        },
        {
          id: 'front_running',
          name: 'Front Running',
          description: 'Detect front running patterns',
          category: 'timing',
          severity: 'high',
          enabled: true,
          conditions: {
            timeGap: 30, // 30 seconds between orders
            priceImpact: 0.05, // 5% price impact
            minOrderSize: 10000 // Minimum order size
          }
        },
        {
          id: 'layering',
          name: 'Layering',
          description: 'Detect layering patterns',
          category: 'pattern',
          severity: 'high',
          enabled: true,
          conditions: {
            orderCountThreshold: 10, // 10 orders in sequence
            timeWindow: 60, // 60 seconds
            priceImprovement: 0.01 // 1% price improvement
          }
        },
        {
          id: 'spoofing',
          name: 'Spoofing',
          description: 'Detect spoofing patterns',
          category: 'pattern',
          severity: 'high',
          enabled: true,
          conditions: {
            orderSizeThreshold: 100000, // $100K order size
            cancellationRate: 0.8, // 80% cancellation rate
            timeWindow: 300 // 5 minutes
          }
        },
        {
          id: 'insider_trading',
          name: 'Insider Trading',
          description: 'Detect potential insider trading',
          category: 'timing',
          severity: 'critical',
          enabled: true,
          conditions: {
            newsTimeGap: 3600, // 1 hour before news
            priceChangeThreshold: 0.15, // 15% price change
            minOrderSize: 50000 // Minimum order size
          }
        },
        {
          id: 'market_abuse',
          name: 'Market Abuse',
          description: 'Detect general market abuse',
          category: 'general',
          severity: 'high',
          enabled: true,
          conditions: {
            frequencyThreshold: 100, // 100 trades per hour
            timeWindow: 3600, // 1 hour
            minOrderSize: 1000 // Minimum order size
          }
        }
      ];

      for (const rule of rules) {
        this.surveillanceRules.set(rule.id, rule);
      }

      logger.info(`Loaded ${rules.length} surveillance rules`);
    } catch (error) {
      logger.error('Error loading surveillance rules:', error);
    }
  }

  async monitorTrades(data, user) {
    try {
      const { trades, portfolioId, userId } = data;
      const startTime = Date.now();
      
      const surveillance = {
        id: uuidv4(),
        portfolioId,
        userId,
        tradeCount: trades.length,
        status: 'monitoring',
        alerts: [],
        createdAt: new Date(),
        completedAt: null,
        metadata: {}
      };
      
      // Store surveillance record
      await this.storeSurveillance(surveillance);
      
      try {
        // Run surveillance checks
        for (const trade of trades) {
          const tradeAlerts = await this.checkTrade(trade, portfolioId, userId);
          surveillance.alerts.push(...tradeAlerts);
        }
        
        // Run pattern-based checks
        const patternAlerts = await this.checkTradingPatterns(trades, portfolioId, userId);
        surveillance.alerts.push(...patternAlerts);
        
        // Update surveillance record
        surveillance.status = 'completed';
        surveillance.completedAt = new Date();
        await this.updateSurveillance(surveillance);
        
        logger.performance('Trade surveillance', Date.now() - startTime, {
          portfolioId,
          tradeCount: trades.length,
          alertCount: surveillance.alerts.length
        });
        
        return surveillance;
      } catch (error) {
        surveillance.status = 'failed';
        surveillance.error = error.message;
        await this.updateSurveillance(surveillance);
        throw error;
      }
    } catch (error) {
      logger.error('Error monitoring trades:', error);
      throw error;
    }
  }

  async checkTrade(trade, portfolioId, userId) {
    try {
      const alerts = [];
      
      // Run individual trade checks
      for (const [ruleId, rule] of this.surveillanceRules) {
        if (!rule.enabled) continue;
        
        try {
          const alert = await this.runSurveillanceRule(rule, trade, portfolioId, userId);
          if (alert) {
            alerts.push(alert);
          }
        } catch (error) {
          logger.error(`Error running surveillance rule ${ruleId}:`, error);
        }
      }
      
      return alerts;
    } catch (error) {
      logger.error('Error checking trade:', error);
      return [];
    }
  }

  async runSurveillanceRule(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      
      switch (rule.id) {
        case 'unusual_volume':
          return await this.checkUnusualVolume(rule, trade, portfolioId, userId);
        case 'price_manipulation':
          return await this.checkPriceManipulation(rule, trade, portfolioId, userId);
        case 'wash_trading':
          return await this.checkWashTrading(rule, trade, portfolioId, userId);
        case 'front_running':
          return await this.checkFrontRunning(rule, trade, portfolioId, userId);
        case 'layering':
          return await this.checkLayering(rule, trade, portfolioId, userId);
        case 'spoofing':
          return await this.checkSpoofing(rule, trade, portfolioId, userId);
        case 'insider_trading':
          return await this.checkInsiderTrading(rule, trade, portfolioId, userId);
        case 'market_abuse':
          return await this.checkMarketAbuse(rule, trade, portfolioId, userId);
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Error running surveillance rule ${rule.id}:`, error);
      return null;
    }
  }

  async checkUnusualVolume(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      const { symbol, volume, timestamp } = trade;
      
      // Get average volume for the symbol
      const avgVolume = await this.getAverageVolume(symbol, conditions.timeWindow);
      
      if (avgVolume > 0 && volume > avgVolume * conditions.volumeThreshold) {
        return {
          id: uuidv4(),
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          tradeId: trade.id,
          symbol: symbol,
          message: `Unusual volume detected: ${volume} vs average ${avgVolume}`,
          details: {
            currentVolume: volume,
            averageVolume: avgVolume,
            threshold: conditions.volumeThreshold,
            ratio: volume / avgVolume
          },
          timestamp: new Date(),
          portfolioId,
          userId
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking unusual volume:', error);
      return null;
    }
  }

  async checkPriceManipulation(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      const { symbol, price, timestamp } = trade;
      
      // Get recent price history
      const priceHistory = await this.getPriceHistory(symbol, conditions.timeWindow);
      
      if (priceHistory.length > 0) {
        const avgPrice = priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length;
        const priceChange = Math.abs(price - avgPrice) / avgPrice;
        
        if (priceChange > conditions.priceChangeThreshold) {
          return {
            id: uuidv4(),
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            tradeId: trade.id,
            symbol: symbol,
            message: `Price manipulation detected: ${price} vs average ${avgPrice}`,
            details: {
              currentPrice: price,
              averagePrice: avgPrice,
              priceChange: priceChange,
              threshold: conditions.priceChangeThreshold
            },
            timestamp: new Date(),
            portfolioId,
            userId
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking price manipulation:', error);
      return null;
    }
  }

  async checkWashTrading(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      const { symbol, timestamp } = trade;
      
      // Get recent trades for the symbol
      const recentTrades = await this.getRecentTrades(symbol, conditions.timeWindow);
      
      if (recentTrades.length >= conditions.minTradeCount) {
        // Check for trades between same accounts
        const sameAccountTrades = recentTrades.filter(t => 
          t.buyerAccount === trade.sellerAccount || 
          t.sellerAccount === trade.buyerAccount
        );
        
        const sameAccountRatio = sameAccountTrades.length / recentTrades.length;
        
        if (sameAccountRatio > conditions.sameAccountThreshold) {
          return {
            id: uuidv4(),
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            tradeId: trade.id,
            symbol: symbol,
            message: `Wash trading detected: ${sameAccountRatio * 100}% same account trades`,
            details: {
              sameAccountTrades: sameAccountTrades.length,
              totalTrades: recentTrades.length,
              sameAccountRatio: sameAccountRatio,
              threshold: conditions.sameAccountThreshold
            },
            timestamp: new Date(),
            portfolioId,
            userId
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking wash trading:', error);
      return null;
    }
  }

  async checkFrontRunning(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      const { symbol, timestamp, orderSize } = trade;
      
      // Get recent large orders
      const recentOrders = await this.getRecentOrders(symbol, conditions.timeGap);
      const largeOrders = recentOrders.filter(o => o.orderSize >= conditions.minOrderSize);
      
      if (largeOrders.length > 0) {
        // Check for price impact
        const priceImpact = this.calculatePriceImpact(trade, largeOrders);
        
        if (priceImpact > conditions.priceImpact) {
          return {
            id: uuidv4(),
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            tradeId: trade.id,
            symbol: symbol,
            message: `Front running detected: ${priceImpact * 100}% price impact`,
            details: {
              priceImpact: priceImpact,
              threshold: conditions.priceImpact,
              largeOrders: largeOrders.length,
              orderSize: orderSize
            },
            timestamp: new Date(),
            portfolioId,
            userId
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking front running:', error);
      return null;
    }
  }

  async checkLayering(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      const { symbol, timestamp } = trade;
      
      // Get recent orders for the symbol
      const recentOrders = await this.getRecentOrders(symbol, conditions.timeWindow);
      
      if (recentOrders.length >= conditions.orderCountThreshold) {
        // Check for layering pattern
        const isLayering = this.detectLayeringPattern(recentOrders, conditions);
        
        if (isLayering) {
          return {
            id: uuidv4(),
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            tradeId: trade.id,
            symbol: symbol,
            message: `Layering detected: ${recentOrders.length} orders in sequence`,
            details: {
              orderCount: recentOrders.length,
              threshold: conditions.orderCountThreshold,
              timeWindow: conditions.timeWindow
            },
            timestamp: new Date(),
            portfolioId,
            userId
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking layering:', error);
      return null;
    }
  }

  async checkSpoofing(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      const { symbol, timestamp, orderSize } = trade;
      
      if (orderSize >= conditions.orderSizeThreshold) {
        // Get recent orders for the symbol
        const recentOrders = await this.getRecentOrders(symbol, conditions.timeWindow);
        const largeOrders = recentOrders.filter(o => o.orderSize >= conditions.orderSizeThreshold);
        
        if (largeOrders.length > 0) {
          // Check cancellation rate
          const cancelledOrders = largeOrders.filter(o => o.status === 'cancelled');
          const cancellationRate = cancelledOrders.length / largeOrders.length;
          
          if (cancellationRate > conditions.cancellationRate) {
            return {
              id: uuidv4(),
              ruleId: rule.id,
              ruleName: rule.name,
              category: rule.category,
              severity: rule.severity,
              tradeId: trade.id,
              symbol: symbol,
              message: `Spoofing detected: ${cancellationRate * 100}% cancellation rate`,
              details: {
                cancellationRate: cancellationRate,
                threshold: conditions.cancellationRate,
                largeOrders: largeOrders.length,
                cancelledOrders: cancelledOrders.length,
                orderSize: orderSize
              },
              timestamp: new Date(),
              portfolioId,
              userId
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking spoofing:', error);
      return null;
    }
  }

  async checkInsiderTrading(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      const { symbol, timestamp, orderSize, price } = trade;
      
      if (orderSize >= conditions.minOrderSize) {
        // Check for recent news
        const recentNews = await this.getRecentNews(symbol, conditions.newsTimeGap);
        
        if (recentNews.length > 0) {
          // Check for price change
          const priceChange = await this.getPriceChange(symbol, timestamp);
          
          if (priceChange > conditions.priceChangeThreshold) {
            return {
              id: uuidv4(),
              ruleId: rule.id,
              ruleName: rule.name,
              category: rule.category,
              severity: rule.severity,
              tradeId: trade.id,
              symbol: symbol,
              message: `Insider trading detected: ${priceChange * 100}% price change before news`,
              details: {
                priceChange: priceChange,
                threshold: conditions.priceChangeThreshold,
                newsCount: recentNews.length,
                orderSize: orderSize,
                newsTimeGap: conditions.newsTimeGap
              },
              timestamp: new Date(),
              portfolioId,
              userId
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking insider trading:', error);
      return null;
    }
  }

  async checkMarketAbuse(rule, trade, portfolioId, userId) {
    try {
      const { conditions } = rule;
      const { timestamp, orderSize } = trade;
      
      if (orderSize >= conditions.minOrderSize) {
        // Get recent trades for the user
        const recentTrades = await this.getRecentUserTrades(userId, conditions.timeWindow);
        
        if (recentTrades.length >= conditions.frequencyThreshold) {
          return {
            id: uuidv4(),
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            tradeId: trade.id,
            symbol: trade.symbol,
            message: `Market abuse detected: ${recentTrades.length} trades in ${conditions.timeWindow} seconds`,
            details: {
              tradeCount: recentTrades.length,
              threshold: conditions.frequencyThreshold,
              timeWindow: conditions.timeWindow,
              orderSize: orderSize
            },
            timestamp: new Date(),
            portfolioId,
            userId
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking market abuse:', error);
      return null;
    }
  }

  async checkTradingPatterns(trades, portfolioId, userId) {
    try {
      const alerts = [];
      
      // Check for patterns across multiple trades
      const patterns = [
        'circular_trading',
        'cross_trading',
        'marker_making',
        'ramping',
        'squeezing'
      ];
      
      for (const pattern of patterns) {
        const patternAlert = await this.checkTradingPattern(pattern, trades, portfolioId, userId);
        if (patternAlert) {
          alerts.push(patternAlert);
        }
      }
      
      return alerts;
    } catch (error) {
      logger.error('Error checking trading patterns:', error);
      return [];
    }
  }

  async checkTradingPattern(pattern, trades, portfolioId, userId) {
    try {
      // Mock pattern detection - in reality would use sophisticated algorithms
      switch (pattern) {
        case 'circular_trading':
          return this.detectCircularTrading(trades, portfolioId, userId);
        case 'cross_trading':
          return this.detectCrossTrading(trades, portfolioId, userId);
        case 'marker_making':
          return this.detectMarkerMaking(trades, portfolioId, userId);
        case 'ramping':
          return this.detectRamping(trades, portfolioId, userId);
        case 'squeezing':
          return this.detectSqueezing(trades, portfolioId, userId);
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Error checking trading pattern ${pattern}:`, error);
      return null;
    }
  }

  detectCircularTrading(trades, portfolioId, userId) {
    // Mock circular trading detection
    const circularTrades = trades.filter(t => t.buyerAccount === t.sellerAccount);
    
    if (circularTrades.length > 0) {
      return {
        id: uuidv4(),
        ruleId: 'circular_trading',
        ruleName: 'Circular Trading',
        category: 'pattern',
        severity: 'high',
        message: `Circular trading detected: ${circularTrades.length} trades`,
        details: {
          circularTrades: circularTrades.length,
          totalTrades: trades.length
        },
        timestamp: new Date(),
        portfolioId,
        userId
      };
    }
    
    return null;
  }

  detectCrossTrading(trades, portfolioId, userId) {
    // Mock cross trading detection
    const crossTrades = trades.filter(t => t.buyerAccount !== t.sellerAccount);
    
    if (crossTrades.length > 0) {
      return {
        id: uuidv4(),
        ruleId: 'cross_trading',
        ruleName: 'Cross Trading',
        category: 'pattern',
        severity: 'medium',
        message: `Cross trading detected: ${crossTrades.length} trades`,
        details: {
          crossTrades: crossTrades.length,
          totalTrades: trades.length
        },
        timestamp: new Date(),
        portfolioId,
        userId
      };
    }
    
    return null;
  }

  detectMarkerMaking(trades, portfolioId, userId) {
    // Mock marker making detection
    const markerTrades = trades.filter(t => t.orderType === 'market');
    
    if (markerTrades.length > 0) {
      return {
        id: uuidv4(),
        ruleId: 'marker_making',
        ruleName: 'Marker Making',
        category: 'pattern',
        severity: 'medium',
        message: `Marker making detected: ${markerTrades.length} market orders`,
        details: {
          markerTrades: markerTrades.length,
          totalTrades: trades.length
        },
        timestamp: new Date(),
        portfolioId,
        userId
      };
    }
    
    return null;
  }

  detectRamping(trades, portfolioId, userId) {
    // Mock ramping detection
    const rampingTrades = trades.filter(t => t.price > t.previousPrice * 1.1);
    
    if (rampingTrades.length > 0) {
      return {
        id: uuidv4(),
        ruleId: 'ramping',
        ruleName: 'Ramping',
        category: 'pattern',
        severity: 'high',
        message: `Ramping detected: ${rampingTrades.length} trades with >10% price increase`,
        details: {
          rampingTrades: rampingTrades.length,
          totalTrades: trades.length
        },
        timestamp: new Date(),
        portfolioId,
        userId
      };
    }
    
    return null;
  }

  detectSqueezing(trades, portfolioId, userId) {
    // Mock squeezing detection
    const squeezingTrades = trades.filter(t => t.price < t.previousPrice * 0.9);
    
    if (squeezingTrades.length > 0) {
      return {
        id: uuidv4(),
        ruleId: 'squeezing',
        ruleName: 'Squeezing',
        category: 'pattern',
        severity: 'high',
        message: `Squeezing detected: ${squeezingTrades.length} trades with >10% price decrease`,
        details: {
          squeezingTrades: squeezingTrades.length,
          totalTrades: trades.length
        },
        timestamp: new Date(),
        portfolioId,
        userId
      };
    }
    
    return null;
  }

  // Helper methods
  async getAverageVolume(symbol, timeWindow) {
    try {
      // Mock average volume calculation - in reality would query market data
      return 10000; // Mock average volume
    } catch (error) {
      logger.error(`Error getting average volume for ${symbol}:`, error);
      return 0;
    }
  }

  async getPriceHistory(symbol, timeWindow) {
    try {
      // Mock price history - in reality would query market data
      return [
        { price: 100, timestamp: new Date(Date.now() - 30000) },
        { price: 101, timestamp: new Date(Date.now() - 20000) },
        { price: 99, timestamp: new Date(Date.now() - 10000) }
      ];
    } catch (error) {
      logger.error(`Error getting price history for ${symbol}:`, error);
      return [];
    }
  }

  async getRecentTrades(symbol, timeWindow) {
    try {
      // Mock recent trades - in reality would query trade database
      return [];
    } catch (error) {
      logger.error(`Error getting recent trades for ${symbol}:`, error);
      return [];
    }
  }

  async getRecentOrders(symbol, timeWindow) {
    try {
      // Mock recent orders - in reality would query order database
      return [];
    } catch (error) {
      logger.error(`Error getting recent orders for ${symbol}:`, error);
      return [];
    }
  }

  async getRecentUserTrades(userId, timeWindow) {
    try {
      // Mock recent user trades - in reality would query trade database
      return [];
    } catch (error) {
      logger.error(`Error getting recent user trades for ${userId}:`, error);
      return [];
    }
  }

  async getRecentNews(symbol, timeGap) {
    try {
      // Mock recent news - in reality would query news database
      return [];
    } catch (error) {
      logger.error(`Error getting recent news for ${symbol}:`, error);
      return [];
    }
  }

  async getPriceChange(symbol, timestamp) {
    try {
      // Mock price change calculation - in reality would calculate from market data
      return 0.05; // 5% price change
    } catch (error) {
      logger.error(`Error getting price change for ${symbol}:`, error);
      return 0;
    }
  }

  calculatePriceImpact(trade, largeOrders) {
    try {
      // Mock price impact calculation - in reality would use sophisticated models
      return 0.02; // 2% price impact
    } catch (error) {
      logger.error('Error calculating price impact:', error);
      return 0;
    }
  }

  detectLayeringPattern(orders, conditions) {
    try {
      // Mock layering pattern detection - in reality would use sophisticated algorithms
      return orders.length >= conditions.orderCountThreshold;
    } catch (error) {
      logger.error('Error detecting layering pattern:', error);
      return false;
    }
  }

  async getAlerts(query, userId) {
    try {
      const { status, severity, category, startDate, endDate, limit = 100, offset = 0 } = query;
      
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramCount = 1;
      
      if (status) {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }
      
      if (severity) {
        paramCount++;
        whereClause += ` AND severity = $${paramCount}`;
        params.push(severity);
      }
      
      if (category) {
        paramCount++;
        whereClause += ` AND category = $${paramCount}`;
        params.push(category);
      }
      
      if (startDate) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(startDate);
      }
      
      if (endDate) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(endDate);
      }
      
      const query_sql = `
        SELECT * FROM surveillance_alerts 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(query_sql, params);
      
      return result.rows.map(row => ({
        id: row.id,
        ruleId: row.rule_id,
        ruleName: row.rule_name,
        category: row.category,
        severity: row.severity,
        tradeId: row.trade_id,
        symbol: row.symbol,
        message: row.message,
        details: row.details,
        status: row.status,
        createdAt: row.created_at,
        portfolioId: row.portfolio_id,
        userId: row.user_id
      }));
    } catch (error) {
      logger.error('Error getting alerts:', error);
      return [];
    }
  }

  async storeSurveillance(surveillance) {
    try {
      const query = `
        INSERT INTO trade_surveillance (
          id, portfolio_id, user_id, trade_count, status, alerts, 
          created_at, completed_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await this.db.query(query, [
        surveillance.id,
        surveillance.portfolioId,
        surveillance.userId,
        surveillance.tradeCount,
        surveillance.status,
        JSON.stringify(surveillance.alerts),
        surveillance.createdAt,
        surveillance.completedAt,
        JSON.stringify(surveillance.metadata)
      ]);
    } catch (error) {
      logger.error('Error storing surveillance:', error);
      throw error;
    }
  }

  async updateSurveillance(surveillance) {
    try {
      const query = `
        UPDATE trade_surveillance 
        SET status = $1, alerts = $2, completed_at = $3, error = $4
        WHERE id = $5
      `;
      
      await this.db.query(query, [
        surveillance.status,
        JSON.stringify(surveillance.alerts),
        surveillance.completedAt,
        surveillance.error || null,
        surveillance.id
      ]);
    } catch (error) {
      logger.error('Error updating surveillance:', error);
      throw error;
    }
  }

  async runSurveillanceChecks() {
    try {
      logger.info('Running trade surveillance checks...');
      
      // Get recent trades
      const query = `
        SELECT * FROM trades 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query);
      
      for (const trade of result.rows) {
        try {
          const alerts = await this.checkTrade(trade, trade.portfolio_id, trade.user_id);
          
          if (alerts.length > 0) {
            // Store alerts
            for (const alert of alerts) {
              await this.storeAlert(alert);
              
              // Emit alert event
              this.emit('surveillanceAlert', alert);
            }
          }
        } catch (error) {
          logger.error(`Error running surveillance check for trade ${trade.id}:`, error);
        }
      }
      
      logger.info('Trade surveillance checks completed');
    } catch (error) {
      logger.error('Error running surveillance checks:', error);
    }
  }

  async storeAlert(alert) {
    try {
      const query = `
        INSERT INTO surveillance_alerts (
          id, rule_id, rule_name, category, severity, trade_id, symbol, 
          message, details, status, created_at, portfolio_id, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;
      
      await this.db.query(query, [
        alert.id,
        alert.ruleId,
        alert.ruleName,
        alert.category,
        alert.severity,
        alert.tradeId,
        alert.symbol,
        alert.message,
        JSON.stringify(alert.details),
        'active',
        alert.timestamp,
        alert.portfolioId,
        alert.userId
      ]);
    } catch (error) {
      logger.error('Error storing alert:', error);
      throw error;
    }
  }

  async close() {
    try {
      logger.info('Trade Surveillance closed successfully');
    } catch (error) {
      logger.error('Error closing Trade Surveillance:', error);
    }
  }
}

module.exports = TradeSurveillance;

