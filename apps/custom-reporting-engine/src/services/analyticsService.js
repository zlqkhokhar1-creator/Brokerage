const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class AnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.analyticsEngines = new Map();
    this.analyticsCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load analytics engines
      await this.loadAnalyticsEngines();
      
      // Start analytics processing
      this.startAnalyticsProcessing();
      
      this._initialized = true;
      logger.info('AnalyticsService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AnalyticsService:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('AnalyticsService closed');
    } catch (error) {
      logger.error('Error closing AnalyticsService:', error);
    }
  }

  async loadAnalyticsEngines() {
    try {
      this.analyticsEngines = new Map([
        ['user_behavior', {
          name: 'User Behavior Analytics',
          description: 'Analyze user behavior patterns and interactions',
          enabled: true,
          interval: 300000, // 5 minutes
          process: this.processUserBehaviorAnalytics.bind(this)
        }],
        ['performance_analytics', {
          name: 'Performance Analytics',
          description: 'Analyze system performance metrics and trends',
          enabled: true,
          interval: 60000, // 1 minute
          process: this.processPerformanceAnalytics.bind(this)
        }],
        ['business_analytics', {
          name: 'Business Analytics',
          description: 'Analyze business metrics and KPIs',
          enabled: true,
          interval: 900000, // 15 minutes
          process: this.processBusinessAnalytics.bind(this)
        }],
        ['security_analytics', {
          name: 'Security Analytics',
          description: 'Analyze security events and threats',
          enabled: true,
          interval: 300000, // 5 minutes
          process: this.processSecurityAnalytics.bind(this)
        }],
        ['usage_analytics', {
          name: 'Usage Analytics',
          description: 'Analyze feature usage and adoption',
          enabled: true,
          interval: 1800000, // 30 minutes
          process: this.processUsageAnalytics.bind(this)
        }]
      ]);
      
      logger.info('Analytics engines loaded successfully');
    } catch (error) {
      logger.error('Error loading analytics engines:', error);
      throw error;
    }
  }

  startAnalyticsProcessing() {
    // Start each analytics engine
    for (const [engineId, engine] of this.analyticsEngines.entries()) {
      if (engine.enabled) {
        setInterval(async () => {
          try {
            await this.runAnalyticsEngine(engineId);
          } catch (error) {
            logger.error(`Error running analytics engine ${engineId}:`, error);
          }
        }, engine.interval);
      }
    }
  }

  async runAnalyticsEngine(engineId) {
    try {
      const engine = this.analyticsEngines.get(engineId);
      if (!engine || !engine.enabled) {
        return;
      }
      
      const startTime = Date.now();
      
      // Run the analytics engine
      const result = await engine.process();
      
      const duration = Date.now() - startTime;
      
      // Store analytics result
      await this.storeAnalyticsResult(engineId, result, duration);
      
      this.emit('analyticsCompleted', { engineId, result, duration });
      
      logger.debug(`Analytics engine completed: ${engineId}`, { duration });
    } catch (error) {
      logger.error(`Error running analytics engine ${engineId}:`, error);
      throw error;
    }
  }

  async processUserBehaviorAnalytics() {
    try {
      // Analyze user sessions
      const sessionAnalytics = await this.analyzeUserSessions();
      
      // Analyze user interactions
      const interactionAnalytics = await this.analyzeUserInteractions();
      
      // Analyze user paths
      const pathAnalytics = await this.analyzeUserPaths();
      
      // Analyze user engagement
      const engagementAnalytics = await this.analyzeUserEngagement();
      
      return {
        sessions: sessionAnalytics,
        interactions: interactionAnalytics,
        paths: pathAnalytics,
        engagement: engagementAnalytics,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error processing user behavior analytics:', error);
      throw error;
    }
  }

  async processPerformanceAnalytics() {
    try {
      // Analyze API performance
      const apiPerformance = await this.analyzeAPIPerformance();
      
      // Analyze database performance
      const dbPerformance = await this.analyzeDatabasePerformance();
      
      // Analyze system performance
      const systemPerformance = await this.analyzeSystemPerformance();
      
      // Analyze error rates
      const errorRates = await this.analyzeErrorRates();
      
      return {
        api: apiPerformance,
        database: dbPerformance,
        system: systemPerformance,
        errors: errorRates,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error processing performance analytics:', error);
      throw error;
    }
  }

  async processBusinessAnalytics() {
    try {
      // Analyze user growth
      const userGrowth = await this.analyzeUserGrowth();
      
      // Analyze revenue metrics
      const revenueMetrics = await this.analyzeRevenueMetrics();
      
      // Analyze feature adoption
      const featureAdoption = await this.analyzeFeatureAdoption();
      
      // Analyze customer satisfaction
      const satisfaction = await this.analyzeCustomerSatisfaction();
      
      return {
        userGrowth: userGrowth,
        revenue: revenueMetrics,
        features: featureAdoption,
        satisfaction: satisfaction,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error processing business analytics:', error);
      throw error;
    }
  }

  async processSecurityAnalytics() {
    try {
      // Analyze security events
      const securityEvents = await this.analyzeSecurityEvents();
      
      // Analyze threat patterns
      const threatPatterns = await this.analyzeThreatPatterns();
      
      // Analyze access patterns
      const accessPatterns = await this.analyzeAccessPatterns();
      
      // Analyze compliance metrics
      const compliance = await this.analyzeComplianceMetrics();
      
      return {
        events: securityEvents,
        threats: threatPatterns,
        access: accessPatterns,
        compliance: compliance,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error processing security analytics:', error);
      throw error;
    }
  }

  async processUsageAnalytics() {
    try {
      // Analyze feature usage
      const featureUsage = await this.analyzeFeatureUsage();
      
      // Analyze report usage
      const reportUsage = await this.analyzeReportUsage();
      
      // Analyze dashboard usage
      const dashboardUsage = await this.analyzeDashboardUsage();
      
      // Analyze export usage
      const exportUsage = await this.analyzeExportUsage();
      
      return {
        features: featureUsage,
        reports: reportUsage,
        dashboards: dashboardUsage,
        exports: exportUsage,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error processing usage analytics:', error);
      throw error;
    }
  }

  async analyzeUserSessions() {
    try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_sessions,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(EXTRACT(EPOCH FROM (last_activity - created_at))) as avg_duration,
          COUNT(CASE WHEN last_activity >= NOW() - INTERVAL '15 minutes' THEN 1 END) as active_sessions
        FROM user_sessions 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        daily: result.rows,
        summary: {
          totalSessions: result.rows.reduce((sum, row) => sum + parseInt(row.total_sessions), 0),
          uniqueUsers: result.rows.reduce((sum, row) => sum + parseInt(row.unique_users), 0),
          avgDuration: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_duration || 0), 0) / result.rows.length,
          activeSessions: result.rows[0]?.active_sessions || 0
        }
      };
    } catch (error) {
      logger.error('Error analyzing user sessions:', error);
      throw error;
    }
  }

  async analyzeUserInteractions() {
    try {
      const query = `
        SELECT 
          action,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(duration) as avg_duration
        FROM user_interactions 
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY action
        ORDER BY count DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        actions: result.rows,
        totalInteractions: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        uniqueUsers: result.rows.reduce((sum, row) => sum + parseInt(row.unique_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing user interactions:', error);
      throw error;
    }
  }

  async analyzeUserPaths() {
    try {
      const query = `
        SELECT 
          path,
          COUNT(*) as visits,
          COUNT(DISTINCT user_id) as unique_visitors,
          AVG(duration) as avg_duration
        FROM user_paths 
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY path
        ORDER BY visits DESC
        LIMIT 20
      `;
      
      const result = await pool.query(query);
      
      return {
        topPaths: result.rows,
        totalVisits: result.rows.reduce((sum, row) => sum + parseInt(row.visits), 0)
      };
    } catch (error) {
      logger.error('Error analyzing user paths:', error);
      throw error;
    }
  }

  async analyzeUserEngagement() {
    try {
      const query = `
        SELECT 
          user_id,
          COUNT(*) as interactions,
          COUNT(DISTINCT DATE(timestamp)) as active_days,
          MAX(timestamp) as last_activity,
          AVG(duration) as avg_session_duration
        FROM user_interactions 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY user_id
        HAVING COUNT(*) > 10
        ORDER BY interactions DESC
        LIMIT 100
      `;
      
      const result = await pool.query(query);
      
      return {
        engagedUsers: result.rows,
        totalEngagedUsers: result.rows.length,
        avgInteractions: result.rows.reduce((sum, row) => sum + parseInt(row.interactions), 0) / result.rows.length
      };
    } catch (error) {
      logger.error('Error analyzing user engagement:', error);
      throw error;
    }
  }

  async analyzeAPIPerformance() {
    try {
      const query = `
        SELECT 
          endpoint,
          method,
          COUNT(*) as requests,
          AVG(response_time) as avg_response_time,
          MAX(response_time) as max_response_time,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
          COUNT(CASE WHEN response_time > 1000 THEN 1 END) as slow_requests
        FROM request_logs 
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY endpoint, method
        ORDER BY requests DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        endpoints: result.rows,
        totalRequests: result.rows.reduce((sum, row) => sum + parseInt(row.requests), 0),
        avgResponseTime: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_response_time || 0), 0) / result.rows.length,
        errorRate: result.rows.reduce((sum, row) => sum + parseInt(row.errors), 0) / result.rows.reduce((sum, row) => sum + parseInt(row.requests), 0) * 100
      };
    } catch (error) {
      logger.error('Error analyzing API performance:', error);
      throw error;
    }
  }

  async analyzeDatabasePerformance() {
    try {
      const query = `
        SELECT 
          query_type,
          COUNT(*) as queries,
          AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as avg_duration,
          MAX(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as max_duration,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
        FROM query_logs 
        WHERE started_at >= NOW() - INTERVAL '1 hour'
        GROUP BY query_type
        ORDER BY queries DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        queryTypes: result.rows,
        totalQueries: result.rows.reduce((sum, row) => sum + parseInt(row.queries), 0),
        avgDuration: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_duration || 0), 0) / result.rows.length,
        errorRate: result.rows.reduce((sum, row) => sum + parseInt(row.errors), 0) / result.rows.reduce((sum, row) => sum + parseInt(row.queries), 0) * 100
      };
    } catch (error) {
      logger.error('Error analyzing database performance:', error);
      throw error;
    }
  }

  async analyzeSystemPerformance() {
    try {
      const query = `
        SELECT 
          metric_name,
          AVG(value) as avg_value,
          MAX(value) as max_value,
          MIN(value) as min_value
        FROM system_metrics 
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY metric_name
        ORDER BY metric_name
      `;
      
      const result = await pool.query(query);
      
      return {
        metrics: result.rows,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error analyzing system performance:', error);
      throw error;
    }
  }

  async analyzeErrorRates() {
    try {
      const query = `
        SELECT 
          error_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as affected_users
        FROM error_logs 
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY error_type
        ORDER BY count DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        errorTypes: result.rows,
        totalErrors: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        affectedUsers: result.rows.reduce((sum, row) => sum + parseInt(row.affected_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing error rates:', error);
      throw error;
    }
  }

  async analyzeUserGrowth() {
    try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        daily: result.rows,
        totalNewUsers: result.rows.reduce((sum, row) => sum + parseInt(row.new_users), 0),
        totalActiveUsers: result.rows.reduce((sum, row) => sum + parseInt(row.active_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing user growth:', error);
      throw error;
    }
  }

  async analyzeRevenueMetrics() {
    try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as revenue,
          COUNT(*) as transactions,
          AVG(amount) as avg_transaction_value
        FROM transactions 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        daily: result.rows,
        totalRevenue: result.rows.reduce((sum, row) => sum + parseFloat(row.revenue || 0), 0),
        totalTransactions: result.rows.reduce((sum, row) => sum + parseInt(row.transactions), 0),
        avgTransactionValue: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_transaction_value || 0), 0) / result.rows.length
      };
    } catch (error) {
      logger.error('Error analyzing revenue metrics:', error);
      throw error;
    }
  }

  async analyzeFeatureAdoption() {
    try {
      const query = `
        SELECT 
          feature_name,
          COUNT(DISTINCT user_id) as users,
          COUNT(*) as usage_count,
          AVG(usage_duration) as avg_duration
        FROM feature_usage 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY feature_name
        ORDER BY users DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        features: result.rows,
        totalUsers: result.rows.reduce((sum, row) => sum + parseInt(row.users), 0),
        totalUsage: result.rows.reduce((sum, row) => sum + parseInt(row.usage_count), 0)
      };
    } catch (error) {
      logger.error('Error analyzing feature adoption:', error);
      throw error;
    }
  }

  async analyzeCustomerSatisfaction() {
    try {
      const query = `
        SELECT 
          rating,
          COUNT(*) as count,
          AVG(rating) as avg_rating
        FROM feedback 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY rating
        ORDER BY rating DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        ratings: result.rows,
        totalFeedback: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        avgRating: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_rating || 0), 0) / result.rows.length
      };
    } catch (error) {
      logger.error('Error analyzing customer satisfaction:', error);
      throw error;
    }
  }

  async analyzeSecurityEvents() {
    try {
      const query = `
        SELECT 
          event_type,
          severity,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as affected_users
        FROM security_events 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY event_type, severity
        ORDER BY count DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        events: result.rows,
        totalEvents: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        affectedUsers: result.rows.reduce((sum, row) => sum + parseInt(row.affected_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing security events:', error);
      throw error;
    }
  }

  async analyzeThreatPatterns() {
    try {
      const query = `
        SELECT 
          threat_type,
          COUNT(*) as count,
          AVG(risk_score) as avg_risk_score
        FROM threat_detections 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY threat_type
        ORDER BY count DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        threats: result.rows,
        totalThreats: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        avgRiskScore: result.rows.reduce((sum, row) => sum + parseFloat(row.avg_risk_score || 0), 0) / result.rows.length
      };
    } catch (error) {
      logger.error('Error analyzing threat patterns:', error);
      throw error;
    }
  }

  async analyzeAccessPatterns() {
    try {
      const query = `
        SELECT 
          resource,
          COUNT(*) as access_count,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(response_time) as avg_response_time
        FROM access_logs 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY resource
        ORDER BY access_count DESC
        LIMIT 20
      `;
      
      const result = await pool.query(query);
      
      return {
        resources: result.rows,
        totalAccess: result.rows.reduce((sum, row) => sum + parseInt(row.access_count), 0),
        uniqueUsers: result.rows.reduce((sum, row) => sum + parseInt(row.unique_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing access patterns:', error);
      throw error;
    }
  }

  async analyzeComplianceMetrics() {
    try {
      const query = `
        SELECT 
          compliance_rule,
          COUNT(*) as violations,
          COUNT(DISTINCT user_id) as affected_users
        FROM compliance_violations 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY compliance_rule
        ORDER BY violations DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        violations: result.rows,
        totalViolations: result.rows.reduce((sum, row) => sum + parseInt(row.violations), 0),
        affectedUsers: result.rows.reduce((sum, row) => sum + parseInt(row.affected_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing compliance metrics:', error);
      throw error;
    }
  }

  async analyzeFeatureUsage() {
    try {
      const query = `
        SELECT 
          feature,
          COUNT(*) as usage_count,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(duration) as avg_duration
        FROM feature_usage 
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY feature
        ORDER BY usage_count DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        features: result.rows,
        totalUsage: result.rows.reduce((sum, row) => sum + parseInt(row.usage_count), 0),
        uniqueUsers: result.rows.reduce((sum, row) => sum + parseInt(row.unique_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing feature usage:', error);
      throw error;
    }
  }

  async analyzeReportUsage() {
    try {
      const query = `
        SELECT 
          report_type,
          COUNT(*) as generation_count,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as avg_generation_time
        FROM report_logs 
        WHERE started_at >= NOW() - INTERVAL '7 days'
        GROUP BY report_type
        ORDER BY generation_count DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        reportTypes: result.rows,
        totalGenerations: result.rows.reduce((sum, row) => sum + parseInt(row.generation_count), 0),
        uniqueUsers: result.rows.reduce((sum, row) => sum + parseInt(row.unique_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing report usage:', error);
      throw error;
    }
  }

  async analyzeDashboardUsage() {
    try {
      const query = `
        SELECT 
          dashboard_id,
          COUNT(*) as view_count,
          COUNT(DISTINCT user_id) as unique_viewers,
          AVG(view_duration) as avg_view_duration
        FROM dashboard_views 
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY dashboard_id
        ORDER BY view_count DESC
        LIMIT 20
      `;
      
      const result = await pool.query(query);
      
      return {
        dashboards: result.rows,
        totalViews: result.rows.reduce((sum, row) => sum + parseInt(row.view_count), 0),
        uniqueViewers: result.rows.reduce((sum, row) => sum + parseInt(row.unique_viewers), 0)
      };
    } catch (error) {
      logger.error('Error analyzing dashboard usage:', error);
      throw error;
    }
  }

  async analyzeExportUsage() {
    try {
      const query = `
        SELECT 
          format,
          COUNT(*) as export_count,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000) as avg_export_time
        FROM export_logs 
        WHERE started_at >= NOW() - INTERVAL '7 days'
        GROUP BY format
        ORDER BY export_count DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        formats: result.rows,
        totalExports: result.rows.reduce((sum, row) => sum + parseInt(row.export_count), 0),
        uniqueUsers: result.rows.reduce((sum, row) => sum + parseInt(row.unique_users), 0)
      };
    } catch (error) {
      logger.error('Error analyzing export usage:', error);
      throw error;
    }
  }

  async storeAnalyticsResult(engineId, result, duration) {
    try {
      const query = `
        INSERT INTO analytics_results (
          id, engine_id, result, duration, timestamp
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      
      await pool.query(query, [
        nanoid(),
        engineId,
        JSON.stringify(result),
        duration,
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing analytics result:', error);
      throw error;
    }
  }

  async getAnalyticsResults(engineId, timeRange = '24h') {
    try {
      const query = `
        SELECT * FROM analytics_results 
        WHERE engine_id = $1 
        AND timestamp >= NOW() - INTERVAL '${timeRange}'
        ORDER BY timestamp DESC
      `;
      
      const result = await pool.query(query, [engineId]);
      
      return result.rows.map(row => ({
        id: row.id,
        engineId: row.engine_id,
        result: row.result,
        duration: row.duration,
        timestamp: new Date(row.timestamp).getTime()
      }));
    } catch (error) {
      logger.error('Error getting analytics results:', error);
      throw error;
    }
  }

  async getAnalyticsEngines() {
    try {
      return Array.from(this.analyticsEngines.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting analytics engines:', error);
      throw error;
    }
  }

  async getAnalyticsStats() {
    try {
      const query = `
        SELECT 
          engine_id,
          COUNT(*) as total_runs,
          AVG(duration) as avg_duration,
          MAX(timestamp) as last_run
        FROM analytics_results 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY engine_id
        ORDER BY total_runs DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting analytics stats:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;
