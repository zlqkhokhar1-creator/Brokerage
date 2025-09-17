// PostgreSQL database connection setup
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/brokerage',
});

module.exports = pool;
