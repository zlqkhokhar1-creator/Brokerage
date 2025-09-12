/**
 * Enhanced Database Configuration
 * Connection pooling, query logging, and optimization
 */

const { Pool } = require('pg');
const { logger, logQuery } = require('../utils/logger');

// Determine connection string and SSL settings (support Supabase and external Postgres)
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const shouldUseSSL = (() => {
  if (process.env.DB_SSL === 'true') return true;
  if (!connectionString) return false;
  // Supabase and many managed providers require SSL even in dev
  return /supabase\.co|amazonaws\.com|render\.com|neon\.tech|timescaledb\.cloud/i.test(connectionString);
})();

// Database configuration
const config = {
  connectionString,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  query_timeout: 20000,
  application_name: 'brokerage-api',
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(config);

// Pool event handlers
pool.on('connect', (client) => {
  logger.info('New database connection established', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('acquire', (client) => {
  logger.debug('Database connection acquired from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('error', (err) => {
  logger.error('Database pool error', {
    error: err.message,
    stack: err.stack,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('remove', (client) => {
  logger.info('Database connection removed from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// Enhanced query function with logging and error handling
const query = async (text, params = []) => {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    logQuery(text, params, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('Database query error', {
      query: text,
      params,
      duration,
      error: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    
    throw error;
  } finally {
    client.release();
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create a transaction context
    const txClient = {
      query: async (text, params = []) => {
        const start = Date.now();
        try {
          const result = await client.query(text, params);
          const duration = Date.now() - start;
          logQuery(text, params, duration);
          return result;
        } catch (error) {
          logger.error('Transaction query error', {
            query: text,
            params,
            error: error.message
          });
          throw error;
        }
      }
    };
    
    const result = await callback(txClient);
    await client.query('COMMIT');
    
    logger.info('Transaction completed successfully');
    return result;
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

// Health check function
const healthCheck = async () => {
  try {
    const start = Date.now();
    await query('SELECT 1');
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: duration,
      connections: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connections: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  }
};

// Common database operations
const dbOps = {
  // Find user by email
  findUserByEmail: async (email) => {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    return result.rows[0];
  },

  // Find user by ID
  findUserById: async (id) => {
    const result = await query(
      'SELECT id, email, first_name, last_name, role, created_at, last_login FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0];
  },

  // Create user
  createUser: async (userData) => {
    const { email, passwordHash, firstName, lastName, phone } = userData;
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, email, first_name, last_name, created_at`,
      [email, passwordHash, firstName, lastName, phone]
    );
    return result.rows[0];
  },

  // Update user last login
  updateLastLogin: async (userId) => {
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  },

  // Create user session
  createSession: async (userId, tokenHash, expiresAt) => {
    await query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, tokenHash, expiresAt]
    );
  },

  // Remove user session
  removeSession: async (userId, tokenHash) => {
    await query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND token_hash = $2',
      [userId, tokenHash]
    );
  },

  // Get user portfolio
  getUserPortfolio: async (userId) => {
    const result = await query(
      `SELECT p.*, s.current_price, s.company_name
       FROM positions p
       LEFT JOIN stocks s ON p.symbol = s.symbol
       WHERE p.user_id = $1 AND p.quantity > 0
       ORDER BY p.market_value DESC`,
      [userId]
    );
    return result.rows;
  },

  // Create order
  createOrder: async (orderData) => {
    const { userId, symbol, quantity, side, type, price, stopPrice, timeInForce } = orderData;
    const result = await query(
      `INSERT INTO orders (user_id, symbol, quantity, side, order_type, price, stop_price, time_in_force, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
       RETURNING *`,
      [userId, symbol, quantity, side, type, price, stopPrice, timeInForce]
    );
    return result.rows[0];
  },

  // Update order status
  updateOrderStatus: async (orderId, status, executedAt = null) => {
    await query(
      'UPDATE orders SET status = $1, executed_at = COALESCE($2, executed_at), updated_at = NOW() WHERE id = $3',
      [status, executedAt, orderId]
    );
  },

  // Get user orders
  getUserOrders: async (userId, limit = 50, offset = 0) => {
    const result = await query(
      `SELECT * FROM orders 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  // Insert audit log
  insertAuditLog: async (userId, action, tableName, recordId, oldValues = null, newValues = null) => {
    await query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, action, tableName, recordId, JSON.stringify(oldValues), JSON.stringify(newValues)]
    );
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Closing database connections...');
  await pool.end();
  logger.info('Database connections closed');
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  pool,
  query,
  transaction,
  healthCheck,
  dbOps,
  shutdown
};
