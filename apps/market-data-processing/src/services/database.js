const { Pool } = require('pg');
const { logger } = require('../utils/logger');

let pool = null;

const connectDatabase = async () => {
  try {
    if (pool) {
      return pool;
    }

    const dbConfig = {
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/brokerage',
      max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
      min: parseInt(process.env.DB_MIN_CONNECTIONS) || 5,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
      application_name: 'market-data-processing',
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };

    pool = new Pool(dbConfig);

    // Event handlers
    pool.on('connect', (client) => {
      logger.info('New database client connected', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      });
    });

    pool.on('acquire', (client) => {
      logger.debug('Database client acquired', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      });
    });

    pool.on('remove', (client) => {
      logger.info('Database client removed', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      });
    });

    pool.on('error', (err, client) => {
      logger.error('Database pool error:', err);
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connection test successful', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'brokerage'
    });

    return pool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return pool;
};

const disconnectDatabase = async () => {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      logger.info('Database pool disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting database pool:', error);
    throw error;
  }
};

// Database utility functions
const dbUtils = {
  // Execute query with logging
  async query(text, params = []) {
    const start = Date.now();
    const pool = getPool();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.databaseQuery(text, duration, {
        rowCount: result.rowCount,
        command: result.command
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed:', {
        query: text,
        params,
        duration,
        error: error.message
      });
      throw error;
    }
  },

  // Execute transaction
  async transaction(callback) {
    const pool = getPool();
    const client = await pool.connect();
    
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
  },

  // Get client from pool
  async getClient() {
    const pool = getPool();
    return await pool.connect();
  },

  // Release client back to pool
  releaseClient(client) {
    if (client) {
      client.release();
    }
  },

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      return {
        status: 'healthy',
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version,
        poolStats: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        }
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  },

  // Get pool statistics
  getPoolStats() {
    if (!pool) {
      return null;
    }
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }
};

module.exports = {
  connectDatabase,
  getPool,
  disconnectDatabase,
  pool: () => pool,
  ...dbUtils
};
