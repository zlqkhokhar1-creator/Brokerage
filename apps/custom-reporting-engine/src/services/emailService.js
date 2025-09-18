const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.transporter = null;
    this.templates = new Map();
    this.emailQueue = [];
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Initialize email transporter
      await this.initializeTransporter();
      
      // Load email templates
      await this.loadEmailTemplates();
      
      // Start email queue processor
      this.startEmailQueueProcessor();
      
      this._initialized = true;
      logger.info('EmailService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EmailService:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('EmailService closed');
    } catch (error) {
      logger.error('Error closing EmailService:', error);
    }
  }

  async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // Verify connection
      await this.transporter.verify();
      logger.info('Email transporter initialized successfully');
    } catch (error) {
      logger.error('Error initializing email transporter:', error);
      throw error;
    }
  }

  async loadEmailTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      
      try {
        const files = await fs.readdir(templatesDir);
        
        for (const file of files) {
          if (file.endsWith('.hbs')) {
            const templateName = file.replace('.hbs', '');
            const templatePath = path.join(templatesDir, file);
            const templateContent = await fs.readFile(templatePath, 'utf8');
            
            this.templates.set(templateName, handlebars.compile(templateContent));
          }
        }
      } catch (error) {
        // Templates directory doesn't exist, create default templates
        await this.createDefaultTemplates();
      }
      
      logger.info('Email templates loaded successfully');
    } catch (error) {
      logger.error('Error loading email templates:', error);
      throw error;
    }
  }

  async createDefaultTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      await fs.mkdir(templatesDir, { recursive: true });
      
      // Create default templates
      const defaultTemplates = {
        'report_ready': `
          <h2>Your Report is Ready</h2>
          <p>Hello {{userName}},</p>
          <p>Your {{reportType}} report has been generated and is ready for download.</p>
          <p><strong>Report Details:</strong></p>
          <ul>
            <li>Report Name: {{reportName}}</li>
            <li>Generated At: {{generatedAt}}</li>
            <li>Format: {{format}}</li>
          </ul>
          <p><a href="{{downloadUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Report</a></p>
          <p>Best regards,<br>Your Brokerage Team</p>
        `,
        'report_scheduled': `
          <h2>Report Scheduled</h2>
          <p>Hello {{userName}},</p>
          <p>Your {{reportType}} report has been scheduled for generation.</p>
          <p><strong>Schedule Details:</strong></p>
          <ul>
            <li>Report Name: {{reportName}}</li>
            <li>Schedule: {{schedule}}</li>
            <li>Next Run: {{nextRun}}</li>
          </ul>
          <p>You will receive an email when the report is ready.</p>
          <p>Best regards,<br>Your Brokerage Team</p>
        `,
        'report_failed': `
          <h2>Report Generation Failed</h2>
          <p>Hello {{userName}},</p>
          <p>We encountered an error while generating your {{reportType}} report.</p>
          <p><strong>Error Details:</strong></p>
          <ul>
            <li>Report Name: {{reportName}}</li>
            <li>Error: {{errorMessage}}</li>
            <li>Failed At: {{failedAt}}</li>
          </ul>
          <p>Please try again or contact support if the issue persists.</p>
          <p>Best regards,<br>Your Brokerage Team</p>
        `,
        'dashboard_shared': `
          <h2>Dashboard Shared</h2>
          <p>Hello {{userName}},</p>
          <p>{{sharedBy}} has shared a dashboard with you.</p>
          <p><strong>Dashboard Details:</strong></p>
          <ul>
            <li>Dashboard Name: {{dashboardName}}</li>
            <li>Shared At: {{sharedAt}}</li>
            <li>Access Level: {{accessLevel}}</li>
          </ul>
          <p><a href="{{dashboardUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
          <p>Best regards,<br>Your Brokerage Team</p>
        `,
        'export_ready': `
          <h2>Your Export is Ready</h2>
          <p>Hello {{userName}},</p>
          <p>Your data export has been completed and is ready for download.</p>
          <p><strong>Export Details:</strong></p>
          <ul>
            <li>Export Name: {{exportName}}</li>
            <li>Format: {{format}}</li>
            <li>Generated At: {{generatedAt}}</li>
            <li>File Size: {{fileSize}}</li>
          </ul>
          <p><a href="{{downloadUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Export</a></p>
          <p>Best regards,<br>Your Brokerage Team</p>
        `
      };
      
      for (const [templateName, content] of Object.entries(defaultTemplates)) {
        const templatePath = path.join(templatesDir, `${templateName}.hbs`);
        await fs.writeFile(templatePath, content);
        this.templates.set(templateName, handlebars.compile(content));
      }
      
      logger.info('Default email templates created');
    } catch (error) {
      logger.error('Error creating default templates:', error);
      throw error;
    }
  }

  startEmailQueueProcessor() {
    setInterval(async () => {
      if (this.emailQueue.length > 0) {
        const email = this.emailQueue.shift();
        try {
          await this.sendEmail(email);
        } catch (error) {
          logger.error('Error processing email from queue:', error);
          // Re-queue email for retry
          this.emailQueue.push(email);
        }
      }
    }, 1000); // Process every second
  }

  async sendEmail(emailData) {
    try {
      const emailId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Sending email: ${emailData.template}`, {
        emailId,
        to: emailData.to,
        template: emailData.template
      });

      // Get template
      const template = this.templates.get(emailData.template);
      if (!template) {
        throw new Error(`Email template not found: ${emailData.template}`);
      }

      // Render template
      const html = template(emailData.data);
      
      // Prepare email
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@brokerage.com',
        to: emailData.to,
        subject: emailData.subject,
        html: html,
        attachments: emailData.attachments || []
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      // Store email record
      await this.storeEmailRecord({
        id: emailId,
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        data: emailData.data,
        status: 'sent',
        messageId: result.messageId,
        sentAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      });
      
      this.emit('emailSent', { emailId, result });
      
      logger.info(`Email sent successfully: ${emailId}`, {
        emailId,
        processingTime: Date.now() - startTime
      });
      
      return { emailId, result };
    } catch (error) {
      logger.error('Error sending email:', error);
      
      // Store failed email record
      await this.storeEmailRecord({
        id: emailId || nanoid(),
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        data: emailData.data,
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async queueEmail(emailData) {
    try {
      this.emailQueue.push(emailData);
      logger.info(`Email queued: ${emailData.template}`, {
        to: emailData.to,
        template: emailData.template
      });
    } catch (error) {
      logger.error('Error queuing email:', error);
      throw error;
    }
  }

  async sendReportReadyEmail(userEmail, userName, reportData) {
    try {
      const emailData = {
        to: userEmail,
        subject: `Your ${reportData.reportType} Report is Ready`,
        template: 'report_ready',
        data: {
          userName,
          reportType: reportData.reportType,
          reportName: reportData.reportName,
          generatedAt: new Date().toLocaleString(),
          format: reportData.format,
          downloadUrl: reportData.downloadUrl
        }
      };
      
      await this.queueEmail(emailData);
    } catch (error) {
      logger.error('Error sending report ready email:', error);
      throw error;
    }
  }

  async sendReportScheduledEmail(userEmail, userName, scheduleData) {
    try {
      const emailData = {
        to: userEmail,
        subject: `Report Scheduled: ${scheduleData.reportName}`,
        template: 'report_scheduled',
        data: {
          userName,
          reportType: scheduleData.reportType,
          reportName: scheduleData.reportName,
          schedule: scheduleData.schedule,
          nextRun: scheduleData.nextRun
        }
      };
      
      await this.queueEmail(emailData);
    } catch (error) {
      logger.error('Error sending report scheduled email:', error);
      throw error;
    }
  }

  async sendReportFailedEmail(userEmail, userName, errorData) {
    try {
      const emailData = {
        to: userEmail,
        subject: `Report Generation Failed: ${errorData.reportName}`,
        template: 'report_failed',
        data: {
          userName,
          reportType: errorData.reportType,
          reportName: errorData.reportName,
          errorMessage: errorData.errorMessage,
          failedAt: new Date().toLocaleString()
        }
      };
      
      await this.queueEmail(emailData);
    } catch (error) {
      logger.error('Error sending report failed email:', error);
      throw error;
    }
  }

  async sendDashboardSharedEmail(userEmail, userName, dashboardData) {
    try {
      const emailData = {
        to: userEmail,
        subject: `Dashboard Shared: ${dashboardData.dashboardName}`,
        template: 'dashboard_shared',
        data: {
          userName,
          sharedBy: dashboardData.sharedBy,
          dashboardName: dashboardData.dashboardName,
          sharedAt: new Date().toLocaleString(),
          accessLevel: dashboardData.accessLevel,
          dashboardUrl: dashboardData.dashboardUrl
        }
      };
      
      await this.queueEmail(emailData);
    } catch (error) {
      logger.error('Error sending dashboard shared email:', error);
      throw error;
    }
  }

  async sendExportReadyEmail(userEmail, userName, exportData) {
    try {
      const emailData = {
        to: userEmail,
        subject: `Your Export is Ready: ${exportData.exportName}`,
        template: 'export_ready',
        data: {
          userName,
          exportName: exportData.exportName,
          format: exportData.format,
          generatedAt: new Date().toLocaleString(),
          fileSize: exportData.fileSize,
          downloadUrl: exportData.downloadUrl
        }
      };
      
      await this.queueEmail(emailData);
    } catch (error) {
      logger.error('Error sending export ready email:', error);
      throw error;
    }
  }

  async storeEmailRecord(emailRecord) {
    try {
      const query = `
        INSERT INTO email_records (
          id, to_email, subject, template, data, status, message_id, 
          sent_at, failed_at, error, processing_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await pool.query(query, [
        emailRecord.id,
        emailRecord.to,
        emailRecord.subject,
        emailRecord.template,
        JSON.stringify(emailRecord.data),
        emailRecord.status,
        emailRecord.messageId,
        emailRecord.sentAt,
        emailRecord.failedAt,
        emailRecord.error,
        emailRecord.processingTime
      ]);
      
      logger.info(`Email record stored: ${emailRecord.id}`);
    } catch (error) {
      logger.error('Error storing email record:', error);
      throw error;
    }
  }

  async getEmailTemplates() {
    try {
      return Array.from(this.templates.keys()).map(templateName => ({
        name: templateName,
        description: this.getTemplateDescription(templateName)
      }));
    } catch (error) {
      logger.error('Error getting email templates:', error);
      throw error;
    }
  }

  getTemplateDescription(templateName) {
    const descriptions = {
      'report_ready': 'Sent when a report is successfully generated',
      'report_scheduled': 'Sent when a report is scheduled for generation',
      'report_failed': 'Sent when report generation fails',
      'dashboard_shared': 'Sent when a dashboard is shared with a user',
      'export_ready': 'Sent when a data export is ready for download'
    };
    
    return descriptions[templateName] || 'Custom email template';
  }

  async getEmailStats() {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(processing_time) as avg_processing_time
        FROM email_records 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY status
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting email stats:', error);
      throw error;
    }
  }
}

module.exports = EmailService;
