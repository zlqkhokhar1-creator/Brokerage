const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { EventEmitter } = require('events');

const { logger } = require('./utils/logger');
const { connectRedis } = require('./services/redis');
const { connectDatabase } = require('./services/database');
const ReportGenerator = require('./services/reportGenerator');
const TemplateEngine = require('./services/templateEngine');
const ReportScheduler = require('./services/reportScheduler');
const DashboardBuilder = require('./services/dashboardBuilder');
const DataVisualizationEngine = require('./services/dataVisualizationEngine');
const ExportEngine = require('./services/exportEngine');
const ReportDeliveryEngine = require('./services/reportDeliveryEngine');
const WebSocketManager = require('./services/webSocketManager');
const { validateRequest } = require('./middleware/validation');
const { authenticateToken } = require('./middleware/auth');

class CustomReportingEngine extends EventEmitter {
  constructor() {
    super();
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 5013;
    
    // Core services
    this.reportGenerator = new ReportGenerator();
    this.templateEngine = new TemplateEngine();
    this.reportScheduler = new ReportScheduler();
    this.dashboardBuilder = new DashboardBuilder();
    this.dataVisualizationEngine = new DataVisualizationEngine();
    this.exportEngine = new ExportEngine();
    this.reportDeliveryEngine = new ReportDeliveryEngine();
    this.webSocketManager = new WebSocketManager(this.io);
    
    // Reporting engine state
    this.isInitialized = false;
    this.activeReports = new Map();
    this.reportTemplates = new Map();
    this.scheduledReports = new Map();
    this.dashboards = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupCronJobs();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || "*",
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        activeReports: this.activeReports.size,
        reportTemplates: this.reportTemplates.size,
        scheduledReports: this.scheduledReports.size,
        dashboards: this.dashboards.size
      });
    });

    // Report generation endpoints
    this.app.post('/api/v1/reports/generate',
      authenticateToken,
      validateRequest('reportGeneration'),
      async (req, res) => {
        try {
          const { reportType, templateId, parameters, format, data } = req.body;
          const report = await this.reportGenerator.generateReport(
            reportType, templateId, parameters, format, data, req.user.id
          );
          
          res.json({
            success: true,
            data: report
          });
        } catch (error) {
          logger.error('Error generating report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate report'
          });
        }
      }
    );

    this.app.get('/api/v1/reports/:reportId',
      authenticateToken,
      async (req, res) => {
        try {
          const { reportId } = req.params;
          const report = await this.reportGenerator.getReport(
            reportId, req.user.id
          );
          
          res.json({
            success: true,
            data: report
          });
        } catch (error) {
          logger.error('Error getting report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get report'
          });
        }
      }
    );

    this.app.get('/api/v1/reports/:reportId/download',
      authenticateToken,
      async (req, res) => {
        try {
          const { reportId } = req.params;
          const { format } = req.query;
          const reportData = await this.reportGenerator.downloadReport(
            reportId, format, req.user.id
          );
          
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
          res.send(reportData.data);
        } catch (error) {
          logger.error('Error downloading report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to download report'
          });
        }
      }
    );

    this.app.get('/api/v1/reports',
      authenticateToken,
      async (req, res) => {
        try {
          const { reportType, status, limit = 100 } = req.query;
          const reports = await this.reportGenerator.getReports(
            req.user.id, reportType, status, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: reports
          });
        } catch (error) {
          logger.error('Error getting reports:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get reports'
          });
        }
      }
    );

    // Template management endpoints
    this.app.post('/api/v1/templates',
      authenticateToken,
      validateRequest('templateCreation'),
      async (req, res) => {
        try {
          const { name, description, templateType, content, parameters } = req.body;
          const template = await this.templateEngine.createTemplate(
            name, description, templateType, content, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: template
          });
        } catch (error) {
          logger.error('Error creating template:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create template'
          });
        }
      }
    );

    this.app.get('/api/v1/templates/:templateId',
      authenticateToken,
      async (req, res) => {
        try {
          const { templateId } = req.params;
          const template = await this.templateEngine.getTemplate(
            templateId, req.user.id
          );
          
          res.json({
            success: true,
            data: template
          });
        } catch (error) {
          logger.error('Error getting template:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get template'
          });
        }
      }
    );

    this.app.put('/api/v1/templates/:templateId',
      authenticateToken,
      validateRequest('templateUpdate'),
      async (req, res) => {
        try {
          const { templateId } = req.params;
          const { name, description, content, parameters } = req.body;
          const template = await this.templateEngine.updateTemplate(
            templateId, name, description, content, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: template
          });
        } catch (error) {
          logger.error('Error updating template:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to update template'
          });
        }
      }
    );

    this.app.delete('/api/v1/templates/:templateId',
      authenticateToken,
      async (req, res) => {
        try {
          const { templateId } = req.params;
          await this.templateEngine.deleteTemplate(
            templateId, req.user.id
          );
          
          res.json({
            success: true,
            message: 'Template deleted successfully'
          });
        } catch (error) {
          logger.error('Error deleting template:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to delete template'
          });
        }
      }
    );

    this.app.get('/api/v1/templates',
      authenticateToken,
      async (req, res) => {
        try {
          const { templateType, status } = req.query;
          const templates = await this.templateEngine.getTemplates(
            req.user.id, templateType, status
          );
          
          res.json({
            success: true,
            data: templates
          });
        } catch (error) {
          logger.error('Error getting templates:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get templates'
          });
        }
      }
    );

    // Report scheduling endpoints
    this.app.post('/api/v1/schedules',
      authenticateToken,
      validateRequest('scheduleCreation'),
      async (req, res) => {
        try {
          const { reportType, templateId, schedule, parameters, delivery } = req.body;
          const scheduleResult = await this.reportScheduler.createSchedule(
            reportType, templateId, schedule, parameters, delivery, req.user.id
          );
          
          res.json({
            success: true,
            data: scheduleResult
          });
        } catch (error) {
          logger.error('Error creating schedule:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create schedule'
          });
        }
      }
    );

    this.app.get('/api/v1/schedules/:scheduleId',
      authenticateToken,
      async (req, res) => {
        try {
          const { scheduleId } = req.params;
          const schedule = await this.reportScheduler.getSchedule(
            scheduleId, req.user.id
          );
          
          res.json({
            success: true,
            data: schedule
          });
        } catch (error) {
          logger.error('Error getting schedule:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get schedule'
          });
        }
      }
    );

    this.app.put('/api/v1/schedules/:scheduleId',
      authenticateToken,
      validateRequest('scheduleUpdate'),
      async (req, res) => {
        try {
          const { scheduleId } = req.params;
          const { schedule, parameters, delivery } = req.body;
          const scheduleResult = await this.reportScheduler.updateSchedule(
            scheduleId, schedule, parameters, delivery, req.user.id
          );
          
          res.json({
            success: true,
            data: scheduleResult
          });
        } catch (error) {
          logger.error('Error updating schedule:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to update schedule'
          });
        }
      }
    );

    this.app.delete('/api/v1/schedules/:scheduleId',
      authenticateToken,
      async (req, res) => {
        try {
          const { scheduleId } = req.params;
          await this.reportScheduler.deleteSchedule(
            scheduleId, req.user.id
          );
          
          res.json({
            success: true,
            message: 'Schedule deleted successfully'
          });
        } catch (error) {
          logger.error('Error deleting schedule:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to delete schedule'
          });
        }
      }
    );

    this.app.get('/api/v1/schedules',
      authenticateToken,
      async (req, res) => {
        try {
          const { status, reportType } = req.query;
          const schedules = await this.reportScheduler.getSchedules(
            req.user.id, status, reportType
          );
          
          res.json({
            success: true,
            data: schedules
          });
        } catch (error) {
          logger.error('Error getting schedules:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get schedules'
          });
        }
      }
    );

    // Dashboard endpoints
    this.app.post('/api/v1/dashboards',
      authenticateToken,
      validateRequest('dashboardCreation'),
      async (req, res) => {
        try {
          const { name, description, layout, widgets, parameters } = req.body;
          const dashboard = await this.dashboardBuilder.createDashboard(
            name, description, layout, widgets, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: dashboard
          });
        } catch (error) {
          logger.error('Error creating dashboard:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create dashboard'
          });
        }
      }
    );

    this.app.get('/api/v1/dashboards/:dashboardId',
      authenticateToken,
      async (req, res) => {
        try {
          const { dashboardId } = req.params;
          const dashboard = await this.dashboardBuilder.getDashboard(
            dashboardId, req.user.id
          );
          
          res.json({
            success: true,
            data: dashboard
          });
        } catch (error) {
          logger.error('Error getting dashboard:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get dashboard'
          });
        }
      }
    );

    this.app.put('/api/v1/dashboards/:dashboardId',
      authenticateToken,
      validateRequest('dashboardUpdate'),
      async (req, res) => {
        try {
          const { dashboardId } = req.params;
          const { name, description, layout, widgets, parameters } = req.body;
          const dashboard = await this.dashboardBuilder.updateDashboard(
            dashboardId, name, description, layout, widgets, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: dashboard
          });
        } catch (error) {
          logger.error('Error updating dashboard:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to update dashboard'
          });
        }
      }
    );

    this.app.delete('/api/v1/dashboards/:dashboardId',
      authenticateToken,
      async (req, res) => {
        try {
          const { dashboardId } = req.params;
          await this.dashboardBuilder.deleteDashboard(
            dashboardId, req.user.id
          );
          
          res.json({
            success: true,
            message: 'Dashboard deleted successfully'
          });
        } catch (error) {
          logger.error('Error deleting dashboard:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to delete dashboard'
          });
        }
      }
    );

    this.app.get('/api/v1/dashboards',
      authenticateToken,
      async (req, res) => {
        try {
          const { status, category } = req.query;
          const dashboards = await this.dashboardBuilder.getDashboards(
            req.user.id, status, category
          );
          
          res.json({
            success: true,
            data: dashboards
          });
        } catch (error) {
          logger.error('Error getting dashboards:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get dashboards'
          });
        }
      }
    );

    // Data visualization endpoints
    this.app.post('/api/v1/visualizations/create',
      authenticateToken,
      validateRequest('visualizationCreation'),
      async (req, res) => {
        try {
          const { visualizationType, data, parameters, format } = req.body;
          const visualization = await this.dataVisualizationEngine.createVisualization(
            visualizationType, data, parameters, format, req.user.id
          );
          
          res.json({
            success: true,
            data: visualization
          });
        } catch (error) {
          logger.error('Error creating visualization:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create visualization'
          });
        }
      }
    );

    this.app.get('/api/v1/visualizations/:visualizationId',
      authenticateToken,
      async (req, res) => {
        try {
          const { visualizationId } = req.params;
          const visualization = await this.dataVisualizationEngine.getVisualization(
            visualizationId, req.user.id
          );
          
          res.json({
            success: true,
            data: visualization
          });
        } catch (error) {
          logger.error('Error getting visualization:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get visualization'
          });
        }
      }
    );

    this.app.get('/api/v1/visualizations/available',
      authenticateToken,
      async (req, res) => {
        try {
          const visualizations = await this.dataVisualizationEngine.getAvailableVisualizations();
          
          res.json({
            success: true,
            data: visualizations
          });
        } catch (error) {
          logger.error('Error getting available visualizations:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get available visualizations'
          });
        }
      }
    );

    // Export endpoints
    this.app.post('/api/v1/export',
      authenticateToken,
      validateRequest('exportRequest'),
      async (req, res) => {
        try {
          const { data, format, parameters } = req.body;
          const exportResult = await this.exportEngine.exportData(
            data, format, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: exportResult
          });
        } catch (error) {
          logger.error('Error exporting data:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to export data'
          });
        }
      }
    );

    this.app.get('/api/v1/export/formats',
      authenticateToken,
      async (req, res) => {
        try {
          const formats = await this.exportEngine.getAvailableFormats();
          
          res.json({
            success: true,
            data: formats
          });
        } catch (error) {
          logger.error('Error getting export formats:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get export formats'
          });
        }
      }
    );

    // Report delivery endpoints
    this.app.post('/api/v1/delivery/send',
      authenticateToken,
      validateRequest('deliveryRequest'),
      async (req, res) => {
        try {
          const { reportId, deliveryMethod, recipients, parameters } = req.body;
          const delivery = await this.reportDeliveryEngine.sendReport(
            reportId, deliveryMethod, recipients, parameters, req.user.id
          );
          
          res.json({
            success: true,
            data: delivery
          });
        } catch (error) {
          logger.error('Error sending report:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to send report'
          });
        }
      }
    );

    this.app.get('/api/v1/delivery/history',
      authenticateToken,
      async (req, res) => {
        try {
          const { reportId, status, limit = 100 } = req.query;
          const history = await this.reportDeliveryEngine.getDeliveryHistory(
            req.user.id, reportId, status, parseInt(limit)
          );
          
          res.json({
            success: true,
            data: history
          });
        } catch (error) {
          logger.error('Error getting delivery history:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get delivery history'
          });
        }
      }
    );

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to custom reporting engine', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe', async (data) => {
        try {
          const { type, reportId, dashboardId } = data;
          await this.webSocketManager.subscribe(socket.id, type, { reportId, dashboardId });
          socket.emit('subscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe' });
        }
      });

      socket.on('unsubscribe', async (data) => {
        try {
          const { type, reportId, dashboardId } = data;
          await this.webSocketManager.unsubscribe(socket.id, type, { reportId, dashboardId });
          socket.emit('unsubscribed', { type, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('WebSocket unsubscription error:', error);
          socket.emit('error', { message: 'Failed to unsubscribe' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from custom reporting engine', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        this.webSocketManager.handleDisconnect(socket.id);
      });
    });
  }

  setupCronJobs() {
    // Process scheduled reports every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.processScheduledReports();
        logger.info('Scheduled reports processed');
      } catch (error) {
        logger.error('Failed to process scheduled reports:', error);
      }
    });

    // Clean up old reports daily
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldReports();
        logger.info('Old reports cleaned up');
      } catch (error) {
        logger.error('Failed to cleanup old reports:', error);
      }
    });

    // Update dashboard data every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.updateDashboardData();
        logger.info('Dashboard data updated');
      } catch (error) {
        logger.error('Failed to update dashboard data:', error);
      }
    });
  }

  setupEventHandlers() {
    // Report generation events
    this.reportGenerator.on('reportGenerated', (report) => {
      this.activeReports.set(report.id, report);
      this.emit('reportGenerated', report);
    });

    this.reportGenerator.on('reportGenerationFailed', (error, report) => {
      logger.error('Report generation failed:', error);
      this.emit('reportGenerationFailed', error, report);
    });

    // Template events
    this.templateEngine.on('templateCreated', (template) => {
      this.reportTemplates.set(template.id, template);
      this.emit('templateCreated', template);
    });

    this.templateEngine.on('templateUpdated', (template) => {
      this.reportTemplates.set(template.id, template);
      this.emit('templateUpdated', template);
    });

    // Schedule events
    this.reportScheduler.on('scheduleCreated', (schedule) => {
      this.scheduledReports.set(schedule.id, schedule);
      this.emit('scheduleCreated', schedule);
    });

    this.reportScheduler.on('scheduleExecuted', (schedule) => {
      this.emit('scheduleExecuted', schedule);
    });

    // Dashboard events
    this.dashboardBuilder.on('dashboardCreated', (dashboard) => {
      this.dashboards.set(dashboard.id, dashboard);
      this.emit('dashboardCreated', dashboard);
    });

    this.dashboardBuilder.on('dashboardUpdated', (dashboard) => {
      this.dashboards.set(dashboard.id, dashboard);
      this.emit('dashboardUpdated', dashboard);
    });
  }

  async processScheduledReports() {
    try {
      // Process all scheduled reports
      for (const [scheduleId, schedule] of this.scheduledReports) {
        try {
          await this.reportScheduler.processSchedule(scheduleId);
        } catch (error) {
          logger.error(`Error processing schedule ${scheduleId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled reports:', error);
    }
  }

  async cleanupOldReports() {
    try {
      // Clean up old reports
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      for (const [reportId, report] of this.activeReports) {
        if (new Date(report.createdAt) < cutoff) {
          this.activeReports.delete(reportId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old reports:', error);
    }
  }

  async updateDashboardData() {
    try {
      // Update data for all active dashboards
      for (const [dashboardId, dashboard] of this.dashboards) {
        try {
          await this.dashboardBuilder.updateDashboardData(dashboardId);
        } catch (error) {
          logger.error(`Error updating dashboard ${dashboardId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error updating dashboard data:', error);
    }
  }

  async start() {
    try {
      // Connect to services
      await connectRedis();
      await connectDatabase();
      
      // Initialize services
      await this.reportGenerator.initialize();
      await this.templateEngine.initialize();
      await this.reportScheduler.initialize();
      await this.dashboardBuilder.initialize();
      await this.dataVisualizationEngine.initialize();
      await this.exportEngine.initialize();
      await this.reportDeliveryEngine.initialize();
      
      this.isInitialized = true;
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Custom Reporting Engine started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start Custom Reporting Engine:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down Custom Reporting Engine...');
    
    // Close services
    await this.reportGenerator.close();
    await this.templateEngine.close();
    await this.reportScheduler.close();
    await this.dashboardBuilder.close();
    await this.dataVisualizationEngine.close();
    await this.exportEngine.close();
    await this.reportDeliveryEngine.close();
    
    this.server.close(() => {
      logger.info('Custom Reporting Engine shutdown complete');
      process.exit(0);
    });
  }
}

// Start the engine
if (require.main === module) {
  const engine = new CustomReportingEngine();
  engine.start();
}

module.exports = CustomReportingEngine;
