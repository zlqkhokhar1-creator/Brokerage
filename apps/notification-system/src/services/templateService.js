const logger = require('../utils/logger');
const database = require('./database');
const handlebars = require('handlebars');
const htmlToText = require('html-to-text');

class TemplateService {
  async getTemplate(templateName, channel) {
    try {
      const query = 'SELECT * FROM notification_templates WHERE name = $1 AND channel = $2 AND is_active = true';
      const result = await database.query(query, [templateName, channel]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting template:', error);
      return null;
    }
  }

  async renderTemplate(template, data) {
    try {
      const { content, subject, title, body } = template;
      
      switch (template.channel) {
        case 'email':
          return await this.renderEmailTemplate(template, data);
        case 'sms':
          return await this.renderSMSTemplate(template, data);
        case 'push':
          return await this.renderPushTemplate(template, data);
        case 'webhook':
          return await this.renderWebhookTemplate(template, data);
        default:
          return {
            text: content || '',
            data: data
          };
      }
    } catch (error) {
      logger.error('Error rendering template:', error);
      return {
        text: template.content || '',
        data: data
      };
    }
  }

  async renderEmailTemplate(template, data) {
    try {
      const { subject, html_content, text_content } = template;
      
      // Render subject
      const renderedSubject = this.renderText(subject, data);
      
      // Render HTML content
      let renderedHtml = html_content;
      if (renderedHtml) {
        renderedHtml = this.renderText(renderedHtml, data);
      }
      
      // Render text content
      let renderedText = text_content;
      if (renderedText) {
        renderedText = this.renderText(renderedText, data);
      } else if (renderedHtml) {
        // Convert HTML to text if no text content provided
        renderedText = htmlToText.fromString(renderedHtml);
      }
      
      return {
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText
      };
    } catch (error) {
      logger.error('Error rendering email template:', error);
      return {
        subject: template.subject || '',
        html: template.html_content || '',
        text: template.text_content || ''
      };
    }
  }

  async renderSMSTemplate(template, data) {
    try {
      const { content } = template;
      
      // Render SMS content
      const renderedContent = this.renderText(content, data);
      
      return {
        text: renderedContent
      };
    } catch (error) {
      logger.error('Error rendering SMS template:', error);
      return {
        text: template.content || ''
      };
    }
  }

  async renderPushTemplate(template, data) {
    try {
      const { title, body, data_fields } = template;
      
      // Render push content
      const renderedTitle = this.renderText(title, data);
      const renderedBody = this.renderText(body, data);
      
      // Render data fields
      let renderedData = {};
      if (data_fields) {
        const dataFields = JSON.parse(data_fields);
        for (const [key, value] of Object.entries(dataFields)) {
          renderedData[key] = this.renderText(value, data);
        }
      }
      
      return {
        title: renderedTitle,
        body: renderedBody,
        data: renderedData
      };
    } catch (error) {
      logger.error('Error rendering push template:', error);
      return {
        title: template.title || '',
        body: template.body || '',
        data: {}
      };
    }
  }

  async renderWebhookTemplate(template, data) {
    try {
      const { content, data_fields } = template;
      
      // Render webhook content
      let renderedContent = content;
      if (renderedContent) {
        renderedContent = this.renderText(renderedContent, data);
      }
      
      // Render data fields
      let renderedData = {};
      if (data_fields) {
        const dataFields = JSON.parse(data_fields);
        for (const [key, value] of Object.entries(dataFields)) {
          renderedData[key] = this.renderText(value, data);
        }
      }
      
      return {
        content: renderedContent,
        data: renderedData
      };
    } catch (error) {
      logger.error('Error rendering webhook template:', error);
      return {
        content: template.content || '',
        data: {}
      };
    }
  }

  renderText(text, data) {
    try {
      if (!text) {
        return '';
      }
      
      const template = handlebars.compile(text);
      return template(data);
    } catch (error) {
      logger.error('Error rendering text:', error);
      return text;
    }
  }

  async createTemplate(templateData) {
    try {
      const { name, channel, subject, title, body, content, html_content, text_content, data_fields } = templateData;
      
      const query = `
        INSERT INTO notification_templates 
        (name, channel, subject, title, body, content, html_content, text_content, data_fields, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, channel, subject, title, body, content,
        html_content, text_content, JSON.stringify(data_fields)
      ]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId, templateData) {
    try {
      const { name, channel, subject, title, body, content, html_content, text_content, data_fields } = templateData;
      
      const query = `
        UPDATE notification_templates 
        SET name = $1, channel = $2, subject = $3, title = $4, body = $5, 
            content = $6, html_content = $7, text_content = $8, data_fields = $9,
            updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, channel, subject, title, body, content,
        html_content, text_content, JSON.stringify(data_fields), templateId
      ]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId) {
    try {
      const query = 'UPDATE notification_templates SET is_active = false WHERE id = $1';
      await database.query(query, [templateId]);
      
      return true;
    } catch (error) {
      logger.error('Error deleting template:', error);
      return false;
    }
  }

  async getTemplates(channel = null) {
    try {
      let query = 'SELECT * FROM notification_templates WHERE is_active = true';
      const params = [];
      
      if (channel) {
        query += ' AND channel = $1';
        params.push(channel);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting templates:', error);
      return [];
    }
  }
}

module.exports = new TemplateService();

