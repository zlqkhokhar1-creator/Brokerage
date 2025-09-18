const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class ABTestingEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.tests = new Map();
    this.testResults = new Map();
    this.userAssignments = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load active tests
      await this.loadActiveTests();
      
      // Load test results
      await this.loadTestResults();
      
      this._initialized = true;
      logger.info('ABTestingEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ABTestingEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ABTestingEngine closed');
    } catch (error) {
      logger.error('Error closing ABTestingEngine:', error);
    }
  }

  async loadActiveTests() {
    try {
      const result = await pool.query(`
        SELECT * FROM ab_tests
        WHERE status IN ('active', 'running', 'paused')
        ORDER BY created_at DESC
      `);
      
      for (const test of result.rows) {
        this.tests.set(test.id, {
          ...test,
          variants: test.variants ? JSON.parse(test.variants) : [],
          traffic_split: test.traffic_split ? JSON.parse(test.traffic_split) : {},
          configuration: test.configuration ? JSON.parse(test.configuration) : {},
          metadata: test.metadata ? JSON.parse(test.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} active A/B tests`);
    } catch (error) {
      logger.error('Error loading active tests:', error);
      throw error;
    }
  }

  async loadTestResults() {
    try {
      const result = await pool.query(`
        SELECT * FROM ab_test_results
        WHERE created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 1000
      `);
      
      for (const result of result.rows) {
        this.testResults.set(result.id, {
          ...result,
          data: result.data ? JSON.parse(result.data) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} test results`);
    } catch (error) {
      logger.error('Error loading test results:', error);
      throw error;
    }
  }

  async createTest(name, variants, trafficSplit, duration, userId) {
    try {
      const testId = nanoid();
      const now = new Date();
      const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      
      // Validate test parameters
      this.validateTestParameters(variants, trafficSplit);
      
      // Create test
      const test = {
        id: testId,
        name,
        variants: variants,
        traffic_split: trafficSplit,
        duration: duration,
        status: 'active',
        start_date: now,
        end_date: endDate,
        configuration: {},
        metadata: {},
        created_by: userId,
        created_at: now,
        updated_at: now
      };
      
      // Store test
      await this.storeTest(test);
      
      // Cache test
      this.tests.set(testId, test);
      
      // Emit event
      this.emit('testCreated', test);
      
      logger.info(`A/B test created: ${testId}`, {
        name,
        variants: variants.length,
        duration
      });
      
      return test;
    } catch (error) {
      logger.error('Error creating A/B test:', error);
      throw error;
    }
  }

  async getTest(testId, userId) {
    try {
      // Check cache first
      if (this.tests.has(testId)) {
        return this.tests.get(testId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM ab_tests
        WHERE id = $1 AND created_by = $2
      `, [testId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('A/B test not found');
      }
      
      const test = {
        ...result.rows[0],
        variants: result.rows[0].variants ? JSON.parse(result.rows[0].variants) : [],
        traffic_split: result.rows[0].traffic_split ? JSON.parse(result.rows[0].traffic_split) : {},
        configuration: result.rows[0].configuration ? JSON.parse(result.rows[0].configuration) : {},
        metadata: result.rows[0].metadata ? JSON.parse(result.rows[0].metadata) : {}
      };
      
      // Cache test
      this.tests.set(testId, test);
      
      return test;
    } catch (error) {
      logger.error('Error getting A/B test:', error);
      throw error;
    }
  }

  async updateTest(testId, updates, userId) {
    try {
      const test = await this.getTest(testId, userId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      // Validate updates
      if (updates.variants) {
        this.validateTestParameters(updates.variants, updates.trafficSplit || test.traffic_split);
      }
      
      // Update test
      const updatedTest = {
        ...test,
        ...updates,
        updated_at: new Date()
      };
      
      // Update database
      await this.updateTestInDatabase(updatedTest);
      
      // Update cache
      this.tests.set(testId, updatedTest);
      
      // Emit event
      this.emit('testUpdated', updatedTest);
      
      logger.info(`A/B test updated: ${testId}`, { updates: Object.keys(updates) });
      
      return updatedTest;
    } catch (error) {
      logger.error('Error updating A/B test:', error);
      throw error;
    }
  }

  async deleteTest(testId, userId) {
    try {
      const test = await this.getTest(testId, userId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      // Soft delete
      await pool.query(`
        UPDATE ab_tests
        SET status = 'deleted', updated_at = $1
        WHERE id = $2
      `, [new Date(), testId]);
      
      // Remove from cache
      this.tests.delete(testId);
      
      // Emit event
      this.emit('testDeleted', { testId, deletedAt: new Date() });
      
      logger.info(`A/B test deleted: ${testId}`);
      
      return { success: true, testId };
    } catch (error) {
      logger.error('Error deleting A/B test:', error);
      throw error;
    }
  }

  async assignUserToVariant(testId, userId) {
    try {
      const test = this.tests.get(testId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      if (test.status !== 'active') {
        throw new Error('A/B test is not active');
      }
      
      // Check if user is already assigned
      const assignmentKey = `${testId}:${userId}`;
      if (this.userAssignments.has(assignmentKey)) {
        return this.userAssignments.get(assignmentKey);
      }
      
      // Assign user to variant based on traffic split
      const variant = this.assignVariant(test.traffic_split, userId);
      
      // Store assignment
      const assignment = {
        test_id: testId,
        user_id: userId,
        variant: variant,
        assigned_at: new Date()
      };
      
      await this.storeUserAssignment(assignment);
      
      // Cache assignment
      this.userAssignments.set(assignmentKey, assignment);
      
      logger.debug(`User assigned to variant: ${userId} -> ${variant}`, { testId });
      
      return assignment;
    } catch (error) {
      logger.error('Error assigning user to variant:', error);
      throw error;
    }
  }

  async recordTestEvent(testId, userId, eventType, eventData) {
    try {
      const test = this.tests.get(testId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      // Get user's variant assignment
      const assignment = await this.getUserAssignment(testId, userId);
      if (!assignment) {
        throw new Error('User not assigned to test variant');
      }
      
      // Create test result
      const result = {
        id: nanoid(),
        test_id: testId,
        user_id: userId,
        variant: assignment.variant,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date()
      };
      
      // Store result
      await this.storeTestResult(result);
      
      // Cache result
      this.testResults.set(result.id, result);
      
      // Emit event
      this.emit('testEventRecorded', result);
      
      logger.debug(`Test event recorded: ${testId}`, {
        userId,
        variant: assignment.variant,
        eventType
      });
      
      return result;
    } catch (error) {
      logger.error('Error recording test event:', error);
      throw error;
    }
  }

  async getTestResults(testId, userId) {
    try {
      const test = await this.getTest(testId, userId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      const result = await pool.query(`
        SELECT 
          variant,
          event_type,
          COUNT(*) as event_count,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(EXTRACT(EPOCH FROM (created_at - (SELECT assigned_at FROM user_assignments WHERE test_id = $1 AND user_id = ab_test_results.user_id LIMIT 1)))) as avg_time_to_event
        FROM ab_test_results
        WHERE test_id = $1
        GROUP BY variant, event_type
        ORDER BY variant, event_type
      `, [testId]);
      
      return result.rows.map(row => ({
        ...row,
        event_count: parseInt(row.event_count),
        unique_users: parseInt(row.unique_users),
        avg_time_to_event: parseFloat(row.avg_time_to_event) || 0
      }));
    } catch (error) {
      logger.error('Error getting test results:', error);
      throw error;
    }
  }

  async analyzeTestResults(testId, userId) {
    try {
      const test = await this.getTest(testId, userId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      const results = await this.getTestResults(testId, userId);
      
      // Analyze results by variant
      const analysis = this.analyzeResultsByVariant(results, test.variants);
      
      // Calculate statistical significance
      const significance = this.calculateStatisticalSignificance(analysis);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(analysis, significance);
      
      const testAnalysis = {
        test_id: testId,
        analysis: analysis,
        significance: significance,
        recommendations: recommendations,
        analyzed_at: new Date()
      };
      
      // Store analysis
      await this.storeTestAnalysis(testAnalysis);
      
      logger.info(`Test results analyzed: ${testId}`, {
        variants: Object.keys(analysis).length,
        significance: significance.overall_significance
      });
      
      return testAnalysis;
    } catch (error) {
      logger.error('Error analyzing test results:', error);
      throw error;
    }
  }

  async pauseTest(testId, userId) {
    try {
      const test = await this.getTest(testId, userId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      // Update test status
      await this.updateTest(testId, { status: 'paused' }, userId);
      
      logger.info(`A/B test paused: ${testId}`);
      
      return { success: true, testId, status: 'paused' };
    } catch (error) {
      logger.error('Error pausing A/B test:', error);
      throw error;
    }
  }

  async resumeTest(testId, userId) {
    try {
      const test = await this.getTest(testId, userId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      // Update test status
      await this.updateTest(testId, { status: 'active' }, userId);
      
      logger.info(`A/B test resumed: ${testId}`);
      
      return { success: true, testId, status: 'active' };
    } catch (error) {
      logger.error('Error resuming A/B test:', error);
      throw error;
    }
  }

  async stopTest(testId, userId) {
    try {
      const test = await this.getTest(testId, userId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      // Update test status
      await this.updateTest(testId, { 
        status: 'completed',
        end_date: new Date()
      }, userId);
      
      // Analyze final results
      const analysis = await this.analyzeTestResults(testId, userId);
      
      logger.info(`A/B test stopped: ${testId}`, {
        final_analysis: analysis.analysis
      });
      
      return { success: true, testId, status: 'completed', analysis };
    } catch (error) {
      logger.error('Error stopping A/B test:', error);
      throw error;
    }
  }

  validateTestParameters(variants, trafficSplit) {
    try {
      if (!Array.isArray(variants) || variants.length < 2) {
        throw new Error('A/B test must have at least 2 variants');
      }
      
      if (!trafficSplit || typeof trafficSplit !== 'object') {
        throw new Error('Traffic split must be an object');
      }
      
      // Validate traffic split percentages
      const totalPercentage = Object.values(trafficSplit).reduce((sum, percentage) => sum + percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Traffic split percentages must sum to 100');
      }
      
      // Validate variant names
      for (const variant of variants) {
        if (!variant.name || !variant.configuration) {
          throw new Error('Each variant must have a name and configuration');
        }
      }
      
    } catch (error) {
      logger.error('Error validating test parameters:', error);
      throw error;
    }
  }

  assignVariant(trafficSplit, userId) {
    try {
      // Use user ID to generate consistent assignment
      const hash = this.hashString(userId);
      const random = hash % 100;
      
      let cumulativePercentage = 0;
      for (const [variant, percentage] of Object.entries(trafficSplit)) {
        cumulativePercentage += percentage;
        if (random < cumulativePercentage) {
          return variant;
        }
      }
      
      // Fallback to first variant
      return Object.keys(trafficSplit)[0];
    } catch (error) {
      logger.error('Error assigning variant:', error);
      return Object.keys(trafficSplit)[0];
    }
  }

  hashString(str) {
    try {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    } catch (error) {
      logger.error('Error hashing string:', error);
      return 0;
    }
  }

  analyzeResultsByVariant(results, variants) {
    try {
      const analysis = {};
      
      // Group results by variant
      const variantResults = {};
      for (const result of results) {
        if (!variantResults[result.variant]) {
          variantResults[result.variant] = [];
        }
        variantResults[result.variant].push(result);
      }
      
      // Analyze each variant
      for (const variant of variants) {
        const variantName = variant.name;
        const variantData = variantResults[variantName] || [];
        
        analysis[variantName] = {
          total_events: variantData.reduce((sum, r) => sum + r.event_count, 0),
          unique_users: new Set(variantData.map(r => r.user_id)).size,
          event_types: {}
        };
        
        // Analyze by event type
        for (const result of variantData) {
          if (!analysis[variantName].event_types[result.event_type]) {
            analysis[variantName].event_types[result.event_type] = {
              count: 0,
              unique_users: new Set()
            };
          }
          analysis[variantName].event_types[result.event_type].count += result.event_count;
          analysis[variantName].event_types[result.event_type].unique_users.add(result.user_id);
        }
        
        // Convert sets to counts
        for (const eventType of Object.keys(analysis[variantName].event_types)) {
          analysis[variantName].event_types[eventType].unique_users = 
            analysis[variantName].event_types[eventType].unique_users.size;
        }
      }
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing results by variant:', error);
      return {};
    }
  }

  calculateStatisticalSignificance(analysis) {
    try {
      const variants = Object.keys(analysis);
      if (variants.length < 2) {
        return { overall_significance: false, confidence: 0 };
      }
      
      // Simple statistical significance calculation
      // In a real implementation, you would use proper statistical tests
      const variant1 = analysis[variants[0]];
      const variant2 = analysis[variants[1]];
      
      const total1 = variant1.total_events;
      const total2 = variant2.total_events;
      
      if (total1 === 0 || total2 === 0) {
        return { overall_significance: false, confidence: 0 };
      }
      
      // Calculate conversion rates
      const rate1 = variant1.unique_users / total1;
      const rate2 = variant2.unique_users / total2;
      
      // Simple significance test (this is simplified)
      const difference = Math.abs(rate1 - rate2);
      const significance = difference > 0.05; // 5% threshold
      
      return {
        overall_significance: significance,
        confidence: significance ? 0.95 : 0.5,
        difference: difference,
        rate1: rate1,
        rate2: rate2
      };
    } catch (error) {
      logger.error('Error calculating statistical significance:', error);
      return { overall_significance: false, confidence: 0 };
    }
  }

  generateRecommendations(analysis, significance) {
    try {
      const recommendations = [];
      
      if (significance.overall_significance) {
        const variants = Object.keys(analysis);
        const variant1 = analysis[variants[0]];
        const variant2 = analysis[variants[1]];
        
        if (variant1.unique_users > variant2.unique_users) {
          recommendations.push({
            type: 'winner',
            variant: variants[0],
            reason: 'Higher user engagement',
            confidence: significance.confidence
          });
        } else {
          recommendations.push({
            type: 'winner',
            variant: variants[1],
            reason: 'Higher user engagement',
            confidence: significance.confidence
          });
        }
      } else {
        recommendations.push({
          type: 'inconclusive',
          reason: 'Insufficient data or no significant difference',
          suggestion: 'Continue test or increase sample size'
        });
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  async getUserAssignment(testId, userId) {
    try {
      const assignmentKey = `${testId}:${userId}`;
      
      // Check cache first
      if (this.userAssignments.has(assignmentKey)) {
        return this.userAssignments.get(assignmentKey);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM user_assignments
        WHERE test_id = $1 AND user_id = $2
      `, [testId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const assignment = result.rows[0];
      
      // Cache assignment
      this.userAssignments.set(assignmentKey, assignment);
      
      return assignment;
    } catch (error) {
      logger.error('Error getting user assignment:', error);
      return null;
    }
  }

  async storeTest(test) {
    try {
      await pool.query(`
        INSERT INTO ab_tests (
          id, name, variants, traffic_split, duration, status,
          start_date, end_date, configuration, metadata,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        test.id,
        test.name,
        JSON.stringify(test.variants),
        JSON.stringify(test.traffic_split),
        test.duration,
        test.status,
        test.start_date,
        test.end_date,
        JSON.stringify(test.configuration),
        JSON.stringify(test.metadata),
        test.created_by,
        test.created_at,
        test.updated_at
      ]);
    } catch (error) {
      logger.error('Error storing test:', error);
      throw error;
    }
  }

  async updateTestInDatabase(test) {
    try {
      await pool.query(`
        UPDATE ab_tests
        SET name = $1, variants = $2, traffic_split = $3, duration = $4,
            status = $5, start_date = $6, end_date = $7, configuration = $8,
            metadata = $9, updated_at = $10
        WHERE id = $11
      `, [
        test.name,
        JSON.stringify(test.variants),
        JSON.stringify(test.traffic_split),
        test.duration,
        test.status,
        test.start_date,
        test.end_date,
        JSON.stringify(test.configuration),
        JSON.stringify(test.metadata),
        test.updated_at,
        test.id
      ]);
    } catch (error) {
      logger.error('Error updating test in database:', error);
      throw error;
    }
  }

  async storeUserAssignment(assignment) {
    try {
      await pool.query(`
        INSERT INTO user_assignments (
          test_id, user_id, variant, assigned_at
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (test_id, user_id) DO UPDATE SET
        variant = $3, assigned_at = $4
      `, [
        assignment.test_id,
        assignment.user_id,
        assignment.variant,
        assignment.assigned_at
      ]);
    } catch (error) {
      logger.error('Error storing user assignment:', error);
      throw error;
    }
  }

  async storeTestResult(result) {
    try {
      await pool.query(`
        INSERT INTO ab_test_results (
          id, test_id, user_id, variant, event_type, event_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        result.id,
        result.test_id,
        result.user_id,
        result.variant,
        result.event_type,
        JSON.stringify(result.event_data),
        result.created_at
      ]);
    } catch (error) {
      logger.error('Error storing test result:', error);
      throw error;
    }
  }

  async storeTestAnalysis(analysis) {
    try {
      await pool.query(`
        INSERT INTO ab_test_analyses (
          test_id, analysis, significance, recommendations, analyzed_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        analysis.test_id,
        JSON.stringify(analysis.analysis),
        JSON.stringify(analysis.significance),
        JSON.stringify(analysis.recommendations),
        analysis.analyzed_at
      ]);
    } catch (error) {
      logger.error('Error storing test analysis:', error);
      throw error;
    }
  }

  async getTestStats() {
    try {
      const stats = {
        total_tests: this.tests.size,
        active_tests: Array.from(this.tests.values()).filter(t => t.status === 'active').length,
        completed_tests: Array.from(this.tests.values()).filter(t => t.status === 'completed').length,
        total_results: this.testResults.size,
        total_assignments: this.userAssignments.size
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting test stats:', error);
      throw error;
    }
  }
}

module.exports = ABTestingEngine;
