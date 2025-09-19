const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class TaxComplianceService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.complianceRules = new Map();
    this.complianceSessions = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadComplianceRules();
      logger.info('Tax Compliance Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Tax Compliance Service:', error);
      throw error;
    }
  }

  async loadComplianceRules() {
    try {
      const rules = [
        {
          id: 'wash_sale_rule',
          name: 'Wash Sale Rule',
          description: 'Prevents claiming losses on securities sold and repurchased within 30 days',
          type: 'trading',
          enabled: true,
          parameters: {
            washSalePeriod: 30,
            replacementWindow: 30
          }
        },
        {
          id: 'constructive_sale_rule',
          name: 'Constructive Sale Rule',
          description: 'Prevents avoiding tax on appreciated positions through short sales',
          type: 'trading',
          enabled: true,
          parameters: {
            appreciationThreshold: 0.1
          }
        },
        {
          id: 'straddle_rule',
          name: 'Straddle Rule',
          description: 'Prevents deferring losses on offsetting positions',
          type: 'trading',
          enabled: true,
          parameters: {
            offsetThreshold: 0.8
          }
        },
        {
          id: 'mark_to_market_rule',
          name: 'Mark-to-Market Rule',
          description: 'Requires certain traders to mark positions to market',
          type: 'trading',
          enabled: true,
          parameters: {
            tradingVolumeThreshold: 1000000
          }
        },
        {
          id: 'estimated_tax_rule',
          name: 'Estimated Tax Rule',
          description: 'Requires quarterly estimated tax payments',
          type: 'payment',
          enabled: true,
          parameters: {
            paymentThreshold: 1000,
            safeHarborPercentage: 0.9
          }
        }
      ];

      for (const rule of rules) {
        this.complianceRules.set(rule.id, rule);
      }

      logger.info(`Loaded ${rules.length} compliance rules`);
    } catch (error) {
      logger.error('Error loading compliance rules:', error);
    }
  }

  async getComplianceStatus(user) {
    try {
      const status = {
        overall: 'compliant',
        rules: [],
        violations: [],
        recommendations: [],
        lastChecked: new Date()
      };

      // Check each compliance rule
      for (const [ruleId, rule] of this.complianceRules) {
        if (!rule.enabled) continue;

        try {
          const ruleStatus = await this.checkComplianceRule(ruleId, user);
          status.rules.push(ruleStatus);

          if (ruleStatus.status === 'violation') {
            status.violations.push(ruleStatus);
            status.overall = 'non_compliant';
          }
        } catch (error) {
          logger.error(`Error checking compliance rule ${ruleId}:`, error);
        }
      }

      // Generate recommendations
      status.recommendations = this.generateComplianceRecommendations(status.rules);

      return status;
    } catch (error) {
      logger.error('Error getting compliance status:', error);
      throw error;
    }
  }

  async checkCompliance(data, user) {
    try {
      const { ruleId, parameters } = data;
      
      const rule = this.complianceRules.get(ruleId);
      if (!rule) {
        throw new Error(`Compliance rule ${ruleId} not found`);
      }

      const session = {
        id: uuidv4(),
        userId: user.id,
        ruleId: ruleId,
        parameters: parameters || rule.parameters,
        status: 'checking',
        createdAt: new Date(),
        results: null
      };

      this.complianceSessions.set(session.id, session);

      // Check compliance rule
      const results = await this.checkComplianceRule(ruleId, user, parameters);
      
      session.results = results;
      session.status = 'completed';
      session.completedAt = new Date();

      // Store results
      await this.storeComplianceResults(session);

      logger.info(`Compliance check completed for rule ${ruleId}`);

      return {
        sessionId: session.id,
        ruleId: ruleId,
        results: results
      };
    } catch (error) {
      logger.error('Compliance check error:', error);
      throw error;
    }
  }

  async checkComplianceRule(ruleId, user, parameters = null) {
    try {
      const rule = this.complianceRules.get(ruleId);
      if (!rule) return null;

      const params = parameters || rule.parameters;

      switch (ruleId) {
        case 'wash_sale_rule':
          return await this.checkWashSaleRule(user, params);
        case 'constructive_sale_rule':
          return await this.checkConstructiveSaleRule(user, params);
        case 'straddle_rule':
          return await this.checkStraddleRule(user, params);
        case 'mark_to_market_rule':
          return await this.checkMarkToMarketRule(user, params);
        case 'estimated_tax_rule':
          return await this.checkEstimatedTaxRule(user, params);
        default:
          return {
            ruleId: ruleId,
            status: 'unknown',
            message: 'Unknown compliance rule'
          };
      }
    } catch (error) {
      logger.error(`Error checking compliance rule ${ruleId}:`, error);
      return {
        ruleId: ruleId,
        status: 'error',
        message: error.message
      };
    }
  }

  async checkWashSaleRule(user, parameters) {
    try {
      const { washSalePeriod } = parameters;
      
      // Get recent transactions
      const transactions = await this.getRecentTransactions(user.id, washSalePeriod);
      
      const violations = [];
      const washSaleGroups = this.groupWashSaleTransactions(transactions);
      
      for (const group of washSaleGroups) {
        if (group.violations.length > 0) {
          violations.push({
            symbol: group.symbol,
            violations: group.violations,
            totalDisallowed: group.totalDisallowed
          });
        }
      }
      
      return {
        ruleId: 'wash_sale_rule',
        status: violations.length > 0 ? 'violation' : 'compliant',
        violations: violations,
        totalViolations: violations.length,
        totalDisallowed: violations.reduce((sum, v) => sum + v.totalDisallowed, 0),
        message: violations.length > 0 ? 
          `Found ${violations.length} wash sale violations` : 
          'No wash sale violations found'
      };
    } catch (error) {
      logger.error('Error checking wash sale rule:', error);
      throw error;
    }
  }

  async checkConstructiveSaleRule(user, parameters) {
    try {
      const { appreciationThreshold } = parameters;
      
      // Get positions with significant appreciation
      const positions = await this.getAppreciatedPositions(user.id, appreciationThreshold);
      
      const violations = [];
      
      for (const position of positions) {
        // Check for short sales of same or substantially identical securities
        const shortSales = await this.getShortSales(user.id, position.symbol);
        
        if (shortSales.length > 0) {
          violations.push({
            symbol: position.symbol,
            appreciation: position.appreciation,
            shortSales: shortSales,
            constructiveSale: true
          });
        }
      }
      
      return {
        ruleId: 'constructive_sale_rule',
        status: violations.length > 0 ? 'violation' : 'compliant',
        violations: violations,
        totalViolations: violations.length,
        message: violations.length > 0 ? 
          `Found ${violations.length} constructive sale violations` : 
          'No constructive sale violations found'
      };
    } catch (error) {
      logger.error('Error checking constructive sale rule:', error);
      throw error;
    }
  }

  async checkStraddleRule(user, parameters) {
    try {
      const { offsetThreshold } = parameters;
      
      // Get offsetting positions
      const straddles = await this.getStraddlePositions(user.id, offsetThreshold);
      
      const violations = [];
      
      for (const straddle of straddles) {
        if (straddle.offsetRatio >= offsetThreshold) {
          violations.push({
            positions: straddle.positions,
            offsetRatio: straddle.offsetRatio,
            totalLoss: straddle.totalLoss
          });
        }
      }
      
      return {
        ruleId: 'straddle_rule',
        status: violations.length > 0 ? 'violation' : 'compliant',
        violations: violations,
        totalViolations: violations.length,
        message: violations.length > 0 ? 
          `Found ${violations.length} straddle violations` : 
          'No straddle violations found'
      };
    } catch (error) {
      logger.error('Error checking straddle rule:', error);
      throw error;
    }
  }

  async checkMarkToMarketRule(user, parameters) {
    try {
      const { tradingVolumeThreshold } = parameters;
      
      // Get trading volume for the year
      const tradingVolume = await this.getTradingVolume(user.id);
      
      const isMarkToMarket = tradingVolume >= tradingVolumeThreshold;
      
      return {
        ruleId: 'mark_to_market_rule',
        status: isMarkToMarket ? 'applicable' : 'not_applicable',
        tradingVolume: tradingVolume,
        threshold: tradingVolumeThreshold,
        message: isMarkToMarket ? 
          'Mark-to-market rule applies' : 
          'Mark-to-market rule does not apply'
      };
    } catch (error) {
      logger.error('Error checking mark-to-market rule:', error);
      throw error;
    }
  }

  async checkEstimatedTaxRule(user, parameters) {
    try {
      const { paymentThreshold, safeHarborPercentage } = parameters;
      
      // Get current year tax liability
      const currentYearTax = await this.getCurrentYearTax(user.id);
      const previousYearTax = await this.getPreviousYearTax(user.id);
      
      const estimatedTaxRequired = Math.max(
        currentYearTax * safeHarborPercentage,
        previousYearTax
      );
      
      const paymentsMade = await this.getEstimatedTaxPayments(user.id);
      const remainingRequired = estimatedTaxRequired - paymentsMade;
      
      const isCompliant = remainingRequired <= paymentThreshold;
      
      return {
        ruleId: 'estimated_tax_rule',
        status: isCompliant ? 'compliant' : 'violation',
        currentYearTax: currentYearTax,
        previousYearTax: previousYearTax,
        estimatedTaxRequired: estimatedTaxRequired,
        paymentsMade: paymentsMade,
        remainingRequired: remainingRequired,
        message: isCompliant ? 
          'Estimated tax requirements met' : 
          `Estimated tax shortfall: $${remainingRequired}`
      };
    } catch (error) {
      logger.error('Error checking estimated tax rule:', error);
      throw error;
    }
  }

  groupWashSaleTransactions(transactions) {
    const groups = new Map();
    
    for (const transaction of transactions) {
      const key = transaction.symbol;
      if (!groups.has(key)) {
        groups.set(key, {
          symbol: key,
          transactions: [],
          violations: [],
          totalDisallowed: 0
        });
      }
      
      groups.get(key).transactions.push(transaction);
    }
    
    // Check for wash sale violations within each group
    for (const group of groups.values()) {
      const violations = this.findWashSaleViolations(group.transactions);
      group.violations = violations;
      group.totalDisallowed = violations.reduce((sum, v) => sum + v.disallowedAmount, 0);
    }
    
    return Array.from(groups.values());
  }

  findWashSaleViolations(transactions) {
    const violations = [];
    const sortedTransactions = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (let i = 0; i < sortedTransactions.length; i++) {
      const sale = sortedTransactions[i];
      if (sale.type !== 'sell' || sale.gainLoss >= 0) continue;
      
      // Look for replacement purchases within 30 days
      for (let j = i + 1; j < sortedTransactions.length; j++) {
        const purchase = sortedTransactions[j];
        if (purchase.type !== 'buy') continue;
        
        const daysDifference = Math.abs(new Date(purchase.date) - new Date(sale.date)) / (1000 * 60 * 60 * 24);
        
        if (daysDifference <= 30) {
          violations.push({
            saleTransaction: sale,
            purchaseTransaction: purchase,
            daysDifference: Math.floor(daysDifference),
            disallowedAmount: Math.min(Math.abs(sale.gainLoss), purchase.quantity * purchase.price)
          });
        }
      }
    }
    
    return violations;
  }

  generateComplianceRecommendations(rules) {
    const recommendations = [];
    
    for (const rule of rules) {
      if (rule.status === 'violation') {
        recommendations.push({
          type: 'compliance',
          priority: 'high',
          description: `Address ${rule.ruleId} violations`,
          action: this.getComplianceAction(rule.ruleId)
        });
      }
    }
    
    return recommendations;
  }

  getComplianceAction(ruleId) {
    const actions = {
      'wash_sale_rule': 'Avoid repurchasing sold securities within 30 days',
      'constructive_sale_rule': 'Close short positions before year-end',
      'straddle_rule': 'Close offsetting positions or mark to market',
      'estimated_tax_rule': 'Make estimated tax payments'
    };
    
    return actions[ruleId] || 'Review compliance requirements';
  }

  // Mock helper methods
  async getRecentTransactions(userId, days) {
    // Mock implementation - in reality would query transaction database
    return [];
  }

  async getAppreciatedPositions(userId, threshold) {
    // Mock implementation - in reality would query position database
    return [];
  }

  async getShortSales(userId, symbol) {
    // Mock implementation - in reality would query transaction database
    return [];
  }

  async getStraddlePositions(userId, threshold) {
    // Mock implementation - in reality would query position database
    return [];
  }

  async getTradingVolume(userId) {
    // Mock implementation - in reality would query transaction database
    return 500000;
  }

  async getCurrentYearTax(userId) {
    // Mock implementation - in reality would query tax database
    return 15000;
  }

  async getPreviousYearTax(userId) {
    // Mock implementation - in reality would query tax database
    return 12000;
  }

  async getEstimatedTaxPayments(userId) {
    // Mock implementation - in reality would query payment database
    return 5000;
  }

  async storeComplianceResults(session) {
    try {
      const query = `
        INSERT INTO compliance_checks (
          id, user_id, rule_id, parameters, results, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await this.db.query(query, [
        session.id,
        session.userId,
        session.ruleId,
        JSON.stringify(session.parameters),
        JSON.stringify(session.results),
        session.status,
        session.createdAt,
        session.completedAt
      ]);
    } catch (error) {
      logger.error('Error storing compliance results:', error);
      throw error;
    }
  }

  async close() {
    try {
      this.complianceSessions.clear();
      logger.info('Tax Compliance Service closed successfully');
    } catch (error) {
      logger.error('Error closing Tax Compliance Service:', error);
    }
  }
}

module.exports = TaxComplianceService;

