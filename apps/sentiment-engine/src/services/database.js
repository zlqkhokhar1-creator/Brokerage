const { Pool } = require('pg');
const { logger } = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'brokerage',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

// Test database connection
const connectDatabase = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Execute query with error handling
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Database query executed', {
      query: text.substring(0, 100),
      duration,
      rows: result.rowCount
    });
    return result;
  } catch (error) {
    logger.error('Database query failed', {
      query: text.substring(0, 100),
      error: error.message,
      duration: Date.now() - start
    });
    throw error;
  }
};

// Execute transaction
const transaction = async (callback) => {
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
};

// Health check
const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW() as timestamp, version() as version');
    return {
      status: 'healthy',
      timestamp: result.rows[0].timestamp,
      version: result.rows[0].version
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// Close all connections
const close = async () => {
  try {
    await pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
};

module.exports = {
  pool,
  connectDatabase,
  query,
  transaction,
  healthCheck,
  close
};
