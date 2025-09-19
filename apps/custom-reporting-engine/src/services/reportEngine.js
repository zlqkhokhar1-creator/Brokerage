const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const templateService = require('./templateService');
const dataAggregator = require('./dataAggregator');
const exportService = require('./exportService');

class ReportEngine {
  async getReports(req, res) {
    try {
      const { userId, type, status, page = 1, limit = 10 } = req.query;
      
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM reports WHERE 1=1';
      const params = [];
      
      if (userId) {
        query += ' AND user_id = $' + (params.length + 1);
        params.push(userId);
      }
      
      if (type) {
        query += ' AND type = $' + (params.length + 1);
        params.push(type);
      }
      
      if (status) {
        query += ' AND status = $' + (params.length + 1);
        params.push(status);
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
      logger.error('Error getting reports:', error);
      res.status(500).json({ success: false, error: 'Failed to get reports' });
    }
  }

  async createReport(req, res) {
    try {
      const { name, description, type, template_id, parameters, schedule } = req.body;
      const userId = req.user.id;
      
      const query = `
        INSERT INTO reports (name, description, type, template_id, parameters, schedule, user_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, description, type, template_id, 
        JSON.stringify(parameters), 
        JSON.stringify(schedule), 
        userId
      ]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error creating report:', error);
      res.status(500).json({ success: false, error: 'Failed to create report' });
    }
  }

  async getReport(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const query = 'SELECT * FROM reports WHERE id = $1 AND user_id = $2';
      const result = await database.query(query, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error getting report:', error);
      res.status(500).json({ success: false, error: 'Failed to get report' });
    }
  }

  async updateReport(req, res) {
    try {
      const { id } = req.params;
      const { name, description, type, template_id, parameters, schedule } = req.body;
      const userId = req.user.id;
      
      const query = `
        UPDATE reports 
        SET name = $1, description = $2, type = $3, template_id = $4, 
            parameters = $5, schedule = $6, updated_at = NOW()
        WHERE id = $7 AND user_id = $8
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, description, type, template_id,
        JSON.stringify(parameters),
        JSON.stringify(schedule),
        id, userId
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating report:', error);
      res.status(500).json({ success: false, error: 'Failed to update report' });
    }
  }

  async deleteReport(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const query = 'DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await database.query(query, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      
      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting report:', error);
      res.status(500).json({ success: false, error: 'Failed to delete report' });
    }
  }

  async executeReport(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Get report details
      const reportQuery = 'SELECT * FROM reports WHERE id = $1 AND user_id = $2';
      const reportResult = await database.query(reportQuery, [id, userId]);
      
      if (reportResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      
      const report = reportResult.rows[0];
      
      // Execute report using template and data aggregator
      const template = await templateService.getTemplate(report.template_id);
      const data = await dataAggregator.aggregateData(report.parameters);
      
      // Generate report content
      const reportContent = await this.generateReportContent(template, data, report.parameters);
      
      // Update report status
      await database.query(
        'UPDATE reports SET status = $1, last_executed = NOW() WHERE id = $2',
        ['completed', id]
      );
      
      res.json({
        success: true,
        data: {
          reportId: id,
          content: reportContent,
          executedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error executing report:', error);
      res.status(500).json({ success: false, error: 'Failed to execute report' });
    }
  }

  async generateReportContent(template, data, parameters) {
    // Implementation for generating report content based on template
    return {
      template: template,
      data: data,
      parameters: parameters,
      generatedAt: new Date().toISOString()
    };
  }

  async executeScheduledReports() {
    try {
      const query = `
        SELECT * FROM reports 
        WHERE schedule IS NOT NULL 
        AND status = 'active'
        AND (last_executed IS NULL OR last_executed < NOW() - INTERVAL '1 day')
      `;
      
      const result = await database.query(query);
      
      for (const report of result.rows) {
        try {
          await this.executeReport({ params: { id: report.id } }, { json: () => {} });
        } catch (error) {
          logger.error(`Error executing scheduled report ${report.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error executing scheduled reports:', error);
    }
  }

  async handleReportRequest(data) {
    try {
      const { reportId, userId } = data;
      await this.executeReport({ params: { id: reportId } }, { json: () => {} });
    } catch (error) {
      logger.error('Error handling report request:', error);
    }
  }
}

module.exports = new ReportEngine();

