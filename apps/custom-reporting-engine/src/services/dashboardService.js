const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const dataAggregator = require('./dataAggregator');

class DashboardService {
  async getDashboards(req, res) {
    try {
      const { userId, type, page = 1, limit = 10 } = req.query;
      
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM dashboards WHERE 1=1';
      const params = [];
      
      if (userId) {
        query += ' AND user_id = $' + (params.length + 1);
        params.push(userId);
      }
      
      if (type) {
        query += ' AND type = $' + (params.length + 1);
        params.push(type);
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
      logger.error('Error getting dashboards:', error);
      res.status(500).json({ success: false, error: 'Failed to get dashboards' });
    }
  }

  async createDashboard(req, res) {
    try {
      const { name, description, type, layout, widgets, filters } = req.body;
      const userId = req.user.id;
      
      const query = `
        INSERT INTO dashboards (name, description, type, layout, widgets, filters, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, description, type,
        JSON.stringify(layout),
        JSON.stringify(widgets),
        JSON.stringify(filters),
        userId
      ]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error creating dashboard:', error);
      res.status(500).json({ success: false, error: 'Failed to create dashboard' });
    }
  }

  async getDashboard(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const query = 'SELECT * FROM dashboards WHERE id = $1 AND user_id = $2';
      const result = await database.query(query, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Dashboard not found' });
      }
      
      const dashboard = result.rows[0];
      
      // Populate dashboard with current data
      const populatedDashboard = await this.populateDashboardData(dashboard);
      
      res.json({
        success: true,
        data: populatedDashboard
      });
    } catch (error) {
      logger.error('Error getting dashboard:', error);
      res.status(500).json({ success: false, error: 'Failed to get dashboard' });
    }
  }

  async updateDashboard(req, res) {
    try {
      const { id } = req.params;
      const { name, description, type, layout, widgets, filters } = req.body;
      const userId = req.user.id;
      
      const query = `
        UPDATE dashboards 
        SET name = $1, description = $2, type = $3, layout = $4, 
            widgets = $5, filters = $6, updated_at = NOW()
        WHERE id = $7 AND user_id = $8
        RETURNING *
      `;
      
      const result = await database.query(query, [
        name, description, type,
        JSON.stringify(layout),
        JSON.stringify(widgets),
        JSON.stringify(filters),
        id, userId
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Dashboard not found' });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating dashboard:', error);
      res.status(500).json({ success: false, error: 'Failed to update dashboard' });
    }
  }

  async deleteDashboard(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const query = 'DELETE FROM dashboards WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await database.query(query, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Dashboard not found' });
      }
      
      res.json({
        success: true,
        message: 'Dashboard deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting dashboard:', error);
      res.status(500).json({ success: false, error: 'Failed to delete dashboard' });
    }
  }

  async refreshDashboard(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const query = 'SELECT * FROM dashboards WHERE id = $1 AND user_id = $2';
      const result = await database.query(query, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Dashboard not found' });
      }
      
      const dashboard = result.rows[0];
      const refreshedDashboard = await this.populateDashboardData(dashboard);
      
      res.json({
        success: true,
        data: refreshedDashboard
      });
    } catch (error) {
      logger.error('Error refreshing dashboard:', error);
      res.status(500).json({ success: false, error: 'Failed to refresh dashboard' });
    }
  }

  async populateDashboardData(dashboard) {
    try {
      const widgets = JSON.parse(dashboard.widgets || '[]');
      const populatedWidgets = [];
      
      for (const widget of widgets) {
        const widgetData = await this.getWidgetData(widget);
        populatedWidgets.push({
          ...widget,
          data: widgetData
        });
      }
      
      return {
        ...dashboard,
        widgets: populatedWidgets,
        lastRefreshed: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error populating dashboard data:', error);
      return dashboard;
    }
  }

  async getWidgetData(widget) {
    try {
      const { type, dataSource, parameters } = widget;
      
      switch (type) {
        case 'chart':
          return await dataAggregator.aggregateData({
            source: dataSource,
            ...parameters
          });
        case 'table':
          return await dataAggregator.queryData({
            query: parameters.query,
            filters: parameters.filters
          });
        case 'metric':
          return await dataAggregator.aggregateData({
            source: dataSource,
            aggregation: 'sum',
            ...parameters
          });
        default:
          return null;
      }
    } catch (error) {
      logger.error('Error getting widget data:', error);
      return null;
    }
  }

  async refreshAllDashboards() {
    try {
      const query = 'SELECT * FROM dashboards WHERE status = $1';
      const result = await database.query(query, ['active']);
      
      for (const dashboard of result.rows) {
        try {
          await this.populateDashboardData(dashboard);
        } catch (error) {
          logger.error(`Error refreshing dashboard ${dashboard.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error refreshing all dashboards:', error);
    }
  }

  async handleDashboardUpdate(data) {
    try {
      const { dashboardId, userId } = data;
      await this.refreshDashboard({ params: { id: dashboardId } }, { json: () => {} });
    } catch (error) {
      logger.error('Error handling dashboard update:', error);
    }
  }
}

module.exports = new DashboardService();

