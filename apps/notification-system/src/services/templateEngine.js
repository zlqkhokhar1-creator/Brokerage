const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class TemplateEngine extends EventEmitter {
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
    this.templateCategories = new Map();
    this.templateVariables = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load templates
      await this.loadTemplates();
      
      // Load template categories
      await this.loadTemplateCategories();
      
      // Load template variables
      await this.loadTemplateVariables();
      
      this._initialized = true;
      logger.info('TemplateEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize TemplateEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('TemplateEngine closed');
    } catch (error) {
      logger.error('Error closing TemplateEngine:', error);
    }
  }

  async loadTemplates() {
    try {
      const result = await pool.query(`
        SELECT * FROM notification_templates
        WHERE is_active = true
        ORDER BY created_at DESC
      `);
      
      for (const template of result.rows) {
        this.templates.set(template.id, {
          ...template,
          content: template.content ? JSON.parse(template.content) : {},
          variables: template.variables ? JSON.parse(template.variables) : [],
          channels: template.channels ? JSON.parse(template.channels) : [],
          metadata: template.metadata ? JSON.parse(template.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} notification templates`);
    } catch (error) {
      logger.error('Error loading templates:', error);
      throw error;
    }
  }

  async loadTemplateCategories() {
    try {
      const result = await pool.query(`
        SELECT * FROM template_categories
        WHERE is_active = true
        ORDER BY name ASC
      `);
      
      for (const category of result.rows) {
        this.templateCategories.set(category.id, {
          ...category,
          metadata: category.metadata ? JSON.parse(category.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} template categories`);
    } catch (error) {
      logger.error('Error loading template categories:', error);
      throw error;
    }
  }

  async loadTemplateVariables() {
    try {
      const result = await pool.query(`
        SELECT * FROM template_variables
        WHERE is_active = true
        ORDER BY name ASC
      `);
      
      for (const variable of result.rows) {
        this.templateVariables.set(variable.id, {
          ...variable,
          validation_rules: variable.validation_rules ? JSON.parse(variable.validation_rules) : {},
          metadata: variable.metadata ? JSON.parse(variable.metadata) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} template variables`);
    } catch (error) {
      logger.error('Error loading template variables:', error);
      throw error;
    }
  }

  async createTemplate(name, content, variables, channels, userId) {
    try {
      const templateId = nanoid();
      const now = new Date();
      
      // Validate template content
      this.validateTemplateContent(content, variables);
      
      // Create template
      const template = {
        id: templateId,
        name,
        content: typeof content === 'string' ? { text: content } : content,
        variables: Array.isArray(variables) ? variables : [],
        channels: Array.isArray(channels) ? channels : [],
        category_id: null,
        metadata: {},
        is_active: true,
        created_by: userId,
        created_at: now,
        updated_at: now
      };
      
      // Store template
      await this.storeTemplate(template);
      
      // Cache template
      this.templates.set(templateId, template);
      
      // Emit event
      this.emit('templateCreated', template);
      
      logger.info(`Template created: ${templateId}`, { name, variables: variables.length });
      
      return template;
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  async getTemplate(templateId, userId) {
    try {
      // Check cache first
      if (this.templates.has(templateId)) {
        return this.templates.get(templateId);
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM notification_templates
        WHERE id = $1 AND (created_by = $2 OR is_public = true)
      `, [templateId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }
      
      const template = {
        ...result.rows[0],
        content: result.rows[0].content ? JSON.parse(result.rows[0].content) : {},
        variables: result.rows[0].variables ? JSON.parse(result.rows[0].variables) : [],
        channels: result.rows[0].channels ? JSON.parse(result.rows[0].channels) : [],
        metadata: result.rows[0].metadata ? JSON.parse(result.rows[0].metadata) : {}
      };
      
      // Cache template
      this.templates.set(templateId, template);
      
      return template;
    } catch (error) {
      logger.error('Error getting template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId, updates, userId) {
    try {
      const template = await this.getTemplate(templateId, userId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Validate updates
      if (updates.content) {
        this.validateTemplateContent(updates.content, updates.variables || template.variables);
      }
      
      // Update template
      const updatedTemplate = {
        ...template,
        ...updates,
        updated_at: new Date()
      };
      
      // Update database
      await this.updateTemplateInDatabase(updatedTemplate);
      
      // Update cache
      this.templates.set(templateId, updatedTemplate);
      
      // Emit event
      this.emit('templateUpdated', updatedTemplate);
      
      logger.info(`Template updated: ${templateId}`, { updates: Object.keys(updates) });
      
      return updatedTemplate;
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId, userId) {
    try {
      const template = await this.getTemplate(templateId, userId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Soft delete
      await pool.query(`
        UPDATE notification_templates
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `, [new Date(), templateId]);
      
      // Remove from cache
      this.templates.delete(templateId);
      
      // Emit event
      this.emit('templateDeleted', { templateId, deletedAt: new Date() });
      
      logger.info(`Template deleted: ${templateId}`);
      
      return { success: true, templateId };
    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  async renderTemplate(templateId, variables, userId) {
    try {
      const template = await this.getTemplate(templateId, userId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Validate variables
      this.validateTemplateVariables(template.variables, variables);
      
      // Render template content
      const renderedContent = this.renderTemplateContent(template.content, variables);
      
      // Create rendered template
      const renderedTemplate = {
        id: nanoid(),
        template_id: templateId,
        content: renderedContent,
        variables: variables,
        channels: template.channels,
        rendered_at: new Date(),
        rendered_by: userId
      };
      
      // Store rendered template
      await this.storeRenderedTemplate(renderedTemplate);
      
      logger.info(`Template rendered: ${templateId}`, {
        variables: Object.keys(variables).length,
        channels: template.channels.length
      });
      
      return renderedTemplate;
    } catch (error) {
      logger.error('Error rendering template:', error);
      throw error;
    }
  }

  async getTemplatesByCategory(categoryId, userId) {
    try {
      const result = await pool.query(`
        SELECT * FROM notification_templates
        WHERE category_id = $1 AND is_active = true
        AND (created_by = $2 OR is_public = true)
        ORDER BY created_at DESC
      `, [categoryId, userId]);
      
      return result.rows.map(row => ({
        ...row,
        content: row.content ? JSON.parse(row.content) : {},
        variables: row.variables ? JSON.parse(row.variables) : [],
        channels: row.channels ? JSON.parse(row.channels) : [],
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
    } catch (error) {
      logger.error('Error getting templates by category:', error);
      throw error;
    }
  }

  async searchTemplates(query, userId) {
    try {
      const result = await pool.query(`
        SELECT * FROM notification_templates
        WHERE (name ILIKE $1 OR content::text ILIKE $1)
        AND is_active = true
        AND (created_by = $2 OR is_public = true)
        ORDER BY created_at DESC
        LIMIT 50
      `, [`%${query}%`, userId]);
      
      return result.rows.map(row => ({
        ...row,
        content: row.content ? JSON.parse(row.content) : {},
        variables: row.variables ? JSON.parse(row.variables) : [],
        channels: row.channels ? JSON.parse(row.channels) : [],
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
    } catch (error) {
      logger.error('Error searching templates:', error);
      throw error;
    }
  }

  validateTemplateContent(content, variables) {
    try {
      if (!content || typeof content !== 'object') {
        throw new Error('Template content must be an object');
      }
      
      // Check for required fields
      const requiredFields = ['text', 'subject'];
      for (const field of requiredFields) {
        if (!content[field]) {
          throw new Error(`Template content must include ${field}`);
        }
      }
      
      // Validate variable placeholders
      const contentText = JSON.stringify(content);
      const variablePlaceholders = contentText.match(/\{\{(\w+)\}\}/g) || [];
      
      for (const placeholder of variablePlaceholders) {
        const variableName = placeholder.replace(/\{\{|\}\}/g, '');
        if (!variables.includes(variableName)) {
          throw new Error(`Variable ${variableName} is used in template but not defined`);
        }
      }
      
      // Check for unused variables
      for (const variable of variables) {
        if (!contentText.includes(`{{${variable}}}`)) {
          logger.warn(`Variable ${variable} is defined but not used in template`);
        }
      }
      
    } catch (error) {
      logger.error('Error validating template content:', error);
      throw error;
    }
  }

  validateTemplateVariables(templateVariables, providedVariables) {
    try {
      // Check for required variables
      for (const variable of templateVariables) {
        if (variable.required && !providedVariables.hasOwnProperty(variable.name)) {
          throw new Error(`Required variable ${variable.name} is missing`);
        }
      }
      
      // Validate variable values
      for (const [name, value] of Object.entries(providedVariables)) {
        const variable = templateVariables.find(v => v.name === name);
        if (variable) {
          this.validateVariableValue(variable, value);
        }
      }
      
    } catch (error) {
      logger.error('Error validating template variables:', error);
      throw error;
    }
  }

  validateVariableValue(variable, value) {
    try {
      const { type, validation_rules } = variable;
      
      // Type validation
      switch (type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new Error(`Variable ${variable.name} must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(`Variable ${variable.name} must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new Error(`Variable ${variable.name} must be a boolean`);
          }
          break;
        case 'email':
          if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new Error(`Variable ${variable.name} must be a valid email`);
          }
          break;
        case 'url':
          if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) {
            throw new Error(`Variable ${variable.name} must be a valid URL`);
          }
          break;
      }
      
      // Custom validation rules
      if (validation_rules) {
        if (validation_rules.min_length && value.length < validation_rules.min_length) {
          throw new Error(`Variable ${variable.name} must be at least ${validation_rules.min_length} characters long`);
        }
        if (validation_rules.max_length && value.length > validation_rules.max_length) {
          throw new Error(`Variable ${variable.name} must be no more than ${validation_rules.max_length} characters long`);
        }
        if (validation_rules.pattern && !new RegExp(validation_rules.pattern).test(value)) {
          throw new Error(`Variable ${variable.name} does not match required pattern`);
        }
      }
      
    } catch (error) {
      logger.error('Error validating variable value:', error);
      throw error;
    }
  }

  renderTemplateContent(content, variables) {
    try {
      const renderedContent = {};
      
      for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string') {
          renderedContent[key] = this.renderString(value, variables);
        } else if (typeof value === 'object' && value !== null) {
          renderedContent[key] = this.renderObject(value, variables);
        } else {
          renderedContent[key] = value;
        }
      }
      
      return renderedContent;
    } catch (error) {
      logger.error('Error rendering template content:', error);
      throw error;
    }
  }

  renderString(str, variables) {
    try {
      return str.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
        if (variables.hasOwnProperty(variableName)) {
          return variables[variableName];
        }
        logger.warn(`Variable ${variableName} not found in provided variables`);
        return match; // Keep original placeholder if variable not found
      });
    } catch (error) {
      logger.error('Error rendering string:', error);
      return str;
    }
  }

  renderObject(obj, variables) {
    try {
      const rendered = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          rendered[key] = this.renderString(value, variables);
        } else if (typeof value === 'object' && value !== null) {
          rendered[key] = this.renderObject(value, variables);
        } else {
          rendered[key] = value;
        }
      }
      
      return rendered;
    } catch (error) {
      logger.error('Error rendering object:', error);
      return obj;
    }
  }

  async storeTemplate(template) {
    try {
      await pool.query(`
        INSERT INTO notification_templates (
          id, name, content, variables, channels, category_id, metadata,
          is_active, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        template.id,
        template.name,
        JSON.stringify(template.content),
        JSON.stringify(template.variables),
        JSON.stringify(template.channels),
        template.category_id,
        JSON.stringify(template.metadata),
        template.is_active,
        template.created_by,
        template.created_at,
        template.updated_at
      ]);
    } catch (error) {
      logger.error('Error storing template:', error);
      throw error;
    }
  }

  async updateTemplateInDatabase(template) {
    try {
      await pool.query(`
        UPDATE notification_templates
        SET name = $1, content = $2, variables = $3, channels = $4,
            category_id = $5, metadata = $6, updated_at = $7
        WHERE id = $8
      `, [
        template.name,
        JSON.stringify(template.content),
        JSON.stringify(template.variables),
        JSON.stringify(template.channels),
        template.category_id,
        JSON.stringify(template.metadata),
        template.updated_at,
        template.id
      ]);
    } catch (error) {
      logger.error('Error updating template in database:', error);
      throw error;
    }
  }

  async storeRenderedTemplate(renderedTemplate) {
    try {
      await pool.query(`
        INSERT INTO rendered_templates (
          id, template_id, content, variables, channels,
          rendered_at, rendered_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        renderedTemplate.id,
        renderedTemplate.template_id,
        JSON.stringify(renderedTemplate.content),
        JSON.stringify(renderedTemplate.variables),
        JSON.stringify(renderedTemplate.channels),
        renderedTemplate.rendered_at,
        renderedTemplate.rendered_by
      ]);
    } catch (error) {
      logger.error('Error storing rendered template:', error);
      throw error;
    }
  }

  async getTemplateStats() {
    try {
      const stats = {
        total_templates: this.templates.size,
        active_templates: Array.from(this.templates.values()).filter(t => t.is_active).length,
        template_categories: this.templateCategories.size,
        template_variables: this.templateVariables.size
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting template stats:', error);
      throw error;
    }
  }

  async getTemplateUsage(templateId) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_usage,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as usage_24h,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as usage_7d,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as usage_30d
        FROM rendered_templates
        WHERE template_id = $1
      `, [templateId]);
      
      return result.rows[0] || {
        total_usage: 0,
        usage_24h: 0,
        usage_7d: 0,
        usage_30d: 0
      };
    } catch (error) {
      logger.error('Error getting template usage:', error);
      throw error;
    }
  }
}

module.exports = TemplateEngine;
