const { Pool } = require('pg');
const { logger } = require('./logger');

class DatabaseService {
  constructor() {
    this.pool = null;
    this._initialized = false;
  }

  async initialize() {
    try {
      // Create connection pool
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'brokerage_kyc',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this._initialized = true;
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
      this._initialized = false;
      logger.info('Database service closed');
    } catch (error) {
      logger.error('Error closing database service:', error);
    }
  }

  async query(text, params = []) {
    try {
      if (!this._initialized) {
        throw new Error('Database service not initialized');
      }
      
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query error:', {
        query: text,
        params,
        error: error.message
      });
      throw error;
    }
  }

  async transaction(callback) {
    try {
      if (!this._initialized) {
        throw new Error('Database service not initialized');
      }
      
      const client = await this.pool.connect();
      
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
    } catch (error) {
      logger.error('Database transaction error:', error);
      throw error;
    }
  }

  async getClient() {
    try {
      if (!this._initialized) {
        throw new Error('Database service not initialized');
      }
      
      return await this.pool.connect();
    } catch (error) {
      logger.error('Error getting database client:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this._initialized) {
        return { status: 'not_initialized', message: 'Database service not initialized' };
      }
      
      const result = await this.query('SELECT NOW()');
      return { 
        status: 'healthy', 
        message: 'Database service is healthy',
        timestamp: result.rows[0].now
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', message: error.message };
    }
  }

  async getStats() {
    try {
      if (!this._initialized) {
        throw new Error('Database service not initialized');
      }
      
      const stats = await this.query(`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') as idle_in_transaction_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction (aborted)') as idle_in_transaction_aborted_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'fastpath function call') as fastpath_function_call_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'disabled') as disabled_connections
      `);
      
      return stats.rows[0];
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

// Export pool for direct access if needed
const pool = databaseService.pool;

module.exports = { databaseService, pool };
