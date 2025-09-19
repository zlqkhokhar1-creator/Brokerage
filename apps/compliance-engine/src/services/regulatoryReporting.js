const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');
const PDFDocument = require('pdf-lib').PDFDocument;
const ExcelJS = require('exceljs');
const moment = require('moment');

class RegulatoryReporting extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.reportTemplates = new Map();
    this.reports = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadReportTemplates();
      logger.info('Regulatory Reporting initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Regulatory Reporting:', error);
      throw error;
    }
  }

  async loadReportTemplates() {
    try {
      const templates = [
        {
          id: 'form_13f',
          name: 'Form 13F',
          description: 'Quarterly holdings report for institutional investment managers',
          frequency: 'quarterly',
          dueDate: '45 days after quarter end',
          format: 'xml',
          enabled: true
        },
        {
          id: 'form_adv',
          name: 'Form ADV',
          description: 'Investment adviser registration and reporting form',
          frequency: 'annual',
          dueDate: '90 days after fiscal year end',
          format: 'xml',
          enabled: true
        },
        {
          id: 'form_cpf',
          name: 'Form CPF',
          description: 'Customer Protection Form for customer account protection',
          frequency: 'monthly',
          dueDate: '10 days after month end',
          format: 'pdf',
          enabled: true
        },
        {
          id: 'form_17h',
          name: 'Form 17H',
          description: 'Risk assessment report for large financial institutions',
          frequency: 'quarterly',
          dueDate: '30 days after quarter end',
          format: 'xml',
          enabled: true
        },
        {
          id: 'form_8k',
          name: 'Form 8-K',
          description: 'Current report for material events',
          frequency: 'as_needed',
          dueDate: '4 business days after event',
          format: 'xml',
          enabled: true
        },
        {
          id: 'form_10k',
          name: 'Form 10-K',
          description: 'Annual report for public companies',
          frequency: 'annual',
          dueDate: '60 days after fiscal year end',
          format: 'xml',
          enabled: true
        },
        {
          id: 'form_10q',
          name: 'Form 10-Q',
          description: 'Quarterly report for public companies',
          frequency: 'quarterly',
          dueDate: '40 days after quarter end',
          format: 'xml',
          enabled: true
        }
      ];

      for (const template of templates) {
        this.reportTemplates.set(template.id, template);
      }

      logger.info(`Loaded ${templates.length} report templates`);
    } catch (error) {
      logger.error('Error loading report templates:', error);
    }
  }

  async generateReport(data, user) {
    try {
      const { reportType, portfolioId, startDate, endDate, format = 'pdf' } = data;
      const startTime = Date.now();
      
      const template = this.reportTemplates.get(reportType);
      if (!template) {
        throw new Error(`Unknown report type: ${reportType}`);
      }
      
      const reportId = uuidv4();
      const report = {
        id: reportId,
        type: reportType,
        name: template.name,
        portfolioId,
        userId: user.id,
        startDate,
        endDate,
        format,
        status: 'generating',
        createdAt: new Date(),
        generatedAt: null,
        filePath: null,
        metadata: {}
      };
      
      // Store report record
      await this.storeReport(report);
      this.reports.set(reportId, report);
      
      try {
        // Generate report based on type
        let reportData;
        switch (reportType) {
          case 'form_13f':
            reportData = await this.generateForm13F(portfolioId, startDate, endDate, user);
            break;
          case 'form_adv':
            reportData = await this.generateFormADV(portfolioId, startDate, endDate, user);
            break;
          case 'form_cpf':
            reportData = await this.generateFormCPF(portfolioId, startDate, endDate, user);
            break;
          case 'form_17h':
            reportData = await this.generateForm17H(portfolioId, startDate, endDate, user);
            break;
          case 'form_8k':
            reportData = await this.generateForm8K(portfolioId, startDate, endDate, user);
            break;
          case 'form_10k':
            reportData = await this.generateForm10K(portfolioId, startDate, endDate, user);
            break;
          case 'form_10q':
            reportData = await this.generateForm10Q(portfolioId, startDate, endDate, user);
            break;
          default:
            throw new Error(`Unsupported report type: ${reportType}`);
        }
        
        // Generate file based on format
        let filePath;
        switch (format) {
          case 'pdf':
            filePath = await this.generatePDFReport(reportData, reportId);
            break;
          case 'xml':
            filePath = await this.generateXMLReport(reportData, reportId);
            break;
          case 'excel':
            filePath = await this.generateExcelReport(reportData, reportId);
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }
        
        // Update report with results
        report.status = 'completed';
        report.generatedAt = new Date();
        report.filePath = filePath;
        report.metadata = {
          recordCount: reportData.recordCount || 0,
          totalValue: reportData.totalValue || 0,
          generationTime: Date.now() - startTime
        };
        
        await this.updateReport(report);
        
        logger.performance('Report generation', Date.now() - startTime, {
          reportType,
          portfolioId,
          format,
          recordCount: report.metadata.recordCount
        });
        
        this.emit('reportGenerated', {
          reportId,
          userId: user.id,
          reportType,
          portfolioId,
          filePath,
          metadata: report.metadata
        });
        
        return report;
      } catch (error) {
        report.status = 'failed';
        report.error = error.message;
        await this.updateReport(report);
        throw error;
      }
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  async generateForm13F(portfolioId, startDate, endDate, user) {
    try {
      // Get portfolio holdings
      const holdings = await this.getPortfolioHoldings(portfolioId, startDate, endDate, user.id);
      
      const reportData = {
        formType: '13F',
        period: {
          startDate,
          endDate
        },
        filer: {
          name: 'Brokerage Platform LLC',
          cik: '0001234567',
          address: {
            street: '123 Financial Street',
            city: 'New York',
            state: 'NY',
            zip: '10001'
          }
        },
        holdings: holdings.map(holding => ({
          nameOfIssuer: holding.name,
          titleOfClass: holding.class,
          cusip: holding.cusip,
          value: holding.value,
          shares: holding.shares,
          sharesType: holding.sharesType,
          investmentDiscretion: 'SOLE',
          otherManagers: 'NONE',
          votingAuthority: {
            sole: holding.shares,
            shared: 0,
            none: 0
          }
        })),
        recordCount: holdings.length,
        totalValue: holdings.reduce((sum, h) => sum + h.value, 0)
      };
      
      return reportData;
    } catch (error) {
      logger.error('Error generating Form 13F:', error);
      throw error;
    }
  }

  async generateFormADV(portfolioId, startDate, endDate, user) {
    try {
      const reportData = {
        formType: 'ADV',
        period: {
          startDate,
          endDate
        },
        filer: {
          name: 'Brokerage Platform LLC',
          cik: '0001234567',
          crd: '123456',
          sec: '801-123456',
          address: {
            street: '123 Financial Street',
            city: 'New York',
            state: 'NY',
            zip: '10001'
          }
        },
        businessInformation: {
          businessType: 'Investment Adviser',
          services: ['Portfolio Management', 'Financial Planning', 'Investment Advice'],
          clients: {
            individuals: 1500,
            highNetWorth: 200,
            institutions: 50,
            pensionPlans: 25
          },
          assetsUnderManagement: 2500000000, // $2.5B
          minimumAccountSize: 100000
        },
        recordCount: 1,
        totalValue: 2500000000
      };
      
      return reportData;
    } catch (error) {
      logger.error('Error generating Form ADV:', error);
      throw error;
    }
  }

  async generateFormCPF(portfolioId, startDate, endDate, user) {
    try {
      const reportData = {
        formType: 'CPF',
        period: {
          startDate,
          endDate
        },
        filer: {
          name: 'Brokerage Platform LLC',
          cik: '0001234567'
        },
        customerProtection: {
          totalCustomerAssets: 5000000000, // $5B
          segregatedAssets: 4500000000, // $4.5B
          excessSegregation: 500000000, // $500M
          protectionRatio: 0.90
        },
        recordCount: 1,
        totalValue: 5000000000
      };
      
      return reportData;
    } catch (error) {
      logger.error('Error generating Form CPF:', error);
      throw error;
    }
  }

  async generateForm17H(portfolioId, startDate, endDate, user) {
    try {
      const reportData = {
        formType: '17H',
        period: {
          startDate,
          endDate
        },
        filer: {
          name: 'Brokerage Platform LLC',
          cik: '0001234567'
        },
        riskAssessment: {
          totalAssets: 10000000000, // $10B
          riskWeightedAssets: 8000000000, // $8B
          capitalRatio: 0.12,
          tier1Capital: 960000000, // $960M
          tier2Capital: 240000000, // $240M
          leverageRatio: 0.08,
          liquidityCoverageRatio: 1.25,
          netStableFundingRatio: 1.15
        },
        recordCount: 1,
        totalValue: 10000000000
      };
      
      return reportData;
    } catch (error) {
      logger.error('Error generating Form 17H:', error);
      throw error;
    }
  }

  async generateForm8K(portfolioId, startDate, endDate, user) {
    try {
      const reportData = {
        formType: '8-K',
        period: {
          startDate,
          endDate
        },
        filer: {
          name: 'Brokerage Platform LLC',
          cik: '0001234567'
        },
        events: [
          {
            item: 'Item 1.01 - Entry into a Material Definitive Agreement',
            description: 'Execution of new trading agreement with major counterparty',
            date: startDate
          },
          {
            item: 'Item 2.02 - Results of Operations and Financial Condition',
            description: 'Quarterly earnings release',
            date: startDate
          }
        ],
        recordCount: 2,
        totalValue: 0
      };
      
      return reportData;
    } catch (error) {
      logger.error('Error generating Form 8K:', error);
      throw error;
    }
  }

  async generateForm10K(portfolioId, startDate, endDate, user) {
    try {
      const reportData = {
        formType: '10-K',
        period: {
          startDate,
          endDate
        },
        filer: {
          name: 'Brokerage Platform LLC',
          cik: '0001234567'
        },
        financialStatements: {
          revenue: 500000000, // $500M
          netIncome: 75000000, // $75M
          totalAssets: 10000000000, // $10B
          totalLiabilities: 8000000000, // $8B
          shareholdersEquity: 2000000000 // $2B
        },
        recordCount: 1,
        totalValue: 10000000000
      };
      
      return reportData;
    } catch (error) {
      logger.error('Error generating Form 10K:', error);
      throw error;
    }
  }

  async generateForm10Q(portfolioId, startDate, endDate, user) {
    try {
      const reportData = {
        formType: '10-Q',
        period: {
          startDate,
          endDate
        },
        filer: {
          name: 'Brokerage Platform LLC',
          cik: '0001234567'
        },
        financialStatements: {
          revenue: 125000000, // $125M
          netIncome: 18750000, // $18.75M
          totalAssets: 10000000000, // $10B
          totalLiabilities: 8000000000, // $8B
          shareholdersEquity: 2000000000 // $2B
        },
        recordCount: 1,
        totalValue: 10000000000
      };
      
      return reportData;
    } catch (error) {
      logger.error('Error generating Form 10Q:', error);
      throw error;
    }
  }

  async generatePDFReport(reportData, reportId) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const { width, height } = page.getSize();
      
      // Add title
      page.drawText(reportData.formType, {
        x: 50,
        y: height - 50,
        size: 24,
        color: { r: 0, g: 0, b: 0 }
      });
      
      // Add period
      page.drawText(`Period: ${reportData.period.startDate} to ${reportData.period.endDate}`, {
        x: 50,
        y: height - 80,
        size: 12,
        color: { r: 0, g: 0, b: 0 }
      });
      
      // Add filer information
      page.drawText(`Filer: ${reportData.filer.name}`, {
        x: 50,
        y: height - 110,
        size: 12,
        color: { r: 0, g: 0, b: 0 }
      });
      
      // Add holdings or other data
      if (reportData.holdings) {
        let y = height - 150;
        for (const holding of reportData.holdings.slice(0, 20)) { // Limit to first 20
          page.drawText(`${holding.nameOfIssuer} - ${holding.shares} shares`, {
            x: 50,
            y: y,
            size: 10,
            color: { r: 0, g: 0, b: 0 }
          });
          y -= 20;
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      const filePath = `reports/${reportId}.pdf`;
      
      // Save to file system (in production, would use cloud storage)
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, pdfBytes);
      
      return filePath;
    } catch (error) {
      logger.error('Error generating PDF report:', error);
      throw error;
    }
  }

  async generateXMLReport(reportData, reportId) {
    try {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += `<${reportData.formType.toLowerCase()}>\n`;
      xml += `  <period>\n`;
      xml += `    <startDate>${reportData.period.startDate}</startDate>\n`;
      xml += `    <endDate>${reportData.period.endDate}</endDate>\n`;
      xml += `  </period>\n`;
      xml += `  <filer>\n`;
      xml += `    <name>${reportData.filer.name}</name>\n`;
      xml += `    <cik>${reportData.filer.cik}</cik>\n`;
      xml += `  </filer>\n`;
      
      if (reportData.holdings) {
        xml += `  <holdings>\n`;
        for (const holding of reportData.holdings) {
          xml += `    <holding>\n`;
          xml += `      <nameOfIssuer>${holding.nameOfIssuer}</nameOfIssuer>\n`;
          xml += `      <titleOfClass>${holding.titleOfClass}</titleOfClass>\n`;
          xml += `      <cusip>${holding.cusip}</cusip>\n`;
          xml += `      <value>${holding.value}</value>\n`;
          xml += `      <shares>${holding.shares}</shares>\n`;
          xml += `    </holding>\n`;
        }
        xml += `  </holdings>\n`;
      }
      
      xml += `</${reportData.formType.toLowerCase()}>\n`;
      
      const filePath = `reports/${reportId}.xml`;
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, xml);
      
      return filePath;
    } catch (error) {
      logger.error('Error generating XML report:', error);
      throw error;
    }
  }

  async generateExcelReport(reportData, reportId) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');
      
      // Add headers
      worksheet.addRow(['Form Type', reportData.formType]);
      worksheet.addRow(['Start Date', reportData.period.startDate]);
      worksheet.addRow(['End Date', reportData.period.endDate]);
      worksheet.addRow(['Filer', reportData.filer.name]);
      worksheet.addRow(['CIK', reportData.filer.cik]);
      worksheet.addRow([]);
      
      if (reportData.holdings) {
        worksheet.addRow(['Holdings']);
        worksheet.addRow(['Name of Issuer', 'Title of Class', 'CUSIP', 'Value', 'Shares']);
        
        for (const holding of reportData.holdings) {
          worksheet.addRow([
            holding.nameOfIssuer,
            holding.titleOfClass,
            holding.cusip,
            holding.value,
            holding.shares
          ]);
        }
      }
      
      const filePath = `reports/${reportId}.xlsx`;
      await workbook.xlsx.writeFile(filePath);
      
      return filePath;
    } catch (error) {
      logger.error('Error generating Excel report:', error);
      throw error;
    }
  }

  async getPortfolioHoldings(portfolioId, startDate, endDate, userId) {
    try {
      // Mock portfolio holdings - in reality would query portfolio service
      return [
        {
          name: 'Apple Inc.',
          class: 'Common Stock',
          cusip: '037833100',
          value: 150000,
          shares: 1000,
          sharesType: 'SH'
        },
        {
          name: 'Microsoft Corporation',
          class: 'Common Stock',
          cusip: '594918104',
          value: 300000,
          shares: 1000,
          sharesType: 'SH'
        },
        {
          name: 'Alphabet Inc.',
          class: 'Class A Common Stock',
          cusip: '02079K305',
          value: 280000,
          shares: 100,
          sharesType: 'SH'
        }
      ];
    } catch (error) {
      logger.error('Error getting portfolio holdings:', error);
      return [];
    }
  }

  async getReports(query, userId) {
    try {
      const { status, reportType, startDate, endDate, limit = 100, offset = 0 } = query;
      
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramCount = 1;
      
      if (status) {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }
      
      if (reportType) {
        paramCount++;
        whereClause += ` AND type = $${paramCount}`;
        params.push(reportType);
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
        SELECT * FROM regulatory_reports 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(query_sql, params);
      
      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        name: row.name,
        portfolioId: row.portfolio_id,
        status: row.status,
        format: row.format,
        createdAt: row.created_at,
        generatedAt: row.generated_at,
        filePath: row.file_path,
        metadata: row.metadata
      }));
    } catch (error) {
      logger.error('Error getting reports:', error);
      return [];
    }
  }

  async storeReport(report) {
    try {
      const query = `
        INSERT INTO regulatory_reports (
          id, type, name, portfolio_id, user_id, start_date, end_date, 
          format, status, created_at, generated_at, file_path, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;
      
      await this.db.query(query, [
        report.id,
        report.type,
        report.name,
        report.portfolioId,
        report.userId,
        report.startDate,
        report.endDate,
        report.format,
        report.status,
        report.createdAt,
        report.generatedAt,
        report.filePath,
        JSON.stringify(report.metadata)
      ]);
    } catch (error) {
      logger.error('Error storing report:', error);
      throw error;
    }
  }

  async updateReport(report) {
    try {
      const query = `
        UPDATE regulatory_reports 
        SET status = $1, generated_at = $2, file_path = $3, metadata = $4, error = $5
        WHERE id = $6
      `;
      
      await this.db.query(query, [
        report.status,
        report.generatedAt,
        report.filePath,
        JSON.stringify(report.metadata),
        report.error || null,
        report.id
      ]);
    } catch (error) {
      logger.error('Error updating report:', error);
      throw error;
    }
  }

  async runMonthlyReporting() {
    try {
      logger.info('Running monthly regulatory reporting...');
      
      // Get all active portfolios
      const query = `
        SELECT DISTINCT portfolio_id, user_id 
        FROM portfolios 
        WHERE status = 'active'
      `;
      
      const result = await this.db.query(query);
      
      for (const row of result.rows) {
        try {
          const endDate = moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
          const startDate = moment(endDate).startOf('month').format('YYYY-MM-DD');
          
          const user = { id: row.user_id };
          await this.generateReport({
            reportType: 'form_cpf',
            portfolioId: row.portfolio_id,
            startDate,
            endDate,
            format: 'pdf'
          }, user);
        } catch (error) {
          logger.error(`Error running monthly reporting for portfolio ${row.portfolio_id}:`, error);
        }
      }
      
      logger.info('Monthly regulatory reporting completed');
    } catch (error) {
      logger.error('Error running monthly regulatory reporting:', error);
    }
  }

  async close() {
    try {
      logger.info('Regulatory Reporting closed successfully');
    } catch (error) {
      logger.error('Error closing Regulatory Reporting:', error);
    }
  }
}

module.exports = RegulatoryReporting;

