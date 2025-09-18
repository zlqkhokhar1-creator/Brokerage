const { Pool } = require('pg');
const { logger } = require('./logger');

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    try {
      this.pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'brokerage',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
      }
      logger.info('Database service closed');
    } catch (error) {
      logger.error('Error closing database service:', error);
    }
  }

  async query(text, params = []) {
    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text,
        duration: `${duration}ms`,
        rowCount: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query error:', {
        query: text,
        params: params,
        error: error.message
      });
      throw error;
    }
  }

  async getClient() {
    try {
      return await this.pool.connect();
    } catch (error) {
      logger.error('Error getting database client:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new DatabaseService();
