const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');

class ReportGenerator extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.reportTypes = new Map();
    this.generationQueue = [];
    this.activeGenerations = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load report types
      await this.loadReportTypes();
      
      // Start generation queue processor
      this.startQueueProcessor();
      
      this._initialized = true;
      logger.info('ReportGenerator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ReportGenerator:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ReportGenerator closed');
    } catch (error) {
      logger.error('Error closing ReportGenerator:', error);
    }
  }

  async loadReportTypes() {
    try {
      this.reportTypes = new Map([
        ['portfolio_summary', {
          name: 'Portfolio Summary',
          description: 'Comprehensive portfolio performance summary',
          template: 'portfolio_summary',
          formats: ['pdf', 'excel', 'html'],
          parameters: ['portfolioId', 'timeRange', 'includeCharts']
        }],
        ['performance_analysis', {
          name: 'Performance Analysis',
          description: 'Detailed performance analysis with attribution',
          template: 'performance_analysis',
          formats: ['pdf', 'excel', 'html'],
          parameters: ['portfolioId', 'timeRange', 'benchmarkId', 'includeRiskMetrics']
        }],
        ['risk_report', {
          name: 'Risk Report',
          description: 'Comprehensive risk analysis and metrics',
          template: 'risk_report',
          formats: ['pdf', 'excel', 'html'],
          parameters: ['portfolioId', 'timeRange', 'riskMetrics', 'includeStressTests']
        }],
        ['compliance_report', {
          name: 'Compliance Report',
          description: 'Regulatory compliance and audit report',
          template: 'compliance_report',
          formats: ['pdf', 'excel', 'html'],
          parameters: ['portfolioId', 'timeRange', 'regulations', 'includeViolations']
        }],
        ['tax_report', {
          name: 'Tax Report',
          description: 'Tax optimization and reporting',
          template: 'tax_report',
          formats: ['pdf', 'excel', 'html'],
          parameters: ['portfolioId', 'taxYear', 'includeOptimizations']
        }],
        ['custom_report', {
          name: 'Custom Report',
          description: 'User-defined custom report',
          template: 'custom',
          formats: ['pdf', 'excel', 'html', 'csv'],
          parameters: ['templateId', 'customParameters']
        }]
      ]);
      
      logger.info('Report types loaded successfully');
    } catch (error) {
      logger.error('Error loading report types:', error);
      throw error;
    }
  }

  startQueueProcessor() {
    setInterval(async () => {
      if (this.generationQueue.length > 0) {
        const item = this.generationQueue.shift();
        try {
          await this.processGenerationItem(item);
        } catch (error) {
          logger.error('Error processing generation item:', error);
        }
      }
    }, 1000); // Process every second
  }

  async processGenerationItem(item) {
    try {
      const { reportId, reportType, templateId, parameters, format, data, userId } = item;
      
      // Mark as processing
      this.activeGenerations.set(reportId, {
        ...item,
        status: 'processing',
        startedAt: new Date().toISOString()
      });
      
      // Generate report
      const report = await this.generateReportContent(
        reportType, 
        templateId, 
        parameters, 
        format, 
        data
      );
      
      // Store report
      await this.storeReport(reportId, report, userId);
      
      // Mark as completed
      this.activeGenerations.set(reportId, {
        ...item,
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      
      this.emit('reportGenerated', { id: reportId, ...report });
      
    } catch (error) {
      logger.error('Error processing generation item:', error);
      this.activeGenerations.set(item.reportId, {
        ...item,
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });
      
      this.emit('reportGenerationFailed', error, { id: item.reportId, ...item });
    }
  }

  async generateReport(reportType, templateId, parameters, format, data, userId) {
    try {
      const reportId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting report generation`, {
        reportId,
        reportType,
        templateId,
        format,
        userId
      });

      // Validate report type
      if (!this.reportTypes.has(reportType)) {
        throw new Error(`Unknown report type: ${reportType}`);
      }

      // Add to queue for processing
      this.generationQueue.push({
        reportId,
        reportType,
        templateId,
        parameters,
        format,
        data,
        userId,
        timestamp: new Date().toISOString()
      });

      const result = {
        id: reportId,
        reportType,
        templateId,
        format,
        status: 'queued',
        userId,
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };

      logger.info(`Report generation queued`, {
        reportId,
        processingTime: result.processingTime
      });

      return result;
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  async generateReportContent(reportType, templateId, parameters, format, data) {
    try {
      const reportTypeConfig = this.reportTypes.get(reportType);
      
      // Get template
      const template = await this.getTemplate(templateId || reportTypeConfig.template);
      
      // Process data
      const processedData = await this.processReportData(data, parameters);
      
      // Generate content based on format
      let content;
      let filename;
      
      switch (format) {
        case 'pdf':
          content = await this.generatePDF(template, processedData, parameters);
          filename = `${reportType}_${Date.now()}.pdf`;
          break;
        case 'excel':
          content = await this.generateExcel(template, processedData, parameters);
          filename = `${reportType}_${Date.now()}.xlsx`;
          break;
        case 'html':
          content = await this.generateHTML(template, processedData, parameters);
          filename = `${reportType}_${Date.now()}.html`;
          break;
        case 'csv':
          content = await this.generateCSV(template, processedData, parameters);
          filename = `${reportType}_${Date.now()}.csv`;
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      return {
        content,
        filename,
        format,
        size: content.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating report content:', error);
      throw error;
    }
  }

  async generatePDF(template, data, parameters) {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        // Add title
        doc.fontSize(20).text(template.title || 'Report', 50, 50);
        
        // Add content based on template
        if (template.sections) {
          let y = 100;
          for (const section of template.sections) {
            doc.fontSize(16).text(section.title, 50, y);
            y += 30;
            
            if (section.content) {
              doc.fontSize(12).text(section.content, 50, y);
              y += 20;
            }
            
            if (section.data && data[section.dataKey]) {
              const sectionData = data[section.dataKey];
              if (Array.isArray(sectionData)) {
                // Create table
                const tableTop = y;
                const itemHeight = 20;
                const colWidths = [100, 100, 100];
                
                // Headers
                doc.fontSize(10).text('Item', 50, tableTop);
                doc.text('Value', 150, tableTop);
                doc.text('Change', 250, tableTop);
                
                // Data rows
                sectionData.forEach((item, index) => {
                  const rowY = tableTop + (index + 1) * itemHeight;
                  doc.text(item.name || '', 50, rowY);
                  doc.text(item.value || '', 150, rowY);
                  doc.text(item.change || '', 250, rowY);
                });
                
                y = tableTop + (sectionData.length + 1) * itemHeight + 20;
              } else {
                doc.fontSize(12).text(JSON.stringify(sectionData, null, 2), 50, y);
                y += 100;
              }
            }
            
            y += 20;
          }
        }
        
        doc.end();
      });
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw error;
    }
  }

  async generateExcel(template, data, parameters) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');
      
      // Add title
      worksheet.addRow([template.title || 'Report']);
      worksheet.getRow(1).font = { size: 16, bold: true };
      
      // Add content based on template
      if (template.sections) {
        let currentRow = 3;
        
        for (const section of template.sections) {
          // Add section title
          worksheet.addRow([section.title]);
          worksheet.getRow(currentRow).font = { size: 14, bold: true };
          currentRow++;
          
          if (section.content) {
            worksheet.addRow([section.content]);
            currentRow++;
          }
          
          if (section.data && data[section.dataKey]) {
            const sectionData = data[section.dataKey];
            if (Array.isArray(sectionData)) {
              // Add headers
              const headers = Object.keys(sectionData[0] || {});
              worksheet.addRow(headers);
              worksheet.getRow(currentRow).font = { bold: true };
              currentRow++;
              
              // Add data rows
              sectionData.forEach(item => {
                const row = headers.map(header => item[header] || '');
                worksheet.addRow(row);
                currentRow++;
              });
            } else {
              worksheet.addRow([JSON.stringify(sectionData, null, 2)]);
              currentRow++;
            }
          }
          
          currentRow += 2; // Add spacing
        }
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      logger.error('Error generating Excel:', error);
      throw error;
    }
  }

  async generateHTML(template, data, parameters) {
    try {
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${template.title || 'Report'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { font-size: 24px; font-weight: bold; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
            .section-content { margin-bottom: 15px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">${template.title || 'Report'}</div>
      `;
      
      if (template.sections) {
        for (const section of template.sections) {
          html += `<div class="section">`;
          html += `<div class="section-title">${section.title}</div>`;
          
          if (section.content) {
            html += `<div class="section-content">${section.content}</div>`;
          }
          
          if (section.data && data[section.dataKey]) {
            const sectionData = data[section.dataKey];
            if (Array.isArray(sectionData)) {
              html += `<table>`;
              html += `<tr>`;
              const headers = Object.keys(sectionData[0] || {});
              headers.forEach(header => {
                html += `<th>${header}</th>`;
              });
              html += `</tr>`;
              
              sectionData.forEach(item => {
                html += `<tr>`;
                headers.forEach(header => {
                  html += `<td>${item[header] || ''}</td>`;
                });
                html += `</tr>`;
              });
              html += `</table>`;
            } else {
              html += `<div class="section-content">${JSON.stringify(sectionData, null, 2)}</div>`;
            }
          }
          
          html += `</div>`;
        }
      }
      
      html += `</body></html>`;
      return html;
    } catch (error) {
      logger.error('Error generating HTML:', error);
      throw error;
    }
  }

  async generateCSV(template, data, parameters) {
    try {
      let csv = '';
      
      if (template.sections) {
        for (const section of template.sections) {
          csv += `"${section.title}"\n`;
          
          if (section.data && data[section.dataKey]) {
            const sectionData = data[section.dataKey];
            if (Array.isArray(sectionData)) {
              const headers = Object.keys(sectionData[0] || {});
              csv += headers.map(h => `"${h}"`).join(',') + '\n';
              
              sectionData.forEach(item => {
                const row = headers.map(header => `"${item[header] || ''}"`);
                csv += row.join(',') + '\n';
              });
            }
          }
          
          csv += '\n';
        }
      }
      
      return csv;
    } catch (error) {
      logger.error('Error generating CSV:', error);
      throw error;
    }
  }

  async processReportData(data, parameters) {
    try {
      // Process data based on parameters
      const processedData = { ...data };
      
      // Apply filters
      if (parameters.filters) {
        for (const [key, filter] of Object.entries(parameters.filters)) {
          if (processedData[key] && Array.isArray(processedData[key])) {
            processedData[key] = processedData[key].filter(filter);
          }
        }
      }
      
      // Apply sorting
      if (parameters.sort) {
        for (const [key, sortConfig] of Object.entries(parameters.sort)) {
          if (processedData[key] && Array.isArray(processedData[key])) {
            processedData[key].sort((a, b) => {
              const aVal = a[sortConfig.field];
              const bVal = b[sortConfig.field];
              return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
            });
          }
        }
      }
      
      // Apply aggregations
      if (parameters.aggregations) {
        for (const [key, aggConfig] of Object.entries(parameters.aggregations)) {
          if (processedData[key] && Array.isArray(processedData[key])) {
            const values = processedData[key].map(item => item[aggConfig.field]);
            
            switch (aggConfig.type) {
              case 'sum':
                processedData[`${key}_${aggConfig.type}`] = values.reduce((a, b) => a + b, 0);
                break;
              case 'avg':
                processedData[`${key}_${aggConfig.type}`] = values.reduce((a, b) => a + b, 0) / values.length;
                break;
              case 'count':
                processedData[`${key}_${aggConfig.type}`] = values.length;
                break;
            }
          }
        }
      }
      
      return processedData;
    } catch (error) {
      logger.error('Error processing report data:', error);
      throw error;
    }
  }

  async getTemplate(templateId) {
    try {
      // Try to get from cache first
      const cacheKey = `template:${templateId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const query = `
        SELECT * FROM report_templates 
        WHERE id = $1 AND status = 'active'
      `;
      
      const result = await pool.query(query, [templateId]);
      
      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = result.rows[0];
      
      // Cache the result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(template));
      
      return template;
    } catch (error) {
      logger.error('Error getting template:', error);
      throw error;
    }
  }

  async getReport(reportId, userId) {
    try {
      const query = `
        SELECT * FROM reports 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await pool.query(query, [reportId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting report:', error);
      throw error;
    }
  }

  async downloadReport(reportId, format, userId) {
    try {
      const report = await this.getReport(reportId, userId);
      
      if (report.format !== format) {
        throw new Error(`Report format mismatch: expected ${format}, got ${report.format}`);
      }
      
      return {
        filename: report.filename,
        data: report.content,
        contentType: this.getContentType(format)
      };
    } catch (error) {
      logger.error('Error downloading report:', error);
      throw error;
    }
  }

  getContentType(format) {
    const contentTypes = {
      'pdf': 'application/pdf',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'html': 'text/html',
      'csv': 'text/csv'
    };
    
    return contentTypes[format] || 'application/octet-stream';
  }

  async getReports(userId, reportType, status, limit) {
    try {
      let query = `
        SELECT * FROM reports 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (reportType) {
        query += ` AND report_type = $${paramIndex}`;
        params.push(reportType);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting reports:', error);
      throw error;
    }
  }

  async storeReport(reportId, report, userId) {
    try {
      const query = `
        INSERT INTO reports (
          id, report_type, template_id, format, filename, content, 
          user_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await pool.query(query, [
        reportId,
        report.reportType,
        report.templateId,
        report.format,
        report.filename,
        report.content,
        userId,
        'completed',
        report.generatedAt
      ]);
      
      logger.info(`Report stored: ${reportId}`);
    } catch (error) {
      logger.error('Error storing report:', error);
      throw error;
    }
  }
}

module.exports = ReportGenerator;
