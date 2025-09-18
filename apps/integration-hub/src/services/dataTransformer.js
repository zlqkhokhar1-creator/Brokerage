const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class DataTransformer extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.templates = new Map();
    this.transformations = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load templates
      await this.loadTemplates();
      
      // Load transformations
      await this.loadTransformations();
      
      this._initialized = true;
      logger.info('DataTransformer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DataTransformer:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('DataTransformer closed');
    } catch (error) {
      logger.error('Error closing DataTransformer:', error);
    }
  }

  async loadTemplates() {
    try {
      const result = await pool.query(`
        SELECT * FROM transformation_templates
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const template of result.rows) {
        this.templates.set(template.id, {
          ...template,
          config: template.config ? JSON.parse(template.config) : {},
          transformations: template.transformations ? JSON.parse(template.transformations) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} transformation templates`);
    } catch (error) {
      logger.error('Error loading templates:', error);
      throw error;
    }
  }

  async loadTransformations() {
    try {
      const result = await pool.query(`
        SELECT * FROM data_transformations
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const transformation of result.rows) {
        this.transformations.set(transformation.id, {
          ...transformation,
          config: transformation.config ? JSON.parse(transformation.config) : {},
          rules: transformation.rules ? JSON.parse(transformation.rules) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} data transformations`);
    } catch (error) {
      logger.error('Error loading transformations:', error);
      throw error;
    }
  }

  async transformData(data, transformationType, parameters, userId) {
    try {
      const startTime = Date.now();
      const transformationId = nanoid();
      
      let result;
      
      switch (transformationType) {
        case 'template':
          result = await this.transformWithTemplate(data, parameters);
          break;
        case 'custom':
          result = await this.transformWithCustom(data, parameters);
          break;
        case 'mapping':
          result = await this.transformWithMapping(data, parameters);
          break;
        case 'filtering':
          result = await this.transformWithFiltering(data, parameters);
          break;
        case 'aggregation':
          result = await this.transformWithAggregation(data, parameters);
          break;
        case 'normalization':
          result = await this.transformWithNormalization(data, parameters);
          break;
        case 'validation':
          result = await this.transformWithValidation(data, parameters);
          break;
        default:
          throw new Error(`Unknown transformation type: ${transformationType}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Log transformation
      await this.logTransformation(transformationId, transformationType, data, result, duration, userId);
      
      // Emit event
      this.emit('dataTransformed', {
        transformationId,
        type: transformationType,
        duration,
        inputSize: JSON.stringify(data).length,
        outputSize: JSON.stringify(result).length
      });
      
      return {
        success: true,
        data: result,
        metadata: {
          transformationId,
          type: transformationType,
          duration,
          inputSize: JSON.stringify(data).length,
          outputSize: JSON.stringify(result).length
        }
      };
    } catch (error) {
      logger.error('Error transforming data:', error);
      throw error;
    }
  }

  async transformWithTemplate(data, parameters) {
    try {
      const { templateId, variables } = parameters;
      const template = this.templates.get(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      let result = data;
      
      // Apply template transformations
      for (const transformation of template.transformations) {
        result = await this.applyTransformation(result, transformation, variables);
      }
      
      return result;
    } catch (error) {
      logger.error('Error transforming with template:', error);
      throw error;
    }
  }

  async transformWithCustom(data, parameters) {
    try {
      const { transformations } = parameters;
      let result = data;
      
      for (const transformation of transformations) {
        result = await this.applyTransformation(result, transformation);
      }
      
      return result;
    } catch (error) {
      logger.error('Error transforming with custom:', error);
      throw error;
    }
  }

  async transformWithMapping(data, parameters) {
    try {
      const { mapping, preserveUnmapped = false } = parameters;
      
      if (Array.isArray(data)) {
        return data.map(item => this.applyMapping(item, mapping, preserveUnmapped));
      } else {
        return this.applyMapping(data, mapping, preserveUnmapped);
      }
    } catch (error) {
      logger.error('Error transforming with mapping:', error);
      throw error;
    }
  }

  async transformWithFiltering(data, parameters) {
    try {
      const { filters, operator = 'AND' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Filtering requires array data');
      }
      
      return data.filter(item => {
        const results = filters.map(filter => this.evaluateFilter(item, filter));
        
        if (operator === 'AND') {
          return results.every(result => result);
        } else if (operator === 'OR') {
          return results.some(result => result);
        } else {
          return results.every(result => result);
        }
      });
    } catch (error) {
      logger.error('Error transforming with filtering:', error);
      throw error;
    }
  }

  async transformWithAggregation(data, parameters) {
    try {
      const { groupBy, aggregations } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Aggregation requires array data');
      }
      
      const groups = this.groupBy(data, groupBy);
      const result = {};
      
      for (const [groupKey, groupData] of Object.entries(groups)) {
        result[groupKey] = {};
        
        for (const aggregation of aggregations) {
          const { field, operation, alias } = aggregation;
          const values = groupData.map(item => item[field]).filter(v => v !== undefined && v !== null);
          
          let aggregatedValue;
          switch (operation) {
            case 'sum':
              aggregatedValue = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'avg':
              aggregatedValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
              break;
            case 'count':
              aggregatedValue = values.length;
              break;
            case 'min':
              aggregatedValue = values.length > 0 ? Math.min(...values) : null;
              break;
            case 'max':
              aggregatedValue = values.length > 0 ? Math.max(...values) : null;
              break;
            case 'first':
              aggregatedValue = values[0] || null;
              break;
            case 'last':
              aggregatedValue = values[values.length - 1] || null;
              break;
            case 'concat':
              aggregatedValue = values.join(', ');
              break;
            case 'unique':
              aggregatedValue = [...new Set(values)];
              break;
            default:
              aggregatedValue = null;
          }
          
          result[groupKey][alias || field] = aggregatedValue;
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error transforming with aggregation:', error);
      throw error;
    }
  }

  async transformWithNormalization(data, parameters) {
    try {
      const { fields, method = 'minmax' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Normalization requires array data');
      }
      
      const result = [...data];
      
      for (const field of fields) {
        const values = result.map(item => item[field]).filter(v => v !== undefined && v !== null && !isNaN(v));
        
        if (values.length === 0) continue;
        
        let normalizedValues;
        
        switch (method) {
          case 'minmax':
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min;
            normalizedValues = values.map(val => range > 0 ? (val - min) / range : 0);
            break;
          case 'zscore':
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);
            normalizedValues = values.map(val => stdDev > 0 ? (val - mean) / stdDev : 0);
            break;
          case 'decimal':
            const maxAbs = Math.max(...values.map(val => Math.abs(val)));
            normalizedValues = values.map(val => maxAbs > 0 ? val / maxAbs : 0);
            break;
          default:
            normalizedValues = values;
        }
        
        let valueIndex = 0;
        for (let i = 0; i < result.length; i++) {
          if (result[i][field] !== undefined && result[i][field] !== null && !isNaN(result[i][field])) {
            result[i][field] = normalizedValues[valueIndex];
            valueIndex++;
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error transforming with normalization:', error);
      throw error;
    }
  }

  async transformWithValidation(data, parameters) {
    try {
      const { rules, strict = false } = parameters;
      const result = {
        valid: true,
        errors: [],
        data: data
      };
      
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const itemErrors = this.validateItem(data[i], rules);
          if (itemErrors.length > 0) {
            result.valid = false;
            result.errors.push({
              index: i,
              errors: itemErrors
            });
            
            if (strict) {
              throw new Error(`Validation failed at index ${i}: ${itemErrors.join(', ')}`);
            }
          }
        }
      } else {
        const errors = this.validateItem(data, rules);
        if (errors.length > 0) {
          result.valid = false;
          result.errors = errors;
          
          if (strict) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error transforming with validation:', error);
      throw error;
    }
  }

  async applyTransformation(data, transformation, variables = {}) {
    try {
      const { type, config } = transformation;
      
      switch (type) {
        case 'map':
          return this.applyMapTransformation(data, config, variables);
        case 'filter':
          return this.applyFilterTransformation(data, config, variables);
        case 'reduce':
          return this.applyReduceTransformation(data, config, variables);
        case 'sort':
          return this.applySortTransformation(data, config, variables);
        case 'group':
          return this.applyGroupTransformation(data, config, variables);
        case 'pivot':
          return this.applyPivotTransformation(data, config, variables);
        case 'join':
          return this.applyJoinTransformation(data, config, variables);
        case 'split':
          return this.applySplitTransformation(data, config, variables);
        case 'merge':
          return this.applyMergeTransformation(data, config, variables);
        case 'format':
          return this.applyFormatTransformation(data, config, variables);
        default:
          throw new Error(`Unknown transformation type: ${type}`);
      }
    } catch (error) {
      logger.error('Error applying transformation:', error);
      throw error;
    }
  }

  applyMapTransformation(data, config, variables) {
    try {
      const { mapping, preserveUnmapped = false } = config;
      
      if (Array.isArray(data)) {
        return data.map(item => this.applyMapping(item, mapping, preserveUnmapped));
      } else {
        return this.applyMapping(data, mapping, preserveUnmapped);
      }
    } catch (error) {
      logger.error('Error applying map transformation:', error);
      throw error;
    }
  }

  applyFilterTransformation(data, config, variables) {
    try {
      const { filters, operator = 'AND' } = config;
      
      if (!Array.isArray(data)) {
        throw new Error('Filter transformation requires array data');
      }
      
      return data.filter(item => {
        const results = filters.map(filter => this.evaluateFilter(item, filter));
        
        if (operator === 'AND') {
          return results.every(result => result);
        } else if (operator === 'OR') {
          return results.some(result => result);
        } else {
          return results.every(result => result);
        }
      });
    } catch (error) {
      logger.error('Error applying filter transformation:', error);
      throw error;
    }
  }

  applyReduceTransformation(data, config, variables) {
    try {
      const { field, operation, initialValue } = config;
      
      if (!Array.isArray(data)) {
        throw new Error('Reduce transformation requires array data');
      }
      
      const values = data.map(item => item[field]).filter(v => v !== undefined && v !== null);
      
      switch (operation) {
        case 'sum':
          return values.reduce((sum, val) => sum + val, initialValue || 0);
        case 'product':
          return values.reduce((prod, val) => prod * val, initialValue || 1);
        case 'count':
          return values.length;
        case 'concat':
          return values.join(initialValue || '');
        case 'custom':
          return values.reduce((acc, val) => config.function(acc, val), initialValue);
        default:
          throw new Error(`Unknown reduce operation: ${operation}`);
      }
    } catch (error) {
      logger.error('Error applying reduce transformation:', error);
      throw error;
    }
  }

  applySortTransformation(data, config, variables) {
    try {
      const { key, order = 'asc' } = config;
      
      if (!Array.isArray(data)) {
        throw new Error('Sort transformation requires array data');
      }
      
      return data.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
    } catch (error) {
      logger.error('Error applying sort transformation:', error);
      throw error;
    }
  }

  applyGroupTransformation(data, config, variables) {
    try {
      const { key } = config;
      
      if (!Array.isArray(data)) {
        throw new Error('Group transformation requires array data');
      }
      
      return this.groupBy(data, key);
    } catch (error) {
      logger.error('Error applying group transformation:', error);
      throw error;
    }
  }

  applyPivotTransformation(data, config, variables) {
    try {
      const { index, columns, values, aggfunc = 'sum' } = config;
      
      if (!Array.isArray(data)) {
        throw new Error('Pivot transformation requires array data');
      }
      
      const result = {};
      
      for (const item of data) {
        const indexKey = item[index];
        const columnKey = item[columns];
        const value = item[values];
        
        if (!result[indexKey]) {
          result[indexKey] = {};
        }
        
        if (!result[indexKey][columnKey]) {
          result[indexKey][columnKey] = [];
        }
        
        result[indexKey][columnKey].push(value);
      }
      
      // Apply aggregation
      for (const indexKey of Object.keys(result)) {
        for (const columnKey of Object.keys(result[indexKey])) {
          const values = result[indexKey][columnKey];
          
          switch (aggfunc) {
            case 'sum':
              result[indexKey][columnKey] = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'avg':
              result[indexKey][columnKey] = values.reduce((sum, val) => sum + val, 0) / values.length;
              break;
            case 'count':
              result[indexKey][columnKey] = values.length;
              break;
            case 'min':
              result[indexKey][columnKey] = Math.min(...values);
              break;
            case 'max':
              result[indexKey][columnKey] = Math.max(...values);
              break;
            default:
              result[indexKey][columnKey] = values;
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error applying pivot transformation:', error);
      throw error;
    }
  }

  applyJoinTransformation(data, config, variables) {
    try {
      const { otherData, on, how = 'inner' } = config;
      
      if (!Array.isArray(data) || !Array.isArray(otherData)) {
        throw new Error('Join transformation requires array data');
      }
      
      const result = [];
      
      for (const leftItem of data) {
        const leftKey = leftItem[on];
        const rightItems = otherData.filter(rightItem => rightItem[on] === leftKey);
        
        if (how === 'inner') {
          for (const rightItem of rightItems) {
            result.push({ ...leftItem, ...rightItem });
          }
        } else if (how === 'left') {
          if (rightItems.length > 0) {
            for (const rightItem of rightItems) {
              result.push({ ...leftItem, ...rightItem });
            }
          } else {
            result.push(leftItem);
          }
        } else if (how === 'right') {
          for (const rightItem of rightItems) {
            result.push({ ...leftItem, ...rightItem });
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error applying join transformation:', error);
      throw error;
    }
  }

  applySplitTransformation(data, config, variables) {
    try {
      const { field, separator, newFields } = config;
      
      if (!Array.isArray(data)) {
        throw new Error('Split transformation requires array data');
      }
      
      return data.map(item => {
        const value = item[field];
        if (typeof value !== 'string') {
          return item;
        }
        
        const parts = value.split(separator);
        const newItem = { ...item };
        
        if (newFields && newFields.length > 0) {
          for (let i = 0; i < newFields.length; i++) {
            newItem[newFields[i]] = parts[i] || '';
          }
        } else {
          for (let i = 0; i < parts.length; i++) {
            newItem[`${field}_${i}`] = parts[i];
          }
        }
        
        return newItem;
      });
    } catch (error) {
      logger.error('Error applying split transformation:', error);
      throw error;
    }
  }

  applyMergeTransformation(data, config, variables) {
    try {
      const { fields, separator, newField } = config;
      
      if (!Array.isArray(data)) {
        throw new Error('Merge transformation requires array data');
      }
      
      return data.map(item => {
        const values = fields.map(field => item[field] || '').filter(v => v !== '');
        const newItem = { ...item };
        newItem[newField] = values.join(separator);
        return newItem;
      });
    } catch (error) {
      logger.error('Error applying merge transformation:', error);
      throw error;
    }
  }

  applyFormatTransformation(data, config, variables) {
    try {
      const { fields, format } = config;
      
      if (!Array.isArray(data)) {
        throw new Error('Format transformation requires array data');
      }
      
      return data.map(item => {
        const newItem = { ...item };
        
        for (const field of fields) {
          const value = item[field];
          if (value !== undefined && value !== null) {
            switch (format) {
              case 'uppercase':
                newItem[field] = value.toString().toUpperCase();
                break;
              case 'lowercase':
                newItem[field] = value.toString().toLowerCase();
                break;
              case 'titlecase':
                newItem[field] = value.toString().replace(/\w\S*/g, txt => 
                  txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
                break;
              case 'trim':
                newItem[field] = value.toString().trim();
                break;
              case 'date':
                newItem[field] = new Date(value).toISOString();
                break;
              case 'number':
                newItem[field] = parseFloat(value);
                break;
              case 'integer':
                newItem[field] = parseInt(value);
                break;
              default:
                newItem[field] = value;
            }
          }
        }
        
        return newItem;
      });
    } catch (error) {
      logger.error('Error applying format transformation:', error);
      throw error;
    }
  }

  applyMapping(item, mapping, preserveUnmapped) {
    try {
      const result = {};
      
      if (preserveUnmapped) {
        Object.assign(result, item);
      }
      
      for (const [targetKey, sourcePath] of Object.entries(mapping)) {
        result[targetKey] = this.getNestedValue(item, sourcePath);
      }
      
      return result;
    } catch (error) {
      logger.error('Error applying mapping:', error);
      return item;
    }
  }

  evaluateFilter(item, filter) {
    try {
      const { field, operator, value } = filter;
      const fieldValue = this.getNestedValue(item, field);
      
      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'greater_than':
          return fieldValue > value;
        case 'less_than':
          return fieldValue < value;
        case 'greater_than_or_equal':
          return fieldValue >= value;
        case 'less_than_or_equal':
          return fieldValue <= value;
        case 'contains':
          return fieldValue && fieldValue.toString().includes(value);
        case 'not_contains':
          return !fieldValue || !fieldValue.toString().includes(value);
        case 'starts_with':
          return fieldValue && fieldValue.toString().startsWith(value);
        case 'ends_with':
          return fieldValue && fieldValue.toString().endsWith(value);
        case 'regex':
          return fieldValue && new RegExp(value).test(fieldValue.toString());
        case 'in':
          return value.includes(fieldValue);
        case 'not_in':
          return !value.includes(fieldValue);
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'not_exists':
          return fieldValue === undefined || fieldValue === null;
        case 'empty':
          return !fieldValue || fieldValue.toString().trim() === '';
        case 'not_empty':
          return fieldValue && fieldValue.toString().trim() !== '';
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating filter:', error);
      return false;
    }
  }

  validateItem(item, rules) {
    try {
      const errors = [];
      
      for (const rule of rules) {
        const { field, type, required, min, max, pattern, custom } = rule;
        const value = this.getNestedValue(item, field);
        
        if (required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          continue;
        }
        
        if (value !== undefined && value !== null && value !== '') {
          switch (type) {
            case 'string':
              if (typeof value !== 'string') {
                errors.push(`${field} must be a string`);
              } else {
                if (min && value.length < min) {
                  errors.push(`${field} must be at least ${min} characters`);
                }
                if (max && value.length > max) {
                  errors.push(`${field} must be no more than ${max} characters`);
                }
                if (pattern && !new RegExp(pattern).test(value)) {
                  errors.push(`${field} must match pattern ${pattern}`);
                }
              }
              break;
            case 'number':
              if (isNaN(value)) {
                errors.push(`${field} must be a number`);
              } else {
                if (min !== undefined && value < min) {
                  errors.push(`${field} must be at least ${min}`);
                }
                if (max !== undefined && value > max) {
                  errors.push(`${field} must be no more than ${max}`);
                }
              }
              break;
            case 'email':
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors.push(`${field} must be a valid email`);
              }
              break;
            case 'url':
              if (!/^https?:\/\/.+/.test(value)) {
                errors.push(`${field} must be a valid URL`);
              }
              break;
            case 'date':
              if (isNaN(Date.parse(value))) {
                errors.push(`${field} must be a valid date`);
              }
              break;
            case 'custom':
              if (custom && !custom(value)) {
                errors.push(`${field} failed custom validation`);
              }
              break;
          }
        }
      }
      
      return errors;
    } catch (error) {
      logger.error('Error validating item:', error);
      return ['Validation error'];
    }
  }

  groupBy(array, key) {
    try {
      return array.reduce((groups, item) => {
        const group = this.getNestedValue(item, key);
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

  async getTemplates(userId) {
    try {
      const templates = Array.from(this.templates.values()).filter(template => 
        template.is_active && (template.is_public || template.created_by === userId)
      );
      
      return templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        config: template.config,
        created_at: template.created_at
      }));
    } catch (error) {
      logger.error('Error getting templates:', error);
      throw error;
    }
  }

  async logTransformation(transformationId, type, inputData, outputData, duration, userId) {
    try {
      await pool.query(`
        INSERT INTO transformation_logs (id, type, input_data, output_data, duration, user_id, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        transformationId, type, JSON.stringify(inputData), JSON.stringify(outputData),
        duration, userId, new Date()
      ]);
    } catch (error) {
      logger.error('Error logging transformation:', error);
    }
  }

  async getTransformationStats() {
    try {
      const stats = {
        totalTemplates: this.templates.size,
        activeTemplates: Array.from(this.templates.values()).filter(t => t.is_active).length,
        totalTransformations: this.transformations.size,
        activeTransformations: Array.from(this.transformations.values()).filter(t => t.is_active).length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting transformation stats:', error);
      throw error;
    }
  }
}

module.exports = DataTransformer;
