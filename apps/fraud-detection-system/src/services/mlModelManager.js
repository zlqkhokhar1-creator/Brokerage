const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class MLModelManager extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.models = new Map();
    this.trainingJobs = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadModels();
      logger.info('ML Model Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ML Model Manager:', error);
      throw error;
    }
  }

  async loadModels() {
    try {
      const models = [
        {
          id: 'transaction_classifier',
          name: 'Transaction Classifier',
          description: 'Classifies transactions as fraudulent or legitimate',
          type: 'classification',
          algorithm: 'random_forest',
          version: '1.0',
          accuracy: 0.95,
          precision: 0.92,
          recall: 0.88,
          f1Score: 0.90,
          status: 'active',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'anomaly_detector',
          name: 'Anomaly Detector',
          description: 'Detects anomalous transaction patterns',
          type: 'anomaly_detection',
          algorithm: 'isolation_forest',
          version: '1.0',
          accuracy: 0.92,
          precision: 0.89,
          recall: 0.85,
          f1Score: 0.87,
          status: 'active',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'behavioral_analyzer',
          name: 'Behavioral Analyzer',
          description: 'Analyzes user behavior patterns',
          type: 'behavioral_analysis',
          algorithm: 'lstm',
          version: '1.0',
          accuracy: 0.88,
          precision: 0.85,
          recall: 0.82,
          f1Score: 0.83,
          status: 'active',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const model of models) {
        this.models.set(model.id, model);
      }

      logger.info(`Loaded ${models.length} ML models`);
    } catch (error) {
      logger.error('Error loading models:', error);
    }
  }

  async getModels(userId) {
    try {
      const query = `
        SELECT * FROM ml_models 
        WHERE status != 'deleted'
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        algorithm: row.algorithm,
        version: row.version,
        accuracy: row.accuracy,
        precision: row.precision,
        recall: row.recall,
        f1Score: row.f1_score,
        status: row.status,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error getting models:', error);
      return [];
    }
  }

  async trainModel(data, user) {
    try {
      const { modelId, trainingData, parameters, algorithm } = data;
      const startTime = Date.now();
      
      const trainingJob = {
        id: uuidv4(),
        modelId: modelId || uuidv4(),
        userId: user.id,
        status: 'training',
        algorithm: algorithm || 'random_forest',
        parameters: parameters || {},
        trainingData: trainingData || {},
        progress: 0,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
        error: null
      };
      
      // Store training job
      await this.storeTrainingJob(trainingJob);
      this.trainingJobs.set(trainingJob.id, trainingJob);
      
      try {
        // Mock training process - in reality would use actual ML libraries
        await this.simulateTraining(trainingJob);
        
        // Update training job
        trainingJob.status = 'completed';
        trainingJob.completedAt = new Date();
        trainingJob.progress = 100;
        
        // Mock performance metrics
        trainingJob.accuracy = 0.95 + Math.random() * 0.05;
        trainingJob.precision = 0.90 + Math.random() * 0.05;
        trainingJob.recall = 0.85 + Math.random() * 0.05;
        trainingJob.f1Score = 0.87 + Math.random() * 0.05;
        
        await this.updateTrainingJob(trainingJob);
        
        // Create or update model
        const model = {
          id: trainingJob.modelId,
          name: `Model ${trainingJob.modelId}`,
          description: `Trained ${trainingJob.algorithm} model`,
          type: this.getModelType(trainingJob.algorithm),
          algorithm: trainingJob.algorithm,
          version: '1.0',
          accuracy: trainingJob.accuracy,
          precision: trainingJob.precision,
          recall: trainingJob.recall,
          f1Score: trainingJob.f1Score,
          status: 'active',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await this.storeModel(model);
        this.models.set(model.id, model);
        
        logger.performance('Model training', Date.now() - startTime, {
          modelId: trainingJob.modelId,
          algorithm: trainingJob.algorithm,
          accuracy: trainingJob.accuracy
        });
        
        this.emit('modelTrained', {
          modelId: model.id,
          userId: user.id,
          accuracy: model.accuracy,
          algorithm: model.algorithm
        });
        
        return {
          trainingJob,
          model
        };
      } catch (error) {
        trainingJob.status = 'failed';
        trainingJob.error = error.message;
        trainingJob.completedAt = new Date();
        await this.updateTrainingJob(trainingJob);
        throw error;
      }
    } catch (error) {
      logger.error('Error training model:', error);
      throw error;
    }
  }

  async simulateTraining(trainingJob) {
    try {
      // Simulate training progress
      for (let progress = 0; progress <= 100; progress += 10) {
        trainingJob.progress = progress;
        await this.updateTrainingJob(trainingJob);
        
        // Simulate training time
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error('Error simulating training:', error);
      throw error;
    }
  }

  async predict(modelId, features) {
    try {
      const model = this.models.get(modelId);
      if (!model || !model.enabled) {
        throw new Error(`Model ${modelId} not found or disabled`);
      }
      
      // Mock prediction - in reality would use actual model
      const prediction = this.mockPrediction(model, features);
      
      return {
        modelId: model.id,
        modelName: model.name,
        prediction: prediction,
        confidence: prediction.confidence,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error predicting with model ${modelId}:`, error);
      throw error;
    }
  }

  mockPrediction(model, features) {
    try {
      let prediction;
      
      switch (model.algorithm) {
        case 'random_forest':
          prediction = this.mockRandomForestPrediction(features);
          break;
        case 'isolation_forest':
          prediction = this.mockIsolationForestPrediction(features);
          break;
        case 'lstm':
          prediction = this.mockLSTMPrediction(features);
          break;
        default:
          prediction = this.mockDefaultPrediction(features);
      }
      
      return prediction;
    } catch (error) {
      logger.error('Error in mock prediction:', error);
      return {
        isFraudulent: false,
        confidence: 0.5,
        riskScore: 50
      };
    }
  }

  mockRandomForestPrediction(features) {
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
      riskFactors,
      algorithm: 'random_forest'
    };
  }

  mockIsolationForestPrediction(features) {
    const anomalyScore = Math.random() * 100;
    const isAnomaly = anomalyScore > 70;
    
    return {
      isAnomaly,
      anomalyScore,
      confidence: Math.min(0.95, Math.max(0.1, anomalyScore / 100)),
      riskScore: anomalyScore,
      algorithm: 'isolation_forest'
    };
  }

  mockLSTMPrediction(features) {
    const behaviorScore = Math.random() * 100;
    const isUnusual = behaviorScore > 60;
    
    return {
      isUnusual,
      behaviorScore,
      confidence: Math.min(0.95, Math.max(0.1, behaviorScore / 100)),
      riskScore: behaviorScore,
      algorithm: 'lstm'
    };
  }

  mockDefaultPrediction(features) {
    const riskScore = Math.random() * 100;
    const isFraudulent = riskScore > 50;
    
    return {
      isFraudulent,
      confidence: Math.min(0.95, Math.max(0.1, riskScore / 100)),
      riskScore,
      algorithm: 'default'
    };
  }

  getModelType(algorithm) {
    const typeMap = {
      'random_forest': 'classification',
      'isolation_forest': 'anomaly_detection',
      'lstm': 'behavioral_analysis',
      'svm': 'classification',
      'naive_bayes': 'classification',
      'kmeans': 'clustering'
    };
    
    return typeMap[algorithm] || 'classification';
  }

  async getTrainingJob(jobId, userId) {
    try {
      const query = `
        SELECT * FROM training_jobs 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [jobId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting training job ${jobId}:`, error);
      return null;
    }
  }

  async getTrainingJobs(userId, limit = 100) {
    try {
      const query = `
        SELECT * FROM training_jobs 
        WHERE user_id = $1
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [userId, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        modelId: row.model_id,
        userId: row.user_id,
        status: row.status,
        algorithm: row.algorithm,
        parameters: row.parameters,
        progress: row.progress,
        accuracy: row.accuracy,
        precision: row.precision,
        recall: row.recall,
        f1Score: row.f1_score,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        error: row.error
      }));
    } catch (error) {
      logger.error('Error getting training jobs:', error);
      return [];
    }
  }

  async storeModel(model) {
    try {
      const query = `
        INSERT INTO ml_models (
          id, name, description, type, algorithm, version, accuracy, 
          precision, recall, f1_score, status, enabled, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) 
        DO UPDATE SET 
          name = $2, description = $3, type = $4, algorithm = $5, 
          version = $6, accuracy = $7, precision = $8, recall = $9, 
          f1_score = $10, status = $11, enabled = $12, updated_at = $14
      `;
      
      await this.db.query(query, [
        model.id,
        model.name,
        model.description,
        model.type,
        model.algorithm,
        model.version,
        model.accuracy,
        model.precision,
        model.recall,
        model.f1Score,
        model.status,
        model.enabled,
        model.createdAt,
        model.updatedAt
      ]);
    } catch (error) {
      logger.error('Error storing model:', error);
      throw error;
    }
  }

  async storeTrainingJob(trainingJob) {
    try {
      const query = `
        INSERT INTO training_jobs (
          id, model_id, user_id, status, algorithm, parameters, 
          progress, accuracy, precision, recall, f1_score, 
          created_at, started_at, completed_at, error
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      
      await this.db.query(query, [
        trainingJob.id,
        trainingJob.modelId,
        trainingJob.userId,
        trainingJob.status,
        trainingJob.algorithm,
        JSON.stringify(trainingJob.parameters),
        trainingJob.progress,
        trainingJob.accuracy,
        trainingJob.precision,
        trainingJob.recall,
        trainingJob.f1Score,
        trainingJob.createdAt,
        trainingJob.startedAt,
        trainingJob.completedAt,
        trainingJob.error
      ]);
    } catch (error) {
      logger.error('Error storing training job:', error);
      throw error;
    }
  }

  async updateTrainingJob(trainingJob) {
    try {
      const query = `
        UPDATE training_jobs 
        SET status = $1, progress = $2, accuracy = $3, precision = $4, 
            recall = $5, f1_score = $6, completed_at = $7, error = $8
        WHERE id = $9
      `;
      
      await this.db.query(query, [
        trainingJob.status,
        trainingJob.progress,
        trainingJob.accuracy,
        trainingJob.precision,
        trainingJob.recall,
        trainingJob.f1Score,
        trainingJob.completedAt,
        trainingJob.error,
        trainingJob.id
      ]);
    } catch (error) {
      logger.error('Error updating training job:', error);
      throw error;
    }
  }

  async runWeeklyRetraining() {
    try {
      logger.info('Running weekly model retraining...');
      
      // Get all active models
      const activeModels = Array.from(this.models.values()).filter(m => m.enabled);
      
      for (const model of activeModels) {
        try {
          // Mock retraining process
          const retrainingJob = {
            id: uuidv4(),
            modelId: model.id,
            userId: 'system',
            status: 'training',
            algorithm: model.algorithm,
            parameters: {},
            progress: 0,
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            createdAt: new Date(),
            startedAt: new Date(),
            completedAt: null,
            error: null
          };
          
          await this.storeTrainingJob(retrainingJob);
          
          // Simulate retraining
          await this.simulateTraining(retrainingJob);
          
          // Update model with new metrics
          model.accuracy = 0.95 + Math.random() * 0.05;
          model.precision = 0.90 + Math.random() * 0.05;
          model.recall = 0.85 + Math.random() * 0.05;
          model.f1Score = 0.87 + Math.random() * 0.05;
          model.updatedAt = new Date();
          
          await this.storeModel(model);
          
          logger.info(`Model ${model.id} retrained successfully`);
        } catch (error) {
          logger.error(`Error retraining model ${model.id}:`, error);
        }
      }
      
      logger.info('Weekly model retraining completed');
    } catch (error) {
      logger.error('Error running weekly retraining:', error);
    }
  }

  async close() {
    try {
      logger.info('ML Model Manager closed successfully');
    } catch (error) {
      logger.error('Error closing ML Model Manager:', error);
    }
  }
}

module.exports = MLModelManager;

