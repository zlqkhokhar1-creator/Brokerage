const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class AuditTrail extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.auditEvents = new Map();
    this.eventTypes = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadEventTypes();
      logger.info('Audit Trail initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Audit Trail:', error);
      throw error;
    }
  }

  async loadEventTypes() {
    try {
      const eventTypes = [
        {
          id: 'user_login',
          name: 'User Login',
          description: 'User authentication event',
          category: 'authentication',
          severity: 'info',
          enabled: true
        },
        {
          id: 'user_logout',
          name: 'User Logout',
          description: 'User logout event',
          category: 'authentication',
          severity: 'info',
          enabled: true
        },
        {
          id: 'portfolio_access',
          name: 'Portfolio Access',
          description: 'Portfolio access event',
          category: 'access',
          severity: 'info',
          enabled: true
        },
        {
          id: 'trade_execution',
          name: 'Trade Execution',
          description: 'Trade execution event',
          category: 'trading',
          severity: 'info',
          enabled: true
        },
        {
          id: 'compliance_check',
          name: 'Compliance Check',
          description: 'Compliance check event',
          category: 'compliance',
          severity: 'info',
          enabled: true
        },
        {
          id: 'risk_calculation',
          name: 'Risk Calculation',
          description: 'Risk calculation event',
          category: 'risk',
          severity: 'info',
          enabled: true
        },
        {
          id: 'data_export',
          name: 'Data Export',
          description: 'Data export event',
          category: 'data',
          severity: 'warning',
          enabled: true
        },
        {
          id: 'data_import',
          name: 'Data Import',
          description: 'Data import event',
          category: 'data',
          severity: 'warning',
          enabled: true
        },
        {
          id: 'configuration_change',
          name: 'Configuration Change',
          description: 'System configuration change event',
          category: 'system',
          severity: 'warning',
          enabled: true
        },
        {
          id: 'security_event',
          name: 'Security Event',
          description: 'Security-related event',
          category: 'security',
          severity: 'critical',
          enabled: true
        },
        {
          id: 'error_event',
          name: 'Error Event',
          description: 'System error event',
          category: 'system',
          severity: 'error',
          enabled: true
        },
        {
          id: 'admin_action',
          name: 'Admin Action',
          description: 'Administrative action event',
          category: 'admin',
          severity: 'warning',
          enabled: true
        }
      ];

      for (const eventType of eventTypes) {
        this.eventTypes.set(eventType.id, eventType);
      }

      logger.info(`Loaded ${eventTypes.length} event types`);
    } catch (error) {
      logger.error('Error loading event types:', error);
    }
  }

  async logEvent(data, user) {
    try {
      const { eventType, entityType, entityId, action, details, metadata } = data;
      const startTime = Date.now();
      
      const event = {
        id: uuidv4(),
        eventType,
        entityType: entityType || 'unknown',
        entityId: entityId || null,
        action: action || 'unknown',
        userId: user.id,
        userRole: user.role || 'user',
        details: details || {},
        metadata: metadata || {},
        severity: this.getEventSeverity(eventType),
        category: this.getEventCategory(eventType),
        timestamp: new Date(),
        ipAddress: user.ipAddress || 'unknown',
        userAgent: user.userAgent || 'unknown',
        sessionId: user.sessionId || null,
        createdAt: new Date()
      };
      
      // Store event
      await this.storeEvent(event);
      this.auditEvents.set(event.id, event);
      
      // Emit event for real-time monitoring
      this.emit('auditEvent', event);
      
      logger.performance('Audit event logging', Date.now() - startTime, {
        eventType,
        entityType,
        entityId,
        userId: user.id
      });
      
      return event;
    } catch (error) {
      logger.error('Error logging audit event:', error);
      throw error;
    }
  }

  async getAuditTrail(query, userId) {
    try {
      const { 
        eventType, 
        entityType, 
        entityId, 
        action, 
        severity, 
        category,
        startDate, 
        endDate, 
        limit = 100, 
        offset = 0 
      } = query;
      
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramCount = 1;
      
      if (eventType) {
        paramCount++;
        whereClause += ` AND event_type = $${paramCount}`;
        params.push(eventType);
      }
      
      if (entityType) {
        paramCount++;
        whereClause += ` AND entity_type = $${paramCount}`;
        params.push(entityType);
      }
      
      if (entityId) {
        paramCount++;
        whereClause += ` AND entity_id = $${paramCount}`;
        params.push(entityId);
      }
      
      if (action) {
        paramCount++;
        whereClause += ` AND action = $${paramCount}`;
        params.push(action);
      }
      
      if (severity) {
        paramCount++;
        whereClause += ` AND severity = $${paramCount}`;
        params.push(severity);
      }
      
      if (category) {
        paramCount++;
        whereClause += ` AND category = $${paramCount}`;
        params.push(category);
      }
      
      if (startDate) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(startDate);
      }
      
      if (endDate) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(endDate);
      }
      
      const query_sql = `
        SELECT * FROM audit_events 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(query_sql, params);
      
      return result.rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        userId: row.user_id,
        userRole: row.user_role,
        details: row.details,
        metadata: row.metadata,
        severity: row.severity,
        category: row.category,
        timestamp: row.timestamp,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        sessionId: row.session_id,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error getting audit trail:', error);
      return [];
    }
  }

  async getAuditStatistics(userId, timeframe = '30d') {
    try {
      const days = this.getDaysFromTimeframe(timeframe);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const query = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
          COUNT(*) FILTER (WHERE severity = 'error') as error_events,
          COUNT(*) FILTER (WHERE severity = 'warning') as warning_events,
          COUNT(*) FILTER (WHERE severity = 'info') as info_events,
          COUNT(DISTINCT event_type) as unique_event_types,
          COUNT(DISTINCT entity_type) as unique_entity_types,
          COUNT(DISTINCT action) as unique_actions
        FROM audit_events 
        WHERE user_id = $1 AND created_at >= $2
      `;
      
      const result = await this.db.query(query, [userId, startDate]);
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error getting audit statistics for user ${userId}:`, error);
      return {
        total_events: 0,
        critical_events: 0,
        error_events: 0,
        warning_events: 0,
        info_events: 0,
        unique_event_types: 0,
        unique_entity_types: 0,
        unique_actions: 0
      };
    }
  }

  async getEventTypes() {
    try {
      return Array.from(this.eventTypes.values());
    } catch (error) {
      logger.error('Error getting event types:', error);
      return [];
    }
  }

  async getEventCategories() {
    try {
      const categories = new Set();
      for (const eventType of this.eventTypes.values()) {
        categories.add(eventType.category);
      }
      return Array.from(categories);
    } catch (error) {
      logger.error('Error getting event categories:', error);
      return [];
    }
  }

  async getEventSeverities() {
    try {
      const severities = new Set();
      for (const eventType of this.eventTypes.values()) {
        severities.add(eventType.severity);
      }
      return Array.from(severities);
    } catch (error) {
      logger.error('Error getting event severities:', error);
      return [];
    }
  }

  async searchAuditTrail(query, userId) {
    try {
      const { searchTerm, eventType, entityType, action, severity, category, startDate, endDate, limit = 100, offset = 0 } = query;
      
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramCount = 1;
      
      if (searchTerm) {
        paramCount++;
        whereClause += ` AND (
          event_type ILIKE $${paramCount} OR 
          entity_type ILIKE $${paramCount} OR 
          entity_id ILIKE $${paramCount} OR 
          action ILIKE $${paramCount} OR 
          details::text ILIKE $${paramCount} OR 
          metadata::text ILIKE $${paramCount}
        )`;
        params.push(`%${searchTerm}%`);
      }
      
      if (eventType) {
        paramCount++;
        whereClause += ` AND event_type = $${paramCount}`;
        params.push(eventType);
      }
      
      if (entityType) {
        paramCount++;
        whereClause += ` AND entity_type = $${paramCount}`;
        params.push(entityType);
      }
      
      if (action) {
        paramCount++;
        whereClause += ` AND action = $${paramCount}`;
        params.push(action);
      }
      
      if (severity) {
        paramCount++;
        whereClause += ` AND severity = $${paramCount}`;
        params.push(severity);
      }
      
      if (category) {
        paramCount++;
        whereClause += ` AND category = $${paramCount}`;
        params.push(category);
      }
      
      if (startDate) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(startDate);
      }
      
      if (endDate) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(endDate);
      }
      
      const query_sql = `
        SELECT * FROM audit_events 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(query_sql, params);
      
      return result.rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        userId: row.user_id,
        userRole: row.user_role,
        details: row.details,
        metadata: row.metadata,
        severity: row.severity,
        category: row.category,
        timestamp: row.timestamp,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        sessionId: row.session_id,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error searching audit trail:', error);
      return [];
    }
  }

  async exportAuditTrail(query, userId, format = 'csv') {
    try {
      const events = await this.getAuditTrail(query, userId);
      
      switch (format) {
        case 'csv':
          return this.exportToCSV(events);
        case 'json':
          return this.exportToJSON(events);
        case 'xml':
          return this.exportToXML(events);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting audit trail:', error);
      throw error;
    }
  }

  exportToCSV(events) {
    try {
      const headers = [
        'ID', 'Event Type', 'Entity Type', 'Entity ID', 'Action', 'User ID', 'User Role',
        'Severity', 'Category', 'Timestamp', 'IP Address', 'User Agent', 'Session ID'
      ];
      
      const csvRows = [headers.join(',')];
      
      for (const event of events) {
        const row = [
          event.id,
          event.eventType,
          event.entityType,
          event.entityId || '',
          event.action,
          event.userId,
          event.userRole,
          event.severity,
          event.category,
          event.timestamp,
          event.ipAddress,
          event.userAgent,
          event.sessionId || ''
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
      }
      
      return csvRows.join('\n');
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  exportToJSON(events) {
    try {
      return JSON.stringify(events, null, 2);
    } catch (error) {
      logger.error('Error exporting to JSON:', error);
      throw error;
    }
  }

  exportToXML(events) {
    try {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<audit_events>\n';
      
      for (const event of events) {
        xml += '  <event>\n';
        xml += `    <id>${event.id}</id>\n`;
        xml += `    <eventType>${event.eventType}</eventType>\n`;
        xml += `    <entityType>${event.entityType}</entityType>\n`;
        xml += `    <entityId>${event.entityId || ''}</entityId>\n`;
        xml += `    <action>${event.action}</action>\n`;
        xml += `    <userId>${event.userId}</userId>\n`;
        xml += `    <userRole>${event.userRole}</userRole>\n`;
        xml += `    <severity>${event.severity}</severity>\n`;
        xml += `    <category>${event.category}</category>\n`;
        xml += `    <timestamp>${event.timestamp}</timestamp>\n`;
        xml += `    <ipAddress>${event.ipAddress}</ipAddress>\n`;
        xml += `    <userAgent>${event.userAgent}</userAgent>\n`;
        xml += `    <sessionId>${event.sessionId || ''}</sessionId>\n`;
        xml += '  </event>\n';
      }
      
      xml += '</audit_events>\n';
      return xml;
    } catch (error) {
      logger.error('Error exporting to XML:', error);
      throw error;
    }
  }

  async storeEvent(event) {
    try {
      const query = `
        INSERT INTO audit_events (
          id, event_type, entity_type, entity_id, action, user_id, user_role,
          details, metadata, severity, category, timestamp, ip_address, 
          user_agent, session_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `;
      
      await this.db.query(query, [
        event.id,
        event.eventType,
        event.entityType,
        event.entityId,
        event.action,
        event.userId,
        event.userRole,
        JSON.stringify(event.details),
        JSON.stringify(event.metadata),
        event.severity,
        event.category,
        event.timestamp,
        event.ipAddress,
        event.userAgent,
        event.sessionId,
        event.createdAt
      ]);
    } catch (error) {
      logger.error('Error storing audit event:', error);
      throw error;
    }
  }

  getEventSeverity(eventType) {
    const event = this.eventTypes.get(eventType);
    return event ? event.severity : 'info';
  }

  getEventCategory(eventType) {
    const event = this.eventTypes.get(eventType);
    return event ? event.category : 'unknown';
  }

  getDaysFromTimeframe(timeframe) {
    const timeframes = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    return timeframes[timeframe] || 30;
  }

  async close() {
    try {
      logger.info('Audit Trail closed successfully');
    } catch (error) {
      logger.error('Error closing Audit Trail:', error);
    }
  }
}

module.exports = AuditTrail;

