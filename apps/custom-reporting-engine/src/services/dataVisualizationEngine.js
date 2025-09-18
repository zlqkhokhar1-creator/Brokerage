const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class DataVisualizationEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.visualizationTypes = new Map();
    this.visualizationCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load visualization types
      await this.loadVisualizationTypes();
      
      this._initialized = true;
      logger.info('DataVisualizationEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DataVisualizationEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('DataVisualizationEngine closed');
    } catch (error) {
      logger.error('Error closing DataVisualizationEngine:', error);
    }
  }

  async loadVisualizationTypes() {
    try {
      this.visualizationTypes = new Map([
        ['line_chart', {
          name: 'Line Chart',
          description: 'Time series data visualization',
          category: 'charts',
          dataTypes: ['time_series', 'numeric'],
          parameters: ['xAxis', 'yAxis', 'series', 'colors']
        }],
        ['bar_chart', {
          name: 'Bar Chart',
          description: 'Categorical data comparison',
          category: 'charts',
          dataTypes: ['categorical', 'numeric'],
          parameters: ['xAxis', 'yAxis', 'categories', 'colors']
        }],
        ['pie_chart', {
          name: 'Pie Chart',
          description: 'Proportional data representation',
          category: 'charts',
          dataTypes: ['categorical', 'numeric'],
          parameters: ['labels', 'values', 'colors']
        }],
        ['scatter_plot', {
          name: 'Scatter Plot',
          description: 'Correlation between two variables',
          category: 'charts',
          dataTypes: ['numeric', 'numeric'],
          parameters: ['xAxis', 'yAxis', 'size', 'color']
        }],
        ['heatmap', {
          name: 'Heatmap',
          description: 'Matrix data visualization',
          category: 'charts',
          dataTypes: ['matrix', 'numeric'],
          parameters: ['rows', 'columns', 'values', 'colorScale']
        }],
        ['histogram', {
          name: 'Histogram',
          description: 'Distribution of numerical data',
          category: 'charts',
          dataTypes: ['numeric'],
          parameters: ['values', 'bins', 'color']
        }],
        ['box_plot', {
          name: 'Box Plot',
          description: 'Statistical data distribution',
          category: 'charts',
          dataTypes: ['numeric'],
          parameters: ['values', 'groups', 'color']
        }],
        ['area_chart', {
          name: 'Area Chart',
          description: 'Stacked area visualization',
          category: 'charts',
          dataTypes: ['time_series', 'numeric'],
          parameters: ['xAxis', 'yAxis', 'series', 'colors']
        }],
        ['gauge', {
          name: 'Gauge',
          description: 'Single value indicator',
          category: 'indicators',
          dataTypes: ['numeric'],
          parameters: ['value', 'min', 'max', 'thresholds']
        }],
        ['metric', {
          name: 'Metric',
          description: 'Single value display',
          category: 'indicators',
          dataTypes: ['numeric'],
          parameters: ['value', 'label', 'format']
        }],
        ['table', {
          name: 'Data Table',
          description: 'Tabular data display',
          category: 'tables',
          dataTypes: ['tabular'],
          parameters: ['columns', 'rows', 'sorting', 'filtering']
        }],
        ['treemap', {
          name: 'Treemap',
          description: 'Hierarchical data visualization',
          category: 'charts',
          dataTypes: ['hierarchical', 'numeric'],
          parameters: ['hierarchy', 'values', 'colors']
        }],
        ['sankey', {
          name: 'Sankey Diagram',
          description: 'Flow data visualization',
          category: 'charts',
          dataTypes: ['flow'],
          parameters: ['nodes', 'links', 'colors']
        }],
        ['radar', {
          name: 'Radar Chart',
          description: 'Multi-dimensional data comparison',
          category: 'charts',
          dataTypes: ['multi_dimensional'],
          parameters: ['dimensions', 'values', 'colors']
        }],
        ['candlestick', {
          name: 'Candlestick Chart',
          description: 'Financial data visualization',
          category: 'charts',
          dataTypes: ['financial'],
          parameters: ['open', 'high', 'low', 'close', 'volume']
        }]
      ]);
      
      logger.info('Visualization types loaded successfully');
    } catch (error) {
      logger.error('Error loading visualization types:', error);
      throw error;
    }
  }

  async createVisualization(visualizationType, data, parameters, format, userId) {
    try {
      const visualizationId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Creating visualization: ${visualizationType}`, {
        visualizationId,
        visualizationType,
        userId
      });

      // Validate visualization type
      if (!this.visualizationTypes.has(visualizationType)) {
        throw new Error(`Unknown visualization type: ${visualizationType}`);
      }

      // Process data
      const processedData = await this.processVisualizationData(data, visualizationType, parameters);
      
      // Generate visualization
      const visualization = await this.generateVisualization(
        visualizationType, 
        processedData, 
        parameters, 
        format
      );
      
      // Store visualization
      const visualizationData = {
        id: visualizationId,
        type: visualizationType,
        data: processedData,
        parameters,
        format,
        visualization,
        userId,
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.storeVisualization(visualizationData);
      
      // Cache visualization
      await this.cacheVisualization(visualizationData);
      
      this.emit('visualizationCreated', visualizationData);
      
      logger.info(`Visualization created: ${visualizationId}`, {
        visualizationId,
        processingTime: visualizationData.processingTime
      });
      
      return visualizationData;
    } catch (error) {
      logger.error('Error creating visualization:', error);
      throw error;
    }
  }

  async processVisualizationData(data, visualizationType, parameters) {
    try {
      const typeConfig = this.visualizationTypes.get(visualizationType);
      
      // Process data based on visualization type
      switch (visualizationType) {
        case 'line_chart':
          return this.processLineChartData(data, parameters);
        case 'bar_chart':
          return this.processBarChartData(data, parameters);
        case 'pie_chart':
          return this.processPieChartData(data, parameters);
        case 'scatter_plot':
          return this.processScatterPlotData(data, parameters);
        case 'heatmap':
          return this.processHeatmapData(data, parameters);
        case 'histogram':
          return this.processHistogramData(data, parameters);
        case 'box_plot':
          return this.processBoxPlotData(data, parameters);
        case 'area_chart':
          return this.processAreaChartData(data, parameters);
        case 'gauge':
          return this.processGaugeData(data, parameters);
        case 'metric':
          return this.processMetricData(data, parameters);
        case 'table':
          return this.processTableData(data, parameters);
        case 'treemap':
          return this.processTreemapData(data, parameters);
        case 'sankey':
          return this.processSankeyData(data, parameters);
        case 'radar':
          return this.processRadarData(data, parameters);
        case 'candlestick':
          return this.processCandlestickData(data, parameters);
        default:
          throw new Error(`Unsupported visualization type: ${visualizationType}`);
      }
    } catch (error) {
      logger.error('Error processing visualization data:', error);
      throw error;
    }
  }

  processLineChartData(data, parameters) {
    try {
      const { xAxis = 'x', yAxis = 'y', series = 'series' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Line chart data must be an array');
      }
      
      const labels = data.map(item => item[xAxis]);
      const datasets = [];
      
      // Group data by series
      const seriesGroups = {};
      data.forEach(item => {
        const seriesName = item[series] || 'default';
        if (!seriesGroups[seriesName]) {
          seriesGroups[seriesName] = [];
        }
        seriesGroups[seriesName].push(item[yAxis]);
      });
      
      // Create datasets
      Object.entries(seriesGroups).forEach(([seriesName, values], index) => {
        datasets.push({
          label: seriesName,
          data: values,
          borderColor: this.getColor(index),
          backgroundColor: this.getColor(index, 0.1),
          tension: 0.1
        });
      });
      
      return {
        labels,
        datasets
      };
    } catch (error) {
      logger.error('Error processing line chart data:', error);
      throw error;
    }
  }

  processBarChartData(data, parameters) {
    try {
      const { xAxis = 'x', yAxis = 'y', categories = 'category' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Bar chart data must be an array');
      }
      
      const labels = data.map(item => item[xAxis]);
      const datasets = [];
      
      // Group data by categories
      const categoryGroups = {};
      data.forEach(item => {
        const categoryName = item[categories] || 'default';
        if (!categoryGroups[categoryName]) {
          categoryGroups[categoryName] = [];
        }
        categoryGroups[categoryName].push(item[yAxis]);
      });
      
      // Create datasets
      Object.entries(categoryGroups).forEach(([categoryName, values], index) => {
        datasets.push({
          label: categoryName,
          data: values,
          backgroundColor: this.getColor(index, 0.8),
          borderColor: this.getColor(index),
          borderWidth: 1
        });
      });
      
      return {
        labels,
        datasets
      };
    } catch (error) {
      logger.error('Error processing bar chart data:', error);
      throw error;
    }
  }

  processPieChartData(data, parameters) {
    try {
      const { labels = 'label', values = 'value' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Pie chart data must be an array');
      }
      
      const pieLabels = data.map(item => item[labels]);
      const pieValues = data.map(item => item[values]);
      const colors = pieLabels.map((_, index) => this.getColor(index));
      
      return {
        labels: pieLabels,
        datasets: [{
          data: pieValues,
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 1
        }]
      };
    } catch (error) {
      logger.error('Error processing pie chart data:', error);
      throw error;
    }
  }

  processScatterPlotData(data, parameters) {
    try {
      const { xAxis = 'x', yAxis = 'y', size = 'size', color = 'color' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Scatter plot data must be an array');
      }
      
      const scatterData = data.map(item => ({
        x: item[xAxis],
        y: item[yAxis],
        size: item[size] || 5,
        color: item[color] || this.getColor(0)
      }));
      
      return {
        datasets: [{
          label: 'Scatter Plot',
          data: scatterData,
          backgroundColor: scatterData.map(item => item.color),
          borderColor: scatterData.map(item => item.color)
        }]
      };
    } catch (error) {
      logger.error('Error processing scatter plot data:', error);
      throw error;
    }
  }

  processHeatmapData(data, parameters) {
    try {
      const { rows = 'row', columns = 'column', values = 'value' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Heatmap data must be an array');
      }
      
      // Create matrix
      const rowLabels = [...new Set(data.map(item => item[rows]))];
      const colLabels = [...new Set(data.map(item => item[columns]))];
      
      const matrix = rowLabels.map(row => 
        colLabels.map(col => {
          const item = data.find(d => d[rows] === row && d[columns] === col);
          return item ? item[values] : 0;
        })
      );
      
      return {
        rows: rowLabels,
        columns: colLabels,
        matrix
      };
    } catch (error) {
      logger.error('Error processing heatmap data:', error);
      throw error;
    }
  }

  processHistogramData(data, parameters) {
    try {
      const { values = 'value', bins = 10 } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Histogram data must be an array');
      }
      
      const valuesArray = data.map(item => item[values]);
      const min = Math.min(...valuesArray);
      const max = Math.max(...valuesArray);
      const binSize = (max - min) / bins;
      
      const histogram = Array(bins).fill(0);
      const labels = [];
      
      for (let i = 0; i < bins; i++) {
        const binStart = min + i * binSize;
        const binEnd = min + (i + 1) * binSize;
        labels.push(`${binStart.toFixed(2)}-${binEnd.toFixed(2)}`);
        
        valuesArray.forEach(value => {
          if (value >= binStart && value < binEnd) {
            histogram[i]++;
          }
        });
      }
      
      return {
        labels,
        datasets: [{
          label: 'Frequency',
          data: histogram,
          backgroundColor: this.getColor(0, 0.8),
          borderColor: this.getColor(0),
          borderWidth: 1
        }]
      };
    } catch (error) {
      logger.error('Error processing histogram data:', error);
      throw error;
    }
  }

  processBoxPlotData(data, parameters) {
    try {
      const { values = 'value', groups = 'group' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Box plot data must be an array');
      }
      
      // Group data by groups
      const groupData = {};
      data.forEach(item => {
        const groupName = item[groups] || 'default';
        if (!groupData[groupName]) {
          groupData[groupName] = [];
        }
        groupData[groupName].push(item[values]);
      });
      
      // Calculate box plot statistics for each group
      const boxPlotData = Object.entries(groupData).map(([groupName, values], index) => {
        const sorted = values.sort((a, b) => a - b);
        const q1 = this.quantile(sorted, 0.25);
        const q2 = this.quantile(sorted, 0.5);
        const q3 = this.quantile(sorted, 0.75);
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        
        return {
          group: groupName,
          min: Math.min(...sorted),
          q1,
          median: q2,
          q3,
          max: Math.max(...sorted),
          outliers: sorted.filter(v => v < lower || v > upper),
          color: this.getColor(index)
        };
      });
      
      return boxPlotData;
    } catch (error) {
      logger.error('Error processing box plot data:', error);
      throw error;
    }
  }

  processAreaChartData(data, parameters) {
    try {
      // Similar to line chart but with filled areas
      const lineData = this.processLineChartData(data, parameters);
      
      // Add fill property to datasets
      lineData.datasets.forEach(dataset => {
        dataset.fill = true;
      });
      
      return lineData;
    } catch (error) {
      logger.error('Error processing area chart data:', error);
      throw error;
    }
  }

  processGaugeData(data, parameters) {
    try {
      const { value = 'value', min = 0, max = 100, thresholds = [] } = parameters;
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Gauge data must be a non-empty array');
      }
      
      const gaugeValue = data[0][value];
      
      return {
        value: gaugeValue,
        min: min,
        max: max,
        thresholds: thresholds,
        percentage: ((gaugeValue - min) / (max - min)) * 100
      };
    } catch (error) {
      logger.error('Error processing gauge data:', error);
      throw error;
    }
  }

  processMetricData(data, parameters) {
    try {
      const { value = 'value', label = 'label', format = 'number' } = parameters;
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Metric data must be a non-empty array');
      }
      
      const metricValue = data[0][value];
      const metricLabel = data[0][label] || 'Value';
      
      return {
        value: metricValue,
        label: metricLabel,
        format: format
      };
    } catch (error) {
      logger.error('Error processing metric data:', error);
      throw error;
    }
  }

  processTableData(data, parameters) {
    try {
      const { columns = [], sorting = [], filtering = [] } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Table data must be an array');
      }
      
      // Extract columns if not provided
      const tableColumns = columns.length > 0 ? columns : Object.keys(data[0] || {});
      
      // Create table structure
      const table = {
        headers: tableColumns,
        rows: data.map(item => tableColumns.map(col => item[col] || '')),
        totalRows: data.length
      };
      
      return table;
    } catch (error) {
      logger.error('Error processing table data:', error);
      throw error;
    }
  }

  processTreemapData(data, parameters) {
    try {
      const { hierarchy = 'hierarchy', values = 'value' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Treemap data must be an array');
      }
      
      // Build hierarchy
      const hierarchyMap = {};
      data.forEach(item => {
        const path = item[hierarchy].split('/');
        let current = hierarchyMap;
        
        for (let i = 0; i < path.length; i++) {
          const segment = path[i];
          if (!current[segment]) {
            current[segment] = { children: {}, value: 0 };
          }
          if (i === path.length - 1) {
            current[segment].value = item[values];
          }
          current = current[segment].children;
        }
      });
      
      return hierarchyMap;
    } catch (error) {
      logger.error('Error processing treemap data:', error);
      throw error;
    }
  }

  processSankeyData(data, parameters) {
    try {
      const { nodes = 'nodes', links = 'links' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Sankey data must be an array');
      }
      
      // Extract nodes and links
      const sankeyNodes = data.map(item => item[nodes] || []).flat();
      const sankeyLinks = data.map(item => item[links] || []).flat();
      
      return {
        nodes: [...new Set(sankeyNodes)],
        links: sankeyLinks
      };
    } catch (error) {
      logger.error('Error processing sankey data:', error);
      throw error;
    }
  }

  processRadarData(data, parameters) {
    try {
      const { dimensions = 'dimensions', values = 'values' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Radar data must be an array');
      }
      
      const radarLabels = data.map(item => item[dimensions] || []);
      const radarValues = data.map(item => item[values] || []);
      
      return {
        labels: radarLabels[0] || [],
        datasets: radarValues.map((values, index) => ({
          label: `Series ${index + 1}`,
          data: values,
          backgroundColor: this.getColor(index, 0.2),
          borderColor: this.getColor(index),
          borderWidth: 2
        }))
      };
    } catch (error) {
      logger.error('Error processing radar data:', error);
      throw error;
    }
  }

  processCandlestickData(data, parameters) {
    try {
      const { open = 'open', high = 'high', low = 'low', close = 'close', volume = 'volume' } = parameters;
      
      if (!Array.isArray(data)) {
        throw new Error('Candlestick data must be an array');
      }
      
      const candlestickData = data.map(item => ({
        x: item.date || item.timestamp,
        o: item[open],
        h: item[high],
        l: item[low],
        c: item[close],
        v: item[volume] || 0
      }));
      
      return {
        datasets: [{
          label: 'Candlestick',
          data: candlestickData
        }]
      };
    } catch (error) {
      logger.error('Error processing candlestick data:', error);
      throw error;
    }
  }

  async generateVisualization(visualizationType, data, parameters, format) {
    try {
      // Generate visualization based on format
      switch (format) {
        case 'json':
          return data;
        case 'html':
          return this.generateHTMLVisualization(visualizationType, data, parameters);
        case 'svg':
          return this.generateSVGVisualization(visualizationType, data, parameters);
        case 'png':
          return this.generatePNGVisualization(visualizationType, data, parameters);
        default:
          return data;
      }
    } catch (error) {
      logger.error('Error generating visualization:', error);
      throw error;
    }
  }

  generateHTMLVisualization(visualizationType, data, parameters) {
    try {
      // Generate HTML for the visualization
      // This would typically use a charting library like Chart.js or D3.js
      return `
        <div class="visualization" data-type="${visualizationType}">
          <canvas id="chart-${Date.now()}" width="400" height="300"></canvas>
          <script>
            // Chart.js or D3.js code would go here
            console.log('Visualization data:', ${JSON.stringify(data)});
          </script>
        </div>
      `;
    } catch (error) {
      logger.error('Error generating HTML visualization:', error);
      throw error;
    }
  }

  generateSVGVisualization(visualizationType, data, parameters) {
    try {
      // Generate SVG for the visualization
      // This would typically use D3.js or similar
      return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <!-- SVG content would go here -->
        <text x="200" y="150" text-anchor="middle">${visualizationType}</text>
      </svg>`;
    } catch (error) {
      logger.error('Error generating SVG visualization:', error);
      throw error;
    }
  }

  generatePNGVisualization(visualizationType, data, parameters) {
    try {
      // Generate PNG for the visualization
      // This would typically use a headless browser or canvas
      return Buffer.from('PNG data would go here');
    } catch (error) {
      logger.error('Error generating PNG visualization:', error);
      throw error;
    }
  }

  getColor(index, alpha = 1) {
    const colors = [
      'rgba(54, 162, 235, ' + alpha + ')',
      'rgba(255, 99, 132, ' + alpha + ')',
      'rgba(255, 205, 86, ' + alpha + ')',
      'rgba(75, 192, 192, ' + alpha + ')',
      'rgba(153, 102, 255, ' + alpha + ')',
      'rgba(255, 159, 64, ' + alpha + ')',
      'rgba(199, 199, 199, ' + alpha + ')',
      'rgba(83, 102, 255, ' + alpha + ')'
    ];
    
    return colors[index % colors.length];
  }

  quantile(sorted, q) {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }

  async getVisualization(visualizationId, userId) {
    try {
      const query = `
        SELECT * FROM visualizations 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await pool.query(query, [visualizationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Visualization not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting visualization:', error);
      throw error;
    }
  }

  async getAvailableVisualizations() {
    try {
      return Array.from(this.visualizationTypes.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting available visualizations:', error);
      throw error;
    }
  }

  async storeVisualization(visualization) {
    try {
      const query = `
        INSERT INTO visualizations (
          id, type, data, parameters, format, visualization, 
          user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      await pool.query(query, [
        visualization.id,
        visualization.type,
        JSON.stringify(visualization.data),
        JSON.stringify(visualization.parameters),
        visualization.format,
        visualization.visualization,
        visualization.userId,
        visualization.createdAt
      ]);
      
      logger.info(`Visualization stored: ${visualization.id}`);
    } catch (error) {
      logger.error('Error storing visualization:', error);
      throw error;
    }
  }

  async cacheVisualization(visualization) {
    try {
      const cacheKey = `visualization:${visualization.id}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(visualization));
    } catch (error) {
      logger.error('Error caching visualization:', error);
      throw error;
    }
  }
}

module.exports = DataVisualizationEngine;
