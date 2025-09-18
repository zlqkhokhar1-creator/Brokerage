const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
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
    
    this.templateTypes = new Map();
    this.templateCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load template types
      await this.loadTemplateTypes();
      
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

  async loadTemplateTypes() {
    try {
      this.templateTypes = new Map([
        ['portfolio_summary', {
          name: 'Portfolio Summary Template',
          description: 'Template for portfolio summary reports',
          sections: ['overview', 'performance', 'holdings', 'risk_metrics'],
          parameters: ['portfolioId', 'timeRange', 'includeCharts']
        }],
        ['performance_analysis', {
          name: 'Performance Analysis Template',
          description: 'Template for performance analysis reports',
          sections: ['attribution', 'benchmark_comparison', 'risk_adjusted_returns', 'factor_analysis'],
          parameters: ['portfolioId', 'timeRange', 'benchmarkId', 'includeRiskMetrics']
        }],
        ['risk_report', {
          name: 'Risk Report Template',
          description: 'Template for risk analysis reports',
          sections: ['risk_metrics', 'stress_tests', 'scenario_analysis', 'recommendations'],
          parameters: ['portfolioId', 'timeRange', 'riskMetrics', 'includeStressTests']
        }],
        ['compliance_report', {
          name: 'Compliance Report Template',
          description: 'Template for compliance reports',
          sections: ['regulatory_summary', 'violations', 'recommendations', 'audit_trail'],
          parameters: ['portfolioId', 'timeRange', 'regulations', 'includeViolations']
        }],
        ['tax_report', {
          name: 'Tax Report Template',
          description: 'Template for tax reports',
          sections: ['tax_summary', 'optimizations', 'harvesting', 'forms'],
          parameters: ['portfolioId', 'taxYear', 'includeOptimizations']
        }],
        ['custom', {
          name: 'Custom Template',
          description: 'User-defined custom template',
          sections: [],
          parameters: []
        }]
      ]);
      
      logger.info('Template types loaded successfully');
    } catch (error) {
      logger.error('Error loading template types:', error);
      throw error;
    }
  }

  async createTemplate(name, description, templateType, content, parameters, userId) {
    try {
      const templateId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Creating template: ${name}`, {
        templateId,
        name,
        templateType,
        userId
      });

      // Validate template type
      if (!this.templateTypes.has(templateType)) {
        throw new Error(`Unknown template type: ${templateType}`);
      }

      // Validate template content
      const validatedContent = await this.validateTemplateContent(content, templateType);
      
      // Create template
      const template = {
        id: templateId,
        name,
        description,
        templateType,
        content: validatedContent,
        parameters,
        userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
      
      // Store template
      await this.storeTemplate(template);
      
      // Cache template
      await this.cacheTemplate(template);
      
      this.emit('templateCreated', template);
      
      logger.info(`Template created: ${templateId}`, {
        templateId,
        processingTime: Date.now() - startTime
      });
      
      return template;
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  async validateTemplateContent(content, templateType) {
    try {
      const templateTypeConfig = this.templateTypes.get(templateType);
      
      // Basic validation
      if (!content || typeof content !== 'object') {
        throw new Error('Template content must be an object');
      }
      
      // Validate required sections
      if (templateTypeConfig.sections && templateTypeConfig.sections.length > 0) {
        for (const section of templateTypeConfig.sections) {
          if (!content.sections || !content.sections.find(s => s.id === section)) {
            logger.warn(`Missing required section: ${section}`);
          }
        }
      }
      
      // Validate template structure
      if (content.sections) {
        for (const section of content.sections) {
          if (!section.id || !section.title) {
            throw new Error('Each section must have an id and title');
          }
        }
      }
      
      return content;
    } catch (error) {
      logger.error('Error validating template content:', error);
      throw error;
    }
  }

  async getTemplate(templateId, userId) {
    try {
      // Try to get from cache first
      const cacheKey = `template:${templateId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        const template = JSON.parse(cached);
        if (template.userId === userId || template.isPublic) {
          return template;
        }
      }

      // Get from database
      const query = `
        SELECT * FROM report_templates 
        WHERE id = $1 AND (user_id = $2 OR is_public = true) AND status = 'active'
      `;
      
      const result = await pool.query(query, [templateId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = result.rows[0];
      
      // Cache the result
      await this.cacheTemplate(template);
      
      return template;
    } catch (error) {
      logger.error('Error getting template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId, name, description, content, parameters, userId) {
    try {
      const startTime = Date.now();
      
      logger.info(`Updating template: ${templateId}`, {
        templateId,
        name,
        userId
      });

      // Get existing template
      const existingTemplate = await this.getTemplate(templateId, userId);
      
      // Validate template content
      const validatedContent = await this.validateTemplateContent(content, existingTemplate.templateType);
      
      // Update template
      const updatedTemplate = {
        ...existingTemplate,
        name: name || existingTemplate.name,
        description: description || existingTemplate.description,
        content: validatedContent,
        parameters: parameters || existingTemplate.parameters,
        updatedAt: new Date().toISOString(),
        version: existingTemplate.version + 1
      };
      
      // Store updated template
      await this.storeTemplate(updatedTemplate);
      
      // Update cache
      await this.cacheTemplate(updatedTemplate);
      
      this.emit('templateUpdated', updatedTemplate);
      
      logger.info(`Template updated: ${templateId}`, {
        templateId,
        processingTime: Date.now() - startTime
      });
      
      return updatedTemplate;
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId, userId) {
    try {
      logger.info(`Deleting template: ${templateId}`, {
        templateId,
        userId
      });

      // Verify ownership
      const template = await this.getTemplate(templateId, userId);
      
      // Soft delete - mark as inactive
      const query = `
        UPDATE report_templates 
        SET status = 'inactive', updated_at = $1 
        WHERE id = $2 AND user_id = $3
      `;
      
      await pool.query(query, [new Date().toISOString(), templateId, userId]);
      
      // Remove from cache
      await this.redis.del(`template:${templateId}`);
      
      this.emit('templateDeleted', { id: templateId, userId });
      
      logger.info(`Template deleted: ${templateId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  async getTemplates(userId, templateType, status) {
    try {
      let query = `
        SELECT * FROM report_templates 
        WHERE (user_id = $1 OR is_public = true)
      `;
      const params = [userId];
      let paramIndex = 2;

      if (templateType) {
        query += ` AND template_type = $${paramIndex}`;
        params.push(templateType);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting templates:', error);
      throw error;
    }
  }

  async storeTemplate(template) {
    try {
      const query = `
        INSERT INTO report_templates (
          id, name, description, template_type, content, parameters, 
          user_id, status, created_at, updated_at, version, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          content = EXCLUDED.content,
          parameters = EXCLUDED.parameters,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          version = EXCLUDED.version
      `;
      
      await pool.query(query, [
        template.id,
        template.name,
        template.description,
        template.templateType,
        JSON.stringify(template.content),
        JSON.stringify(template.parameters),
        template.userId,
        template.status,
        template.createdAt,
        template.updatedAt,
        template.version,
        template.isPublic || false
      ]);
      
      logger.info(`Template stored: ${template.id}`);
    } catch (error) {
      logger.error('Error storing template:', error);
      throw error;
    }
  }

  async cacheTemplate(template) {
    try {
      const cacheKey = `template:${template.id}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(template));
    } catch (error) {
      logger.error('Error caching template:', error);
      throw error;
    }
  }

  async getTemplateTypes() {
    try {
      return Array.from(this.templateTypes.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting template types:', error);
      throw error;
    }
  }

  async createTemplateFromExisting(templateId, name, description, userId) {
    try {
      const existingTemplate = await this.getTemplate(templateId, userId);
      
      const newTemplate = {
        ...existingTemplate,
        id: nanoid(),
        name,
        description,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
      
      await this.storeTemplate(newTemplate);
      await this.cacheTemplate(newTemplate);
      
      this.emit('templateCreated', newTemplate);
      
      return newTemplate;
    } catch (error) {
      logger.error('Error creating template from existing:', error);
      throw error;
    }
  }

  async validateTemplate(templateId, userId) {
    try {
      const template = await this.getTemplate(templateId, userId);
      
      const validation = {
        isValid: true,
        errors: [],
        warnings: []
      };
      
      // Check required fields
      if (!template.name) {
        validation.errors.push('Template name is required');
        validation.isValid = false;
      }
      
      if (!template.content) {
        validation.errors.push('Template content is required');
        validation.isValid = false;
      }
      
      // Check template structure
      if (template.content.sections) {
        for (const section of template.content.sections) {
          if (!section.id) {
            validation.errors.push('Section ID is required');
            validation.isValid = false;
          }
          
          if (!section.title) {
            validation.warnings.push('Section title is recommended');
          }
        }
      }
      
      return validation;
    } catch (error) {
      logger.error('Error validating template:', error);
      throw error;
    }
  }

  async getTemplateUsage(templateId, userId) {
    try {
      const query = `
        SELECT COUNT(*) as usage_count 
        FROM reports 
        WHERE template_id = $1 AND user_id = $2
      `;
      
      const result = await pool.query(query, [templateId, userId]);
      return parseInt(result.rows[0].usage_count);
    } catch (error) {
      logger.error('Error getting template usage:', error);
      throw error;
    }
  }

  async searchTemplates(query, userId, templateType, limit = 20) {
    try {
      let sql = `
        SELECT * FROM report_templates 
        WHERE (user_id = $1 OR is_public = true) 
        AND (name ILIKE $2 OR description ILIKE $2)
      `;
      const params = [userId, `%${query}%`];
      let paramIndex = 3;

      if (templateType) {
        sql += ` AND template_type = $${paramIndex}`;
        params.push(templateType);
        paramIndex++;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Error searching templates:', error);
      throw error;
    }
  }
}

module.exports = TemplateEngine;
