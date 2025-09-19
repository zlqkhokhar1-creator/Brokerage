const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');

class TemplateService {
  async getTemplates(req, res) {
    try {
      const { type, category, page = 1, limit = 10 } = req.query;
      
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM templates WHERE 1=1';
      const params = [];
      
      if (type) {
        query += ' AND type = $' + (params.length + 1);
        params.push(type);
      }
      
      if (category) {
        query += ' AND category = $' + (params.length + 1);
        params.push(category);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);
      
      const result = await database.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rowCount
        }
      });
    } catch (error) {
      logger.error('Error getting templates:', error);
      res.status(500).json({ success: false, error: 'Failed to get templates' });
    }
  }

  async createTemplate(req, res) {
    try {
      const { name, description, type, category, content, parameters, metadata } = req.body;
      const userId = req.user.id;
      
      const query = `
        INSERT INTO templates (name, description, type, category, content, parameters, metadata, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, description, type, category,
        JSON.stringify(content),
        JSON.stringify(parameters),
        JSON.stringify(metadata),
        userId
      ]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error creating template:', error);
      res.status(500).json({ success: false, error: 'Failed to create template' });
    }
  }

  async getTemplate(req, res) {
    try {
      const { id } = req.params;
      
      const query = 'SELECT * FROM templates WHERE id = $1';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error getting template:', error);
      res.status(500).json({ success: false, error: 'Failed to get template' });
    }
  }

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, description, type, category, content, parameters, metadata } = req.body;
      const userId = req.user.id;
      
      const query = `
        UPDATE templates 
        SET name = $1, description = $2, type = $3, category = $4, 
            content = $5, parameters = $6, metadata = $7, updated_at = NOW()
        WHERE id = $8 AND user_id = $9
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, description, type, category,
        JSON.stringify(content),
        JSON.stringify(parameters),
        JSON.stringify(metadata),
        id, userId
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating template:', error);
      res.status(500).json({ success: false, error: 'Failed to update template' });
    }
  }

  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const query = 'DELETE FROM templates WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await database.query(query, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }
      
      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting template:', error);
      res.status(500).json({ success: false, error: 'Failed to delete template' });
    }
  }

  async getTemplate(id) {
    try {
      const query = 'SELECT * FROM templates WHERE id = $1';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting template:', error);
      throw error;
    }
  }

  async renderTemplate(template, data, parameters) {
    try {
      const { content, type } = template;
      
      switch (type) {
        case 'html':
          return await this.renderHtmlTemplate(content, data, parameters);
        case 'pdf':
          return await this.renderPdfTemplate(content, data, parameters);
        case 'excel':
          return await this.renderExcelTemplate(content, data, parameters);
        case 'json':
          return await this.renderJsonTemplate(content, data, parameters);
        default:
          throw new Error('Unsupported template type');
      }
    } catch (error) {
      logger.error('Error rendering template:', error);
      throw error;
    }
  }

  async renderHtmlTemplate(content, data, parameters) {
    // Implementation for HTML template rendering
    return {
      type: 'html',
      content: content,
      data: data,
      parameters: parameters
    };
  }

  async renderPdfTemplate(content, data, parameters) {
    // Implementation for PDF template rendering
    return {
      type: 'pdf',
      content: content,
      data: data,
      parameters: parameters
    };
  }

  async renderExcelTemplate(content, data, parameters) {
    // Implementation for Excel template rendering
    return {
      type: 'excel',
      content: content,
      data: data,
      parameters: parameters
    };
  }

  async renderJsonTemplate(content, data, parameters) {
    // Implementation for JSON template rendering
    return {
      type: 'json',
      content: content,
      data: data,
      parameters: parameters
    };
  }
}

module.exports = new TemplateService();

