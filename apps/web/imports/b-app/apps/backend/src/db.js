const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const shouldUseSSL = (() => {
  if (process.env.DB_SSL === 'true') return true;
  if (!connectionString) return false;
  return /supabase\.co|amazonaws\.com|render\.com|neon\.tech|timescaledb\.cloud/i.test(connectionString);
})();

const pool = new Pool({
  connectionString,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
