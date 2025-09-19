const { Pool } = require('pg');
const { logger } = require('../utils/logger');

let dbPool = null;

async function connectDatabase() {
  try {
    if (dbPool) {
      return dbPool;
    }

    const config = {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'brokerage_risk',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
      allowExitOnIdle: false, // Allow the application to exit on idle
      statement_timeout: 30000, // 30 seconds
      query_timeout: 30000, // 30 seconds
      application_name: 'risk-monitoring-system',
      keepAlive: true,
      keepAliveInitialDelayMillis: 0
    };

    dbPool = new Pool(config);

    dbPool.on('connect', (client) => {
      logger.info('New database client connected');
    });

    dbPool.on('error', (err, client) => {
      logger.error('Unexpected error on idle database client:', err);
    });

    dbPool.on('remove', (client) => {
      logger.info('Database client removed from pool');
    });

    // Test the connection
    const client = await dbPool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connection pool established');
    return dbPool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

async function disconnectDatabase() {
  try {
    if (dbPool) {
      await dbPool.end();
      dbPool = null;
      logger.info('Database connection pool closed');
    }
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};

