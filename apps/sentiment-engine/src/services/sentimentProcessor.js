const Redis = require('ioredis');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const SentimentAnalyzer = require('./sentimentAnalyzer');

class SentimentProcessor {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.analyzer = new SentimentAnalyzer();
    this.batchSize = 100;
    this.processingInterval = 5000; // 5 seconds
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      logger.info('SentimentProcessor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SentimentProcessor:', error);
      throw error;
    }
  }

  async processPendingData() {
    try {
      const pendingKeys = await this.redis.keys('sentiment:pending:*');
      
      if (pendingKeys.length === 0) {
        return;
      }

      logger.info(`Processing ${pendingKeys.length} pending sentiment items`);

      // Process in batches
      for (let i = 0; i < pendingKeys.length; i += this.batchSize) {
        const batch = pendingKeys.slice(i, i + this.batchSize);
        await this.processBatch(batch);
      }

    } catch (error) {
      logger.error('Error processing pending data:', error);
      throw error;
    }
  }

  async processBatch(keys) {
    const pipeline = this.redis.pipeline();
    const items = [];

    // Get all items from Redis
    for (const key of keys) {
      pipeline.hgetall(key);
    }

    const results = await pipeline.exec();
    
    for (let i = 0; i < results.length; i++) {
      if (results[i][0] === null) continue; // Skip failed operations
      
      const item = results[i][1];
      if (item && Object.keys(item).length > 0) {
        items.push({
          key: keys[i],
          data: item
        });
      }
    }

    // Process each item
    for (const item of items) {
      try {
        await this.processSentimentItem(item);
        await this.redis.del(item.key); // Remove from pending
      } catch (error) {
        logger.error(`Error processing item ${item.key}:`, error);
        // Move to error queue for retry
        await this.redis.hset(`sentiment:error:${Date.now()}`, item.data);
        await this.redis.del(item.key);
      }
    }
  }

  async processSentimentItem(item) {
    const { data } = item;
    const {
      text,
      symbol,
      source,
      metadata,
      userId,
      timestamp
    } = data;

    // Analyze sentiment
    const analysis = await this.analyzer.analyzeText(text, {
      symbol,
      source,
      metadata,
      userId
    });

    // Store in database
    await this.storeSentimentData({
      symbol: symbol?.toUpperCase(),
      source,
      text,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      metadata: JSON.parse(metadata || '{}'),
      userId,
      timestamp: timestamp || new Date().toISOString()
    });

    // Update real-time cache
    await this.updateRealTimeCache(symbol, analysis);

    // Check for alerts
    await this.checkSentimentAlerts(symbol, analysis);

    logger.debug(`Processed sentiment for ${symbol}`, {
      symbol,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence
    });
  }

  async storeSentimentData(data) {
    const query = `
      INSERT INTO sentiment_data (
        symbol, source, text, sentiment_score, confidence, 
        metadata, user_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (symbol, source, created_at) 
      DO UPDATE SET 
        sentiment_score = EXCLUDED.sentiment_score,
        confidence = EXCLUDED.confidence,
        metadata = EXCLUDED.metadata
    `;

    const values = [
      data.symbol,
      data.source,
      data.text,
      data.sentiment.score,
      data.confidence,
      JSON.stringify(data.metadata),
      data.userId,
      data.timestamp
    ];

    await pool.query(query, values);
  }

  async updateRealTimeCache(symbol, analysis) {
    const cacheKey = `sentiment:realtime:${symbol}`;
    const timestamp = Date.now();
    
    // Store latest sentiment
    await this.redis.hset(cacheKey, {
      score: analysis.sentiment.score,
      confidence: analysis.confidence,
      timestamp: timestamp,
      polarity: analysis.sentiment.polarity,
      subjectivity: analysis.sentiment.subjectivity
    });

    // Add to time series
    await this.redis.zadd(
      `sentiment:timeseries:${symbol}`,
      timestamp,
      JSON.stringify({
        score: analysis.sentiment.score,
        confidence: analysis.confidence,
        polarity: analysis.sentiment.polarity,
        subjectivity: analysis.sentiment.subjectivity
      })
    );

    // Update aggregated sentiment
    await this.updateAggregatedSentiment(symbol, analysis);

    // Set expiration (24 hours)
    await this.redis.expire(cacheKey, 86400);
  }

  async updateAggregatedSentiment(symbol, analysis) {
    const aggKey = `sentiment:aggregated:${symbol}`;
    
    // Get current aggregated data
    const current = await this.redis.hgetall(aggKey);
    
    const count = parseInt(current.count || 0) + 1;
    const totalScore = parseFloat(current.totalScore || 0) + analysis.sentiment.score;
    const totalConfidence = parseFloat(current.totalConfidence || 0) + analysis.confidence;
    
    const avgScore = totalScore / count;
    const avgConfidence = totalConfidence / count;
    
    // Calculate weighted sentiment
    const weightedScore = avgScore * avgConfidence;
    
    // Determine sentiment category
    let category = 'neutral';
    if (weightedScore > 0.3) category = 'positive';
    else if (weightedScore < -0.3) category = 'negative';
    
    await this.redis.hset(aggKey, {
      count,
      totalScore,
      totalConfidence,
      avgScore,
      avgConfidence,
      weightedScore,
      category,
      lastUpdated: Date.now()
    });

    // Set expiration (1 hour)
    await this.redis.expire(aggKey, 3600);
  }

  async checkSentimentAlerts(symbol, analysis) {
    const threshold = 0.7; // High confidence threshold
    const scoreThreshold = 0.8; // Strong sentiment threshold
    
    if (analysis.confidence >= threshold && Math.abs(analysis.sentiment.score) >= scoreThreshold) {
      const alert = {
        symbol,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        timestamp: new Date().toISOString(),
        type: analysis.sentiment.score > 0 ? 'positive_spike' : 'negative_spike'
      };

      // Store alert
      await this.redis.lpush('sentiment:alerts', JSON.stringify(alert));
      
      // Keep only last 1000 alerts
      await this.redis.ltrim('sentiment:alerts', 0, 999);

      logger.info(`Sentiment alert triggered for ${symbol}`, alert);
    }
  }

  async getSymbolSentiment(symbol, timeframe = '1h', limit = 100) {
    try {
      const timeframes = {
        '1h': 3600000,
        '4h': 14400000,
        '24h': 86400000,
        '7d': 604800000
      };

      const duration = timeframes[timeframe] || timeframes['1h'];
      const cutoff = Date.now() - duration;

      // Get time series data
      const timeseries = await this.redis.zrevrangebyscore(
        `sentiment:timeseries:${symbol}`,
        '+inf',
        cutoff,
        'LIMIT',
        0,
        limit
      );

      const data = timeseries.map(item => {
        const parsed = JSON.parse(item);
        return {
          ...parsed,
          timestamp: new Date(parseInt(item.split(':')[1])).toISOString()
        };
      });

      // Get aggregated data
      const aggregated = await this.redis.hgetall(`sentiment:aggregated:${symbol}`);
      
      // Get current real-time data
      const realtime = await this.redis.hgetall(`sentiment:realtime:${symbol}`);

      return {
        symbol,
        timeframe,
        timeseries: data,
        aggregated: aggregated,
        realtime: realtime,
        summary: this.calculateSummary(data)
      };

    } catch (error) {
      logger.error(`Error getting sentiment for ${symbol}:`, error);
      throw error;
    }
  }

  async getMarketSentiment(timeframe = '1h', limit = 100) {
    try {
      // Get all symbols with recent sentiment data
      const symbols = await this.redis.keys('sentiment:aggregated:*');
      
      const marketData = await Promise.all(
        symbols.map(async (key) => {
          const symbol = key.replace('sentiment:aggregated:', '');
          const data = await this.redis.hgetall(key);
          return {
            symbol,
            ...data
          };
        })
      );

      // Calculate market-wide metrics
      const validData = marketData.filter(item => item.count && parseInt(item.count) > 0);
      
      if (validData.length === 0) {
        return {
          marketSentiment: 'neutral',
          avgScore: 0,
          totalSymbols: 0,
          positiveSymbols: 0,
          negativeSymbols: 0,
          neutralSymbols: 0
        };
      }

      const totalScore = validData.reduce((sum, item) => sum + parseFloat(item.avgScore || 0), 0);
      const avgScore = totalScore / validData.length;
      
      const positiveSymbols = validData.filter(item => parseFloat(item.avgScore || 0) > 0.1).length;
      const negativeSymbols = validData.filter(item => parseFloat(item.avgScore || 0) < -0.1).length;
      const neutralSymbols = validData.length - positiveSymbols - negativeSymbols;

      let marketSentiment = 'neutral';
      if (avgScore > 0.2) marketSentiment = 'positive';
      else if (avgScore < -0.2) marketSentiment = 'negative';

      return {
        marketSentiment,
        avgScore,
        totalSymbols: validData.length,
        positiveSymbols,
        negativeSymbols,
        neutralSymbols,
        symbols: validData
      };

    } catch (error) {
      logger.error('Error getting market sentiment:', error);
      throw error;
    }
  }

  async getSentimentTrends(symbol, timeframe = '24h') {
    try {
      const timeframes = {
        '1h': 3600000,
        '4h': 14400000,
        '24h': 86400000,
        '7d': 604800000
      };

      const duration = timeframes[timeframe] || timeframes['24h'];
      const cutoff = Date.now() - duration;

      const timeseries = await this.redis.zrevrangebyscore(
        `sentiment:timeseries:${symbol}`,
        '+inf',
        cutoff
      );

      const data = timeseries.map(item => {
        const parsed = JSON.parse(item);
        return {
          ...parsed,
          timestamp: new Date(parseInt(item.split(':')[1])).toISOString()
        };
      });

      return {
        symbol,
        timeframe,
        trends: this.calculateTrends(data),
        data: data
      };

    } catch (error) {
      logger.error(`Error getting sentiment trends for ${symbol}:`, error);
      throw error;
    }
  }

  async getSentimentAlerts(symbol, threshold = 0.7) {
    try {
      const alerts = await this.redis.lrange('sentiment:alerts', 0, 99);
      
      let filteredAlerts = alerts.map(alert => JSON.parse(alert));
      
      if (symbol) {
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.symbol === symbol.toUpperCase()
        );
      }

      filteredAlerts = filteredAlerts.filter(alert => 
        alert.confidence >= threshold
      );

      return {
        alerts: filteredAlerts,
        count: filteredAlerts.length
      };

    } catch (error) {
      logger.error('Error getting sentiment alerts:', error);
      throw error;
    }
  }

  calculateSummary(data) {
    if (data.length === 0) {
      return {
        avgScore: 0,
        avgConfidence: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        trend: 'stable'
      };
    }

    const scores = data.map(item => item.score);
    const confidences = data.map(item => item.confidence);
    
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    
    const positiveCount = scores.filter(score => score > 0.1).length;
    const negativeCount = scores.filter(score => score < -0.1).length;
    const neutralCount = scores.length - positiveCount - negativeCount;

    // Calculate trend
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    let trend = 'stable';
    if (secondHalfAvg > firstHalfAvg + 0.1) trend = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 0.1) trend = 'declining';

    return {
      avgScore,
      avgConfidence,
      positiveCount,
      negativeCount,
      neutralCount,
      trend
    };
  }

  calculateTrends(data) {
    if (data.length < 2) {
      return { direction: 'stable', strength: 0 };
    }

    const scores = data.map(item => item.score);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    const difference = secondHalfAvg - firstHalfAvg;
    const strength = Math.abs(difference);
    
    let direction = 'stable';
    if (difference > 0.1) direction = 'improving';
    else if (difference < -0.1) direction = 'declining';

    return {
      direction,
      strength,
      change: difference
    };
  }

  async cleanupOldData() {
    try {
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      // Clean up time series data
      const timeseriesKeys = await this.redis.keys('sentiment:timeseries:*');
      
      for (const key of timeseriesKeys) {
        await this.redis.zremrangebyscore(key, '-inf', cutoff);
      }

      // Clean up old alerts
      const alerts = await this.redis.lrange('sentiment:alerts', 0, -1);
      const cutoffTime = new Date(cutoff).toISOString();
      
      const validAlerts = alerts.filter(alert => {
        const alertData = JSON.parse(alert);
        return alertData.timestamp > cutoffTime;
      });

      if (validAlerts.length !== alerts.length) {
        await this.redis.del('sentiment:alerts');
        if (validAlerts.length > 0) {
          await this.redis.lpush('sentiment:alerts', ...validAlerts);
        }
      }

      logger.info('Sentiment data cleanup completed');

    } catch (error) {
      logger.error('Error during data cleanup:', error);
    }
  }
}

module.exports = SentimentProcessor;
