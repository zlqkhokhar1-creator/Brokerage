/**
 * Kysely Database Configuration
 */

import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../types/database';

// Use the existing pool configuration from database.js
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const shouldUseSSL = (() => {
  if (process.env.DB_SSL === 'true') return true;
  if (!connectionString) return false;
  return /supabase\.co|amazonaws\.com|render\.com|neon\.tech|timescaledb\.cloud/i.test(connectionString);
})();

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false
});

// Create Kysely instance
export const kysely = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  })
});

// Export the pool for backward compatibility
export { pool };