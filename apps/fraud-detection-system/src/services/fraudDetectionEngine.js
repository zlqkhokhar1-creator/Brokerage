const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class FraudDetectionEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.fraudRules = new Map();
    this.mlModels = new Map();
    this.riskThresholds = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load fraud detection rules
      await this.loadFraudRules();
      
      // Load ML models
      await this.loadMLModels();
      
      // Load risk thresholds
      await this.loadRiskThresholds();
      
      this._initialized = true;
      logger.info('FraudDetectionEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FraudDetectionEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('FraudDetectionEngine closed');
    } catch (error) {
      logger.error('Error closing FraudDetectionEngine:', error);
    }
  }

  async analyzeTransaction(transaction, userData, deviceData, behavioralData, userId) {
    try {
      if (!this._initialized) {
        throw new Error('FraudDetectionEngine not initialized');
      }

      logger.info('Analyzing transaction for fraud', {
        transactionId: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount
      });

      // Initialize fraud analysis result
      const fraudResult = {
        transactionId: transaction.id,
        userId: transaction.userId,
        isFraudulent: false,
        riskScore: 0,
        confidence: 0,
        reasons: [],
        recommendations: [],
        timestamp: new Date().toISOString()
      };

      // Rule-based fraud detection
      const ruleResults = await this.runFraudRules(transaction, userData, deviceData, behavioralData);
      fraudResult.ruleResults = ruleResults;
      fraudResult.riskScore += ruleResults.riskScore;
      fraudResult.reasons.push(...ruleResults.reasons);

      // ML-based fraud detection
      const mlResults = await this.runMLModels(transaction, userData, deviceData, behavioralData);
      fraudResult.mlResults = mlResults;
      fraudResult.riskScore += mlResults.riskScore;
      fraudResult.confidence = mlResults.confidence;

      // Anomaly detection
      const anomalyResults = await this.detectAnomalies(transaction, userData, deviceData, behavioralData);
      fraudResult.anomalyResults = anomalyResults;
      fraudResult.riskScore += anomalyResults.riskScore;
      fraudResult.reasons.push(...anomalyResults.reasons);

      // Behavioral analysis
      const behavioralResults = await this.analyzeBehavior(transaction, userData, deviceData, behavioralData);
      fraudResult.behavioralResults = behavioralResults;
      fraudResult.riskScore += behavioralResults.riskScore;
      fraudResult.reasons.push(...behavioralResults.reasons);

      // Device fingerprinting analysis
      const deviceResults = await this.analyzeDevice(transaction, userData, deviceData, behavioralData);
      fraudResult.deviceResults = deviceResults;
      fraudResult.riskScore += deviceResults.riskScore;
      fraudResult.reasons.push(...deviceResults.reasons);

      // Calculate final risk score (0-100)
      fraudResult.riskScore = Math.min(100, Math.max(0, fraudResult.riskScore));
      fraudResult.confidence = Math.min(100, Math.max(0, fraudResult.confidence));

      // Determine if transaction is fraudulent
      const riskThreshold = this.riskThresholds.get('transaction') || 70;
      fraudResult.isFraudulent = fraudResult.riskScore >= riskThreshold;

      // Generate recommendations
      fraudResult.recommendations = this.generateRecommendations(fraudResult);

      // Store fraud analysis result
      await this.storeFraudAnalysis(fraudResult);

      // Generate alert if fraudulent
      if (fraudResult.isFraudulent) {
        await this.generateFraudAlert(fraudResult);
      }

      logger.info('Transaction fraud analysis completed', {
        transactionId: transaction.id,
        riskScore: fraudResult.riskScore,
        isFraudulent: fraudResult.isFraudulent,
        confidence: fraudResult.confidence
      });

      return fraudResult;

    } catch (error) {
      logger.error('Error analyzing transaction for fraud:', error);
      throw error;
    }
  }

  async scanTransactions(transactions, userId, timeRange, requesterId) {
    try {
      logger.info('Scanning transactions for fraud', {
        transactionCount: transactions.length,
        userId,
        timeRange
      });

      const scanResults = {
        userId,
        timeRange,
        totalTransactions: transactions.length,
        fraudulentTransactions: 0,
        highRiskTransactions: 0,
        mediumRiskTransactions: 0,
        lowRiskTransactions: 0,
        fraudRate: 0,
        averageRiskScore: 0,
        riskDistribution: {},
        topFraudReasons: [],
        recommendations: [],
        timestamp: new Date().toISOString()
      };

      let totalRiskScore = 0;
      const fraudReasons = {};

      // Analyze each transaction
      for (const transaction of transactions) {
        try {
          const fraudResult = await this.analyzeTransaction(
            transaction, 
            { userId }, 
            {}, 
            {}, 
            requesterId
          );

          totalRiskScore += fraudResult.riskScore;

          // Categorize by risk level
          if (fraudResult.isFraudulent) {
            scanResults.fraudulentTransactions++;
          } else if (fraudResult.riskScore >= 70) {
            scanResults.highRiskTransactions++;
          } else if (fraudResult.riskScore >= 40) {
            scanResults.mediumRiskTransactions++;
          } else {
            scanResults.lowRiskTransactions++;
          }

          // Collect fraud reasons
          for (const reason of fraudResult.reasons) {
            fraudReasons[reason] = (fraudReasons[reason] || 0) + 1;
          }

        } catch (error) {
          logger.error(`Error analyzing transaction ${transaction.id}:`, error);
        }
      }

      // Calculate statistics
      scanResults.fraudRate = (scanResults.fraudulentTransactions / scanResults.totalTransactions) * 100;
      scanResults.averageRiskScore = totalRiskScore / scanResults.totalTransactions;

      // Get top fraud reasons
      scanResults.topFraudReasons = Object.entries(fraudReasons)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([reason, count]) => ({ reason, count }));

      // Generate recommendations
      scanResults.recommendations = this.generateScanRecommendations(scanResults);

      // Store scan results
      await this.storeFraudScan(scanResults);

      logger.info('Transaction fraud scan completed', {
        userId,
        fraudRate: scanResults.fraudRate,
        averageRiskScore: scanResults.averageRiskScore
      });

      return scanResults;

    } catch (error) {
      logger.error('Error scanning transactions for fraud:', error);
      throw error;
    }
  }

  async runFraudRules(transaction, userData, deviceData, behavioralData) {
    try {
      const ruleResults = {
        riskScore: 0,
        reasons: [],
        triggeredRules: []
      };

      // Check each fraud rule
      for (const [ruleId, rule] of this.fraudRules) {
        try {
          const ruleResult = await this.evaluateRule(rule, transaction, userData, deviceData, behavioralData);
          
          if (ruleResult.triggered) {
            ruleResults.triggeredRules.push({
              ruleId,
              ruleName: rule.name,
              severity: rule.severity,
              description: ruleResult.description
            });
            
            ruleResults.riskScore += ruleResult.riskScore;
            ruleResults.reasons.push(ruleResult.description);
          }
        } catch (error) {
          logger.error(`Error evaluating rule ${ruleId}:`, error);
        }
      }

      return ruleResults;

    } catch (error) {
      logger.error('Error running fraud rules:', error);
      return { riskScore: 0, reasons: [], triggeredRules: [] };
    }
  }

  async runMLModels(transaction, userData, deviceData, behavioralData) {
    try {
      const mlResults = {
        riskScore: 0,
        confidence: 0,
        modelPredictions: []
      };

      // Run each ML model
      for (const [modelId, model] of this.mlModels) {
        try {
          const prediction = await this.runModel(model, transaction, userData, deviceData, behavioralData);
          
          mlResults.modelPredictions.push({
            modelId,
            modelName: model.name,
            prediction: prediction.prediction,
            confidence: prediction.confidence,
            riskScore: prediction.riskScore
          });
          
          mlResults.riskScore += prediction.riskScore;
          mlResults.confidence += prediction.confidence;
        } catch (error) {
          logger.error(`Error running model ${modelId}:`, error);
        }
      }

      // Average the confidence
      if (mlResults.modelPredictions.length > 0) {
        mlResults.confidence = mlResults.confidence / mlResults.modelPredictions.length;
      }

      return mlResults;

    } catch (error) {
      logger.error('Error running ML models:', error);
      return { riskScore: 0, confidence: 0, modelPredictions: [] };
    }
  }

  async detectAnomalies(transaction, userData, deviceData, behavioralData) {
    try {
      const anomalyResults = {
        riskScore: 0,
        reasons: [],
        anomalies: []
      };

      // Check for amount anomalies
      if (transaction.amount > this.getUserAverageAmount(transaction.userId) * 3) {
        anomalyResults.anomalies.push('unusually_high_amount');
        anomalyResults.riskScore += 20;
        anomalyResults.reasons.push('Transaction amount is unusually high');
      }

      // Check for time anomalies
      const hour = new Date(transaction.timestamp).getHours();
      if (hour < 6 || hour > 22) {
        anomalyResults.anomalies.push('unusual_time');
        anomalyResults.riskScore += 15;
        anomalyResults.reasons.push('Transaction at unusual time');
      }

      // Check for location anomalies
      if (deviceData.ipAddress && this.isUnusualLocation(deviceData.ipAddress, transaction.userId)) {
        anomalyResults.anomalies.push('unusual_location');
        anomalyResults.riskScore += 25;
        anomalyResults.reasons.push('Transaction from unusual location');
      }

      // Check for frequency anomalies
      if (this.isUnusualFrequency(transaction.userId, transaction.timestamp)) {
        anomalyResults.anomalies.push('unusual_frequency');
        anomalyResults.riskScore += 15;
        anomalyResults.reasons.push('Unusual transaction frequency');
      }

      return anomalyResults;

    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      return { riskScore: 0, reasons: [], anomalies: [] };
    }
  }

  async analyzeBehavior(transaction, userData, deviceData, behavioralData) {
    try {
      const behavioralResults = {
        riskScore: 0,
        reasons: [],
        behavioralFlags: []
      };

      // Check for behavioral patterns
      if (behavioralData && behavioralData.tradingPattern) {
        if (behavioralData.tradingPattern === 'aggressive') {
          behavioralResults.behavioralFlags.push('aggressive_trading');
          behavioralResults.riskScore += 10;
          behavioralResults.reasons.push('Aggressive trading pattern detected');
        }
      }

      // Check for device changes
      if (deviceData && this.isNewDevice(deviceData, transaction.userId)) {
        behavioralResults.behavioralFlags.push('new_device');
        behavioralResults.riskScore += 20;
        behavioralResults.reasons.push('Transaction from new device');
      }

      // Check for session anomalies
      if (behavioralData && behavioralData.sessionDuration < 60) {
        behavioralResults.behavioralFlags.push('short_session');
        behavioralResults.riskScore += 15;
        behavioralResults.reasons.push('Very short session duration');
      }

      return behavioralResults;

    } catch (error) {
      logger.error('Error analyzing behavior:', error);
      return { riskScore: 0, reasons: [], behavioralFlags: [] };
    }
  }

  async analyzeDevice(transaction, userData, deviceData, behavioralData) {
    try {
      const deviceResults = {
        riskScore: 0,
        reasons: [],
        deviceFlags: []
      };

      // Check for device fingerprinting
      if (deviceData && deviceData.fingerprint) {
        const deviceRisk = await this.assessDeviceRisk(deviceData.fingerprint, transaction.userId);
        deviceResults.riskScore += deviceRisk.riskScore;
        deviceResults.reasons.push(...deviceRisk.reasons);
        deviceResults.deviceFlags.push(...deviceRisk.flags);
      }

      // Check for browser anomalies
      if (deviceData && deviceData.userAgent) {
        if (this.isSuspiciousUserAgent(deviceData.userAgent)) {
          deviceResults.deviceFlags.push('suspicious_user_agent');
          deviceResults.riskScore += 25;
          deviceResults.reasons.push('Suspicious user agent detected');
        }
      }

      return deviceResults;

    } catch (error) {
      logger.error('Error analyzing device:', error);
      return { riskScore: 0, reasons: [], deviceFlags: [] };
    }
  }

  async evaluateRule(rule, transaction, userData, deviceData, behavioralData) {
    try {
      const ruleResult = {
        triggered: false,
        riskScore: 0,
        description: ''
      };

      // Evaluate rule conditions
      switch (rule.type) {
        case 'AMOUNT_THRESHOLD':
          if (transaction.amount > rule.conditions.threshold) {
            ruleResult.triggered = true;
            ruleResult.riskScore = rule.conditions.riskScore || 20;
            ruleResult.description = `Transaction amount exceeds threshold: $${transaction.amount}`;
          }
          break;

        case 'FREQUENCY_LIMIT':
          const frequency = await this.getTransactionFrequency(transaction.userId, rule.conditions.timeWindow);
          if (frequency > rule.conditions.limit) {
            ruleResult.triggered = true;
            ruleResult.riskScore = rule.conditions.riskScore || 15;
            ruleResult.description = `Transaction frequency exceeds limit: ${frequency} in ${rule.conditions.timeWindow}`;
          }
          break;

        case 'LOCATION_ANOMALY':
          if (deviceData.ipAddress && this.isUnusualLocation(deviceData.ipAddress, transaction.userId)) {
            ruleResult.triggered = true;
            ruleResult.riskScore = rule.conditions.riskScore || 25;
            ruleResult.description = 'Transaction from unusual location';
          }
          break;

        case 'DEVICE_ANOMALY':
          if (deviceData && this.isNewDevice(deviceData, transaction.userId)) {
            ruleResult.triggered = true;
            ruleResult.riskScore = rule.conditions.riskScore || 20;
            ruleResult.description = 'Transaction from new device';
          }
          break;

        case 'BEHAVIORAL_ANOMALY':
          if (behavioralData && this.isUnusualBehavior(behavioralData, transaction.userId)) {
            ruleResult.triggered = true;
            ruleResult.riskScore = rule.conditions.riskScore || 15;
            ruleResult.description = 'Unusual behavioral pattern detected';
          }
          break;

        default:
          logger.warn(`Unknown rule type: ${rule.type}`);
      }

      return ruleResult;

    } catch (error) {
      logger.error('Error evaluating rule:', error);
      return { triggered: false, riskScore: 0, description: '' };
    }
  }

  async runModel(model, transaction, userData, deviceData, behavioralData) {
    try {
      // Prepare features for ML model
      const features = this.prepareFeatures(transaction, userData, deviceData, behavioralData);
      
      // Run model prediction (mock implementation)
      const prediction = {
        prediction: Math.random() > 0.5 ? 'fraudulent' : 'legitimate',
        confidence: Math.random() * 100,
        riskScore: Math.random() * 50
      };

      return prediction;

    } catch (error) {
      logger.error('Error running ML model:', error);
      return { prediction: 'legitimate', confidence: 0, riskScore: 0 };
    }
  }

  prepareFeatures(transaction, userData, deviceData, behavioralData) {
    return {
      amount: transaction.amount,
      hour: new Date(transaction.timestamp).getHours(),
      dayOfWeek: new Date(transaction.timestamp).getDay(),
      userAge: userData.age || 0,
      accountAge: userData.accountAge || 0,
      deviceType: deviceData.deviceType || 'unknown',
      browser: deviceData.browser || 'unknown',
      os: deviceData.os || 'unknown',
      sessionDuration: behavioralData.sessionDuration || 0,
      tradingPattern: behavioralData.tradingPattern || 'normal'
    };
  }

  generateRecommendations(fraudResult) {
    const recommendations = [];

    if (fraudResult.riskScore >= 80) {
      recommendations.push('Block transaction immediately');
      recommendations.push('Contact user for verification');
      recommendations.push('Review user account for suspicious activity');
    } else if (fraudResult.riskScore >= 60) {
      recommendations.push('Require additional verification');
      recommendations.push('Monitor user account closely');
      recommendations.push('Consider transaction limits');
    } else if (fraudResult.riskScore >= 40) {
      recommendations.push('Monitor for additional suspicious activity');
      recommendations.push('Consider enhanced verification for future transactions');
    }

    return recommendations;
  }

  generateScanRecommendations(scanResults) {
    const recommendations = [];

    if (scanResults.fraudRate > 10) {
      recommendations.push('High fraud rate detected - consider account review');
      recommendations.push('Implement additional verification measures');
    } else if (scanResults.fraudRate > 5) {
      recommendations.push('Moderate fraud rate - monitor closely');
      recommendations.push('Consider enhanced monitoring');
    }

    if (scanResults.averageRiskScore > 70) {
      recommendations.push('High average risk score - review risk thresholds');
    }

    return recommendations;
  }

  async generateFraudAlert(fraudResult) {
    try {
      const alertId = nanoid();
      const alert = {
        id: alertId,
        type: 'FRAUD_DETECTED',
        severity: fraudResult.riskScore >= 80 ? 'critical' : 'high',
        title: 'Fraudulent Transaction Detected',
        description: `Transaction ${fraudResult.transactionId} flagged as fraudulent`,
        details: {
          transactionId: fraudResult.transactionId,
          userId: fraudResult.userId,
          riskScore: fraudResult.riskScore,
          confidence: fraudResult.confidence,
          reasons: fraudResult.reasons
        },
        status: 'open',
        createdAt: new Date().toISOString()
      };

      // Store alert
      await this.storeFraudAlert(alert);
      
      // Emit event
      this.emit('fraudAlertGenerated', alert);
      
      logger.warn('Fraud alert generated', { alertId, transactionId: fraudResult.transactionId });
      
      return alert;

    } catch (error) {
      logger.error('Error generating fraud alert:', error);
      throw error;
    }
  }

  async blockUser(userId, reason, duration, requesterId) {
    try {
      const blockId = nanoid();
      const block = {
        id: blockId,
        userId,
        reason,
        duration,
        blockedBy: requesterId,
        blockedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
        status: 'active'
      };

      // Store block
      await this.storeUserBlock(block);
      
      // Emit event
      this.emit('userBlocked', block);
      
      logger.warn('User blocked', { blockId, userId, reason, duration });
      
      return block;

    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  async unblockUser(userId, reason, requesterId) {
    try {
      // Remove active blocks
      await this.removeUserBlocks(userId);
      
      // Emit event
      this.emit('userUnblocked', { userId, reason, unblockedBy: requesterId });
      
      logger.info('User unblocked', { userId, reason });
      
      return { success: true, userId, reason };

    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  // Helper methods
  getUserAverageAmount(userId) {
    // Mock implementation - in production, this would query the database
    return 1000;
  }

  isUnusualLocation(ipAddress, userId) {
    // Mock implementation - in production, this would check against user's location history
    return Math.random() > 0.8;
  }

  isUnusualFrequency(userId, timestamp) {
    // Mock implementation - in production, this would check against user's transaction history
    return Math.random() > 0.7;
  }

  isNewDevice(deviceData, userId) {
    // Mock implementation - in production, this would check against user's device history
    return Math.random() > 0.6;
  }

  isSuspiciousUserAgent(userAgent) {
    // Mock implementation - in production, this would check against known suspicious patterns
    return userAgent.includes('bot') || userAgent.includes('crawler');
  }

  isUnusualBehavior(behavioralData, userId) {
    // Mock implementation - in production, this would check against user's behavioral patterns
    return Math.random() > 0.5;
  }

  async assessDeviceRisk(fingerprint, userId) {
    // Mock implementation - in production, this would assess device risk based on fingerprint
    return {
      riskScore: Math.random() * 30,
      reasons: ['Device fingerprint analysis'],
      flags: ['device_analysis']
    };
  }

  async getTransactionFrequency(userId, timeWindow) {
    // Mock implementation - in production, this would query the database
    return Math.floor(Math.random() * 10);
  }

  async loadFraudRules() {
    try {
      // Mock fraud rules - in production, this would load from database
      this.fraudRules.set('rule_001', {
        id: 'rule_001',
        name: 'High Amount Transaction',
        type: 'AMOUNT_THRESHOLD',
        conditions: { threshold: 10000, riskScore: 20 },
        severity: 'medium'
      });
      
      this.fraudRules.set('rule_002', {
        id: 'rule_002',
        name: 'High Frequency Transaction',
        type: 'FREQUENCY_LIMIT',
        conditions: { limit: 5, timeWindow: '1_hour', riskScore: 15 },
        severity: 'medium'
      });
      
      logger.info(`Loaded ${this.fraudRules.size} fraud rules`);
    } catch (error) {
      logger.error('Error loading fraud rules:', error);
    }
  }

  async loadMLModels() {
    try {
      // Mock ML models - in production, this would load from database
      this.mlModels.set('model_001', {
        id: 'model_001',
        name: 'Transaction Fraud Model',
        type: 'RANDOM_FOREST',
        version: '1.0.0',
        status: 'active'
      });
      
      logger.info(`Loaded ${this.mlModels.size} ML models`);
    } catch (error) {
      logger.error('Error loading ML models:', error);
    }
  }

  async loadRiskThresholds() {
    try {
      // Mock risk thresholds - in production, this would load from database
      this.riskThresholds.set('transaction', 70);
      this.riskThresholds.set('user', 80);
      this.riskThresholds.set('device', 60);
      
      logger.info(`Loaded ${this.riskThresholds.size} risk thresholds`);
    } catch (error) {
      logger.error('Error loading risk thresholds:', error);
    }
  }

  async storeFraudAnalysis(fraudResult) {
    try {
      const query = `
        INSERT INTO fraud_analyses (
          id, transaction_id, user_id, is_fraudulent, risk_score, confidence,
          reasons, recommendations, analysis_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await pool.query(query, [
        nanoid(),
        fraudResult.transactionId,
        fraudResult.userId,
        fraudResult.isFraudulent,
        fraudResult.riskScore,
        fraudResult.confidence,
        JSON.stringify(fraudResult.reasons),
        JSON.stringify(fraudResult.recommendations),
        JSON.stringify(fraudResult),
        fraudResult.timestamp
      ]);
    } catch (error) {
      logger.error('Error storing fraud analysis:', error);
    }
  }

  async storeFraudScan(scanResults) {
    try {
      const query = `
        INSERT INTO fraud_scans (
          id, user_id, time_range, total_transactions, fraudulent_transactions,
          fraud_rate, average_risk_score, scan_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await pool.query(query, [
        nanoid(),
        scanResults.userId,
        scanResults.timeRange,
        scanResults.totalTransactions,
        scanResults.fraudulentTransactions,
        scanResults.fraudRate,
        scanResults.averageRiskScore,
        JSON.stringify(scanResults),
        scanResults.timestamp
      ]);
    } catch (error) {
      logger.error('Error storing fraud scan:', error);
    }
  }

  async storeFraudAlert(alert) {
    try {
      const query = `
        INSERT INTO fraud_alerts (
          id, type, severity, title, description, details, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await pool.query(query, [
        alert.id,
        alert.type,
        alert.severity,
        alert.title,
        alert.description,
        JSON.stringify(alert.details),
        alert.status,
        alert.createdAt
      ]);
    } catch (error) {
      logger.error('Error storing fraud alert:', error);
    }
  }

  async storeUserBlock(block) {
    try {
      const query = `
        INSERT INTO user_blocks (
          id, user_id, reason, duration, blocked_by, blocked_at, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await pool.query(query, [
        block.id,
        block.userId,
        block.reason,
        block.duration,
        block.blockedBy,
        block.blockedAt,
        block.expiresAt,
        block.status
      ]);
    } catch (error) {
      logger.error('Error storing user block:', error);
    }
  }

  async removeUserBlocks(userId) {
    try {
      const query = 'UPDATE user_blocks SET status = $1 WHERE user_id = $2 AND status = $3';
      await pool.query(query, ['inactive', userId, 'active']);
    } catch (error) {
      logger.error('Error removing user blocks:', error);
    }
  }
}

module.exports = FraudDetectionEngine;
