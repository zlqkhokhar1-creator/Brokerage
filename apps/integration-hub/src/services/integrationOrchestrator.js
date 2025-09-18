const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class IntegrationOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.integrations = new Map();
    this.workflows = new Map();
    this.executions = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load integrations
      await this.loadIntegrations();
      
      // Load workflows
      await this.loadWorkflows();
      
      this._initialized = true;
      logger.info('IntegrationOrchestrator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize IntegrationOrchestrator:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('IntegrationOrchestrator closed');
    } catch (error) {
      logger.error('Error closing IntegrationOrchestrator:', error);
    }
  }

  async loadIntegrations() {
    try {
      const result = await pool.query(`
        SELECT * FROM integrations
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const integration of result.rows) {
        this.integrations.set(integration.id, {
          ...integration,
          configuration: integration.configuration ? JSON.parse(integration.configuration) : {},
          partners: integration.partners ? JSON.parse(integration.partners) : [],
          workflow: integration.workflow ? JSON.parse(integration.workflow) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} integrations`);
    } catch (error) {
      logger.error('Error loading integrations:', error);
      throw error;
    }
  }

  async loadWorkflows() {
    try {
      const result = await pool.query(`
        SELECT * FROM integration_workflows
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const workflow of result.rows) {
        this.workflows.set(workflow.id, {
          ...workflow,
          steps: workflow.steps ? JSON.parse(workflow.steps) : [],
          conditions: workflow.conditions ? JSON.parse(workflow.conditions) : [],
          error_handling: workflow.error_handling ? JSON.parse(workflow.error_handling) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} workflows`);
    } catch (error) {
      logger.error('Error loading workflows:', error);
      throw error;
    }
  }

  async createIntegration(name, type, configuration, partners, createdBy) {
    try {
      const integrationId = nanoid();
      const integration = {
        id: integrationId,
        name,
        type,
        configuration: configuration || {},
        partners: partners || [],
        workflow: [],
        status: 'inactive',
        is_active: true,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO integrations (id, name, type, configuration, partners, workflow, status, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        integrationId, name, type, JSON.stringify(configuration), JSON.stringify(partners),
        JSON.stringify([]), 'inactive', true, createdBy, integration.created_at, integration.updated_at
      ]);
      
      // Store in memory
      this.integrations.set(integrationId, integration);
      
      // Store in Redis
      await this.redis.setex(
        `integration:${integrationId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(integration)
      );
      
      logger.info(`Integration created: ${integrationId}`, { name, type, partners: partners.length });
      
      // Emit event
      this.emit('integrationCreated', integration);
      
      return integration;
    } catch (error) {
      logger.error('Error creating integration:', error);
      throw error;
    }
  }

  async getIntegration(integrationId, userId) {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        return null;
      }
      
      // Check if user has access to this integration
      if (integration.created_by !== userId) {
        throw new Error('Access denied');
      }
      
      return integration;
    } catch (error) {
      logger.error('Error getting integration:', error);
      throw error;
    }
  }

  async updateIntegration(integrationId, updates, updatedBy) {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }
      
      // Update integration
      Object.assign(integration, updates, {
        updated_by: updatedBy,
        updated_at: new Date()
      });
      
      // Update database
      await pool.query(`
        UPDATE integrations
        SET name = $1, type = $2, configuration = $3, partners = $4, workflow = $5,
            status = $6, is_active = $7, updated_by = $8, updated_at = $9
        WHERE id = $10
      `, [
        integration.name, integration.type, JSON.stringify(integration.configuration),
        JSON.stringify(integration.partners), JSON.stringify(integration.workflow),
        integration.status, integration.is_active, updatedBy, integration.updated_at, integrationId
      ]);
      
      // Update Redis
      await this.redis.setex(
        `integration:${integrationId}`,
        24 * 60 * 60,
        JSON.stringify(integration)
      );
      
      logger.info(`Integration updated: ${integrationId}`, { updatedBy, updates: Object.keys(updates) });
      
      // Emit event
      this.emit('integrationUpdated', integration);
      
      return integration;
    } catch (error) {
      logger.error('Error updating integration:', error);
      throw error;
    }
  }

  async deleteIntegration(integrationId, deletedBy) {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }
      
      // Soft delete
      integration.is_active = false;
      integration.deleted_by = deletedBy;
      integration.deleted_at = new Date();
      
      // Update database
      await pool.query(`
        UPDATE integrations
        SET is_active = false, deleted_by = $1, deleted_at = $2, updated_at = $3
        WHERE id = $4
      `, [deletedBy, integration.deleted_at, new Date(), integrationId]);
      
      // Remove from memory
      this.integrations.delete(integrationId);
      
      // Remove from Redis
      await this.redis.del(`integration:${integrationId}`);
      
      logger.info(`Integration deleted: ${integrationId}`, { deletedBy });
      
      // Emit event
      this.emit('integrationDeleted', integration);
      
      return true;
    } catch (error) {
      logger.error('Error deleting integration:', error);
      throw error;
    }
  }

  async executeIntegration(integrationId, parameters, data, userId) {
    try {
      const integration = await this.getIntegration(integrationId, userId);
      if (!integration) {
        throw new Error('Integration not found');
      }
      
      if (integration.status !== 'active') {
        throw new Error('Integration is not active');
      }
      
      const executionId = nanoid();
      const execution = {
        id: executionId,
        integration_id: integrationId,
        parameters: parameters || {},
        data: data || {},
        status: 'running',
        started_at: new Date(),
        completed_at: null,
        result: null,
        error: null
      };
      
      // Store execution
      this.executions.set(executionId, execution);
      
      // Store in database
      await pool.query(`
        INSERT INTO integration_executions (id, integration_id, parameters, data, status, started_at, completed_at, result, error)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        executionId, integrationId, JSON.stringify(parameters), JSON.stringify(data),
        'running', execution.started_at, null, null, null
      ]);
      
      // Execute integration workflow
      try {
        const result = await this.executeWorkflow(integration, execution);
        
        // Update execution
        execution.status = 'completed';
        execution.completed_at = new Date();
        execution.result = result;
        
        // Update database
        await pool.query(`
          UPDATE integration_executions
          SET status = $1, completed_at = $2, result = $3
          WHERE id = $4
        `, ['completed', execution.completed_at, JSON.stringify(result), executionId]);
        
        logger.info(`Integration executed successfully: ${executionId}`, {
          integrationId,
          duration: execution.completed_at - execution.started_at
        });
        
        // Emit event
        this.emit('integrationExecuted', execution);
        
        return {
          success: true,
          executionId,
          result
        };
      } catch (error) {
        // Update execution with error
        execution.status = 'failed';
        execution.completed_at = new Date();
        execution.error = error.message;
        
        // Update database
        await pool.query(`
          UPDATE integration_executions
          SET status = $1, completed_at = $2, error = $3
          WHERE id = $4
        `, ['failed', execution.completed_at, error.message, executionId]);
        
        logger.error(`Integration execution failed: ${executionId}`, {
          integrationId,
          error: error.message
        });
        
        throw error;
      }
    } catch (error) {
      logger.error('Error executing integration:', error);
      throw error;
    }
  }

  async executeWorkflow(integration, execution) {
    try {
      const { workflow } = integration;
      const context = {
        parameters: execution.parameters,
        data: execution.data,
        integration: integration,
        execution: execution
      };
      
      const results = [];
      
      for (const step of workflow) {
        const stepResult = await this.executeStep(step, context);
        results.push(stepResult);
        
        // Update context with step result
        context[step.id] = stepResult;
      }
      
      return {
        workflow: workflow.map(s => s.id),
        results: results,
        context: context
      };
    } catch (error) {
      logger.error('Error executing workflow:', error);
      throw error;
    }
  }

  async executeStep(step, context) {
    try {
      const { type, config, conditions } = step;
      
      // Check conditions
      if (conditions && conditions.length > 0) {
        const shouldExecute = await this.evaluateConditions(conditions, context);
        if (!shouldExecute) {
          return {
            stepId: step.id,
            status: 'skipped',
            reason: 'Conditions not met'
          };
        }
      }
      
      // Execute step based on type
      switch (type) {
        case 'api_call':
          return await this.executeApiCall(step, context);
        case 'data_transform':
          return await this.executeDataTransform(step, context);
        case 'webhook_trigger':
          return await this.executeWebhookTrigger(step, context);
        case 'database_query':
          return await this.executeDatabaseQuery(step, context);
        case 'conditional':
          return await this.executeConditional(step, context);
        case 'loop':
          return await this.executeLoop(step, context);
        case 'parallel':
          return await this.executeParallel(step, context);
        case 'delay':
          return await this.executeDelay(step, context);
        case 'log':
          return await this.executeLog(step, context);
        default:
          throw new Error(`Unknown step type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error executing step ${step.id}:`, error);
      throw error;
    }
  }

  async executeApiCall(step, context) {
    try {
      const { config } = step;
      const { method, url, headers, body, timeout } = config;
      
      const axios = require('axios');
      
      const requestConfig = {
        method: method || 'GET',
        url: this.interpolateString(url, context),
        headers: this.interpolateObject(headers, context),
        timeout: timeout || 30000
      };
      
      if (body && method !== 'GET') {
        requestConfig.data = this.interpolateObject(body, context);
      }
      
      const response = await axios(requestConfig);
      
      return {
        stepId: step.id,
        status: 'completed',
        result: {
          status: response.status,
          headers: response.headers,
          data: response.data
        }
      };
    } catch (error) {
      logger.error(`Error executing API call step ${step.id}:`, error);
      throw error;
    }
  }

  async executeDataTransform(step, context) {
    try {
      const { config } = step;
      const { transformation, inputPath, outputPath } = config;
      
      const inputData = this.getNestedValue(context, inputPath);
      let transformedData = inputData;
      
      // Apply transformation
      switch (transformation.type) {
        case 'map':
          transformedData = inputData.map(item => this.applyMapping(item, transformation.mapping));
          break;
        case 'filter':
          transformedData = inputData.filter(item => this.evaluateCondition(transformation.condition, item));
          break;
        case 'reduce':
          transformedData = inputData.reduce((acc, item) => {
            return this.applyReducer(acc, item, transformation.reducer);
          }, transformation.initialValue);
          break;
        case 'sort':
          transformedData = inputData.sort((a, b) => {
            return this.compareValues(a[transformation.key], b[transformation.key], transformation.order);
          });
          break;
        case 'group':
          transformedData = this.groupBy(inputData, transformation.key);
          break;
        default:
          throw new Error(`Unknown transformation type: ${transformation.type}`);
      }
      
      // Set output
      this.setNestedValue(context, outputPath, transformedData);
      
      return {
        stepId: step.id,
        status: 'completed',
        result: transformedData
      };
    } catch (error) {
      logger.error(`Error executing data transform step ${step.id}:`, error);
      throw error;
    }
  }

  async executeWebhookTrigger(step, context) {
    try {
      const { config } = step;
      const { webhookId, eventType, data } = config;
      
      // This would integrate with the WebhookManager
      // For now, just log the webhook trigger
      logger.info(`Webhook triggered: ${webhookId}`, {
        eventType,
        data: this.interpolateObject(data, context)
      });
      
      return {
        stepId: step.id,
        status: 'completed',
        result: {
          webhookId,
          eventType,
          triggered: true
        }
      };
    } catch (error) {
      logger.error(`Error executing webhook trigger step ${step.id}:`, error);
      throw error;
    }
  }

  async executeDatabaseQuery(step, context) {
    try {
      const { config } = step;
      const { query, parameters } = config;
      
      const interpolatedQuery = this.interpolateString(query, context);
      const interpolatedParameters = this.interpolateArray(parameters, context);
      
      const result = await pool.query(interpolatedQuery, interpolatedParameters);
      
      return {
        stepId: step.id,
        status: 'completed',
        result: {
          rows: result.rows,
          rowCount: result.rowCount
        }
      };
    } catch (error) {
      logger.error(`Error executing database query step ${step.id}:`, error);
      throw error;
    }
  }

  async executeConditional(step, context) {
    try {
      const { config } = step;
      const { condition, trueSteps, falseSteps } = config;
      
      const conditionResult = this.evaluateCondition(condition, context);
      const stepsToExecute = conditionResult ? trueSteps : falseSteps;
      
      const results = [];
      for (const subStep of stepsToExecute) {
        const result = await this.executeStep(subStep, context);
        results.push(result);
      }
      
      return {
        stepId: step.id,
        status: 'completed',
        result: {
          condition: conditionResult,
          results: results
        }
      };
    } catch (error) {
      logger.error(`Error executing conditional step ${step.id}:`, error);
      throw error;
    }
  }

  async executeLoop(step, context) {
    try {
      const { config } = step;
      const { arrayPath, steps } = config;
      
      const array = this.getNestedValue(context, arrayPath);
      const results = [];
      
      for (let i = 0; i < array.length; i++) {
        const loopContext = {
          ...context,
          loopIndex: i,
          loopItem: array[i]
        };
        
        const loopResults = [];
        for (const subStep of steps) {
          const result = await this.executeStep(subStep, loopContext);
          loopResults.push(result);
        }
        
        results.push(loopResults);
      }
      
      return {
        stepId: step.id,
        status: 'completed',
        result: {
          iterations: array.length,
          results: results
        }
      };
    } catch (error) {
      logger.error(`Error executing loop step ${step.id}:`, error);
      throw error;
    }
  }

  async executeParallel(step, context) {
    try {
      const { config } = step;
      const { steps } = config;
      
      const promises = steps.map(subStep => this.executeStep(subStep, context));
      const results = await Promise.all(promises);
      
      return {
        stepId: step.id,
        status: 'completed',
        result: {
          parallel: true,
          results: results
        }
      };
    } catch (error) {
      logger.error(`Error executing parallel step ${step.id}:`, error);
      throw error;
    }
  }

  async executeDelay(step, context) {
    try {
      const { config } = step;
      const { duration } = config;
      
      await new Promise(resolve => setTimeout(resolve, duration));
      
      return {
        stepId: step.id,
        status: 'completed',
        result: {
          delayed: duration
        }
      };
    } catch (error) {
      logger.error(`Error executing delay step ${step.id}:`, error);
      throw error;
    }
  }

  async executeLog(step, context) {
    try {
      const { config } = step;
      const { level, message, data } = config;
      
      const interpolatedMessage = this.interpolateString(message, context);
      const interpolatedData = this.interpolateObject(data, context);
      
      logger[level](interpolatedMessage, interpolatedData);
      
      return {
        stepId: step.id,
        status: 'completed',
        result: {
          logged: true,
          message: interpolatedMessage
        }
      };
    } catch (error) {
      logger.error(`Error executing log step ${step.id}:`, error);
      throw error;
    }
  }

  async evaluateConditions(conditions, context) {
    try {
      for (const condition of conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
      return true;
    } catch (error) {
      logger.error('Error evaluating conditions:', error);
      return false;
    }
  }

  evaluateCondition(condition, context) {
    try {
      const { type, field, operator, value } = condition;
      const fieldValue = this.getNestedValue(context, field);
      
      switch (type) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'greater_than':
          return fieldValue > value;
        case 'less_than':
          return fieldValue < value;
        case 'contains':
          return fieldValue && fieldValue.includes(value);
        case 'not_contains':
          return !fieldValue || !fieldValue.includes(value);
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'not_exists':
          return fieldValue === undefined || fieldValue === null;
        case 'in':
          return value.includes(fieldValue);
        case 'not_in':
          return !value.includes(fieldValue);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  interpolateString(str, context) {
    try {
      return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        return this.getNestedValue(context, path.trim());
      });
    } catch (error) {
      logger.error('Error interpolating string:', error);
      return str;
    }
  }

  interpolateObject(obj, context) {
    try {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => this.interpolateObject(item, context));
      }
      
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, context);
      }
      return result;
    } catch (error) {
      logger.error('Error interpolating object:', error);
      return obj;
    }
  }

  interpolateArray(arr, context) {
    try {
      return arr.map(item => this.interpolateObject(item, context));
    } catch (error) {
      logger.error('Error interpolating array:', error);
      return arr;
    }
  }

  getNestedValue(obj, path) {
    try {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
      }, obj);
    } catch (error) {
      logger.error('Error getting nested value:', error);
      return null;
    }
  }

  setNestedValue(obj, path, value) {
    try {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((current, key) => {
        if (!current[key]) {
          current[key] = {};
        }
        return current[key];
      }, obj);
      target[lastKey] = value;
    } catch (error) {
      logger.error('Error setting nested value:', error);
    }
  }

  applyMapping(item, mapping) {
    try {
      const result = {};
      for (const [targetKey, sourcePath] of Object.entries(mapping)) {
        result[targetKey] = this.getNestedValue(item, sourcePath);
      }
      return result;
    } catch (error) {
      logger.error('Error applying mapping:', error);
      return item;
    }
  }

  applyReducer(acc, item, reducer) {
    try {
      switch (reducer.type) {
        case 'sum':
          return acc + (item[reducer.key] || 0);
        case 'count':
          return acc + 1;
        case 'concat':
          return acc + (item[reducer.key] || '');
        case 'custom':
          return reducer.function(acc, item);
        default:
          return acc;
      }
    } catch (error) {
      logger.error('Error applying reducer:', error);
      return acc;
    }
  }

  compareValues(a, b, order = 'asc') {
    try {
      if (a < b) return order === 'asc' ? -1 : 1;
      if (a > b) return order === 'asc' ? 1 : -1;
      return 0;
    } catch (error) {
      logger.error('Error comparing values:', error);
      return 0;
    }
  }

  groupBy(array, key) {
    try {
      return array.reduce((groups, item) => {
        const group = item[key];
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(item);
        return groups;
      }, {});
    } catch (error) {
      logger.error('Error grouping by:', error);
      return {};
    }
  }

  async getIntegrationStats() {
    try {
      const stats = {
        totalIntegrations: this.integrations.size,
        activeIntegrations: Array.from(this.integrations.values()).filter(i => i.is_active).length,
        totalExecutions: this.executions.size,
        runningExecutions: Array.from(this.executions.values()).filter(e => e.status === 'running').length,
        completedExecutions: Array.from(this.executions.values()).filter(e => e.status === 'completed').length,
        failedExecutions: Array.from(this.executions.values()).filter(e => e.status === 'failed').length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting integration stats:', error);
      throw error;
    }
  }
}

module.exports = IntegrationOrchestrator;
