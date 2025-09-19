const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class TaxReportingService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.reportTemplates = new Map();
    this.reportingSessions = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadReportTemplates();
      logger.info('Tax Reporting Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Tax Reporting Service:', error);
      throw error;
    }
  }

  async loadReportTemplates() {
    try {
      const templates = [
        {
          id: 'annual_tax_summary',
          name: 'Annual Tax Summary',
          description: 'Comprehensive annual tax report',
          type: 'annual',
          enabled: true,
          parameters: {
            includeTransactions: true,
            includeGainsLosses: true,
            includeDividends: true,
            includeInterest: true
          }
        },
        {
          id: 'quarterly_tax_estimate',
          name: 'Quarterly Tax Estimate',
          description: 'Quarterly estimated tax calculation',
          type: 'quarterly',
          enabled: true,
          parameters: {
            includeYTD: true,
            includeProjections: true,
            includeRecommendations: true
          }
        },
        {
          id: 'tax_loss_harvesting_report',
          name: 'Tax Loss Harvesting Report',
          description: 'Report on tax loss harvesting activities',
          type: 'harvesting',
          enabled: true,
          parameters: {
            includeOpportunities: true,
            includeExecuted: true,
            includeSavings: true
          }
        },
        {
          id: 'wash_sale_report',
          name: 'Wash Sale Report',
          description: 'Report on wash sale violations and tracking',
          type: 'compliance',
          enabled: true,
          parameters: {
            includeViolations: true,
            includeTracking: true,
            includeRecommendations: true
          }
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
      const { templateId, parameters, dateRange } = data;
      
      const template = this.reportTemplates.get(templateId);
      if (!template) {
        throw new Error(`Report template ${templateId} not found`);
      }

      const session = {
        id: uuidv4(),
        userId: user.id,
        templateId: templateId,
        parameters: parameters || template.parameters,
        dateRange: dateRange || this.getDefaultDateRange(template.type),
        status: 'generating',
        createdAt: new Date(),
        report: null
      };

      this.reportingSessions.set(session.id, session);

      // Generate report based on template
      const report = await this.generateReportByTemplate(session);
      
      session.report = report;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store report
      await this.storeReport(session);

      logger.info(`Tax report generated for user ${user.id}`);

      return {
        sessionId: session.id,
        report: report,
        downloadUrl: this.generateDownloadUrl(session.id)
      };
    } catch (error) {
      logger.error('Tax report generation error:', error);
      throw error;
    }
  }

  async generateReportByTemplate(session) {
    try {
      const { templateId, parameters, dateRange } = session;
      
      switch (templateId) {
        case 'annual_tax_summary':
          return await this.generateAnnualTaxSummary(session);
        case 'quarterly_tax_estimate':
          return await this.generateQuarterlyTaxEstimate(session);
        case 'tax_loss_harvesting_report':
          return await this.generateTaxLossHarvestingReport(session);
        case 'wash_sale_report':
          return await this.generateWashSaleReport(session);
        default:
          throw new Error(`Unknown report template: ${templateId}`);
      }
    } catch (error) {
      logger.error('Error generating report by template:', error);
      throw error;
    }
  }

  async generateAnnualTaxSummary(session) {
    try {
      const { userId, parameters, dateRange } = session;
      
      // Get user's tax data for the year
      const taxData = await this.getUserTaxData(userId, dateRange);
      
      const report = {
        type: 'annual_tax_summary',
        year: new Date(dateRange.end).getFullYear(),
        summary: {
          totalIncome: taxData.totalIncome,
          totalDeductions: taxData.totalDeductions,
          taxableIncome: taxData.taxableIncome,
          totalTax: taxData.totalTax,
          effectiveRate: taxData.effectiveRate,
          marginalRate: taxData.marginalRate
        },
        capitalGains: {
          shortTerm: taxData.shortTermGains,
          longTerm: taxData.longTermGains,
          total: taxData.totalCapitalGains,
          tax: taxData.capitalGainsTax
        },
        dividends: {
          qualified: taxData.qualifiedDividends,
          ordinary: taxData.ordinaryDividends,
          total: taxData.totalDividends,
          tax: taxData.dividendTax
        },
        interest: {
          taxable: taxData.taxableInterest,
          taxExempt: taxData.taxExemptInterest,
          total: taxData.totalInterest,
          tax: taxData.interestTax
        },
        transactions: parameters.includeTransactions ? taxData.transactions : null,
        recommendations: this.generateTaxRecommendations(taxData)
      };

      return report;
    } catch (error) {
      logger.error('Error generating annual tax summary:', error);
      throw error;
    }
  }

  async generateQuarterlyTaxEstimate(session) {
    try {
      const { userId, parameters, dateRange } = session;
      
      // Get user's YTD tax data
      const ytdData = await this.getUserTaxData(userId, {
        start: new Date(new Date().getFullYear(), 0, 1),
        end: new Date()
      });
      
      // Project full year
      const projectedData = this.projectFullYearTax(ytdData);
      
      const report = {
        type: 'quarterly_tax_estimate',
        quarter: this.getCurrentQuarter(),
        year: new Date().getFullYear(),
        ytd: {
          income: ytdData.totalIncome,
          tax: ytdData.totalTax,
          effectiveRate: ytdData.effectiveRate
        },
        projected: {
          income: projectedData.totalIncome,
          tax: projectedData.totalTax,
          effectiveRate: projectedData.effectiveRate
        },
        estimated: {
          quarterly: projectedData.totalTax / 4,
          remaining: projectedData.totalTax - ytdData.totalTax,
          recommendations: this.generateQuarterlyRecommendations(ytdData, projectedData)
        }
      };

      return report;
    } catch (error) {
      logger.error('Error generating quarterly tax estimate:', error);
      throw error;
    }
  }

  async generateTaxLossHarvestingReport(session) {
    try {
      const { userId, parameters, dateRange } = session;
      
      // Get harvesting data
      const harvestingData = await this.getHarvestingData(userId, dateRange);
      
      const report = {
        type: 'tax_loss_harvesting_report',
        period: dateRange,
        summary: {
          totalOpportunities: harvestingData.opportunities.length,
          executed: harvestingData.executed.length,
          totalLosses: harvestingData.totalLosses,
          totalSavings: harvestingData.totalSavings
        },
        opportunities: parameters.includeOpportunities ? harvestingData.opportunities : null,
        executed: parameters.includeExecuted ? harvestingData.executed : null,
        savings: parameters.includeSavings ? {
          byMonth: harvestingData.savingsByMonth,
          byStrategy: harvestingData.savingsByStrategy,
          total: harvestingData.totalSavings
        } : null,
        recommendations: this.generateHarvestingRecommendations(harvestingData)
      };

      return report;
    } catch (error) {
      logger.error('Error generating tax loss harvesting report:', error);
      throw error;
    }
  }

  async generateWashSaleReport(session) {
    try {
      const { userId, parameters, dateRange } = session;
      
      // Get wash sale data
      const washSaleData = await this.getWashSaleData(userId, dateRange);
      
      const report = {
        type: 'wash_sale_report',
        period: dateRange,
        summary: {
          totalViolations: washSaleData.violations.length,
          totalDisallowed: washSaleData.totalDisallowed,
          totalTracking: washSaleData.tracking.length
        },
        violations: parameters.includeViolations ? washSaleData.violations : null,
        tracking: parameters.includeTracking ? washSaleData.tracking : null,
        recommendations: parameters.includeRecommendations ? 
          this.generateWashSaleRecommendations(washSaleData) : null
      };

      return report;
    } catch (error) {
      logger.error('Error generating wash sale report:', error);
      throw error;
    }
  }

  async getUserTaxData(userId, dateRange) {
    try {
      // Mock implementation - in reality would query tax database
      return {
        totalIncome: 100000,
        totalDeductions: 25000,
        taxableIncome: 75000,
        totalTax: 15000,
        effectiveRate: 0.15,
        marginalRate: 0.22,
        shortTermGains: 5000,
        longTermGains: 10000,
        totalCapitalGains: 15000,
        capitalGainsTax: 3000,
        qualifiedDividends: 2000,
        ordinaryDividends: 1000,
        totalDividends: 3000,
        dividendTax: 600,
        taxableInterest: 500,
        taxExemptInterest: 200,
        totalInterest: 700,
        interestTax: 100,
        transactions: []
      };
    } catch (error) {
      logger.error('Error fetching user tax data:', error);
      throw error;
    }
  }

  async getHarvestingData(userId, dateRange) {
    try {
      // Mock implementation - in reality would query harvesting database
      return {
        opportunities: [],
        executed: [],
        totalLosses: 5000,
        totalSavings: 1250,
        savingsByMonth: {},
        savingsByStrategy: {}
      };
    } catch (error) {
      logger.error('Error fetching harvesting data:', error);
      throw error;
    }
  }

  async getWashSaleData(userId, dateRange) {
    try {
      // Mock implementation - in reality would query wash sale database
      return {
        violations: [],
        totalDisallowed: 0,
        tracking: []
      };
    } catch (error) {
      logger.error('Error fetching wash sale data:', error);
      throw error;
    }
  }

  generateTaxRecommendations(taxData) {
    const recommendations = [];
    
    if (taxData.effectiveRate > 0.20) {
      recommendations.push({
        type: 'tax_efficiency',
        priority: 'high',
        description: 'Consider tax-loss harvesting to reduce effective tax rate',
        potentialSavings: taxData.totalTax * 0.1
      });
    }
    
    if (taxData.shortTermGains > taxData.longTermGains) {
      recommendations.push({
        type: 'holding_period',
        priority: 'medium',
        description: 'Consider holding positions longer to qualify for long-term capital gains rates',
        potentialSavings: (taxData.shortTermGains - taxData.longTermGains) * 0.17
      });
    }
    
    return recommendations;
  }

  generateQuarterlyRecommendations(ytdData, projectedData) {
    const recommendations = [];
    
    const remainingTax = projectedData.totalTax - ytdData.totalTax;
    const quarterlyEstimate = projectedData.totalTax / 4;
    
    if (remainingTax > quarterlyEstimate * 1.1) {
      recommendations.push({
        type: 'payment',
        priority: 'high',
        description: 'Consider making estimated tax payment to avoid penalties',
        amount: remainingTax - quarterlyEstimate
      });
    }
    
    return recommendations;
  }

  generateHarvestingRecommendations(harvestingData) {
    const recommendations = [];
    
    if (harvestingData.totalSavings < 1000) {
      recommendations.push({
        type: 'opportunity',
        priority: 'medium',
        description: 'Consider more aggressive tax-loss harvesting strategies',
        potentialSavings: 2000
      });
    }
    
    return recommendations;
  }

  generateWashSaleRecommendations(washSaleData) {
    const recommendations = [];
    
    if (washSaleData.violations.length > 0) {
      recommendations.push({
        type: 'compliance',
        priority: 'high',
        description: 'Review trading patterns to avoid wash sale violations',
        potentialSavings: washSaleData.totalDisallowed
      });
    }
    
    return recommendations;
  }

  projectFullYearTax(ytdData) {
    const monthsElapsed = new Date().getMonth() + 1;
    const projectionFactor = 12 / monthsElapsed;
    
    return {
      totalIncome: ytdData.totalIncome * projectionFactor,
      totalTax: ytdData.totalTax * projectionFactor,
      effectiveRate: ytdData.effectiveRate
    };
  }

  getCurrentQuarter() {
    const month = new Date().getMonth();
    return Math.floor(month / 3) + 1;
  }

  getDefaultDateRange(type) {
    const now = new Date();
    
    switch (type) {
      case 'annual':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31)
        };
      case 'quarterly':
        return {
          start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
          end: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 2, 31)
        };
      default:
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: now
        };
    }
  }

  generateDownloadUrl(sessionId) {
    return `/api/tax-optimization/reports/${sessionId}/download`;
  }

  async getReports(user) {
    try {
      const query = `
        SELECT id, template_id, status, created_at, completed_at
        FROM tax_reports
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const result = await this.db.query(query, [user.id]);
      
      return result.rows.map(row => ({
        id: row.id,
        templateId: row.template_id,
        status: row.status,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        downloadUrl: this.generateDownloadUrl(row.id)
      }));
    } catch (error) {
      logger.error('Error fetching tax reports:', error);
      throw error;
    }
  }

  async generateMonthlyReports() {
    try {
      logger.info('Generating monthly tax reports...');
      
      // Get all active users
      const users = await this.getActiveUsers();
      
      for (const user of users) {
        try {
          await this.generateReport({
            templateId: 'quarterly_tax_estimate',
            parameters: {},
            dateRange: this.getDefaultDateRange('quarterly')
          }, user);
        } catch (error) {
          logger.error(`Error generating report for user ${user.id}:`, error);
        }
      }
      
      logger.info('Monthly tax reports generated');
    } catch (error) {
      logger.error('Error generating monthly reports:', error);
    }
  }

  async getActiveUsers() {
    // Mock implementation - in reality would query user database
    return [];
  }

  async storeReport(session) {
    try {
      const query = `
        INSERT INTO tax_reports (
          id, user_id, template_id, parameters, date_range,
          report_data, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await this.db.query(query, [
        session.id,
        session.userId,
        session.templateId,
        JSON.stringify(session.parameters),
        JSON.stringify(session.dateRange),
        JSON.stringify(session.report),
        session.status,
        session.createdAt,
        session.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing tax report:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.reportingSessions.clear();
      logger.info('Tax Reporting Service closed successfully');
    } catch (error) {
      logger.error('Error closing Tax Reporting Service:', error);
    }
  }
}

module.exports = TaxReportingService;

