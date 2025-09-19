const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class TaxCalculationService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.calculationSessions = new Map();
    this.taxBrackets = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadTaxBrackets();
      logger.info('Tax Calculation Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Tax Calculation Service:', error);
      throw error;
    }
  }

  async loadTaxBrackets() {
    try {
      const brackets = [
        {
          year: 2024,
          filingStatus: 'single',
          brackets: [
            { min: 0, max: 11000, rate: 0.10 },
            { min: 11000, max: 44725, rate: 0.12 },
            { min: 44725, max: 95375, rate: 0.22 },
            { min: 95375, max: 182050, rate: 0.24 },
            { min: 182050, max: 231250, rate: 0.32 },
            { min: 231250, max: 578125, rate: 0.35 },
            { min: 578125, max: Infinity, rate: 0.37 }
          ]
        },
        {
          year: 2024,
          filingStatus: 'married_joint',
          brackets: [
            { min: 0, max: 22000, rate: 0.10 },
            { min: 22000, max: 89450, rate: 0.12 },
            { min: 89450, max: 190750, rate: 0.22 },
            { min: 190750, max: 364200, rate: 0.24 },
            { min: 364200, max: 462500, rate: 0.32 },
            { min: 462500, max: 693750, rate: 0.35 },
            { min: 693750, max: Infinity, rate: 0.37 }
          ]
        }
      ];

      for (const bracket of brackets) {
        const key = `${bracket.year}_${bracket.filingStatus}`;
        this.taxBrackets.set(key, bracket);
      }

      logger.info(`Loaded ${brackets.length} tax bracket sets`);
    } catch (error) {
      logger.error('Error loading tax brackets:', error);
    }
  }

  async calculateTax(data, user) {
    try {
      const { income, deductions, filingStatus, year, includeState } = data;
      
      const session = {
        id: uuidv4(),
        userId: user.id,
        income: income,
        deductions: deductions || {},
        filingStatus: filingStatus || 'single',
        year: year || new Date().getFullYear(),
        includeState: includeState || false,
        status: 'calculating',
        createdAt: new Date(),
        results: null
      };

      this.calculationSessions.set(session.id, session);

      // Calculate federal tax
      const federalTax = await this.calculateFederalTax(session);
      
      // Calculate state tax if requested
      const stateTax = session.includeState ? await this.calculateStateTax(session) : null;
      
      // Calculate total tax
      const totalTax = federalTax.total + (stateTax ? stateTax.total : 0);
      
      const results = {
        federal: federalTax,
        state: stateTax,
        total: {
          tax: totalTax,
          effectiveRate: totalTax / income,
          marginalRate: federalTax.marginalRate
        },
        recommendations: this.generateTaxRecommendations(session, federalTax, stateTax)
      };
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storeCalculationResults(session);

      logger.info(`Tax calculation completed for user ${user.id}`);

      return {
        sessionId: session.id,
        results: results
      };
    } catch (error) {
      logger.error('Tax calculation error:', error);
      throw error;
    }
  }

  async calculateFederalTax(session) {
    try {
      const { income, deductions, filingStatus, year } = session;
      
      // Get tax brackets
      const bracketKey = `${year}_${filingStatus}`;
      const brackets = this.taxBrackets.get(bracketKey);
      
      if (!brackets) {
        throw new Error(`Tax brackets not found for ${year} ${filingStatus}`);
      }
      
      // Calculate taxable income
      const standardDeduction = this.getStandardDeduction(filingStatus, year);
      const totalDeductions = this.calculateTotalDeductions(deductions, standardDeduction);
      const taxableIncome = Math.max(0, income - totalDeductions);
      
      // Calculate tax using brackets
      let totalTax = 0;
      let marginalRate = 0;
      let remainingIncome = taxableIncome;
      
      for (const bracket of brackets.brackets) {
        if (remainingIncome <= 0) break;
        
        const bracketIncome = Math.min(remainingIncome, bracket.max - bracket.min);
        const bracketTax = bracketIncome * bracket.rate;
        
        totalTax += bracketTax;
        marginalRate = bracket.rate;
        remainingIncome -= bracketIncome;
      }
      
      return {
        total: totalTax,
        taxableIncome: taxableIncome,
        effectiveRate: totalTax / income,
        marginalRate: marginalRate,
        deductions: {
          standard: standardDeduction,
          itemized: this.calculateItemizedDeductions(deductions),
          total: totalDeductions
        },
        brackets: this.calculateBracketBreakdown(taxableIncome, brackets.brackets)
      };
    } catch (error) {
      logger.error('Error calculating federal tax:', error);
      throw error;
    }
  }

  async calculateStateTax(session) {
    try {
      const { income, deductions, filingStatus, year } = session;
      
      // Mock implementation - in reality would use state-specific tax calculations
      const stateRate = 0.05; // 5% state tax rate
      const stateTax = income * stateRate;
      
      return {
        total: stateTax,
        rate: stateRate,
        effectiveRate: stateTax / income
      };
    } catch (error) {
      logger.error('Error calculating state tax:', error);
      throw error;
    }
  }

  getStandardDeduction(filingStatus, year) {
    const deductions = {
      2024: {
        single: 13850,
        married_joint: 27700,
        married_separate: 13850,
        head_of_household: 20800
      }
    };
    
    return deductions[year]?.[filingStatus] || 13850;
  }

  calculateTotalDeductions(deductions, standardDeduction) {
    const itemizedDeductions = this.calculateItemizedDeductions(deductions);
    return Math.max(standardDeduction, itemizedDeductions);
  }

  calculateItemizedDeductions(deductions) {
    let total = 0;
    
    if (deductions.mortgageInterest) total += deductions.mortgageInterest;
    if (deductions.stateTaxes) total += deductions.stateTaxes;
    if (deductions.propertyTax) total += deductions.propertyTax;
    if (deductions.charitable) total += deductions.charitable;
    if (deductions.medical) total += deductions.medical;
    
    return total;
  }

  calculateBracketBreakdown(taxableIncome, brackets) {
    const breakdown = [];
    let remainingIncome = taxableIncome;
    
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      
      const bracketIncome = Math.min(remainingIncome, bracket.max - bracket.min);
      const bracketTax = bracketIncome * bracket.rate;
      
      breakdown.push({
        min: bracket.min,
        max: bracket.max,
        rate: bracket.rate,
        income: bracketIncome,
        tax: bracketTax
      });
      
      remainingIncome -= bracketIncome;
    }
    
    return breakdown;
  }

  generateTaxRecommendations(session, federalTax, stateTax) {
    const recommendations = [];
    
    // Check if itemizing would be better
    const standardDeduction = this.getStandardDeduction(session.filingStatus, session.year);
    const itemizedDeductions = this.calculateItemizedDeductions(session.deductions);
    
    if (itemizedDeductions > standardDeduction) {
      recommendations.push({
        type: 'deduction',
        priority: 'high',
        description: 'Consider itemizing deductions instead of taking standard deduction',
        potentialSavings: (itemizedDeductions - standardDeduction) * federalTax.marginalRate
      });
    }
    
    // Check for tax optimization opportunities
    if (federalTax.effectiveRate > 0.20) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Consider tax-loss harvesting or retirement contributions',
        potentialSavings: session.income * 0.05
      });
    }
    
    return recommendations;
  }

  async getCalculations(user) {
    try {
      const query = `
        SELECT id, income, deductions, filing_status, year, 
               results, created_at, completed_at
        FROM tax_calculations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const result = await this.db.query(query, [user.id]);
      
      return result.rows.map(row => ({
        id: row.id,
        income: row.income,
        deductions: row.deductions,
        filingStatus: row.filing_status,
        year: row.year,
        results: row.results,
        createdAt: row.created_at,
        completedAt: row.completed_at
      }));
    } catch (error) {
      logger.error('Error fetching tax calculations:', error);
      throw error;
    }
  }

  async storeCalculationResults(session) {
    try {
      const query = `
        INSERT INTO tax_calculations (
          id, user_id, income, deductions, filing_status, year,
          results, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.query(query, [
        session.id,
        session.userId,
        session.income,
        JSON.stringify(session.deductions),
        session.filingStatus,
        session.year,
        JSON.stringify(session.results),
        session.status,
        session.createdAt,
        session.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing calculation results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.calculationSessions.clear();
      logger.info('Tax Calculation Service closed successfully');
    } catch (error) {
      logger.error('Error closing Tax Calculation Service:', error);
    }
  }
}

module.exports = TaxCalculationService;

