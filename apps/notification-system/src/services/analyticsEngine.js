const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class AnalyticsEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.metrics = new Map();
    this.reports = new Map();
    this.analyticsCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load metrics
      await this.loadMetrics();
      
      // Load reports
      await this.loadReports();
      
      this._initialized = true;
      logger.info('AnalyticsEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AnalyticsEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('AnalyticsEngine closed');
    } catch (error) {
      logger.error('Error closing AnalyticsEngine:', error);
    }
  }

  async loadMetrics() {
    try {
      const result = await pool.query(`
        SELECT * FROM analytics_metrics
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      
      for (const metric of result.rows) {
        this.metrics.set(metric.id, {
          ...metric,
          data: metric.data ? JSON.parse(metric.data) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} analytics metrics`);
    } catch (error) {
      logger.error('Error loading metrics:', error);
      throw error;
    }
  }

  async loadReports() {
    try {
      const result = await pool.query(`
        SELECT * FROM analytics_reports
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 100
      `);
      
      for (const report of result.rows) {
        this.reports.set(report.id, {
          ...report,
          configuration: report.configuration ? JSON.parse(report.configuration) : {},
          metadata: report.metadata ? JSON.parse(report.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} analytics reports`);
    } catch (error) {
      logger.error('Error loading reports:', error);
      throw error;
    }
  }

  async getMetrics(timeRange, metricType, channel, userId) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      const cacheKey = `metrics:${timeRange}:${metricType}:${channel}:${userId}`;
      
      // Check cache first
      if (this.analyticsCache.has(cacheKey)) {
        const cached = this.analyticsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
          return cached.data;
        }
      }
      
      let query = `
        SELECT 
          metric_type,
          channel,
          COUNT(*) as total_events,
          AVG(data->>'value')::numeric as avg_value,
          MIN(data->>'value')::numeric as min_value,
          MAX(data->>'value')::numeric as max_value,
          STDDEV(data->>'value')::numeric as stddev_value
        FROM analytics_metrics
        WHERE created_at >= $1
      `;
      const params = [timeCondition];
      let paramCount = 2;
      
      if (metricType) {
        query += ` AND metric_type = $${paramCount}`;
        params.push(metricType);
        paramCount++;
      }
      
      if (channel) {
        query += ` AND channel = $${paramCount}`;
        params.push(channel);
        paramCount++;
      }
      
      query += ` GROUP BY metric_type, channel ORDER BY created_at DESC`;
      
      const result = await pool.query(query, params);
      
      const metrics = result.rows.map(row => ({
        ...row,
        avg_value: parseFloat(row.avg_value) || 0,
        min_value: parseFloat(row.min_value) || 0,
        max_value: parseFloat(row.max_value) || 0,
        stddev_value: parseFloat(row.stddev_value) || 0
      }));
      
      // Cache result
      this.analyticsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });
      
      return metrics;
    } catch (error) {
      logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  async generateReport(reportType, timeRange, format, userId) {
    try {
      const reportId = nanoid();
      const now = new Date();
      
      // Generate report based on type
      let reportData;
      switch (reportType) {
        case 'delivery_summary':
          reportData = await this.generateDeliverySummaryReport(timeRange, userId);
          break;
        case 'channel_performance':
          reportData = await this.generateChannelPerformanceReport(timeRange, userId);
          break;
        case 'user_engagement':
          reportData = await this.generateUserEngagementReport(timeRange, userId);
          break;
        case 'template_effectiveness':
          reportData = await this.generateTemplateEffectivenessReport(timeRange, userId);
          break;
        case 'delivery_trends':
          reportData = await this.generateDeliveryTrendsReport(timeRange, userId);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
      
      // Create report
      const report = {
        id: reportId,
        type: reportType,
        time_range: timeRange,
        format: format,
        data: reportData,
        status: 'completed',
        created_by: userId,
        created_at: now
      };
      
      // Store report
      await this.storeReport(report);
      
      // Cache report
      this.reports.set(reportId, report);
      
      // Emit event
      this.emit('reportGenerated', report);
      
      logger.info(`Report generated: ${reportId}`, {
        type: reportType,
        timeRange,
        format
      });
      
      return report;
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  async generateDeliverySummaryReport(timeRange, userId) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_notifications,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_notifications,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_notifications,
          AVG(CASE WHEN status = 'delivered' THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) END) as avg_delivery_time,
          COUNT(DISTINCT created_by) as unique_senders,
          COUNT(DISTINCT recipients) as unique_recipients
        FROM notifications
        WHERE created_at >= $1
        AND (created_by = $2 OR $2 IS NULL)
      `, [timeCondition, userId]);
      
      const summary = result.rows[0];
      
      return {
        total_notifications: parseInt(summary.total_notifications),
        delivered_notifications: parseInt(summary.delivered_notifications),
        failed_notifications: parseInt(summary.failed_notifications),
        pending_notifications: parseInt(summary.pending_notifications),
        delivery_rate: summary.total_notifications > 0 ? 
          (summary.delivered_notifications / summary.total_notifications) * 100 : 0,
        avg_delivery_time: parseFloat(summary.avg_delivery_time) || 0,
        unique_senders: parseInt(summary.unique_senders),
        unique_recipients: parseInt(summary.unique_recipients)
      };
    } catch (error) {
      logger.error('Error generating delivery summary report:', error);
      throw error;
    }
  }

  async generateChannelPerformanceReport(timeRange, userId) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await pool.query(`
        SELECT 
          nd.channel,
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
          AVG(CASE WHEN nd.status = 'delivered' THEN EXTRACT(EPOCH FROM (nd.delivered_at - nd.created_at)) END) as avg_delivery_time,
          AVG(CASE WHEN nd.status = 'delivered' THEN EXTRACT(EPOCH FROM (nd.delivered_at - nd.created_at)) END) as avg_response_time
        FROM notification_deliveries nd
        JOIN notifications n ON nd.notification_id = n.id
        WHERE nd.created_at >= $1
        AND (n.created_by = $2 OR $2 IS NULL)
        GROUP BY nd.channel
        ORDER BY total_deliveries DESC
      `, [timeCondition, userId]);
      
      return result.rows.map(row => ({
        channel: row.channel,
        total_deliveries: parseInt(row.total_deliveries),
        successful_deliveries: parseInt(row.successful_deliveries),
        success_rate: row.total_deliveries > 0 ? 
          (row.successful_deliveries / row.total_deliveries) * 100 : 0,
        avg_delivery_time: parseFloat(row.avg_delivery_time) || 0,
        avg_response_time: parseFloat(row.avg_response_time) || 0
      }));
    } catch (error) {
      logger.error('Error generating channel performance report:', error);
      throw error;
    }
  }

  async generateUserEngagementReport(timeRange, userId) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await pool.query(`
        SELECT 
          DATE(nd.created_at) as date,
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
          COUNT(DISTINCT nd.recipient) as unique_recipients,
          AVG(CASE WHEN nd.status = 'delivered' THEN EXTRACT(EPOCH FROM (nd.delivered_at - nd.created_at)) END) as avg_delivery_time
        FROM notification_deliveries nd
        JOIN notifications n ON nd.notification_id = n.id
        WHERE nd.created_at >= $1
        AND (n.created_by = $2 OR $2 IS NULL)
        GROUP BY DATE(nd.created_at)
        ORDER BY date ASC
      `, [timeCondition, userId]);
      
      return result.rows.map(row => ({
        date: row.date,
        total_deliveries: parseInt(row.total_deliveries),
        successful_deliveries: parseInt(row.successful_deliveries),
        success_rate: row.total_deliveries > 0 ? 
          (row.successful_deliveries / row.total_deliveries) * 100 : 0,
        unique_recipients: parseInt(row.unique_recipients),
        avg_delivery_time: parseFloat(row.avg_delivery_time) || 0
      }));
    } catch (error) {
      logger.error('Error generating user engagement report:', error);
      throw error;
    }
  }

  async generateTemplateEffectivenessReport(timeRange, userId) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await pool.query(`
        SELECT 
          nt.name as template_name,
          nt.id as template_id,
          COUNT(*) as total_usage,
          COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
          AVG(CASE WHEN nd.status = 'delivered' THEN EXTRACT(EPOCH FROM (nd.delivered_at - nd.created_at)) END) as avg_delivery_time
        FROM notification_templates nt
        JOIN notifications n ON n.template_id = nt.id
        JOIN notification_deliveries nd ON nd.notification_id = n.id
        WHERE nd.created_at >= $1
        AND (n.created_by = $2 OR $2 IS NULL)
        GROUP BY nt.id, nt.name
        ORDER BY total_usage DESC
      `, [timeCondition, userId]);
      
      return result.rows.map(row => ({
        template_name: row.template_name,
        template_id: row.template_id,
        total_usage: parseInt(row.total_usage),
        successful_deliveries: parseInt(row.successful_deliveries),
        success_rate: row.total_usage > 0 ? 
          (row.successful_deliveries / row.total_usage) * 100 : 0,
        avg_delivery_time: parseFloat(row.avg_delivery_time) || 0
      }));
    } catch (error) {
      logger.error('Error generating template effectiveness report:', error);
      throw error;
    }
  }

  async generateDeliveryTrendsReport(timeRange, userId) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('hour', nd.created_at) as hour,
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
          AVG(CASE WHEN nd.status = 'delivered' THEN EXTRACT(EPOCH FROM (nd.delivered_at - nd.created_at)) END) as avg_delivery_time
        FROM notification_deliveries nd
        JOIN notifications n ON nd.notification_id = n.id
        WHERE nd.created_at >= $1
        AND (n.created_by = $2 OR $2 IS NULL)
        GROUP BY DATE_TRUNC('hour', nd.created_at)
        ORDER BY hour ASC
      `, [timeCondition, userId]);
      
      return result.rows.map(row => ({
        hour: row.hour,
        total_deliveries: parseInt(row.total_deliveries),
        successful_deliveries: parseInt(row.successful_deliveries),
        success_rate: row.total_deliveries > 0 ? 
          (row.successful_deliveries / row.total_deliveries) * 100 : 0,
        avg_delivery_time: parseFloat(row.avg_delivery_time) || 0
      }));
    } catch (error) {
      logger.error('Error generating delivery trends report:', error);
      throw error;
    }
  }

  async storeReport(report) {
    try {
      await pool.query(`
        INSERT INTO analytics_reports (
          id, type, time_range, format, data, status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        report.id,
        report.type,
        report.time_range,
        report.format,
        JSON.stringify(report.data),
        report.status,
        report.created_by,
        report.created_at
      ]);
    } catch (error) {
      logger.error('Error storing report:', error);
      throw error;
    }
  }

  async updateAllMetrics() {
    try {
      // Update delivery metrics
      await this.updateDeliveryMetrics();
      
      // Update channel metrics
      await this.updateChannelMetrics();
      
      // Update user engagement metrics
      await this.updateUserEngagementMetrics();
      
      // Update template metrics
      await this.updateTemplateMetrics();
      
      logger.info('All analytics metrics updated');
    } catch (error) {
      logger.error('Error updating all metrics:', error);
    }
  }

  async updateDeliveryMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_notifications,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_notifications,
          AVG(CASE WHEN status = 'delivered' THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) END) as avg_delivery_time
        FROM notifications
        WHERE created_at >= $1
      `, [oneHourAgo]);
      
      const metrics = result.rows[0];
      
      // Store metrics
      await this.storeMetric('delivery_summary', {
        total_notifications: parseInt(metrics.total_notifications),
        delivered_notifications: parseInt(metrics.delivered_notifications),
        failed_notifications: parseInt(metrics.failed_notifications),
        delivery_rate: metrics.total_notifications > 0 ? 
          (metrics.delivered_notifications / metrics.total_notifications) * 100 : 0,
        avg_delivery_time: parseFloat(metrics.avg_delivery_time) || 0
      });
      
    } catch (error) {
      logger.error('Error updating delivery metrics:', error);
    }
  }

  async updateChannelMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const result = await pool.query(`
        SELECT 
          nd.channel,
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
          AVG(CASE WHEN nd.status = 'delivered' THEN EXTRACT(EPOCH FROM (nd.delivered_at - nd.created_at)) END) as avg_delivery_time
        FROM notification_deliveries nd
        WHERE nd.created_at >= $1
        GROUP BY nd.channel
      `, [oneHourAgo]);
      
      for (const row of result.rows) {
        await this.storeMetric('channel_performance', {
          channel: row.channel,
          total_deliveries: parseInt(row.total_deliveries),
          successful_deliveries: parseInt(row.successful_deliveries),
          success_rate: row.total_deliveries > 0 ? 
            (row.successful_deliveries / row.total_deliveries) * 100 : 0,
          avg_delivery_time: parseFloat(row.avg_delivery_time) || 0
        }, row.channel);
      }
      
    } catch (error) {
      logger.error('Error updating channel metrics:', error);
    }
  }

  async updateUserEngagementMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const result = await pool.query(`
        SELECT 
          COUNT(DISTINCT nd.recipient) as unique_recipients,
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries
        FROM notification_deliveries nd
        WHERE nd.created_at >= $1
      `, [oneHourAgo]);
      
      const metrics = result.rows[0];
      
      await this.storeMetric('user_engagement', {
        unique_recipients: parseInt(metrics.unique_recipients),
        total_deliveries: parseInt(metrics.total_deliveries),
        successful_deliveries: parseInt(metrics.successful_deliveries),
        engagement_rate: metrics.total_deliveries > 0 ? 
          (metrics.successful_deliveries / metrics.total_deliveries) * 100 : 0
      });
      
    } catch (error) {
      logger.error('Error updating user engagement metrics:', error);
    }
  }

  async updateTemplateMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const result = await pool.query(`
        SELECT 
          nt.id as template_id,
          nt.name as template_name,
          COUNT(*) as total_usage,
          COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries
        FROM notification_templates nt
        JOIN notifications n ON n.template_id = nt.id
        JOIN notification_deliveries nd ON nd.notification_id = n.id
        WHERE nd.created_at >= $1
        GROUP BY nt.id, nt.name
      `, [oneHourAgo]);
      
      for (const row of result.rows) {
        await this.storeMetric('template_effectiveness', {
          template_id: row.template_id,
          template_name: row.template_name,
          total_usage: parseInt(row.total_usage),
          successful_deliveries: parseInt(row.successful_deliveries),
          effectiveness_rate: row.total_usage > 0 ? 
            (row.successful_deliveries / row.total_usage) * 100 : 0
        }, row.template_id);
      }
      
    } catch (error) {
      logger.error('Error updating template metrics:', error);
    }
  }

  async storeMetric(metricType, data, channel = null) {
    try {
      const metricId = nanoid();
      const now = new Date();
      
      await pool.query(`
        INSERT INTO analytics_metrics (
          id, metric_type, channel, data, created_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        metricId,
        metricType,
        channel,
        JSON.stringify(data),
        now
      ]);
      
      // Cache metric
      this.metrics.set(metricId, {
        id: metricId,
        metric_type: metricType,
        channel: channel,
        data: data,
        created_at: now
      });
      
    } catch (error) {
      logger.error('Error storing metric:', error);
    }
  }

  getTimeCondition(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  async getAnalyticsDashboard(userId) {
    try {
      const dashboard = {
        overview: await this.generateDeliverySummaryReport('24h', userId),
        channel_performance: await this.generateChannelPerformanceReport('24h', userId),
        recent_trends: await this.generateDeliveryTrendsReport('24h', userId),
        top_templates: await this.generateTemplateEffectivenessReport('24h', userId),
        user_engagement: await this.generateUserEngagementReport('24h', userId)
      };
      
      return dashboard;
    } catch (error) {
      logger.error('Error getting analytics dashboard:', error);
      throw error;
    }
  }

  async getAnalyticsStats() {
    try {
      const stats = {
        total_metrics: this.metrics.size,
        total_reports: this.reports.size,
        cache_size: this.analyticsCache.size
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting analytics stats:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsEngine;
