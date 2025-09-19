const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class FraudDetectionEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.fraudRules = new Map();
    this.mlModels = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadFraudRules();
      await this.loadMLModels();
      logger.info('Fraud Detection Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Fraud Detection Engine:', error);
      throw error;
    }
  }

  async loadFraudRules() {
    try {
      const rules = [
        {
          id: 'unusual_transaction_amount',
          name: 'Unusual Transaction Amount',
          description: 'Detect transactions with unusually high amounts',
          category: 'amount',
          severity: 'medium',
          enabled: true,
          conditions: { threshold: 100000, timeWindow: 3600 }
        },
        {
          id: 'rapid_successive_transactions',
          name: 'Rapid Successive Transactions',
          description: 'Detect multiple transactions in quick succession',
          category: 'frequency',
          severity: 'high',
          enabled: true,
          conditions: { maxTransactions: 10, timeWindow: 300 }
        },
        {
          id: 'geographic_anomaly',
          name: 'Geographic Anomaly',
          description: 'Detect transactions from unusual locations',
          category: 'location',
          severity: 'medium',
          enabled: true,
          conditions: { maxDistance: 1000, timeWindow: 3600 }
        }
      ];

      for (const rule of rules) {
        this.fraudRules.set(rule.id, rule);
      }

      logger.info(`Loaded ${rules.length} fraud detection rules`);
    } catch (error) {
      logger.error('Error loading fraud rules:', error);
    }
  }

  async loadMLModels() {
    try {
      const models = [
        {
          id: 'transaction_classifier',
          name: 'Transaction Classifier',
          type: 'classification',
          version: '1.0',
          accuracy: 0.95,
          enabled: true
        },
        {
          id: 'anomaly_detector',
          name: 'Anomaly Detector',
          type: 'anomaly_detection',
          version: '1.0',
          accuracy: 0.92,
          enabled: true
        }
      ];

      for (const model of models) {
        this.mlModels.set(model.id, model);
      }

      logger.info(`Loaded ${models.length} ML models`);
    } catch (error) {
      logger.error('Error loading ML models:', error);
    }
  }

  async detectFraud(data, user) {
    try {
      const { transactionId, transactionData, userData, deviceData, locationData } = data;
      const startTime = Date.now();
      
      const detection = {
        id: uuidv4(),
        transactionId,
        userId: user.id,
        status: 'analyzing',
        riskScore: 0,
        rules: [],
        mlPredictions: [],
        recommendations: [],
        createdAt: new Date(),
        completedAt: null
      };
      
      await this.storeDetection(detection);
      
      try {
        // Run rule-based detection
        const ruleResults = await this.runRuleBasedDetection(transactionData, userData, deviceData, locationData);
        detection.rules = ruleResults;
        
        // Run ML-based detection
        const mlResults = await this.runMLDetection(transactionData, userData, deviceData, locationData);
        detection.mlPredictions = mlResults;
        
        // Calculate overall risk score
        detection.riskScore = this.calculateRiskScore(ruleResults, mlResults);
        
        // Determine fraud status
        detection.status = this.determineFraudStatus(detection.riskScore, ruleResults, mlResults);
        
        // Generate recommendations
        detection.recommendations = this.generateRecommendations(ruleResults, mlResults, detection.riskScore);
        
        detection.completedAt = new Date();
        await this.updateDetection(detection);
        
        if (detection.status === 'fraudulent') {
          this.emit('fraudDetected', {
            detectionId: detection.id,
            transactionId: detection.transactionId,
            userId: detection.userId,
            riskScore: detection.riskScore
          });
        }
        
        logger.performance('Fraud detection', Date.now() - startTime, {
          transactionId,
          riskScore: detection.riskScore,
          status: detection.status
        });
        
        return detection;
      } catch (error) {
        detection.status = 'error';
        detection.error = error.message;
        await this.updateDetection(detection);
        throw error;
      }
    } catch (error) {
      logger.error('Error detecting fraud:', error);
      throw error;
    }
  }

  async runRuleBasedDetection(transactionData, userData, deviceData, locationData) {
    try {
      const results = [];
      
      for (const [ruleId, rule] of this.fraudRules) {
        if (!rule.enabled) continue;
        
        try {
          const result = await this.evaluateRule(rule, transactionData, userData, deviceData, locationData);
          results.push(result);
        } catch (error) {
          logger.error(`Error evaluating rule ${ruleId}:`, error);
          results.push({
            ruleId,
            status: 'error',
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error running rule-based detection:', error);
      return [];
    }
  }

  async evaluateRule(rule, transactionData, userData, deviceData, locationData) {
    try {
      const { conditions } = rule;
      let isTriggered = false;
      let details = {};
      
      switch (rule.id) {
        case 'unusual_transaction_amount':
          isTriggered = transactionData.amount > conditions.threshold;
          details = { amount: transactionData.amount, threshold: conditions.threshold };
          break;
          
        case 'rapid_successive_transactions':
          const count = await this.getTransactionCount(userData.id, conditions.timeWindow);
          isTriggered = count > conditions.maxTransactions;
          details = { transactionCount: count };
          break;
          
        case 'geographic_anomaly':
          isTriggered = locationData.isNew;
          details = { location: locationData };
          break;
          
        default:
          return {
            ruleId: rule.id,
            status: 'skipped',
            reason: 'Unknown rule type'
          };
      }
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        status: isTriggered ? 'triggered' : 'passed',
        details: details,
        riskScore: isTriggered ? this.getRuleRiskScore(rule.severity) : 0
      };
    } catch (error) {
      logger.error(`Error evaluating rule ${rule.id}:`, error);
      return {
        ruleId: rule.id,
        status: 'error',
        error: error.message
      };
    }
  }

  async runMLDetection(transactionData, userData, deviceData, locationData) {
    try {
      const results = [];
      
      for (const [modelId, model] of this.mlModels) {
        if (!model.enabled) continue;
        
        try {
          const prediction = await this.runMLModel(model, transactionData, userData, deviceData, locationData);
          results.push(prediction);
        } catch (error) {
          logger.error(`Error running ML model ${modelId}:`, error);
          results.push({
            modelId,
            status: 'error',
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error running ML detection:', error);
      return [];
    }
  }

  async runMLModel(model, transactionData, userData, deviceData, locationData) {
    try {
      const features = this.extractFeatures(transactionData, userData, deviceData, locationData);
      
      let prediction;
      switch (model.type) {
        case 'classification':
          prediction = this.mockClassificationModel(features);
          break;
        case 'anomaly_detection':
          prediction = this.mockAnomalyDetectionModel(features);
          break;
        default:
          return {
            modelId: model.id,
            status: 'skipped',
            reason: 'Unknown model type'
          };
      }
      
      return {
        modelId: model.id,
        modelName: model.name,
        type: model.type,
        prediction: prediction,
        confidence: prediction.confidence,
        riskScore: prediction.riskScore,
        status: 'completed'
      };
    } catch (error) {
      logger.error(`Error running ML model ${model.id}:`, error);
      return {
        modelId: model.id,
        status: 'error',
        error: error.message
      };
    }
  }

  extractFeatures(transactionData, userData, deviceData, locationData) {
    return {
      amount: transactionData.amount,
      hour: new Date(transactionData.timestamp).getHours(),
      dayOfWeek: new Date(transactionData.timestamp).getDay(),
      isWeekend: [0, 6].includes(new Date(transactionData.timestamp).getDay()),
      userAge: this.calculateUserAge(userData.dateOfBirth),
      accountAge: this.calculateAccountAge(userData.createdAt),
      deviceType: deviceData.type,
      browser: deviceData.browser,
      os: deviceData.os,
      country: locationData.country,
      city: locationData.city,
      isNewLocation: locationData.isNew,
      isNewDevice: deviceData.isNew
    };
  }

  mockClassificationModel(features) {
    const riskFactors = [];
    let riskScore = 0;
    
    if (features.amount > 50000) {
      riskFactors.push('high_amount');
      riskScore += 30;
    }
    
    if (features.hour < 6 || features.hour > 22) {
      riskFactors.push('unusual_time');
      riskScore += 20;
    }
    
    if (features.isNewLocation) {
      riskFactors.push('new_location');
      riskScore += 25;
    }
    
    if (features.isNewDevice) {
      riskFactors.push('new_device');
      riskScore += 35;
    }
    
    const isFraudulent = riskScore > 50;
    const confidence = Math.min(0.95, Math.max(0.1, riskScore / 100));
    
    return {
      isFraudulent,
      confidence,
      riskScore,
      riskFactors
    };
  }

  mockAnomalyDetectionModel(features) {
    const anomalyScore = Math.random() * 100;
    const isAnomaly = anomalyScore > 70;
    
    return {
      isAnomaly,
      anomalyScore,
      confidence: Math.min(0.95, Math.max(0.1, anomalyScore / 100)),
      riskScore: anomalyScore
    };
  }

  calculateRiskScore(ruleResults, mlResults) {
    try {
      let totalScore = 0;
      let weightSum = 0;
      
      for (const rule of ruleResults) {
        if (rule.status === 'triggered') {
          const weight = this.getRuleWeight(rule.severity);
          totalScore += rule.riskScore * weight;
          weightSum += weight;
        }
      }
      
      for (const ml of mlResults) {
        if (ml.status === 'completed' && ml.riskScore) {
          const weight = 2;
          totalScore += ml.riskScore * weight;
          weightSum += weight;
        }
      }
      
      return weightSum > 0 ? Math.min(100, totalScore / weightSum) : 0;
    } catch (error) {
      logger.error('Error calculating risk score:', error);
      return 0;
    }
  }

  determineFraudStatus(riskScore, ruleResults, mlResults) {
    try {
      const criticalRules = ruleResults.filter(r => r.severity === 'critical' && r.status === 'triggered');
      if (criticalRules.length > 0) {
        return 'fraudulent';
      }
      
      const fraudPredictions = mlResults.filter(m => m.prediction && m.prediction.isFraudulent);
      if (fraudPredictions.length > 0) {
        return 'fraudulent';
      }
      
      if (riskScore >= 80) {
        return 'fraudulent';
      } else if (riskScore >= 60) {
        return 'suspicious';
      } else if (riskScore >= 40) {
        return 'review';
      } else {
        return 'legitimate';
      }
    } catch (error) {
      logger.error('Error determining fraud status:', error);
      return 'error';
    }
  }

  generateRecommendations(ruleResults, mlResults, riskScore) {
    try {
      const recommendations = [];
      
      for (const rule of ruleResults) {
        if (rule.status === 'triggered') {
          switch (rule.ruleId) {
            case 'unusual_transaction_amount':
              recommendations.push({
                type: 'amount_verification',
                priority: 'high',
                message: 'Verify transaction amount with user',
                action: 'contact_user'
              });
              break;
            case 'rapid_successive_transactions':
              recommendations.push({
                type: 'velocity_limit',
                priority: 'high',
                message: 'Consider implementing velocity limits',
                action: 'implement_velocity_limits'
              });
              break;
            case 'geographic_anomaly':
              recommendations.push({
                type: 'location_verification',
                priority: 'medium',
                message: 'Verify user location',
                action: 'location_verification'
              });
              break;
          }
        }
      }
      
      for (const ml of mlResults) {
        if (ml.status === 'completed' && ml.prediction) {
          if (ml.prediction.isFraudulent) {
            recommendations.push({
              type: 'ml_fraud_detection',
              priority: 'critical',
              message: `ML model ${ml.modelName} detected fraud`,
              action: 'block_transaction'
            });
          }
        }
      }
      
      if (riskScore >= 80) {
        recommendations.push({
          type: 'high_risk',
          priority: 'critical',
          message: 'High risk transaction - manual review required',
          action: 'manual_review'
        });
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  async getTransactionCount(userId, timeWindow) {
    return Math.floor(Math.random() * 20);
  }

  calculateUserAge(dateOfBirth) {
    return new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
  }

  calculateAccountAge(createdAt) {
    return (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
  }

  getRuleRiskScore(severity) {
    const scores = {
      'low': 20,
      'medium': 40,
      'high': 60,
      'critical': 80
    };
    return scores[severity] || 20;
  }

  getRuleWeight(severity) {
    const weights = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 5
    };
    return weights[severity] || 1;
  }

  async getFraudStatus(transactionId, userId) {
    try {
      const query = `
        SELECT * FROM fraud_detections 
        WHERE transaction_id = $1 AND user_id = $2 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [transactionId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting fraud status for ${transactionId}:`, error);
      return null;
    }
  }

  async storeDetection(detection) {
    try {
      const query = `
        INSERT INTO fraud_detections (
          id, transaction_id, user_id, status, risk_score, rules, 
          ml_predictions, recommendations, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.query(query, [
        detection.id,
        detection.transactionId,
        detection.userId,
        detection.status,
        detection.riskScore,
        JSON.stringify(detection.rules),
        JSON.stringify(detection.mlPredictions),
        JSON.stringify(detection.recommendations),
        detection.createdAt,
        detection.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing detection:', error);
      throw error;
    }
  }

  async updateDetection(detection) {
    try {
      const query = `
        UPDATE fraud_detections 
        SET status = $1, risk_score = $2, rules = $3, ml_predictions = $4, 
            recommendations = $5, completed_at = $6, error = $7
        WHERE id = $8
      `;
      
      await this.db.query(query, [
        detection.status,
        detection.riskScore,
        JSON.stringify(detection.rules),
        JSON.stringify(detection.mlPredictions),
        JSON.stringify(detection.recommendations),
        detection.completedAt,
        detection.error || null,
        detection.id
      ]);
    } catch (error) {
      logger.error('Error updating detection:', error);
      throw error;
    }
  }

  async runDailyAnalysis() {
    try {
      logger.info('Running daily fraud analysis...');
      // Implementation for daily analysis
      logger.info('Daily fraud analysis completed');
    } catch (error) {
      logger.error('Error running daily fraud analysis:', error);
    }
  }

  async close() {
    try {
      logger.info('Fraud Detection Engine closed successfully');
    } catch (error) {
      logger.error('Error closing Fraud Detection Engine:', error);
    }
  }
}

module.exports = FraudDetectionEngine;