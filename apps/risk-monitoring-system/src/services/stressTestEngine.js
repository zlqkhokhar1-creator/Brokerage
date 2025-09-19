const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { connectRedis } = require('./redis');
const { connectDatabase } = require('./database');

class StressTestEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.db = null;
    this.stressTests = new Map();
    this.scenarios = new Map();
  }

  async initialize() {
    try {
      this.redis = await connectRedis();
      this.db = await connectDatabase();
      await this.loadDefaultScenarios();
      logger.info('Stress Test Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Stress Test Engine:', error);
      throw error;
    }
  }

  async loadDefaultScenarios() {
    try {
      const defaultScenarios = [
        {
          id: 'market_crash',
          name: 'Market Crash',
          description: 'Simulate a 2008-style market crash',
          parameters: {
            equityShock: -0.30, // -30% equity shock
            bondShock: -0.10,   // -10% bond shock
            volatilitySpike: 0.50, // 50% volatility increase
            correlationIncrease: 0.20 // 20% correlation increase
          }
        },
        {
          id: 'interest_rate_shock',
          name: 'Interest Rate Shock',
          description: 'Simulate a sudden interest rate increase',
          parameters: {
            rateShock: 0.03, // 3% rate increase
            bondShock: -0.15, // -15% bond shock
            equityShock: -0.10, // -10% equity shock
            duration: 1 // 1 year duration
          }
        },
        {
          id: 'volatility_spike',
          name: 'Volatility Spike',
          description: 'Simulate a VIX spike scenario',
          parameters: {
            volatilityMultiplier: 3.0, // 3x normal volatility
            correlationIncrease: 0.30, // 30% correlation increase
            liquidityReduction: 0.50 // 50% liquidity reduction
          }
        },
        {
          id: 'sector_crash',
          name: 'Sector Crash',
          description: 'Simulate a specific sector crash',
          parameters: {
            sectorShock: -0.40, // -40% sector shock
            affectedSectors: ['technology', 'healthcare'],
            spilloverEffect: 0.10 // 10% spillover to other sectors
          }
        },
        {
          id: 'currency_crisis',
          name: 'Currency Crisis',
          description: 'Simulate a currency crisis',
          parameters: {
            currencyShock: -0.25, // -25% currency shock
            emergingMarketShock: -0.35, // -35% EM shock
            commodityShock: -0.20 // -20% commodity shock
          }
        },
        {
          id: 'liquidity_crisis',
          name: 'Liquidity Crisis',
          description: 'Simulate a liquidity crisis',
          parameters: {
            liquidityReduction: 0.80, // 80% liquidity reduction
            spreadIncrease: 5.0, // 5x spread increase
            forcedLiquidation: 0.20 // 20% forced liquidation
          }
        }
      ];

      for (const scenario of defaultScenarios) {
        this.scenarios.set(scenario.id, scenario);
      }

      logger.info(`Loaded ${defaultScenarios.length} default stress test scenarios`);
    } catch (error) {
      logger.error('Error loading default scenarios:', error);
    }
  }

  async runStressTest(portfolioId, scenarios, positions, userId) {
    try {
      const testId = uuidv4();
      const startTime = Date.now();
      
      // Validate scenarios
      const validScenarios = scenarios.filter(scenarioId => this.scenarios.has(scenarioId));
      if (validScenarios.length === 0) {
        throw new Error('No valid scenarios provided');
      }
      
      // Create stress test record
      const stressTest = {
        id: testId,
        portfolioId,
        userId,
        scenarios: validScenarios,
        positions: positions,
        status: 'running',
        results: {},
        createdAt: new Date(),
        startedAt: new Date()
      };
      
      // Store in database
      await this.storeStressTest(stressTest);
      this.stressTests.set(testId, stressTest);
      
      // Run stress tests for each scenario
      const results = {};
      
      for (const scenarioId of validScenarios) {
        try {
          const scenario = this.scenarios.get(scenarioId);
          const scenarioResult = await this.runScenarioStressTest(
            scenario, positions, portfolioId
          );
          results[scenarioId] = scenarioResult;
        } catch (error) {
          logger.error(`Error running stress test scenario ${scenarioId}:`, error);
          results[scenarioId] = {
            error: error.message,
            status: 'failed'
          };
        }
      }
      
      // Calculate aggregate results
      const aggregateResults = this.calculateAggregateResults(results, positions);
      
      // Update stress test with results
      stressTest.results = results;
      stressTest.aggregateResults = aggregateResults;
      stressTest.status = 'completed';
      stressTest.completedAt = new Date();
      stressTest.duration = Date.now() - startTime;
      
      // Store updated results
      await this.updateStressTest(stressTest);
      
      logger.info(`Stress test ${testId} completed`, {
        portfolioId,
        scenarios: validScenarios.length,
        duration: stressTest.duration
      });
      
      this.emit('stressTestCompleted', stressTest);
      
      return stressTest;
    } catch (error) {
      logger.error('Error running stress test:', error);
      throw error;
    }
  }

  async runScenarioStressTest(scenario, positions, portfolioId) {
    try {
      const { parameters } = scenario;
      const results = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        parameters,
        positionResults: [],
        portfolioImpact: {},
        status: 'completed'
      };
      
      let totalValue = 0;
      let totalLoss = 0;
      
      // Apply stress to each position
      for (const position of positions) {
        const positionResult = this.applyStressToPosition(position, parameters);
        results.positionResults.push(positionResult);
        
        totalValue += positionResult.originalValue;
        totalLoss += positionResult.stressLoss;
      }
      
      // Calculate portfolio-level impact
      results.portfolioImpact = {
        originalValue: totalValue,
        stressedValue: totalValue - totalLoss,
        totalLoss: totalLoss,
        lossPercentage: totalValue > 0 ? (totalLoss / totalValue) * 100 : 0,
        maxDrawdown: this.calculateMaxDrawdown(results.positionResults),
        worstPosition: this.findWorstPosition(results.positionResults)
      };
      
      return results;
    } catch (error) {
      logger.error(`Error running scenario stress test ${scenario.id}:`, error);
      return {
        scenarioId: scenario.id,
        error: error.message,
        status: 'failed'
      };
    }
  }

  applyStressToPosition(position, parameters) {
    try {
      const originalValue = position.quantity * position.price;
      let stressMultiplier = 1.0;
      
      // Apply equity shock
      if (parameters.equityShock && this.isEquityAsset(position.symbol)) {
        stressMultiplier += parameters.equityShock;
      }
      
      // Apply bond shock
      if (parameters.bondShock && this.isBondAsset(position.symbol)) {
        stressMultiplier += parameters.bondShock;
      }
      
      // Apply sector shock
      if (parameters.sectorShock && this.isAffectedSector(position.symbol, parameters.affectedSectors)) {
        stressMultiplier += parameters.sectorShock;
      }
      
      // Apply currency shock
      if (parameters.currencyShock && this.isCurrencyAsset(position.symbol)) {
        stressMultiplier += parameters.currencyShock;
      }
      
      // Apply volatility adjustment
      if (parameters.volatilityMultiplier) {
        const volatilityAdjustment = (parameters.volatilityMultiplier - 1) * 0.1; // 10% per volatility unit
        stressMultiplier += volatilityAdjustment;
      }
      
      // Apply liquidity adjustment
      if (parameters.liquidityReduction) {
        const liquidityAdjustment = -parameters.liquidityReduction * 0.05; // 5% per liquidity unit
        stressMultiplier += liquidityAdjustment;
      }
      
      // Ensure multiplier is not negative
      stressMultiplier = Math.max(0.1, stressMultiplier);
      
      const stressedValue = originalValue * stressMultiplier;
      const stressLoss = originalValue - stressedValue;
      
      return {
        symbol: position.symbol,
        quantity: position.quantity,
        originalPrice: position.price,
        stressedPrice: position.price * stressMultiplier,
        originalValue,
        stressedValue,
        stressLoss,
        lossPercentage: originalValue > 0 ? (stressLoss / originalValue) * 100 : 0,
        stressMultiplier
      };
    } catch (error) {
      logger.error(`Error applying stress to position ${position.symbol}:`, error);
      return {
        symbol: position.symbol,
        error: error.message,
        status: 'failed'
      };
    }
  }

  isEquityAsset(symbol) {
    // Simple heuristic - in reality, this would check against a database
    const equityIndicators = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA'];
    return equityIndicators.some(indicator => symbol.includes(indicator)) || 
           symbol.endsWith('.ST') || symbol.endsWith('.L');
  }

  isBondAsset(symbol) {
    // Simple heuristic for bond identification
    return symbol.includes('BOND') || symbol.includes('TREASURY') || 
           symbol.includes('CORP') || symbol.endsWith('.BOND');
  }

  isAffectedSector(symbol, affectedSectors) {
    // Simple sector mapping - in reality, this would use a proper sector database
    const sectorMap = {
      'technology': ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'META'],
      'healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV'],
      'financial': ['JPM', 'BAC', 'WFC', 'GS'],
      'energy': ['XOM', 'CVX', 'COP', 'EOG']
    };
    
    if (!affectedSectors) return false;
    
    return affectedSectors.some(sector => {
      const symbols = sectorMap[sector] || [];
      return symbols.some(s => symbol.includes(s));
    });
  }

  isCurrencyAsset(symbol) {
    // Simple currency identification
    return symbol.includes('USD') || symbol.includes('EUR') || 
           symbol.includes('GBP') || symbol.includes('JPY') ||
           symbol.endsWith('.FX');
  }

  calculateMaxDrawdown(positionResults) {
    try {
      let maxDrawdown = 0;
      let peak = 0;
      let currentValue = 0;
      
      for (const result of positionResults) {
        if (result.originalValue) {
          currentValue += result.stressedValue;
          
          if (currentValue > peak) {
            peak = currentValue;
          }
          
          const drawdown = peak > 0 ? (peak - currentValue) / peak : 0;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
      }
      
      return maxDrawdown * 100; // Convert to percentage
    } catch (error) {
      logger.error('Error calculating max drawdown:', error);
      return 0;
    }
  }

  findWorstPosition(positionResults) {
    try {
      let worstPosition = null;
      let worstLoss = 0;
      
      for (const result of positionResults) {
        if (result.lossPercentage && result.lossPercentage > worstLoss) {
          worstLoss = result.lossPercentage;
          worstPosition = result;
        }
      }
      
      return worstPosition;
    } catch (error) {
      logger.error('Error finding worst position:', error);
      return null;
    }
  }

  calculateAggregateResults(results, positions) {
    try {
      const aggregateResults = {
        totalScenarios: Object.keys(results).length,
        successfulScenarios: 0,
        failedScenarios: 0,
        averageLoss: 0,
        maxLoss: 0,
        minLoss: Infinity,
        worstScenario: null,
        bestScenario: null
      };
      
      let totalLoss = 0;
      let scenarioCount = 0;
      
      for (const [scenarioId, result] of Object.entries(results)) {
        if (result.status === 'completed' && result.portfolioImpact) {
          aggregateResults.successfulScenarios++;
          
          const lossPercentage = result.portfolioImpact.lossPercentage;
          totalLoss += lossPercentage;
          scenarioCount++;
          
          if (lossPercentage > aggregateResults.maxLoss) {
            aggregateResults.maxLoss = lossPercentage;
            aggregateResults.worstScenario = {
              scenarioId,
              scenarioName: result.scenarioName,
              lossPercentage
            };
          }
          
          if (lossPercentage < aggregateResults.minLoss) {
            aggregateResults.minLoss = lossPercentage;
            aggregateResults.bestScenario = {
              scenarioId,
              scenarioName: result.scenarioName,
              lossPercentage
            };
          }
        } else {
          aggregateResults.failedScenarios++;
        }
      }
      
      aggregateResults.averageLoss = scenarioCount > 0 ? totalLoss / scenarioCount : 0;
      aggregateResults.minLoss = aggregateResults.minLoss === Infinity ? 0 : aggregateResults.minLoss;
      
      return aggregateResults;
    } catch (error) {
      logger.error('Error calculating aggregate results:', error);
      return {
        totalScenarios: 0,
        successfulScenarios: 0,
        failedScenarios: 0,
        averageLoss: 0,
        maxLoss: 0,
        minLoss: 0,
        worstScenario: null,
        bestScenario: null
      };
    }
  }

  async getStressTest(testId, userId) {
    try {
      // Check cache first
      const cached = this.stressTests.get(testId);
      if (cached && cached.userId === userId) {
        return cached;
      }
      
      // Load from database
      const query = `
        SELECT * FROM stress_tests 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [testId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const stressTest = result.rows[0];
      this.stressTests.set(testId, stressTest);
      
      return stressTest;
    } catch (error) {
      logger.error(`Error getting stress test ${testId}:`, error);
      return null;
    }
  }

  async storeStressTest(stressTest) {
    try {
      const query = `
        INSERT INTO stress_tests (
          id, portfolio_id, user_id, scenarios, positions, status, 
          results, aggregate_results, created_at, started_at, completed_at, duration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      await this.db.query(query, [
        stressTest.id,
        stressTest.portfolioId,
        stressTest.userId,
        JSON.stringify(stressTest.scenarios),
        JSON.stringify(stressTest.positions),
        stressTest.status,
        JSON.stringify(stressTest.results),
        JSON.stringify(stressTest.aggregateResults),
        stressTest.createdAt,
        stressTest.startedAt,
        stressTest.completedAt,
        stressTest.duration
      ]);
    } catch (error) {
      logger.error('Error storing stress test:', error);
      throw error;
    }
  }

  async updateStressTest(stressTest) {
    try {
      const query = `
        UPDATE stress_tests 
        SET status = $1, results = $2, aggregate_results = $3, 
            completed_at = $4, duration = $5
        WHERE id = $6
      `;
      
      await this.db.query(query, [
        stressTest.status,
        JSON.stringify(stressTest.results),
        JSON.stringify(stressTest.aggregateResults),
        stressTest.completedAt,
        stressTest.duration,
        stressTest.id
      ]);
    } catch (error) {
      logger.error('Error updating stress test:', error);
      throw error;
    }
  }

  async getAvailableScenarios() {
    try {
      return Array.from(this.scenarios.values());
    } catch (error) {
      logger.error('Error getting available scenarios:', error);
      return [];
    }
  }

  async addCustomScenario(scenario) {
    try {
      const scenarioId = scenario.id || uuidv4();
      const customScenario = {
        id: scenarioId,
        name: scenario.name,
        description: scenario.description,
        parameters: scenario.parameters,
        isCustom: true,
        createdAt: new Date()
      };
      
      this.scenarios.set(scenarioId, customScenario);
      
      // Store in database
      const query = `
        INSERT INTO stress_test_scenarios (
          id, name, description, parameters, is_custom, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await this.db.query(query, [
        scenarioId,
        customScenario.name,
        customScenario.description,
        JSON.stringify(customScenario.parameters),
        true,
        customScenario.createdAt
      ]);
      
      logger.info(`Custom stress test scenario added: ${scenarioId}`);
      return customScenario;
    } catch (error) {
      logger.error('Error adding custom scenario:', error);
      throw error;
    }
  }

  async close() {
    try {
      logger.info('Stress Test Engine closed successfully');
    } catch (error) {
      logger.error('Error closing Stress Test Engine:', error);
    }
  }
}

module.exports = StressTestEngine;

