const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const cron = require('node-cron');

class ReportScheduler extends EventEmitter {
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
      
      // Load existing schedules
      await this.loadSchedules();
      
      this._initialized = true;
      logger.info('ReportScheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ReportScheduler:', error);
      throw error;
    }
  }

  async close() {
    try {
      // Stop all cron jobs
      for (const [scheduleId, job] of this.cronJobs) {
        job.stop();
      }
      
      await this.redis.quit();
      this._initialized = false;
      logger.info('ReportScheduler closed');
    } catch (error) {
      logger.error('Error closing ReportScheduler:', error);
    }
  }

  async loadSchedules() {
    try {
      const query = `
        SELECT * FROM report_schedules 
        WHERE status = 'active'
      `;
      
      const result = await pool.query(query);
      
      for (const schedule of result.rows) {
        await this.createCronJob(schedule);
        this.schedules.set(schedule.id, schedule);
      }
      
      logger.info(`Loaded ${result.rows.length} active schedules`);
    } catch (error) {
      logger.error('Error loading schedules:', error);
      throw error;
    }
  }

  async createSchedule(reportType, templateId, schedule, parameters, delivery, userId) {
    try {
      const scheduleId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Creating schedule: ${scheduleId}`, {
        scheduleId,
        reportType,
        templateId,
        userId
      });

      // Validate schedule
      this.validateSchedule(schedule);
      
      // Create schedule
      const scheduleData = {
        id: scheduleId,
        reportType,
        templateId,
        schedule,
        parameters,
        delivery,
        userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastRun: null,
        nextRun: this.calculateNextRun(schedule)
      };
      
      // Store schedule
      await this.storeSchedule(scheduleData);
      
      // Create cron job
      await this.createCronJob(scheduleData);
      
      // Add to schedules map
      this.schedules.set(scheduleId, scheduleData);
      
      this.emit('scheduleCreated', scheduleData);
      
      logger.info(`Schedule created: ${scheduleId}`, {
        scheduleId,
        processingTime: Date.now() - startTime
      });
      
      return scheduleData;
    } catch (error) {
      logger.error('Error creating schedule:', error);
      throw error;
    }
  }

  validateSchedule(schedule) {
    try {
      if (!schedule.frequency) {
        throw new Error('Schedule frequency is required');
      }
      
      const validFrequencies = ['daily', 'weekly', 'monthly', 'custom'];
      if (!validFrequencies.includes(schedule.frequency)) {
        throw new Error(`Invalid frequency: ${schedule.frequency}`);
      }
      
      if (schedule.frequency === 'custom' && !schedule.cronExpression) {
        throw new Error('Cron expression is required for custom frequency');
      }
      
      if (schedule.frequency === 'custom') {
        if (!cron.validate(schedule.cronExpression)) {
          throw new Error('Invalid cron expression');
        }
      }
      
      if (schedule.frequency === 'weekly' && !schedule.dayOfWeek) {
        throw new Error('Day of week is required for weekly frequency');
      }
      
      if (schedule.frequency === 'monthly' && !schedule.dayOfMonth) {
        throw new Error('Day of month is required for monthly frequency');
      }
      
    } catch (error) {
      logger.error('Error validating schedule:', error);
      throw error;
    }
  }

  calculateNextRun(schedule) {
    try {
      const now = new Date();
      
      switch (schedule.frequency) {
        case 'daily':
          const dailyTime = schedule.time || '09:00';
          const [hours, minutes] = dailyTime.split(':').map(Number);
          const nextDaily = new Date(now);
          nextDaily.setHours(hours, minutes, 0, 0);
          if (nextDaily <= now) {
            nextDaily.setDate(nextDaily.getDate() + 1);
          }
          return nextDaily.toISOString();
          
        case 'weekly':
          const weeklyTime = schedule.time || '09:00';
          const [weeklyHours, weeklyMinutes] = weeklyTime.split(':').map(Number);
          const dayOfWeek = schedule.dayOfWeek || 1; // Monday
          const nextWeekly = new Date(now);
          nextWeekly.setHours(weeklyHours, weeklyMinutes, 0, 0);
          
          const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
          nextWeekly.setDate(now.getDate() + daysUntilTarget);
          
          if (nextWeekly <= now) {
            nextWeekly.setDate(nextWeekly.getDate() + 7);
          }
          
          return nextWeekly.toISOString();
          
        case 'monthly':
          const monthlyTime = schedule.time || '09:00';
          const [monthlyHours, monthlyMinutes] = monthlyTime.split(':').map(Number);
          const dayOfMonth = schedule.dayOfMonth || 1;
          const nextMonthly = new Date(now);
          nextMonthly.setHours(monthlyHours, monthlyMinutes, 0, 0);
          nextMonthly.setDate(dayOfMonth);
          
          if (nextMonthly <= now) {
            nextMonthly.setMonth(nextMonthly.getMonth() + 1);
          }
          
          return nextMonthly.toISOString();
          
        case 'custom':
          // For custom cron expressions, we'll calculate the next run
          // This is a simplified implementation
          return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
          
        default:
          throw new Error(`Unknown frequency: ${schedule.frequency}`);
      }
    } catch (error) {
      logger.error('Error calculating next run:', error);
      throw error;
    }
  }

  async createCronJob(scheduleData) {
    try {
      let cronExpression;
      
      if (scheduleData.schedule.frequency === 'custom') {
        cronExpression = scheduleData.schedule.cronExpression;
      } else {
        cronExpression = this.buildCronExpression(scheduleData.schedule);
      }
      
      const job = cron.schedule(cronExpression, async () => {
        try {
          await this.executeSchedule(scheduleData.id);
        } catch (error) {
          logger.error(`Error executing schedule ${scheduleData.id}:`, error);
        }
      }, {
        scheduled: false
      });
      
      this.cronJobs.set(scheduleData.id, job);
      job.start();
      
      logger.info(`Cron job created for schedule ${scheduleData.id}`, {
        scheduleId: scheduleData.id,
        cronExpression
      });
      
    } catch (error) {
      logger.error('Error creating cron job:', error);
      throw error;
    }
  }

  buildCronExpression(schedule) {
    try {
      const time = schedule.time || '09:00';
      const [hours, minutes] = time.split(':').map(Number);
      
      switch (schedule.frequency) {
        case 'daily':
          return `${minutes} ${hours} * * *`;
          
        case 'weekly':
          const dayOfWeek = schedule.dayOfWeek || 1;
          return `${minutes} ${hours} * * ${dayOfWeek}`;
          
        case 'monthly':
          const dayOfMonth = schedule.dayOfMonth || 1;
          return `${minutes} ${hours} ${dayOfMonth} * *`;
          
        default:
          throw new Error(`Unknown frequency: ${schedule.frequency}`);
      }
    } catch (error) {
      logger.error('Error building cron expression:', error);
      throw error;
    }
  }

  async executeSchedule(scheduleId) {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        logger.warn(`Schedule not found: ${scheduleId}`);
        return;
      }
      
      logger.info(`Executing schedule: ${scheduleId}`, {
        scheduleId,
        reportType: schedule.reportType,
        userId: schedule.userId
      });
      
      // Update last run
      schedule.lastRun = new Date().toISOString();
      schedule.nextRun = this.calculateNextRun(schedule.schedule);
      
      // Update database
      await this.updateSchedule(schedule);
      
      // Generate report
      const report = await this.generateScheduledReport(schedule);
      
      // Deliver report
      await this.deliverReport(report, schedule.delivery);
      
      this.emit('scheduleExecuted', schedule);
      
      logger.info(`Schedule executed: ${scheduleId}`, {
        scheduleId,
        reportId: report.id
      });
      
    } catch (error) {
      logger.error(`Error executing schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  async generateScheduledReport(schedule) {
    try {
      // This would typically call the report generator
      // For now, we'll create a mock report
      const report = {
        id: nanoid(),
        reportType: schedule.reportType,
        templateId: schedule.templateId,
        parameters: schedule.parameters,
        userId: schedule.userId,
        status: 'completed',
        createdAt: new Date().toISOString()
      };
      
      return report;
    } catch (error) {
      logger.error('Error generating scheduled report:', error);
      throw error;
    }
  }

  async deliverReport(report, delivery) {
    try {
      // This would typically call the delivery engine
      // For now, we'll just log the delivery
      logger.info(`Delivering report: ${report.id}`, {
        reportId: report.id,
        deliveryMethod: delivery.method,
        recipients: delivery.recipients
      });
      
    } catch (error) {
      logger.error('Error delivering report:', error);
      throw error;
    }
  }

  async getSchedule(scheduleId, userId) {
    try {
      const query = `
        SELECT * FROM report_schedules 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await pool.query(query, [scheduleId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting schedule:', error);
      throw error;
    }
  }

  async updateSchedule(scheduleId, schedule, parameters, delivery, userId) {
    try {
      const startTime = Date.now();
      
      logger.info(`Updating schedule: ${scheduleId}`, {
        scheduleId,
        userId
      });

      // Get existing schedule
      const existingSchedule = await this.getSchedule(scheduleId, userId);
      
      // Stop existing cron job
      const existingJob = this.cronJobs.get(scheduleId);
      if (existingJob) {
        existingJob.stop();
        this.cronJobs.delete(scheduleId);
      }
      
      // Update schedule
      const updatedSchedule = {
        ...existingSchedule,
        schedule: schedule || existingSchedule.schedule,
        parameters: parameters || existingSchedule.parameters,
        delivery: delivery || existingSchedule.delivery,
        updatedAt: new Date().toISOString(),
        nextRun: this.calculateNextRun(schedule || existingSchedule.schedule)
      };
      
      // Store updated schedule
      await this.storeSchedule(updatedSchedule);
      
      // Create new cron job
      await this.createCronJob(updatedSchedule);
      
      // Update schedules map
      this.schedules.set(scheduleId, updatedSchedule);
      
      this.emit('scheduleUpdated', updatedSchedule);
      
      logger.info(`Schedule updated: ${scheduleId}`, {
        scheduleId,
        processingTime: Date.now() - startTime
      });
      
      return updatedSchedule;
    } catch (error) {
      logger.error('Error updating schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(scheduleId, userId) {
    try {
      logger.info(`Deleting schedule: ${scheduleId}`, {
        scheduleId,
        userId
      });

      // Stop cron job
      const job = this.cronJobs.get(scheduleId);
      if (job) {
        job.stop();
        this.cronJobs.delete(scheduleId);
      }
      
      // Mark as inactive
      const query = `
        UPDATE report_schedules 
        SET status = 'inactive', updated_at = $1 
        WHERE id = $2 AND user_id = $3
      `;
      
      await pool.query(query, [new Date().toISOString(), scheduleId, userId]);
      
      // Remove from schedules map
      this.schedules.delete(scheduleId);
      
      this.emit('scheduleDeleted', { id: scheduleId, userId });
      
      logger.info(`Schedule deleted: ${scheduleId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting schedule:', error);
      throw error;
    }
  }

  async getSchedules(userId, status, reportType) {
    try {
      let query = `
        SELECT * FROM report_schedules 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (reportType) {
        query += ` AND report_type = $${paramIndex}`;
        params.push(reportType);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting schedules:', error);
      throw error;
    }
  }

  async processSchedule(scheduleId) {
    try {
      await this.executeSchedule(scheduleId);
    } catch (error) {
      logger.error(`Error processing schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  async storeSchedule(schedule) {
    try {
      const query = `
        INSERT INTO report_schedules (
          id, report_type, template_id, schedule, parameters, delivery, 
          user_id, status, created_at, updated_at, last_run, next_run
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          schedule = EXCLUDED.schedule,
          parameters = EXCLUDED.parameters,
          delivery = EXCLUDED.delivery,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          last_run = EXCLUDED.last_run,
          next_run = EXCLUDED.next_run
      `;
      
      await pool.query(query, [
        schedule.id,
        schedule.reportType,
        schedule.templateId,
        JSON.stringify(schedule.schedule),
        JSON.stringify(schedule.parameters),
        JSON.stringify(schedule.delivery),
        schedule.userId,
        schedule.status,
        schedule.createdAt,
        schedule.updatedAt,
        schedule.lastRun,
        schedule.nextRun
      ]);
      
      logger.info(`Schedule stored: ${schedule.id}`);
    } catch (error) {
      logger.error('Error storing schedule:', error);
      throw error;
    }
  }

  async updateSchedule(schedule) {
    try {
      const query = `
        UPDATE report_schedules 
        SET last_run = $1, next_run = $2, updated_at = $3 
        WHERE id = $4
      `;
      
      await pool.query(query, [
        schedule.lastRun,
        schedule.nextRun,
        schedule.updatedAt,
        schedule.id
      ]);
      
      logger.info(`Schedule updated: ${schedule.id}`);
    } catch (error) {
      logger.error('Error updating schedule:', error);
      throw error;
    }
  }

  async getScheduleStats() {
    try {
      const stats = {
        totalSchedules: this.schedules.size,
        activeSchedules: Array.from(this.schedules.values()).filter(s => s.status === 'active').length,
        totalCronJobs: this.cronJobs.size,
        schedulesByType: {},
        schedulesByFrequency: {}
      };
      
      for (const schedule of this.schedules.values()) {
        // By type
        stats.schedulesByType[schedule.reportType] = (stats.schedulesByType[schedule.reportType] || 0) + 1;
        
        // By frequency
        stats.schedulesByFrequency[schedule.schedule.frequency] = (stats.schedulesByFrequency[schedule.schedule.frequency] || 0) + 1;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting schedule stats:', error);
      throw error;
    }
  }
}

module.exports = ReportScheduler;
