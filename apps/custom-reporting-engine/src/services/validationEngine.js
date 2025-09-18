const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class ValidationEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.validationRules = new Map();
    this.validationSchemas = new Map();
    this.validationCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load validation rules and schemas
      await this.loadValidationRules();
      await this.loadValidationSchemas();
      
      this._initialized = true;
      logger.info('ValidationEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ValidationEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ValidationEngine closed');
    } catch (error) {
      logger.error('Error closing ValidationEngine:', error);
    }
  }

  async loadValidationRules() {
    try {
      this.validationRules = new Map([
        ['required', {
          name: 'Required',
          description: 'Field is required',
          validate: this.validateRequired.bind(this)
        }],
        ['email', {
          name: 'Email',
          description: 'Valid email address',
          validate: this.validateEmail.bind(this)
        }],
        ['url', {
          name: 'URL',
          description: 'Valid URL',
          validate: this.validateURL.bind(this)
        }],
        ['phone', {
          name: 'Phone',
          description: 'Valid phone number',
          validate: this.validatePhone.bind(this)
        }],
        ['date', {
          name: 'Date',
          description: 'Valid date',
          validate: this.validateDate.bind(this)
        }],
        ['datetime', {
          name: 'DateTime',
          description: 'Valid date and time',
          validate: this.validateDateTime.bind(this)
        }],
        ['number', {
          name: 'Number',
          description: 'Valid number',
          validate: this.validateNumber.bind(this)
        }],
        ['integer', {
          name: 'Integer',
          description: 'Valid integer',
          validate: this.validateInteger.bind(this)
        }],
        ['float', {
          name: 'Float',
          description: 'Valid float',
          validate: this.validateFloat.bind(this)
        }],
        ['boolean', {
          name: 'Boolean',
          description: 'Valid boolean',
          validate: this.validateBoolean.bind(this)
        }],
        ['string', {
          name: 'String',
          description: 'Valid string',
          validate: this.validateString.bind(this)
        }],
        ['array', {
          name: 'Array',
          description: 'Valid array',
          validate: this.validateArray.bind(this)
        }],
        ['object', {
          name: 'Object',
          description: 'Valid object',
          validate: this.validateObject.bind(this)
        }],
        ['min_length', {
          name: 'Minimum Length',
          description: 'Minimum string length',
          validate: this.validateMinLength.bind(this)
        }],
        ['max_length', {
          name: 'Maximum Length',
          description: 'Maximum string length',
          validate: this.validateMaxLength.bind(this)
        }],
        ['min_value', {
          name: 'Minimum Value',
          description: 'Minimum numeric value',
          validate: this.validateMinValue.bind(this)
        }],
        ['max_value', {
          name: 'Maximum Value',
          description: 'Maximum numeric value',
          validate: this.validateMaxValue.bind(this)
        }],
        ['min_items', {
          name: 'Minimum Items',
          description: 'Minimum array items',
          validate: this.validateMinItems.bind(this)
        }],
        ['max_items', {
          name: 'Maximum Items',
          description: 'Maximum array items',
          validate: this.validateMaxItems.bind(this)
        }],
        ['pattern', {
          name: 'Pattern',
          description: 'Regex pattern match',
          validate: this.validatePattern.bind(this)
        }],
        ['enum', {
          name: 'Enum',
          description: 'Value must be one of specified options',
          validate: this.validateEnum.bind(this)
        }],
        ['unique', {
          name: 'Unique',
          description: 'Value must be unique',
          validate: this.validateUnique.bind(this)
        }],
        ['exists', {
          name: 'Exists',
          description: 'Value must exist in database',
          validate: this.validateExists.bind(this)
        }],
        ['custom', {
          name: 'Custom',
          description: 'Custom validation function',
          validate: this.validateCustom.bind(this)
        }]
      ]);
      
      logger.info('Validation rules loaded successfully');
    } catch (error) {
      logger.error('Error loading validation rules:', error);
      throw error;
    }
  }

  async loadValidationSchemas() {
    try {
      this.validationSchemas = new Map([
        ['report', {
          name: 'Report',
          description: 'Report validation schema',
          fields: {
            name: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: 255
            },
            description: {
              type: 'string',
              required: false,
              maxLength: 1000
            },
            type: {
              type: 'enum',
              required: true,
              values: ['financial', 'performance', 'risk', 'compliance', 'custom']
            },
            format: {
              type: 'enum',
              required: true,
              values: ['pdf', 'excel', 'csv', 'json', 'html']
            },
            parameters: {
              type: 'object',
              required: false
            },
            schedule: {
              type: 'object',
              required: false,
              fields: {
                enabled: { type: 'boolean' },
                frequency: { type: 'enum', values: ['daily', 'weekly', 'monthly', 'yearly'] },
                time: { type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
              }
            }
          }
        }],
        ['dashboard', {
          name: 'Dashboard',
          description: 'Dashboard validation schema',
          fields: {
            name: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: 255
            },
            description: {
              type: 'string',
              required: false,
              maxLength: 1000
            },
            layout: {
              type: 'object',
              required: true,
              fields: {
                columns: { type: 'integer', minValue: 1, maxValue: 12 },
                rows: { type: 'integer', minValue: 1, maxValue: 20 }
              }
            },
            widgets: {
              type: 'array',
              required: true,
              minItems: 1,
              maxItems: 50,
              items: {
                type: 'object',
                fields: {
                  id: { type: 'string', required: true },
                  type: { type: 'enum', values: ['chart', 'table', 'metric', 'text'] },
                  position: { type: 'object', required: true },
                  config: { type: 'object', required: true }
                }
              }
            }
          }
        }],
        ['template', {
          name: 'Template',
          description: 'Template validation schema',
          fields: {
            name: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: 255
            },
            description: {
              type: 'string',
              required: false,
              maxLength: 1000
            },
            type: {
              type: 'enum',
              required: true,
              values: ['report', 'dashboard', 'email', 'notification']
            },
            content: {
              type: 'string',
              required: true,
              minLength: 1
            },
            variables: {
              type: 'array',
              required: false,
              items: {
                type: 'object',
                fields: {
                  name: { type: 'string', required: true },
                  type: { type: 'enum', values: ['string', 'number', 'boolean', 'date'] },
                  required: { type: 'boolean' },
                  defaultValue: { type: 'string' }
                }
              }
            }
          }
        }],
        ['schedule', {
          name: 'Schedule',
          description: 'Schedule validation schema',
          fields: {
            name: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: 255
            },
            description: {
              type: 'string',
              required: false,
              maxLength: 1000
            },
            type: {
              type: 'enum',
              required: true,
              values: ['report', 'export', 'notification', 'cleanup']
            },
            frequency: {
              type: 'enum',
              required: true,
              values: ['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom']
            },
            time: {
              type: 'string',
              required: true,
              pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            },
            timezone: {
              type: 'string',
              required: true,
              pattern: /^[A-Za-z_]+\/[A-Za-z_]+$/
            },
            enabled: {
              type: 'boolean',
              required: true
            },
            config: {
              type: 'object',
              required: false
            }
          }
        }],
        ['export', {
          name: 'Export',
          description: 'Export validation schema',
          fields: {
            name: {
              type: 'string',
              required: true,
              minLength: 1,
              maxLength: 255
            },
            format: {
              type: 'enum',
              required: true,
              values: ['excel', 'csv', 'pdf', 'json', 'xml', 'html']
            },
            data: {
              type: 'array',
              required: true,
              minItems: 1
            },
            filters: {
              type: 'object',
              required: false
            },
            sorting: {
              type: 'array',
              required: false,
              items: {
                type: 'object',
                fields: {
                  field: { type: 'string', required: true },
                  direction: { type: 'enum', values: ['asc', 'desc'] }
                }
              }
            },
            pagination: {
              type: 'object',
              required: false,
              fields: {
                page: { type: 'integer', minValue: 1 },
                limit: { type: 'integer', minValue: 1, maxValue: 1000 }
              }
            }
          }
        }]
      ]);
      
      logger.info('Validation schemas loaded successfully');
    } catch (error) {
      logger.error('Error loading validation schemas:', error);
      throw error;
    }
  }

  async validate(data, schema, options = {}) {
    try {
      const validationId = nanoid();
      const startTime = Date.now();
      
      logger.debug(`Starting validation: ${validationId}`, { schema: schema.name });
      
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        data: data,
        schema: schema.name,
        validationId: validationId,
        duration: 0
      };
      
      // Validate each field
      for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
        const fieldValue = data[fieldName];
        const fieldResult = await this.validateField(fieldName, fieldValue, fieldSchema, data);
        
        if (!fieldResult.valid) {
          result.valid = false;
          result.errors.push(...fieldResult.errors);
        }
        
        if (fieldResult.warnings && fieldResult.warnings.length > 0) {
          result.warnings.push(...fieldResult.warnings);
        }
      }
      
      // Check for extra fields if not allowed
      if (!options.allowExtraFields) {
        const schemaFields = Object.keys(schema.fields);
        const dataFields = Object.keys(data);
        const extraFields = dataFields.filter(field => !schemaFields.includes(field));
        
        if (extraFields.length > 0) {
          result.valid = false;
          result.errors.push({
            field: 'extra_fields',
            message: `Extra fields not allowed: ${extraFields.join(', ')}`,
            value: extraFields
          });
        }
      }
      
      result.duration = Date.now() - startTime;
      
      // Store validation result
      await this.storeValidationResult(result);
      
      this.emit('validationCompleted', result);
      
      logger.debug(`Validation completed: ${validationId}`, {
        valid: result.valid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        duration: result.duration
      });
      
      return result;
    } catch (error) {
      logger.error('Error validating data:', error);
      throw error;
    }
  }

  async validateField(fieldName, fieldValue, fieldSchema, fullData) {
    try {
      const result = {
        valid: true,
        errors: [],
        warnings: []
      };
      
      // Check if field is required
      if (fieldSchema.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        result.valid = false;
        result.errors.push({
          field: fieldName,
          message: `Field '${fieldName}' is required`,
          value: fieldValue
        });
        return result;
      }
      
      // Skip validation if field is not provided and not required
      if (fieldValue === undefined || fieldValue === null) {
        return result;
      }
      
      // Validate field type
      if (fieldSchema.type) {
        const typeResult = await this.validateFieldType(fieldName, fieldValue, fieldSchema);
        if (!typeResult.valid) {
          result.valid = false;
          result.errors.push(...typeResult.errors);
        }
        if (typeResult.warnings) {
          result.warnings.push(...typeResult.warnings);
        }
      }
      
      // Validate field constraints
      for (const [constraintName, constraintValue] of Object.entries(fieldSchema)) {
        if (constraintName === 'type' || constraintName === 'required' || constraintName === 'fields') {
          continue;
        }
        
        const constraintResult = await this.validateFieldConstraint(
          fieldName, 
          fieldValue, 
          constraintName, 
          constraintValue, 
          fullData
        );
        
        if (!constraintResult.valid) {
          result.valid = false;
          result.errors.push(...constraintResult.errors);
        }
        if (constraintResult.warnings) {
          result.warnings.push(...constraintResult.warnings);
        }
      }
      
      // Validate nested fields for objects
      if (fieldSchema.type === 'object' && fieldSchema.fields && typeof fieldValue === 'object') {
        const nestedResult = await this.validate(fieldValue, { fields: fieldSchema.fields });
        if (!nestedResult.valid) {
          result.valid = false;
          result.errors.push(...nestedResult.errors.map(error => ({
            ...error,
            field: `${fieldName}.${error.field}`
          })));
        }
      }
      
      // Validate array items
      if (fieldSchema.type === 'array' && fieldSchema.items && Array.isArray(fieldValue)) {
        for (let i = 0; i < fieldValue.length; i++) {
          const itemResult = await this.validateField(
            `${fieldName}[${i}]`, 
            fieldValue[i], 
            fieldSchema.items, 
            fullData
          );
          if (!itemResult.valid) {
            result.valid = false;
            result.errors.push(...itemResult.errors);
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error validating field:', error);
      throw error;
    }
  }

  async validateFieldType(fieldName, fieldValue, fieldSchema) {
    try {
      const type = fieldSchema.type;
      const rule = this.validationRules.get(type);
      
      if (!rule) {
        throw new Error(`Unknown validation rule: ${type}`);
      }
      
      return await rule.validate(fieldName, fieldValue, fieldSchema);
    } catch (error) {
      logger.error('Error validating field type:', error);
      throw error;
    }
  }

  async validateFieldConstraint(fieldName, fieldValue, constraintName, constraintValue, fullData) {
    try {
      const rule = this.validationRules.get(constraintName);
      
      if (!rule) {
        return { valid: true, errors: [], warnings: [] };
      }
      
      return await rule.validate(fieldName, fieldValue, { [constraintName]: constraintValue }, fullData);
    } catch (error) {
      logger.error('Error validating field constraint:', error);
      throw error;
    }
  }

  // Validation rule implementations
  async validateRequired(fieldName, fieldValue, fieldSchema) {
    const isRequired = fieldSchema.required;
    const isEmpty = fieldValue === undefined || fieldValue === null || fieldValue === '';
    
    if (isRequired && isEmpty) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' is required`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateEmail(fieldName, fieldValue, fieldSchema) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (typeof fieldValue !== 'string' || !emailRegex.test(fieldValue)) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid email address`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateURL(fieldName, fieldValue, fieldSchema) {
    try {
      new URL(fieldValue);
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid URL`,
          value: fieldValue
        }]
      };
    }
  }

  async validatePhone(fieldName, fieldValue, fieldSchema) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    
    if (typeof fieldValue !== 'string' || !phoneRegex.test(fieldValue.replace(/[\s\-\(\)]/g, ''))) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid phone number`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateDate(fieldName, fieldValue, fieldSchema) {
    const date = new Date(fieldValue);
    
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid date`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateDateTime(fieldName, fieldValue, fieldSchema) {
    const date = new Date(fieldValue);
    
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid date and time`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateNumber(fieldName, fieldValue, fieldSchema) {
    if (typeof fieldValue !== 'number' || isNaN(fieldValue)) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid number`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateInteger(fieldName, fieldValue, fieldSchema) {
    if (!Number.isInteger(fieldValue)) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid integer`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateFloat(fieldName, fieldValue, fieldSchema) {
    if (typeof fieldValue !== 'number' || isNaN(fieldValue)) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid float`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateBoolean(fieldName, fieldValue, fieldSchema) {
    if (typeof fieldValue !== 'boolean') {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid boolean`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateString(fieldName, fieldValue, fieldSchema) {
    if (typeof fieldValue !== 'string') {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid string`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateArray(fieldName, fieldValue, fieldSchema) {
    if (!Array.isArray(fieldValue)) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid array`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateObject(fieldName, fieldValue, fieldSchema) {
    if (typeof fieldValue !== 'object' || fieldValue === null || Array.isArray(fieldValue)) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be a valid object`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateMinLength(fieldName, fieldValue, fieldSchema) {
    const minLength = fieldSchema.minLength;
    
    if (typeof fieldValue === 'string' && fieldValue.length < minLength) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be at least ${minLength} characters long`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateMaxLength(fieldName, fieldValue, fieldSchema) {
    const maxLength = fieldSchema.maxLength;
    
    if (typeof fieldValue === 'string' && fieldValue.length > maxLength) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be at most ${maxLength} characters long`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateMinValue(fieldName, fieldValue, fieldSchema) {
    const minValue = fieldSchema.minValue;
    
    if (typeof fieldValue === 'number' && fieldValue < minValue) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be at least ${minValue}`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateMaxValue(fieldName, fieldValue, fieldSchema) {
    const maxValue = fieldSchema.maxValue;
    
    if (typeof fieldValue === 'number' && fieldValue > maxValue) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be at most ${maxValue}`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateMinItems(fieldName, fieldValue, fieldSchema) {
    const minItems = fieldSchema.minItems;
    
    if (Array.isArray(fieldValue) && fieldValue.length < minItems) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must have at least ${minItems} items`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateMaxItems(fieldName, fieldValue, fieldSchema) {
    const maxItems = fieldSchema.maxItems;
    
    if (Array.isArray(fieldValue) && fieldValue.length > maxItems) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must have at most ${maxItems} items`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validatePattern(fieldName, fieldValue, fieldSchema) {
    const pattern = fieldSchema.pattern;
    
    if (typeof fieldValue === 'string' && !pattern.test(fieldValue)) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must match the required pattern`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateEnum(fieldName, fieldValue, fieldSchema) {
    const values = fieldSchema.values || fieldSchema.enum;
    
    if (!values.includes(fieldValue)) {
      return {
        valid: false,
        errors: [{
          field: fieldName,
          message: `Field '${fieldName}' must be one of: ${values.join(', ')}`,
          value: fieldValue
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  async validateUnique(fieldName, fieldValue, fieldSchema) {
    // This would typically check against a database
    // For now, we'll just return valid
    return { valid: true, errors: [] };
  }

  async validateExists(fieldName, fieldValue, fieldSchema) {
    // This would typically check against a database
    // For now, we'll just return valid
    return { valid: true, errors: [] };
  }

  async validateCustom(fieldName, fieldValue, fieldSchema) {
    const customFunction = fieldSchema.custom;
    
    if (typeof customFunction === 'function') {
      try {
        const result = await customFunction(fieldValue, fieldName, fieldSchema);
        return result;
      } catch (error) {
        return {
          valid: false,
          errors: [{
            field: fieldName,
            message: `Custom validation failed: ${error.message}`,
            value: fieldValue
          }]
        };
      }
    }
    
    return { valid: true, errors: [] };
  }

  async storeValidationResult(result) {
    try {
      const query = `
        INSERT INTO validation_results (
          id, schema, valid, errors, warnings, duration, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        result.validationId,
        result.schema,
        result.valid,
        JSON.stringify(result.errors),
        JSON.stringify(result.warnings),
        result.duration,
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error storing validation result:', error);
      throw error;
    }
  }

  async getValidationSchemas() {
    try {
      return Array.from(this.validationSchemas.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting validation schemas:', error);
      throw error;
    }
  }

  async getValidationRules() {
    try {
      return Array.from(this.validationRules.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting validation rules:', error);
      throw error;
    }
  }

  async getValidationStats() {
    try {
      const query = `
        SELECT 
          schema,
          COUNT(*) as total_validations,
          COUNT(CASE WHEN valid = true THEN 1 END) as successful_validations,
          COUNT(CASE WHEN valid = false THEN 1 END) as failed_validations,
          AVG(duration) as avg_duration
        FROM validation_results 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY schema
        ORDER BY total_validations DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting validation stats:', error);
      throw error;
    }
  }
}

module.exports = ValidationEngine;
