const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class AuditLogger extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.auditEvents = new Map();
    this.auditQueue = [];
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load audit event types
      await this.loadAuditEventTypes();
      
      // Start audit queue processor
      this.startAuditQueueProcessor();
      
      this._initialized = true;
      logger.info('AuditLogger initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AuditLogger:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('AuditLogger closed');
    } catch (error) {
      logger.error('Error closing AuditLogger:', error);
    }
  }

  async loadAuditEventTypes() {
    try {
      this.auditEvents = new Map([
        ['report_created', {
          name: 'Report Created',
          description: 'A new report was created',
          category: 'reports',
          severity: 'info',
          fields: ['reportId', 'reportName', 'reportType', 'userId']
        }],
        ['report_updated', {
          name: 'Report Updated',
          description: 'An existing report was updated',
          category: 'reports',
          severity: 'info',
          fields: ['reportId', 'reportName', 'changes', 'userId']
        }],
        ['report_deleted', {
          name: 'Report Deleted',
          description: 'A report was deleted',
          category: 'reports',
          severity: 'warning',
          fields: ['reportId', 'reportName', 'userId']
        }],
        ['report_shared', {
          name: 'Report Shared',
          description: 'A report was shared with another user',
          category: 'reports',
          severity: 'info',
          fields: ['reportId', 'reportName', 'sharedWith', 'userId']
        }],
        ['report_exported', {
          name: 'Report Exported',
          description: 'A report was exported',
          category: 'reports',
          severity: 'info',
          fields: ['reportId', 'reportName', 'format', 'userId']
        }],
        ['dashboard_created', {
          name: 'Dashboard Created',
          description: 'A new dashboard was created',
          category: 'dashboards',
          severity: 'info',
          fields: ['dashboardId', 'dashboardName', 'userId']
        }],
        ['dashboard_updated', {
          name: 'Dashboard Updated',
          description: 'An existing dashboard was updated',
          category: 'dashboards',
          severity: 'info',
          fields: ['dashboardId', 'dashboardName', 'changes', 'userId']
        }],
        ['dashboard_deleted', {
          name: 'Dashboard Deleted',
          description: 'A dashboard was deleted',
          category: 'dashboards',
          severity: 'warning',
          fields: ['dashboardId', 'dashboardName', 'userId']
        }],
        ['dashboard_shared', {
          name: 'Dashboard Shared',
          description: 'A dashboard was shared with another user',
          category: 'dashboards',
          severity: 'info',
          fields: ['dashboardId', 'dashboardName', 'sharedWith', 'userId']
        }],
        ['template_created', {
          name: 'Template Created',
          description: 'A new template was created',
          category: 'templates',
          severity: 'info',
          fields: ['templateId', 'templateName', 'templateType', 'userId']
        }],
        ['template_updated', {
          name: 'Template Updated',
          description: 'An existing template was updated',
          category: 'templates',
          severity: 'info',
          fields: ['templateId', 'templateName', 'changes', 'userId']
        }],
        ['template_deleted', {
          name: 'Template Deleted',
          description: 'A template was deleted',
          category: 'templates',
          severity: 'warning',
          fields: ['templateId', 'templateName', 'userId']
        }],
        ['schedule_created', {
          name: 'Schedule Created',
          description: 'A new schedule was created',
          category: 'schedules',
          severity: 'info',
          fields: ['scheduleId', 'scheduleName', 'scheduleType', 'userId']
        }],
        ['schedule_updated', {
          name: 'Schedule Updated',
          description: 'An existing schedule was updated',
          category: 'schedules',
          severity: 'info',
          fields: ['scheduleId', 'scheduleName', 'changes', 'userId']
        }],
        ['schedule_deleted', {
          name: 'Schedule Deleted',
          description: 'A schedule was deleted',
          category: 'schedules',
          severity: 'warning',
          fields: ['scheduleId', 'scheduleName', 'userId']
        }],
        ['export_created', {
          name: 'Export Created',
          description: 'A new export was created',
          category: 'exports',
          severity: 'info',
          fields: ['exportId', 'exportName', 'format', 'userId']
        }],
        ['export_downloaded', {
          name: 'Export Downloaded',
          description: 'An export was downloaded',
          category: 'exports',
          severity: 'info',
          fields: ['exportId', 'exportName', 'userId']
        }],
        ['user_login', {
          name: 'User Login',
          description: 'A user logged in',
          category: 'authentication',
          severity: 'info',
          fields: ['userId', 'ipAddress', 'userAgent']
        }],
        ['user_logout', {
          name: 'User Logout',
          description: 'A user logged out',
          category: 'authentication',
          severity: 'info',
          fields: ['userId', 'ipAddress']
        }],
        ['permission_granted', {
          name: 'Permission Granted',
          description: 'A permission was granted to a user',
          category: 'permissions',
          severity: 'info',
          fields: ['userId', 'permission', 'resourceId', 'grantedBy']
        }],
        ['permission_revoked', {
          name: 'Permission Revoked',
          description: 'A permission was revoked from a user',
          category: 'permissions',
          severity: 'warning',
          fields: ['userId', 'permission', 'resourceId', 'revokedBy']
        }],
        ['role_assigned', {
          name: 'Role Assigned',
          description: 'A role was assigned to a user',
          category: 'permissions',
          severity: 'info',
          fields: ['userId', 'roleId', 'assignedBy']
        }],
        ['role_removed', {
          name: 'Role Removed',
          description: 'A role was removed from a user',
          category: 'permissions',
          severity: 'warning',
          fields: ['userId', 'roleId', 'removedBy']
        }],
        ['system_error', {
          name: 'System Error',
          description: 'A system error occurred',
          category: 'system',
          severity: 'error',
          fields: ['errorMessage', 'errorCode', 'component', 'userId']
        }],
        ['security_violation', {
          name: 'Security Violation',
          description: 'A security violation was detected',
          category: 'security',
          severity: 'critical',
          fields: ['violationType', 'userId', 'ipAddress', 'details']
        }]
      ]);
      
      logger.info('Audit event types loaded successfully');
    } catch (error) {
      logger.error('Error loading audit event types:', error);
      throw error;
    }
  }

  startAuditQueueProcessor() {
    setInterval(async () => {
      if (this.auditQueue.length > 0) {
        const auditEvent = this.auditQueue.shift();
        try {
          await this.processAuditEvent(auditEvent);
        } catch (error) {
          logger.error('Error processing audit event from queue:', error);
          // Re-queue audit event for retry
          this.auditQueue.push(auditEvent);
        }
      }
    }, 1000); // Process every second
  }

  async processAuditEvent(auditEvent) {
    try {
      const auditId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Processing audit event: ${auditEvent.eventType}`, {
        auditId,
        eventType: auditEvent.eventType,
        userId: auditEvent.userId
      });

      // Get event type configuration
      const eventConfig = this.auditEvents.get(auditEvent.eventType);
      if (!eventConfig) {
        throw new Error(`Unknown audit event type: ${auditEvent.eventType}`);
      }

      // Validate required fields
      this.validateAuditEvent(auditEvent, eventConfig);
      
      // Store audit record
      await this.storeAuditRecord({
        id: auditId,
        eventType: auditEvent.eventType,
        userId: auditEvent.userId,
        data: auditEvent.data,
        metadata: auditEvent.metadata,
        ipAddress: auditEvent.ipAddress,
        userAgent: auditEvent.userAgent,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      });
      
      this.emit('auditEventProcessed', { auditId, auditEvent });
      
      logger.info(`Audit event processed: ${auditId}`, {
        auditId,
        processingTime: Date.now() - startTime
      });
      
      return { auditId };
    } catch (error) {
      logger.error('Error processing audit event:', error);
      throw error;
    }
  }

  validateAuditEvent(auditEvent, eventConfig) {
    try {
      const requiredFields = eventConfig.fields || [];
      
      for (const field of requiredFields) {
        if (!auditEvent.data || auditEvent.data[field] === undefined) {
          throw new Error(`Required field missing: ${field}`);
        }
      }
    } catch (error) {
      logger.error('Error validating audit event:', error);
      throw error;
    }
  }

  async logAuditEvent(eventType, userId, data, metadata = {}, ipAddress = null, userAgent = null) {
    try {
      const auditEvent = {
        eventType,
        userId,
        data,
        metadata,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      };
      
      this.auditQueue.push(auditEvent);
      
      logger.info(`Audit event queued: ${eventType}`, {
        userId,
        eventType
      });
    } catch (error) {
      logger.error('Error logging audit event:', error);
      throw error;
    }
  }

  async logReportCreated(reportId, reportName, reportType, userId, metadata = {}) {
    try {
      await this.logAuditEvent('report_created', userId, {
        reportId,
        reportName,
        reportType
      }, metadata);
    } catch (error) {
      logger.error('Error logging report created:', error);
      throw error;
    }
  }

  async logReportUpdated(reportId, reportName, changes, userId, metadata = {}) {
    try {
      await this.logAuditEvent('report_updated', userId, {
        reportId,
        reportName,
        changes
      }, metadata);
    } catch (error) {
      logger.error('Error logging report updated:', error);
      throw error;
    }
  }

  async logReportDeleted(reportId, reportName, userId, metadata = {}) {
    try {
      await this.logAuditEvent('report_deleted', userId, {
        reportId,
        reportName
      }, metadata);
    } catch (error) {
      logger.error('Error logging report deleted:', error);
      throw error;
    }
  }

  async logReportShared(reportId, reportName, sharedWith, userId, metadata = {}) {
    try {
      await this.logAuditEvent('report_shared', userId, {
        reportId,
        reportName,
        sharedWith
      }, metadata);
    } catch (error) {
      logger.error('Error logging report shared:', error);
      throw error;
    }
  }

  async logReportExported(reportId, reportName, format, userId, metadata = {}) {
    try {
      await this.logAuditEvent('report_exported', userId, {
        reportId,
        reportName,
        format
      }, metadata);
    } catch (error) {
      logger.error('Error logging report exported:', error);
      throw error;
    }
  }

  async logDashboardCreated(dashboardId, dashboardName, userId, metadata = {}) {
    try {
      await this.logAuditEvent('dashboard_created', userId, {
        dashboardId,
        dashboardName
      }, metadata);
    } catch (error) {
      logger.error('Error logging dashboard created:', error);
      throw error;
    }
  }

  async logDashboardUpdated(dashboardId, dashboardName, changes, userId, metadata = {}) {
    try {
      await this.logAuditEvent('dashboard_updated', userId, {
        dashboardId,
        dashboardName,
        changes
      }, metadata);
    } catch (error) {
      logger.error('Error logging dashboard updated:', error);
      throw error;
    }
  }

  async logDashboardDeleted(dashboardId, dashboardName, userId, metadata = {}) {
    try {
      await this.logAuditEvent('dashboard_deleted', userId, {
        dashboardId,
        dashboardName
      }, metadata);
    } catch (error) {
      logger.error('Error logging dashboard deleted:', error);
      throw error;
    }
  }

  async logDashboardShared(dashboardId, dashboardName, sharedWith, userId, metadata = {}) {
    try {
      await this.logAuditEvent('dashboard_shared', userId, {
        dashboardId,
        dashboardName,
        sharedWith
      }, metadata);
    } catch (error) {
      logger.error('Error logging dashboard shared:', error);
      throw error;
    }
  }

  async logTemplateCreated(templateId, templateName, templateType, userId, metadata = {}) {
    try {
      await this.logAuditEvent('template_created', userId, {
        templateId,
        templateName,
        templateType
      }, metadata);
    } catch (error) {
      logger.error('Error logging template created:', error);
      throw error;
    }
  }

  async logTemplateUpdated(templateId, templateName, changes, userId, metadata = {}) {
    try {
      await this.logAuditEvent('template_updated', userId, {
        templateId,
        templateName,
        changes
      }, metadata);
    } catch (error) {
      logger.error('Error logging template updated:', error);
      throw error;
    }
  }

  async logTemplateDeleted(templateId, templateName, userId, metadata = {}) {
    try {
      await this.logAuditEvent('template_deleted', userId, {
        templateId,
        templateName
      }, metadata);
    } catch (error) {
      logger.error('Error logging template deleted:', error);
      throw error;
    }
  }

  async logScheduleCreated(scheduleId, scheduleName, scheduleType, userId, metadata = {}) {
    try {
      await this.logAuditEvent('schedule_created', userId, {
        scheduleId,
        scheduleName,
        scheduleType
      }, metadata);
    } catch (error) {
      logger.error('Error logging schedule created:', error);
      throw error;
    }
  }

  async logScheduleUpdated(scheduleId, scheduleName, changes, userId, metadata = {}) {
    try {
      await this.logAuditEvent('schedule_updated', userId, {
        scheduleId,
        scheduleName,
        changes
      }, metadata);
    } catch (error) {
      logger.error('Error logging schedule updated:', error);
      throw error;
    }
  }

  async logScheduleDeleted(scheduleId, scheduleName, userId, metadata = {}) {
    try {
      await this.logAuditEvent('schedule_deleted', userId, {
        scheduleId,
        scheduleName
      }, metadata);
    } catch (error) {
      logger.error('Error logging schedule deleted:', error);
      throw error;
    }
  }

  async logExportCreated(exportId, exportName, format, userId, metadata = {}) {
    try {
      await this.logAuditEvent('export_created', userId, {
        exportId,
        exportName,
        format
      }, metadata);
    } catch (error) {
      logger.error('Error logging export created:', error);
      throw error;
    }
  }

  async logExportDownloaded(exportId, exportName, userId, metadata = {}) {
    try {
      await this.logAuditEvent('export_downloaded', userId, {
        exportId,
        exportName
      }, metadata);
    } catch (error) {
      logger.error('Error logging export downloaded:', error);
      throw error;
    }
  }

  async logUserLogin(userId, ipAddress, userAgent, metadata = {}) {
    try {
      await this.logAuditEvent('user_login', userId, {
        userId,
        ipAddress,
        userAgent
      }, metadata, ipAddress, userAgent);
    } catch (error) {
      logger.error('Error logging user login:', error);
      throw error;
    }
  }

  async logUserLogout(userId, ipAddress, metadata = {}) {
    try {
      await this.logAuditEvent('user_logout', userId, {
        userId,
        ipAddress
      }, metadata, ipAddress);
    } catch (error) {
      logger.error('Error logging user logout:', error);
      throw error;
    }
  }

  async logPermissionGranted(userId, permission, resourceId, grantedBy, metadata = {}) {
    try {
      await this.logAuditEvent('permission_granted', userId, {
        userId,
        permission,
        resourceId,
        grantedBy
      }, metadata);
    } catch (error) {
      logger.error('Error logging permission granted:', error);
      throw error;
    }
  }

  async logPermissionRevoked(userId, permission, resourceId, revokedBy, metadata = {}) {
    try {
      await this.logAuditEvent('permission_revoked', userId, {
        userId,
        permission,
        resourceId,
        revokedBy
      }, metadata);
    } catch (error) {
      logger.error('Error logging permission revoked:', error);
      throw error;
    }
  }

  async logRoleAssigned(userId, roleId, assignedBy, metadata = {}) {
    try {
      await this.logAuditEvent('role_assigned', userId, {
        userId,
        roleId,
        assignedBy
      }, metadata);
    } catch (error) {
      logger.error('Error logging role assigned:', error);
      throw error;
    }
  }

  async logRoleRemoved(userId, roleId, removedBy, metadata = {}) {
    try {
      await this.logAuditEvent('role_removed', userId, {
        userId,
        roleId,
        removedBy
      }, metadata);
    } catch (error) {
      logger.error('Error logging role removed:', error);
      throw error;
    }
  }

  async logSystemError(errorMessage, errorCode, component, userId = null, metadata = {}) {
    try {
      await this.logAuditEvent('system_error', userId, {
        errorMessage,
        errorCode,
        component
      }, metadata);
    } catch (error) {
      logger.error('Error logging system error:', error);
      throw error;
    }
  }

  async logSecurityViolation(violationType, userId, ipAddress, details, metadata = {}) {
    try {
      await this.logAuditEvent('security_violation', userId, {
        violationType,
        userId,
        ipAddress,
        details
      }, metadata, ipAddress);
    } catch (error) {
      logger.error('Error logging security violation:', error);
      throw error;
    }
  }

  async storeAuditRecord(auditRecord) {
    try {
      const query = `
        INSERT INTO audit_logs (
          id, event_type, user_id, data, metadata, ip_address, 
          user_agent, timestamp, processing_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await pool.query(query, [
        auditRecord.id,
        auditRecord.eventType,
        auditRecord.userId,
        JSON.stringify(auditRecord.data),
        JSON.stringify(auditRecord.metadata),
        auditRecord.ipAddress,
        auditRecord.userAgent,
        auditRecord.timestamp,
        auditRecord.processingTime
      ]);
      
      logger.info(`Audit record stored: ${auditRecord.id}`);
    } catch (error) {
      logger.error('Error storing audit record:', error);
      throw error;
    }
  }

  async getAuditLogs(filters = {}, pagination = {}) {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];
      let paramCount = 0;
      
      // Apply filters
      if (filters.eventType) {
        paramCount++;
        query += ` AND event_type = $${paramCount}`;
        params.push(filters.eventType);
      }
      
      if (filters.userId) {
        paramCount++;
        query += ` AND user_id = $${paramCount}`;
        params.push(filters.userId);
      }
      
      if (filters.startDate) {
        paramCount++;
        query += ` AND timestamp >= $${paramCount}`;
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        paramCount++;
        query += ` AND timestamp <= $${paramCount}`;
        params.push(filters.endDate);
      }
      
      if (filters.severity) {
        paramCount++;
        query += ` AND data->>'severity' = $${paramCount}`;
        params.push(filters.severity);
      }
      
      // Apply sorting
      query += ' ORDER BY timestamp DESC';
      
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
        eventType: row.event_type,
        userId: row.user_id,
        data: row.data,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        processingTime: row.processing_time
      }));
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  async getAuditStats() {
    try {
      const query = `
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM audit_logs 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY event_type
        ORDER BY count DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting audit stats:', error);
      throw error;
    }
  }

  async getAuditEventTypes() {
    try {
      return Array.from(this.auditEvents.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting audit event types:', error);
      throw error;
    }
  }
}

module.exports = AuditLogger;
