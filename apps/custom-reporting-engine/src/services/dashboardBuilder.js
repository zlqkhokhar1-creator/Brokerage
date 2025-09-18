const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class DashboardBuilder extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.widgetTypes = new Map();
    this.dashboardCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load widget types
      await this.loadWidgetTypes();
      
      this._initialized = true;
      logger.info('DashboardBuilder initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DashboardBuilder:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('DashboardBuilder closed');
    } catch (error) {
      logger.error('Error closing DashboardBuilder:', error);
    }
  }

  async loadWidgetTypes() {
    try {
      this.widgetTypes = new Map([
        ['chart', {
          name: 'Chart Widget',
          description: 'Interactive chart visualization',
          component: 'ChartWidget',
          configurable: true,
          dataSource: true
        }],
        ['table', {
          name: 'Table Widget',
          description: 'Data table with sorting and filtering',
          component: 'TableWidget',
          configurable: true,
          dataSource: true
        }],
        ['metric', {
          name: 'Metric Widget',
          description: 'Single value metric display',
          component: 'MetricWidget',
          configurable: true,
          dataSource: true
        }],
        ['gauge', {
          name: 'Gauge Widget',
          description: 'Gauge chart for progress indicators',
          component: 'GaugeWidget',
          configurable: true,
          dataSource: true
        }],
        ['pie_chart', {
          name: 'Pie Chart Widget',
          description: 'Pie chart for categorical data',
          component: 'PieChartWidget',
          configurable: true,
          dataSource: true
        }],
        ['bar_chart', {
          name: 'Bar Chart Widget',
          description: 'Bar chart for comparative data',
          component: 'BarChartWidget',
          configurable: true,
          dataSource: true
        }],
        ['line_chart', {
          name: 'Line Chart Widget',
          description: 'Line chart for time series data',
          component: 'LineChartWidget',
          configurable: true,
          dataSource: true
        }],
        ['heatmap', {
          name: 'Heatmap Widget',
          description: 'Heatmap for correlation data',
          component: 'HeatmapWidget',
          configurable: true,
          dataSource: true
        }],
        ['text', {
          name: 'Text Widget',
          description: 'Rich text content widget',
          component: 'TextWidget',
          configurable: true,
          dataSource: false
        }],
        ['image', {
          name: 'Image Widget',
          description: 'Image display widget',
          component: 'ImageWidget',
          configurable: true,
          dataSource: false
        }]
      ]);
      
      logger.info('Widget types loaded successfully');
    } catch (error) {
      logger.error('Error loading widget types:', error);
      throw error;
    }
  }

  async createDashboard(name, description, layout, widgets, parameters, userId) {
    try {
      const dashboardId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Creating dashboard: ${name}`, {
        dashboardId,
        name,
        userId
      });

      // Validate layout
      this.validateLayout(layout);
      
      // Validate widgets
      await this.validateWidgets(widgets);
      
      // Create dashboard
      const dashboard = {
        id: dashboardId,
        name,
        description,
        layout,
        widgets,
        parameters,
        userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
      
      // Store dashboard
      await this.storeDashboard(dashboard);
      
      // Cache dashboard
      await this.cacheDashboard(dashboard);
      
      this.emit('dashboardCreated', dashboard);
      
      logger.info(`Dashboard created: ${dashboardId}`, {
        dashboardId,
        processingTime: Date.now() - startTime
      });
      
      return dashboard;
    } catch (error) {
      logger.error('Error creating dashboard:', error);
      throw error;
    }
  }

  validateLayout(layout) {
    try {
      if (!layout || typeof layout !== 'object') {
        throw new Error('Layout must be an object');
      }
      
      if (!layout.rows || !Array.isArray(layout.rows)) {
        throw new Error('Layout must have a rows array');
      }
      
      for (const row of layout.rows) {
        if (!row.columns || !Array.isArray(row.columns)) {
          throw new Error('Each row must have a columns array');
        }
        
        for (const column of row.columns) {
          if (!column.width || typeof column.width !== 'number') {
            throw new Error('Each column must have a numeric width');
          }
          
          if (column.width < 1 || column.width > 12) {
            throw new Error('Column width must be between 1 and 12');
          }
        }
      }
      
    } catch (error) {
      logger.error('Error validating layout:', error);
      throw error;
    }
  }

  async validateWidgets(widgets) {
    try {
      if (!widgets || !Array.isArray(widgets)) {
        throw new Error('Widgets must be an array');
      }
      
      for (const widget of widgets) {
        if (!widget.id) {
          throw new Error('Each widget must have an id');
        }
        
        if (!widget.type) {
          throw new Error('Each widget must have a type');
        }
        
        if (!this.widgetTypes.has(widget.type)) {
          throw new Error(`Unknown widget type: ${widget.type}`);
        }
        
        if (!widget.position) {
          throw new Error('Each widget must have a position');
        }
        
        if (!widget.position.row || !widget.position.column) {
          throw new Error('Widget position must have row and column');
        }
      }
      
    } catch (error) {
      logger.error('Error validating widgets:', error);
      throw error;
    }
  }

  async getDashboard(dashboardId, userId) {
    try {
      // Try to get from cache first
      const cacheKey = `dashboard:${dashboardId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        const dashboard = JSON.parse(cached);
        if (dashboard.userId === userId || dashboard.isPublic) {
          return dashboard;
        }
      }

      // Get from database
      const query = `
        SELECT * FROM dashboards 
        WHERE id = $1 AND (user_id = $2 OR is_public = true) AND status = 'active'
      `;
      
      const result = await pool.query(query, [dashboardId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Dashboard not found');
      }

      const dashboard = result.rows[0];
      
      // Cache the result
      await this.cacheDashboard(dashboard);
      
      return dashboard;
    } catch (error) {
      logger.error('Error getting dashboard:', error);
      throw error;
    }
  }

  async updateDashboard(dashboardId, name, description, layout, widgets, parameters, userId) {
    try {
      const startTime = Date.now();
      
      logger.info(`Updating dashboard: ${dashboardId}`, {
        dashboardId,
        name,
        userId
      });

      // Get existing dashboard
      const existingDashboard = await this.getDashboard(dashboardId, userId);
      
      // Validate layout
      this.validateLayout(layout);
      
      // Validate widgets
      await this.validateWidgets(widgets);
      
      // Update dashboard
      const updatedDashboard = {
        ...existingDashboard,
        name: name || existingDashboard.name,
        description: description || existingDashboard.description,
        layout: layout || existingDashboard.layout,
        widgets: widgets || existingDashboard.widgets,
        parameters: parameters || existingDashboard.parameters,
        updatedAt: new Date().toISOString(),
        version: existingDashboard.version + 1
      };
      
      // Store updated dashboard
      await this.storeDashboard(updatedDashboard);
      
      // Update cache
      await this.cacheDashboard(updatedDashboard);
      
      this.emit('dashboardUpdated', updatedDashboard);
      
      logger.info(`Dashboard updated: ${dashboardId}`, {
        dashboardId,
        processingTime: Date.now() - startTime
      });
      
      return updatedDashboard;
    } catch (error) {
      logger.error('Error updating dashboard:', error);
      throw error;
    }
  }

  async deleteDashboard(dashboardId, userId) {
    try {
      logger.info(`Deleting dashboard: ${dashboardId}`, {
        dashboardId,
        userId
      });

      // Verify ownership
      const dashboard = await this.getDashboard(dashboardId, userId);
      
      // Soft delete - mark as inactive
      const query = `
        UPDATE dashboards 
        SET status = 'inactive', updated_at = $1 
        WHERE id = $2 AND user_id = $3
      `;
      
      await pool.query(query, [new Date().toISOString(), dashboardId, userId]);
      
      // Remove from cache
      await this.redis.del(`dashboard:${dashboardId}`);
      
      this.emit('dashboardDeleted', { id: dashboardId, userId });
      
      logger.info(`Dashboard deleted: ${dashboardId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting dashboard:', error);
      throw error;
    }
  }

  async getDashboards(userId, status, category) {
    try {
      let query = `
        SELECT * FROM dashboards 
        WHERE (user_id = $1 OR is_public = true)
      `;
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting dashboards:', error);
      throw error;
    }
  }

  async updateDashboardData(dashboardId) {
    try {
      const dashboard = await this.getDashboard(dashboardId, 'system');
      
      // Update data for each widget
      for (const widget of dashboard.widgets) {
        if (widget.dataSource) {
          await this.updateWidgetData(widget);
        }
      }
      
      // Update dashboard
      dashboard.updatedAt = new Date().toISOString();
      await this.storeDashboard(dashboard);
      await this.cacheDashboard(dashboard);
      
      logger.info(`Dashboard data updated: ${dashboardId}`);
      
    } catch (error) {
      logger.error(`Error updating dashboard data ${dashboardId}:`, error);
      throw error;
    }
  }

  async updateWidgetData(widget) {
    try {
      // This would typically fetch data from various sources
      // For now, we'll generate mock data
      const mockData = this.generateMockData(widget.type, widget.config);
      
      widget.data = mockData;
      widget.lastUpdated = new Date().toISOString();
      
    } catch (error) {
      logger.error(`Error updating widget data:`, error);
      throw error;
    }
  }

  generateMockData(widgetType, config) {
    try {
      switch (widgetType) {
        case 'chart':
        case 'line_chart':
          return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Performance',
              data: [12, 19, 3, 5, 2, 3],
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          };
          
        case 'bar_chart':
          return {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [{
              label: 'Revenue',
              data: [65, 59, 80, 81],
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }]
          };
          
        case 'pie_chart':
          return {
            labels: ['Stocks', 'Bonds', 'Cash', 'Other'],
            datasets: [{
              data: [40, 30, 20, 10],
              backgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56',
                '#4BC0C0'
              ]
            }]
          };
          
        case 'table':
          return {
            headers: ['Symbol', 'Price', 'Change', 'Volume'],
            rows: [
              ['AAPL', '$150.25', '+2.5%', '1.2M'],
              ['MSFT', '$300.10', '-1.2%', '800K'],
              ['GOOGL', '$2800.50', '+0.8%', '500K']
            ]
          };
          
        case 'metric':
          return {
            value: 125.5,
            change: 5.2,
            changePercent: 4.3,
            trend: 'up'
          };
          
        case 'gauge':
          return {
            value: 75,
            max: 100,
            min: 0,
            label: 'Performance'
          };
          
        default:
          return { message: 'No data available' };
      }
    } catch (error) {
      logger.error('Error generating mock data:', error);
      return { error: 'Failed to generate data' };
    }
  }

  async storeDashboard(dashboard) {
    try {
      const query = `
        INSERT INTO dashboards (
          id, name, description, layout, widgets, parameters, 
          user_id, status, created_at, updated_at, version, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          layout = EXCLUDED.layout,
          widgets = EXCLUDED.widgets,
          parameters = EXCLUDED.parameters,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          version = EXCLUDED.version
      `;
      
      await pool.query(query, [
        dashboard.id,
        dashboard.name,
        dashboard.description,
        JSON.stringify(dashboard.layout),
        JSON.stringify(dashboard.widgets),
        JSON.stringify(dashboard.parameters),
        dashboard.userId,
        dashboard.status,
        dashboard.createdAt,
        dashboard.updatedAt,
        dashboard.version,
        dashboard.isPublic || false
      ]);
      
      logger.info(`Dashboard stored: ${dashboard.id}`);
    } catch (error) {
      logger.error('Error storing dashboard:', error);
      throw error;
    }
  }

  async cacheDashboard(dashboard) {
    try {
      const cacheKey = `dashboard:${dashboard.id}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(dashboard));
    } catch (error) {
      logger.error('Error caching dashboard:', error);
      throw error;
    }
  }

  async getWidgetTypes() {
    try {
      return Array.from(this.widgetTypes.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting widget types:', error);
      throw error;
    }
  }

  async createDashboardFromTemplate(templateId, name, description, userId) {
    try {
      // This would typically load a dashboard template
      // For now, we'll create a basic dashboard
      const template = {
        layout: {
          rows: [
            {
              columns: [
                { width: 6, widgets: ['metric1', 'metric2'] },
                { width: 6, widgets: ['chart1'] }
              ]
            },
            {
              columns: [
                { width: 12, widgets: ['table1'] }
              ]
            }
          ]
        },
        widgets: [
          {
            id: 'metric1',
            type: 'metric',
            position: { row: 0, column: 0 },
            config: { title: 'Total Value', value: 0 }
          },
          {
            id: 'metric2',
            type: 'metric',
            position: { row: 0, column: 1 },
            config: { title: 'Daily Change', value: 0 }
          },
          {
            id: 'chart1',
            type: 'line_chart',
            position: { row: 0, column: 2 },
            config: { title: 'Performance Chart' }
          },
          {
            id: 'table1',
            type: 'table',
            position: { row: 1, column: 0 },
            config: { title: 'Holdings' }
          }
        ]
      };
      
      const dashboard = await this.createDashboard(
        name,
        description,
        template.layout,
        template.widgets,
        {},
        userId
      );
      
      return dashboard;
    } catch (error) {
      logger.error('Error creating dashboard from template:', error);
      throw error;
    }
  }

  async getDashboardStats() {
    try {
      const stats = {
        totalDashboards: this.dashboardCache.size,
        widgetTypes: this.widgetTypes.size,
        dashboardsByCategory: {},
        mostUsedWidgets: {}
      };
      
      for (const dashboard of this.dashboardCache.values()) {
        // By category
        if (dashboard.category) {
          stats.dashboardsByCategory[dashboard.category] = (stats.dashboardsByCategory[dashboard.category] || 0) + 1;
        }
        
        // Widget usage
        for (const widget of dashboard.widgets) {
          stats.mostUsedWidgets[widget.type] = (stats.mostUsedWidgets[widget.type] || 0) + 1;
        }
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}

module.exports = DashboardBuilder;
