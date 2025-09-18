const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class QueueManager extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.queues = new Map();
    this.workers = new Map();
    this.jobs = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load queue configurations
      await this.loadQueueConfigurations();
      
      // Start queue processors
      this.startQueueProcessors();
      
      this._initialized = true;
      logger.info('QueueManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize QueueManager:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('QueueManager closed');
    } catch (error) {
      logger.error('Error closing QueueManager:', error);
    }
  }

  async loadQueueConfigurations() {
    try {
      this.queues = new Map([
        ['report_generation', {
          name: 'Report Generation',
          description: 'Queue for report generation jobs',
          concurrency: 5,
          retryAttempts: 3,
          retryDelay: 5000,
          timeout: 300000, // 5 minutes
          priority: 'high'
        }],
        ['export_creation', {
          name: 'Export Creation',
          description: 'Queue for export creation jobs',
          concurrency: 10,
          retryAttempts: 3,
          retryDelay: 3000,
          timeout: 600000, // 10 minutes
          priority: 'medium'
        }],
        ['email_sending', {
          name: 'Email Sending',
          description: 'Queue for email sending jobs',
          concurrency: 20,
          retryAttempts: 5,
          retryDelay: 1000,
          timeout: 60000, // 1 minute
          priority: 'low'
        }],
        ['notification_sending', {
          name: 'Notification Sending',
          description: 'Queue for notification sending jobs',
          concurrency: 15,
          retryAttempts: 3,
          retryDelay: 2000,
          timeout: 30000, // 30 seconds
          priority: 'medium'
        }],
        ['data_processing', {
          name: 'Data Processing',
          description: 'Queue for data processing jobs',
          concurrency: 8,
          retryAttempts: 2,
          retryDelay: 10000,
          timeout: 1800000, // 30 minutes
          priority: 'high'
        }],
        ['cleanup', {
          name: 'Cleanup',
          description: 'Queue for cleanup jobs',
          concurrency: 3,
          retryAttempts: 1,
          retryDelay: 30000,
          timeout: 3600000, // 1 hour
          priority: 'low'
        }]
      ]);
      
      logger.info('Queue configurations loaded successfully');
    } catch (error) {
      logger.error('Error loading queue configurations:', error);
      throw error;
    }
  }

  startQueueProcessors() {
    // Start processors for each queue
    for (const [queueName, config] of this.queues.entries()) {
      this.startQueueProcessor(queueName);
    }
  }

  startQueueProcessor(queueName) {
    const config = this.queues.get(queueName);
    if (!config) return;
    
    // Start multiple workers based on concurrency
    for (let i = 0; i < config.concurrency; i++) {
      const workerId = `${queueName}_worker_${i}`;
      this.startWorker(workerId, queueName);
    }
  }

  startWorker(workerId, queueName) {
    const config = this.queues.get(queueName);
    if (!config) return;
    
    const worker = {
      id: workerId,
      queueName: queueName,
      status: 'idle',
      currentJob: null,
      startTime: Date.now()
    };
    
    this.workers.set(workerId, worker);
    
    // Start processing jobs
    this.processJobs(workerId, queueName);
  }

  async processJobs(workerId, queueName) {
    try {
      while (true) {
        try {
          // Get next job from queue
          const job = await this.getNextJob(queueName);
          
          if (job) {
            await this.processJob(workerId, job);
          } else {
            // No jobs available, wait a bit
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          logger.error(`Error processing jobs in worker ${workerId}:`, error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      logger.error(`Worker ${workerId} stopped:`, error);
    }
  }

  async getNextJob(queueName) {
    try {
      // Use Redis BLPOP to get next job atomically
      const result = await this.redis.blpop(`queue:${queueName}`, 1);
      
      if (!result || result.length < 2) {
        return null;
      }
      
      const jobData = JSON.parse(result[1]);
      return jobData;
    } catch (error) {
      logger.error('Error getting next job:', error);
      return null;
    }
  }

  async processJob(workerId, job) {
    try {
      const worker = this.workers.get(workerId);
      if (!worker) return;
      
      worker.status = 'working';
      worker.currentJob = job.id;
      
      // Update job status
      await this.updateJobStatus(job.id, 'processing', { workerId });
      
      // Process the job
      const result = await this.executeJob(job);
      
      // Update job status
      await this.updateJobStatus(job.id, 'completed', { result });
      
      // Store job result
      await this.storeJobResult(job.id, result);
      
      this.emit('jobCompleted', { jobId: job.id, result });
      
      logger.info(`Job completed: ${job.id}`, { workerId, duration: Date.now() - job.createdAt });
    } catch (error) {
      logger.error(`Error processing job ${job.id}:`, error);
      
      // Handle job failure
      await this.handleJobFailure(job, error);
    } finally {
      // Reset worker status
      const worker = this.workers.get(workerId);
      if (worker) {
        worker.status = 'idle';
        worker.currentJob = null;
      }
    }
  }

  async executeJob(job) {
    try {
      const { type, data, options } = job;
      
      switch (type) {
        case 'report_generation':
          return await this.executeReportGeneration(data, options);
        case 'export_creation':
          return await this.executeExportCreation(data, options);
        case 'email_sending':
          return await this.executeEmailSending(data, options);
        case 'notification_sending':
          return await this.executeNotificationSending(data, options);
        case 'data_processing':
          return await this.executeDataProcessing(data, options);
        case 'cleanup':
          return await this.executeCleanup(data, options);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      logger.error('Error executing job:', error);
      throw error;
    }
  }

  async executeReportGeneration(data, options) {
    try {
      // This would integrate with the ReportGenerator service
      logger.info('Executing report generation job', { data, options });
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return {
        success: true,
        reportId: nanoid(),
        reportUrl: `/reports/${nanoid()}.pdf`,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing report generation:', error);
      throw error;
    }
  }

  async executeExportCreation(data, options) {
    try {
      // This would integrate with the ExportEngine service
      logger.info('Executing export creation job', { data, options });
      
      // Simulate export creation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return {
        success: true,
        exportId: nanoid(),
        exportUrl: `/exports/${nanoid()}.xlsx`,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing export creation:', error);
      throw error;
    }
  }

  async executeEmailSending(data, options) {
    try {
      // This would integrate with the EmailService
      logger.info('Executing email sending job', { data, options });
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        messageId: nanoid(),
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing email sending:', error);
      throw error;
    }
  }

  async executeNotificationSending(data, options) {
    try {
      // This would integrate with the NotificationService
      logger.info('Executing notification sending job', { data, options });
      
      // Simulate notification sending
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        notificationId: nanoid(),
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing notification sending:', error);
      throw error;
    }
  }

  async executeDataProcessing(data, options) {
    try {
      // This would integrate with various data processing services
      logger.info('Executing data processing job', { data, options });
      
      // Simulate data processing
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      return {
        success: true,
        processedRecords: data.recordCount || 1000,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing data processing:', error);
      throw error;
    }
  }

  async executeCleanup(data, options) {
    try {
      // This would integrate with various cleanup services
      logger.info('Executing cleanup job', { data, options });
      
      // Simulate cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        cleanedItems: data.itemCount || 100,
        cleanedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing cleanup:', error);
      throw error;
    }
  }

  async handleJobFailure(job, error) {
    try {
      const config = this.queues.get(job.queueName);
      if (!config) return;
      
      job.attempts = (job.attempts || 0) + 1;
      
      if (job.attempts < config.retryAttempts) {
        // Retry job
        job.status = 'retrying';
        job.nextRetry = Date.now() + config.retryDelay;
        
        await this.updateJobStatus(job.id, 'retrying', { 
          attempts: job.attempts,
          nextRetry: job.nextRetry,
          error: error.message
        });
        
        // Schedule retry
        setTimeout(() => {
          this.addJob(job.queueName, job);
        }, config.retryDelay);
        
        logger.warn(`Job ${job.id} scheduled for retry ${job.attempts}/${config.retryAttempts}`);
      } else {
        // Job failed permanently
        await this.updateJobStatus(job.id, 'failed', { 
          attempts: job.attempts,
          error: error.message,
          failedAt: new Date().toISOString()
        });
        
        this.emit('jobFailed', { jobId: job.id, error: error.message });
        
        logger.error(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
      }
    } catch (error) {
      logger.error('Error handling job failure:', error);
    }
  }

  async addJob(queueName, jobData, options = {}) {
    try {
      const config = this.queues.get(queueName);
      if (!config) {
        throw new Error(`Unknown queue: ${queueName}`);
      }
      
      const job = {
        id: nanoid(),
        queueName: queueName,
        type: jobData.type,
        data: jobData.data,
        options: { ...config, ...options },
        status: 'pending',
        priority: config.priority,
        createdAt: Date.now(),
        attempts: 0
      };
      
      // Store job in database
      await this.storeJob(job);
      
      // Add job to Redis queue
      await this.redis.lpush(`queue:${queueName}`, JSON.stringify(job));
      
      this.emit('jobAdded', { jobId: job.id, queueName });
      
      logger.info(`Job added to queue: ${queueName}`, { jobId: job.id });
      
      return job.id;
    } catch (error) {
      logger.error('Error adding job to queue:', error);
      throw error;
    }
  }

  async storeJob(job) {
    try {
      const query = `
        INSERT INTO queue_jobs (
          id, queue_name, type, data, options, status, priority, 
          created_at, attempts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await pool.query(query, [
        job.id,
        job.queueName,
        job.type,
        JSON.stringify(job.data),
        JSON.stringify(job.options),
        job.status,
        job.priority,
        new Date(job.createdAt).toISOString(),
        job.attempts
      ]);
    } catch (error) {
      logger.error('Error storing job:', error);
      throw error;
    }
  }

  async updateJobStatus(jobId, status, additionalData = {}) {
    try {
      const query = `
        UPDATE queue_jobs 
        SET status = $1, updated_at = $2, additional_data = $3
        WHERE id = $4
      `;
      
      await pool.query(query, [
        status,
        new Date().toISOString(),
        JSON.stringify(additionalData),
        jobId
      ]);
    } catch (error) {
      logger.error('Error updating job status:', error);
      throw error;
    }
  }

  async storeJobResult(jobId, result) {
    try {
      const query = `
        INSERT INTO queue_job_results (
          id, job_id, result, created_at
        ) VALUES ($1, $2, $3, $4)
      `;
      
      await pool.query(query, [
        nanoid(),
        jobId,
        JSON.stringify(result),
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing job result:', error);
      throw error;
    }
  }

  async getJobStatus(jobId) {
    try {
      const query = 'SELECT * FROM queue_jobs WHERE id = $1';
      const result = await pool.query(query, [jobId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        queueName: row.queue_name,
        type: row.type,
        data: row.data,
        options: row.options,
        status: row.status,
        priority: row.priority,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
        attempts: row.attempts,
        additionalData: row.additional_data
      };
    } catch (error) {
      logger.error('Error getting job status:', error);
      throw error;
    }
  }

  async getJobs(queueName, status = null, limit = 100) {
    try {
      let query = 'SELECT * FROM queue_jobs WHERE queue_name = $1';
      const params = [queueName];
      let paramCount = 1;
      
      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
      }
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        queueName: row.queue_name,
        type: row.type,
        data: row.data,
        options: row.options,
        status: row.status,
        priority: row.priority,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
        attempts: row.attempts,
        additionalData: row.additional_data
      }));
    } catch (error) {
      logger.error('Error getting jobs:', error);
      throw error;
    }
  }

  async cancelJob(jobId) {
    try {
      // Update job status
      await this.updateJobStatus(jobId, 'cancelled');
      
      // Remove from Redis queue if still pending
      const job = await this.getJobStatus(jobId);
      if (job && job.status === 'pending') {
        await this.redis.lrem(`queue:${job.queueName}`, 1, JSON.stringify(job));
      }
      
      this.emit('jobCancelled', { jobId });
      
      logger.info(`Job cancelled: ${jobId}`);
    } catch (error) {
      logger.error('Error cancelling job:', error);
      throw error;
    }
  }

  async getQueueStats(queueName = null) {
    try {
      let query = `
        SELECT 
          queue_name,
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration
        FROM queue_jobs 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;
      
      const params = [];
      if (queueName) {
        query += ' AND queue_name = $1';
        params.push(queueName);
      }
      
      query += ' GROUP BY queue_name, status ORDER BY queue_name, status';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw error;
    }
  }

  async getWorkers() {
    try {
      return Array.from(this.workers.values());
    } catch (error) {
      logger.error('Error getting workers:', error);
      throw error;
    }
  }

  async getQueues() {
    try {
      return Array.from(this.queues.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting queues:', error);
      throw error;
    }
  }

  async pauseQueue(queueName) {
    try {
      const config = this.queues.get(queueName);
      if (!config) {
        throw new Error(`Unknown queue: ${queueName}`);
      }
      
      config.paused = true;
      this.queues.set(queueName, config);
      
      logger.info(`Queue paused: ${queueName}`);
    } catch (error) {
      logger.error('Error pausing queue:', error);
      throw error;
    }
  }

  async resumeQueue(queueName) {
    try {
      const config = this.queues.get(queueName);
      if (!config) {
        throw new Error(`Unknown queue: ${queueName}`);
      }
      
      config.paused = false;
      this.queues.set(queueName, config);
      
      logger.info(`Queue resumed: ${queueName}`);
    } catch (error) {
      logger.error('Error resuming queue:', error);
      throw error;
    }
  }

  async clearQueue(queueName, status = 'pending') {
    try {
      // Clear from Redis
      await this.redis.del(`queue:${queueName}`);
      
      // Update database
      const query = 'UPDATE queue_jobs SET status = $1 WHERE queue_name = $2 AND status = $3';
      await pool.query(query, ['cancelled', queueName, status]);
      
      logger.info(`Queue cleared: ${queueName} (status: ${status})`);
    } catch (error) {
      logger.error('Error clearing queue:', error);
      throw error;
    }
  }
}

module.exports = QueueManager;
