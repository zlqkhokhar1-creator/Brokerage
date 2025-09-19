const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabaseConnectionPool {
  constructor() {
    this.pools = new Map();
    this.defaultConfig = {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  getPool(databaseName) {
    if (!this.pools.has(databaseName)) {
      const config = {
        ...this.defaultConfig,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: databaseName,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      };

      const pool = new Pool(config);
      
      pool.on('error', (err) => {
        logger.error(`Unexpected error on idle client for ${databaseName}:`, err);
      });

      pool.on('connect', () => {
        logger.debug(`New client connected to ${databaseName}`);
      });

      this.pools.set(databaseName, pool);
    }

    return this.pools.get(databaseName);
  }

  async query(databaseName, text, params) {
    const pool = this.getPool(databaseName);
    const start = Date.now();
    
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Executed query on ${databaseName}`, { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error(`Database query error on ${databaseName}:`, { text, error: error.message });
      throw error;
    }
  }

  async getClient(databaseName) {
    const pool = this.getPool(databaseName);
    return await pool.connect();
  }

  async closeAll() {
    const promises = Array.from(this.pools.values()).map(pool => pool.end());
    await Promise.all(promises);
    this.pools.clear();
    logger.info('All database connection pools closed');
  }

  async healthCheck() {
    try {
      const promises = Array.from(this.pools.keys()).map(async (dbName) => {
        try {
          await this.query(dbName, 'SELECT 1');
          return { database: dbName, status: 'healthy' };
        } catch (error) {
          return { database: dbName, status: 'unhealthy', error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const allHealthy = results.every(r => r.status === 'healthy');
      
      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        databases: results
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new DatabaseConnectionPool();
