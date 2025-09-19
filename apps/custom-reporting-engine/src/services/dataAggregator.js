const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const axios = require('axios');

class DataAggregator {
  async aggregateData(req, res) {
    try {
      const { source, filters, aggregation, groupBy, timeRange } = req.body;
      
      let data;
      
      switch (source) {
        case 'trading':
          data = await this.aggregateTradingData(filters, aggregation, groupBy, timeRange);
          break;
        case 'portfolio':
          data = await this.aggregatePortfolioData(filters, aggregation, groupBy, timeRange);
          break;
        case 'market':
          data = await this.aggregateMarketData(filters, aggregation, groupBy, timeRange);
          break;
        case 'risk':
          data = await this.aggregateRiskData(filters, aggregation, groupBy, timeRange);
          break;
        case 'performance':
          data = await this.aggregatePerformanceData(filters, aggregation, groupBy, timeRange);
          break;
        default:
          throw new Error('Unsupported data source');
      }
      
      res.json({
        success: true,
        data: data,
        metadata: {
          source,
          aggregation,
          groupBy,
          timeRange,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error aggregating data:', error);
      res.status(500).json({ success: false, error: 'Failed to aggregate data' });
    }
  }

  async getDataSources(req, res) {
    try {
      const sources = [
        { id: 'trading', name: 'Trading Data', description: 'Trading transactions and orders' },
        { id: 'portfolio', name: 'Portfolio Data', description: 'Portfolio holdings and performance' },
        { id: 'market', name: 'Market Data', description: 'Market prices and indicators' },
        { id: 'risk', name: 'Risk Data', description: 'Risk metrics and calculations' },
        { id: 'performance', name: 'Performance Data', description: 'Performance analytics and metrics' }
      ];
      
      res.json({
        success: true,
        data: sources
      });
    } catch (error) {
      logger.error('Error getting data sources:', error);
      res.status(500).json({ success: false, error: 'Failed to get data sources' });
    }
  }

  async queryData(req, res) {
    try {
      const { query, filters, limit = 1000 } = req.body;
      
      // Validate and sanitize query
      const sanitizedQuery = this.sanitizeQuery(query);
      
      // Apply filters
      const filteredQuery = this.applyFilters(sanitizedQuery, filters);
      
      // Execute query
      const result = await database.query(filteredQuery + ` LIMIT ${limit}`);
      
      res.json({
        success: true,
        data: result.rows,
        metadata: {
          query: filteredQuery,
          rowCount: result.rowCount,
          executedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error querying data:', error);
      res.status(500).json({ success: false, error: 'Failed to query data' });
    }
  }

  async aggregateTradingData(filters, aggregation, groupBy, timeRange) {
    try {
      let query = 'SELECT ';
      
      if (groupBy) {
        query += `${groupBy}, `;
      }
      
      switch (aggregation) {
        case 'sum':
          query += 'SUM(amount) as total_amount, COUNT(*) as transaction_count';
          break;
        case 'avg':
          query += 'AVG(amount) as avg_amount, COUNT(*) as transaction_count';
          break;
        case 'count':
          query += 'COUNT(*) as transaction_count';
          break;
        default:
          query += 'SUM(amount) as total_amount, COUNT(*) as transaction_count';
      }
      
      query += ' FROM trading_transactions WHERE 1=1';
      
      if (timeRange) {
        query += ` AND created_at >= NOW() - INTERVAL '${timeRange}'`;
      }
      
      if (filters) {
        Object.keys(filters).forEach((key, index) => {
          query += ` AND ${key} = $${index + 1}`;
        });
      }
      
      if (groupBy) {
        query += ` GROUP BY ${groupBy}`;
      }
      
      const result = await database.query(query, Object.values(filters || {}));
      return result.rows;
    } catch (error) {
      logger.error('Error aggregating trading data:', error);
      throw error;
    }
  }

  async aggregatePortfolioData(filters, aggregation, groupBy, timeRange) {
    try {
      let query = 'SELECT ';
      
      if (groupBy) {
        query += `${groupBy}, `;
      }
      
      switch (aggregation) {
        case 'sum':
          query += 'SUM(value) as total_value, COUNT(*) as holding_count';
          break;
        case 'avg':
          query += 'AVG(value) as avg_value, COUNT(*) as holding_count';
          break;
        case 'count':
          query += 'COUNT(*) as holding_count';
          break;
        default:
          query += 'SUM(value) as total_value, COUNT(*) as holding_count';
      }
      
      query += ' FROM portfolio_holdings WHERE 1=1';
      
      if (timeRange) {
        query += ` AND updated_at >= NOW() - INTERVAL '${timeRange}'`;
      }
      
      if (filters) {
        Object.keys(filters).forEach((key, index) => {
          query += ` AND ${key} = $${index + 1}`;
        });
      }
      
      if (groupBy) {
        query += ` GROUP BY ${groupBy}`;
      }
      
      const result = await database.query(query, Object.values(filters || {}));
      return result.rows;
    } catch (error) {
      logger.error('Error aggregating portfolio data:', error);
      throw error;
    }
  }

  async aggregateMarketData(filters, aggregation, groupBy, timeRange) {
    try {
      let query = 'SELECT ';
      
      if (groupBy) {
        query += `${groupBy}, `;
      }
      
      switch (aggregation) {
        case 'sum':
          query += 'SUM(price) as total_price, COUNT(*) as data_point_count';
          break;
        case 'avg':
          query += 'AVG(price) as avg_price, COUNT(*) as data_point_count';
          break;
        case 'count':
          query += 'COUNT(*) as data_point_count';
          break;
        default:
          query += 'AVG(price) as avg_price, COUNT(*) as data_point_count';
      }
      
      query += ' FROM market_data WHERE 1=1';
      
      if (timeRange) {
        query += ` AND timestamp >= NOW() - INTERVAL '${timeRange}'`;
      }
      
      if (filters) {
        Object.keys(filters).forEach((key, index) => {
          query += ` AND ${key} = $${index + 1}`;
        });
      }
      
      if (groupBy) {
        query += ` GROUP BY ${groupBy}`;
      }
      
      const result = await database.query(query, Object.values(filters || {}));
      return result.rows;
    } catch (error) {
      logger.error('Error aggregating market data:', error);
      throw error;
    }
  }

  async aggregateRiskData(filters, aggregation, groupBy, timeRange) {
    try {
      let query = 'SELECT ';
      
      if (groupBy) {
        query += `${groupBy}, `;
      }
      
      switch (aggregation) {
        case 'sum':
          query += 'SUM(risk_value) as total_risk, COUNT(*) as risk_metric_count';
          break;
        case 'avg':
          query += 'AVG(risk_value) as avg_risk, COUNT(*) as risk_metric_count';
          break;
        case 'count':
          query += 'COUNT(*) as risk_metric_count';
          break;
        default:
          query += 'AVG(risk_value) as avg_risk, COUNT(*) as risk_metric_count';
      }
      
      query += ' FROM risk_metrics WHERE 1=1';
      
      if (timeRange) {
        query += ` AND calculated_at >= NOW() - INTERVAL '${timeRange}'`;
      }
      
      if (filters) {
        Object.keys(filters).forEach((key, index) => {
          query += ` AND ${key} = $${index + 1}`;
        });
      }
      
      if (groupBy) {
        query += ` GROUP BY ${groupBy}`;
      }
      
      const result = await database.query(query, Object.values(filters || {}));
      return result.rows;
    } catch (error) {
      logger.error('Error aggregating risk data:', error);
      throw error;
    }
  }

  async aggregatePerformanceData(filters, aggregation, groupBy, timeRange) {
    try {
      let query = 'SELECT ';
      
      if (groupBy) {
        query += `${groupBy}, `;
      }
      
      switch (aggregation) {
        case 'sum':
          query += 'SUM(return_value) as total_return, COUNT(*) as performance_metric_count';
          break;
        case 'avg':
          query += 'AVG(return_value) as avg_return, COUNT(*) as performance_metric_count';
          break;
        case 'count':
          query += 'COUNT(*) as performance_metric_count';
          break;
        default:
          query += 'AVG(return_value) as avg_return, COUNT(*) as performance_metric_count';
      }
      
      query += ' FROM performance_metrics WHERE 1=1';
      
      if (timeRange) {
        query += ` AND calculated_at >= NOW() - INTERVAL '${timeRange}'`;
      }
      
      if (filters) {
        Object.keys(filters).forEach((key, index) => {
          query += ` AND ${key} = $${index + 1}`;
        });
      }
      
      if (groupBy) {
        query += ` GROUP BY ${groupBy}`;
      }
      
      const result = await database.query(query, Object.values(filters || {}));
      return result.rows;
    } catch (error) {
      logger.error('Error aggregating performance data:', error);
      throw error;
    }
  }

  sanitizeQuery(query) {
    // Basic SQL injection prevention
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /UPDATE\s+.*\s+SET/i,
      /INSERT\s+INTO/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
      /TRUNCATE\s+TABLE/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error('Dangerous query detected');
      }
    }
    
    return query;
  }

  applyFilters(query, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return query;
    }
    
    let filteredQuery = query;
    const filterConditions = [];
    
    Object.keys(filters).forEach((key, index) => {
      filterConditions.push(`${key} = $${index + 1}`);
    });
    
    if (filterConditions.length > 0) {
      filteredQuery += ' WHERE ' + filterConditions.join(' AND ');
    }
    
    return filteredQuery;
  }
}

module.exports = new DataAggregator();

