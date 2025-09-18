const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const cron = require('node-cron');

class SchedulerService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.schedules = new Map();
    this.cronJobs = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load schedules from database
      await this.loadSchedules();
      
      // Start scheduler
      this.startScheduler();
      
      this._initialized = true;
      logger.info('SchedulerService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SchedulerService:', error);
      throw error;
    }
  }

  async close() {
    try {
      // Stop all cron jobs
      for (const [scheduleId, cronJob] of this.cronJobs.entries()) {
        cronJob.destroy();
      }
      
      await this.redis.quit();
      this._initialized = false;
      logger.info('SchedulerService closed');
    } catch (error) {
      logger.error('Error closing SchedulerService:', error);
    }
  }

  async loadSchedules() {
    try {
      const query = 'SELECT * FROM schedules WHERE enabled = true';
      const result = await pool.query(query);
      
      for (const row of result.rows) {
        const schedule = {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          schedule: row.schedule,
          jobType: row.job_type,
          jobData: row.job_data,
          options: row.options,
          enabled: row.enabled,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        
        this.schedules.set(row.id, schedule);
        
        // Create cron job
        await this.createCronJob(schedule);
      }
      
      logger.info(`Loaded ${result.rows.length} schedules`);
    } catch (error) {
      logger.error('Error loading schedules:', error);
      throw error;
    }
  }

  startScheduler() {
    // Check for missed schedules every minute
    setInterval(async () => {
      try {
        await this.checkMissedSchedules();
      } catch (error) {
        logger.error('Error checking missed schedules:', error);
      }
    }, 60000);
  }

  async createSchedule(scheduleData) {
    try {
      const scheduleId = nanoid();
      const schedule = {
        id: scheduleId,
        name: scheduleData.name,
        description: scheduleData.description,
        type: scheduleData.type,
        schedule: scheduleData.schedule,
        jobType: scheduleData.jobType,
        jobData: scheduleData.jobData,
        options: scheduleData.options || {},
        enabled: scheduleData.enabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Validate schedule
      this.validateSchedule(schedule);
      
      // Store in database
      await this.storeSchedule(schedule);
      
      // Add to in-memory map
      this.schedules.set(scheduleId, schedule);
      
      // Create cron job
      await this.createCronJob(schedule);
      
      this.emit('scheduleCreated', schedule);
      
      logger.info(`Schedule created: ${scheduleId}`, { name: schedule.name });
      
      return scheduleId;
    } catch (error) {
      logger.error('Error creating schedule:', error);
      throw error;
    }
  }

  async updateSchedule(scheduleId, updates) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }
      
      // Update schedule
      Object.assign(schedule, updates);
      schedule.updatedAt = new Date().toISOString();
      
      // Validate updated schedule
      this.validateSchedule(schedule);
      
      // Update in database
      await this.updateScheduleInDatabase(schedule);
      
      // Update in-memory map
      this.schedules.set(scheduleId, schedule);
      
      // Recreate cron job
      if (this.cronJobs.has(scheduleId)) {
        this.cronJobs.get(scheduleId).destroy();
      }
      
      if (schedule.enabled) {
        await this.createCronJob(schedule);
      }
      
      this.emit('scheduleUpdated', schedule);
      
      logger.info(`Schedule updated: ${scheduleId}`, { name: schedule.name });
    } catch (error) {
      logger.error('Error updating schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }
      
      // Stop cron job
      if (this.cronJobs.has(scheduleId)) {
        this.cronJobs.get(scheduleId).destroy();
        this.cronJobs.delete(scheduleId);
      }
      
      // Remove from database
      await this.deleteScheduleFromDatabase(scheduleId);
      
      // Remove from in-memory map
      this.schedules.delete(scheduleId);
      
      this.emit('scheduleDeleted', { scheduleId, name: schedule.name });
      
      logger.info(`Schedule deleted: ${scheduleId}`, { name: schedule.name });
    } catch (error) {
      logger.error('Error deleting schedule:', error);
      throw error;
    }
  }

  async createCronJob(schedule) {
    try {
      if (!schedule.enabled) {
        return;
      }
      
      const cronJob = cron.schedule(schedule.schedule, async () => {
        try {
          await this.executeSchedule(schedule);
        } catch (error) {
          logger.error(`Error executing schedule ${schedule.id}:`, error);
        }
      }, {
        scheduled: false
      });
      
      this.cronJobs.set(schedule.id, cronJob);
      
      // Start the cron job
      cronJob.start();
      
      logger.info(`Cron job created for schedule: ${schedule.id}`, { schedule: schedule.schedule });
    } catch (error) {
      logger.error('Error creating cron job:', error);
      throw error;
    }
  }

  async executeSchedule(schedule) {
    try {
      const executionId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Executing schedule: ${schedule.id}`, { 
        name: schedule.name, 
        jobType: schedule.jobType 
      });
      
      // Store execution record
      await this.storeExecution(executionId, schedule.id, 'running', startTime);
      
      try {
        // Execute the job based on type
        const result = await this.executeJob(schedule.jobType, schedule.jobData, schedule.options);
        
        const duration = Date.now() - startTime;
        
        // Update execution record
        await this.updateExecution(executionId, 'completed', result, duration);
        
        this.emit('scheduleExecuted', { 
          scheduleId: schedule.id, 
          executionId, 
          result, 
          duration 
        });
        
        logger.info(`Schedule executed successfully: ${schedule.id}`, { 
          executionId, 
          duration 
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Update execution record with error
        await this.updateExecution(executionId, 'failed', { error: error.message }, duration);
        
        this.emit('scheduleFailed', { 
          scheduleId: schedule.id, 
          executionId, 
          error: error.message, 
          duration 
        });
        
        logger.error(`Schedule execution failed: ${schedule.id}`, { 
          executionId, 
          error: error.message, 
          duration 
        });
      }
    } catch (error) {
      logger.error('Error executing schedule:', error);
      throw error;
    }
  }

  async executeJob(jobType, jobData, options) {
    try {
      switch (jobType) {
        case 'report_generation':
          return await this.executeReportGeneration(jobData, options);
        case 'export_creation':
          return await this.executeExportCreation(jobData, options);
        case 'email_sending':
          return await this.executeEmailSending(jobData, options);
        case 'notification_sending':
          return await this.executeNotificationSending(jobData, options);
        case 'data_processing':
          return await this.executeDataProcessing(jobData, options);
        case 'cleanup':
          return await this.executeCleanup(jobData, options);
        case 'backup':
          return await this.executeBackup(jobData, options);
        case 'health_check':
          return await this.executeHealthCheck(jobData, options);
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }
    } catch (error) {
      logger.error('Error executing job:', error);
      throw error;
    }
  }

  async executeReportGeneration(jobData, options) {
    try {
      // This would integrate with the ReportGenerator service
      logger.info('Executing scheduled report generation', { jobData, options });
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return {
        success: true,
        reportId: nanoid(),
        reportUrl: `/reports/${nanoid()}.pdf`,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing scheduled report generation:', error);
      throw error;
    }
  }

  async executeExportCreation(jobData, options) {
    try {
      // This would integrate with the ExportEngine service
      logger.info('Executing scheduled export creation', { jobData, options });
      
      // Simulate export creation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return {
        success: true,
        exportId: nanoid(),
        exportUrl: `/exports/${nanoid()}.xlsx`,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing scheduled export creation:', error);
      throw error;
    }
  }

  async executeEmailSending(jobData, options) {
    try {
      // This would integrate with the EmailService
      logger.info('Executing scheduled email sending', { jobData, options });
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        messageId: nanoid(),
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing scheduled email sending:', error);
      throw error;
    }
  }

  async executeNotificationSending(jobData, options) {
    try {
      // This would integrate with the NotificationService
      logger.info('Executing scheduled notification sending', { jobData, options });
      
      // Simulate notification sending
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        notificationId: nanoid(),
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing scheduled notification sending:', error);
      throw error;
    }
  }

  async executeDataProcessing(jobData, options) {
    try {
      // This would integrate with various data processing services
      logger.info('Executing scheduled data processing', { jobData, options });
      
      // Simulate data processing
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      return {
        success: true,
        processedRecords: jobData.recordCount || 1000,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing scheduled data processing:', error);
      throw error;
    }
  }

  async executeCleanup(jobData, options) {
    try {
      // This would integrate with various cleanup services
      logger.info('Executing scheduled cleanup', { jobData, options });
      
      // Simulate cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        cleanedItems: jobData.itemCount || 100,
        cleanedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing scheduled cleanup:', error);
      throw error;
    }
  }

  async executeBackup(jobData, options) {
    try {
      // This would integrate with the BackupService
      logger.info('Executing scheduled backup', { jobData, options });
      
      // Simulate backup
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      return {
        success: true,
        backupId: nanoid(),
        backupUrl: `/backups/${nanoid()}.tar.gz`,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing scheduled backup:', error);
      throw error;
    }
  }

  async executeHealthCheck(jobData, options) {
    try {
      // This would integrate with the HealthMonitor service
      logger.info('Executing scheduled health check', { jobData, options });
      
      // Simulate health check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        healthStatus: 'healthy',
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error executing scheduled health check:', error);
      throw error;
    }
  }

  validateSchedule(schedule) {
    try {
      if (!schedule.name) {
        throw new Error('Schedule name is required');
      }
      
      if (!schedule.schedule) {
        throw new Error('Schedule expression is required');
      }
      
      if (!schedule.jobType) {
        throw new Error('Job type is required');
      }
      
      // Validate cron expression
      if (!cron.validate(schedule.schedule)) {
        throw new Error('Invalid cron expression');
      }
      
      // Validate job type
      const validJobTypes = [
        'report_generation',
        'export_creation',
        'email_sending',
        'notification_sending',
        'data_processing',
        'cleanup',
        'backup',
        'health_check'
      ];
      
      if (!validJobTypes.includes(schedule.jobType)) {
        throw new Error(`Invalid job type: ${schedule.jobType}`);
      }
    } catch (error) {
      logger.error('Error validating schedule:', error);
      throw error;
    }
  }

  async storeSchedule(schedule) {
    try {
      const query = `
        INSERT INTO schedules (
          id, name, description, type, schedule, job_type, job_data, 
          options, enabled, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await pool.query(query, [
        schedule.id,
        schedule.name,
        schedule.description,
        schedule.type,
        schedule.schedule,
        schedule.jobType,
        JSON.stringify(schedule.jobData),
        JSON.stringify(schedule.options),
        schedule.enabled,
        schedule.createdAt,
        schedule.updatedAt
      ]);
    } catch (error) {
      logger.error('Error storing schedule:', error);
      throw error;
    }
  }

  async updateScheduleInDatabase(schedule) {
    try {
      const query = `
        UPDATE schedules 
        SET name = $1, description = $2, type = $3, schedule = $4, 
            job_type = $5, job_data = $6, options = $7, enabled = $8, 
            updated_at = $9
        WHERE id = $10
      `;
      
      await pool.query(query, [
        schedule.name,
        schedule.description,
        schedule.type,
        schedule.schedule,
        schedule.jobType,
        JSON.stringify(schedule.jobData),
        JSON.stringify(schedule.options),
        schedule.enabled,
        schedule.updatedAt,
        schedule.id
      ]);
    } catch (error) {
      logger.error('Error updating schedule in database:', error);
      throw error;
    }
  }

  async deleteScheduleFromDatabase(scheduleId) {
    try {
      const query = 'DELETE FROM schedules WHERE id = $1';
      await pool.query(query, [scheduleId]);
    } catch (error) {
      logger.error('Error deleting schedule from database:', error);
      throw error;
    }
  }

  async storeExecution(executionId, scheduleId, status, startTime) {
    try {
      const query = `
        INSERT INTO schedule_executions (
          id, schedule_id, status, start_time, created_at
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      
      await pool.query(query, [
        executionId,
        scheduleId,
        status,
        new Date(startTime).toISOString(),
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing execution:', error);
      throw error;
    }
  }

  async updateExecution(executionId, status, result, duration) {
    try {
      const query = `
        UPDATE schedule_executions 
        SET status = $1, end_time = $2, duration = $3, result = $4, updated_at = $5
        WHERE id = $6
      `;
      
      await pool.query(query, [
        status,
        new Date().toISOString(),
        duration,
        JSON.stringify(result),
        new Date().toISOString(),
        executionId
      ]);
    } catch (error) {
      logger.error('Error updating execution:', error);
      throw error;
    }
  }

  async checkMissedSchedules() {
    try {
      // This would check for schedules that should have run but didn't
      // For now, we'll just log that we're checking
      logger.debug('Checking for missed schedules');
    } catch (error) {
      logger.error('Error checking missed schedules:', error);
    }
  }

  async getSchedules(filters = {}, pagination = {}) {
    try {
      let query = 'SELECT * FROM schedules WHERE 1=1';
      const params = [];
      let paramCount = 0;
      
      // Apply filters
      if (filters.type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        params.push(filters.type);
      }
      
      if (filters.jobType) {
        paramCount++;
        query += ` AND job_type = $${paramCount}`;
        params.push(filters.jobType);
      }
      
      if (filters.enabled !== undefined) {
        paramCount++;
        query += ` AND enabled = $${paramCount}`;
        params.push(filters.enabled);
      }
      
      // Apply sorting
      query += ' ORDER BY created_at DESC';
      
      // Apply pagination
      if (pagination.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(pagination.limit);
        
        if (pagination.offset) {
          paramCount++;
          query += ` OFFSET $${paramCount}`;
          params.push(pagination.offset);
        }
      }
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        schedule: row.schedule,
        jobType: row.job_type,
        jobData: row.job_data,
        options: row.options,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error getting schedules:', error);
      throw error;
    }
  }

  async getSchedule(scheduleId) {
    try {
      const query = 'SELECT * FROM schedules WHERE id = $1';
      const result = await pool.query(query, [scheduleId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        schedule: row.schedule,
        jobType: row.job_type,
        jobData: row.job_data,
        options: row.options,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error getting schedule:', error);
      throw error;
    }
  }

  async getExecutions(scheduleId, limit = 100) {
    try {
      const query = `
        SELECT * FROM schedule_executions 
        WHERE schedule_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await pool.query(query, [scheduleId, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        scheduleId: row.schedule_id,
        status: row.status,
        startTime: new Date(row.start_time).getTime(),
        endTime: row.end_time ? new Date(row.end_time).getTime() : null,
        duration: row.duration,
        result: row.result,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error getting executions:', error);
      throw error;
    }
  }

  async getSchedulerStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_schedules,
          COUNT(CASE WHEN enabled = true THEN 1 END) as active_schedules,
          COUNT(CASE WHEN enabled = false THEN 1 END) as inactive_schedules
        FROM schedules
      `;
      
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting scheduler stats:', error);
      throw error;
    }
  }

  async getExecutionStats(scheduleId = null) {
    try {
      let query = `
        SELECT 
          schedule_id,
          status,
          COUNT(*) as count,
          AVG(duration) as avg_duration
        FROM schedule_executions 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;
      
      const params = [];
      if (scheduleId) {
        query += ' AND schedule_id = $1';
        params.push(scheduleId);
      }
      
      query += ' GROUP BY schedule_id, status ORDER BY schedule_id, status';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting execution stats:', error);
      throw error;
    }
  }

  async pauseSchedule(scheduleId) {
    try {
      await this.updateSchedule(scheduleId, { enabled: false });
      logger.info(`Schedule paused: ${scheduleId}`);
    } catch (error) {
      logger.error('Error pausing schedule:', error);
      throw error;
    }
  }

  async resumeSchedule(scheduleId) {
    try {
      await this.updateSchedule(scheduleId, { enabled: true });
      logger.info(`Schedule resumed: ${scheduleId}`);
    } catch (error) {
      logger.error('Error resuming schedule:', error);
      throw error;
    }
  }

  async executeScheduleNow(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }
      
      await this.executeSchedule(schedule);
      logger.info(`Schedule executed manually: ${scheduleId}`);
    } catch (error) {
      logger.error('Error executing schedule manually:', error);
      throw error;
    }
  }
}

module.exports = SchedulerService;
