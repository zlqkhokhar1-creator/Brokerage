const { Pool } = require('pg');
const { logger } = require('../utils/logger');

let dbPool = null;

const connectDatabase = async () => {
  try {
    if (dbPool) {
      return dbPool;
    }

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'brokerage',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

    dbPool = new Pool(dbConfig);

    // Handle pool events
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

    logger.info('Database connected successfully');
    return dbPool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

const getDatabasePool = () => {
  if (!dbPool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return dbPool;
};

const closeDatabase = async () => {
  try {
    if (dbPool) {
      await dbPool.end();
      dbPool = null;
      logger.info('Database connection pool closed');
    }
  } catch (error) {
    logger.error('Error closing database connection pool:', error);
  }
};

// Database utility functions
const dbUtils = {
  // Execute a query
  async query(text, params = []) {
    const pool = getDatabasePool();
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.info('Database query executed', {
        query: text.substring(0, 100) + '...',
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.error('Database query error', {
        query: text.substring(0, 100) + '...',
        duration: `${duration}ms`,
        error: error.message
      });
      
      throw error;
    }
  },

  // Execute a query with a client
  async queryWithClient(client, text, params = []) {
    const start = Date.now();
    
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      logger.info('Database query executed with client', {
        query: text.substring(0, 100) + '...',
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.error('Database query error with client', {
        query: text.substring(0, 100) + '...',
        duration: `${duration}ms`,
        error: error.message
      });
      
      throw error;
    }
  },

  // Get a client from the pool
  async getClient() {
    const pool = getDatabasePool();
    return await pool.connect();
  },

  // Execute a transaction
  async transaction(callback) {
    const pool = getDatabasePool();
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

  // Execute multiple queries in a transaction
  async executeTransaction(queries) {
    return await this.transaction(async (client) => {
      const results = [];
      
      for (const { text, params } of queries) {
        const result = await this.queryWithClient(client, text, params);
        results.push(result);
      }
      
      return results;
    });
  },

  // Insert a record and return the ID
  async insertAndReturnId(table, data, idColumn = 'id') {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${idColumn}
    `;
    
    const result = await this.query(query, values);
    return result.rows[0][idColumn];
  },

  // Update a record
  async update(table, data, where, whereParams = []) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${where}
    `;
    
    const allParams = [...values, ...whereParams];
    const result = await this.query(query, allParams);
    return result.rowCount;
  },

  // Delete records
  async delete(table, where, params = []) {
    const query = `DELETE FROM ${table} WHERE ${where}`;
    const result = await this.query(query, params);
    return result.rowCount;
  },

  // Find a single record
  async findOne(table, where, params = [], select = '*') {
    const query = `SELECT ${select} FROM ${table} WHERE ${where} LIMIT 1`;
    const result = await this.query(query, params);
    return result.rows[0] || null;
  },

  // Find multiple records
  async findMany(table, where = '1=1', params = [], select = '*', orderBy = null, limit = null, offset = null) {
    let query = `SELECT ${select} FROM ${table} WHERE ${where}`;
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
    
    const result = await this.query(query, params);
    return result.rows;
  },

  // Count records
  async count(table, where = '1=1', params = []) {
    const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`;
    const result = await this.query(query, params);
    return parseInt(result.rows[0].count);
  },

  // Check if a record exists
  async exists(table, where, params = []) {
    const count = await this.count(table, where, params);
    return count > 0;
  },

  // Get table info
  async getTableInfo(table) {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    
    const result = await this.query(query, [table]);
    return result.rows;
  },

  // Get table indexes
  async getTableIndexes(table) {
    const query = `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = $1
    `;
    
    const result = await this.query(query, [table]);
    return result.rows;
  },

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      return {
        status: 'healthy',
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  },

  // Get pool stats
  getPoolStats() {
    if (!dbPool) {
      return null;
    }
    
    return {
      totalCount: dbPool.totalCount,
      idleCount: dbPool.idleCount,
      waitingCount: dbPool.waitingCount
    };
  }
};

module.exports = {
  connectDatabase,
  getDatabasePool,
  closeDatabase,
  ...dbUtils
};

