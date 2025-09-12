// Test setup file
const { Pool } = require('pg');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://investpro:secure_password_123@localhost:5432/brokerage_test';

// Create test database connection
const testDb = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Global test utilities
global.testDb = testDb;

// Cleanup after all tests
afterAll(async () => {
  await testDb.end();
});

// Increase timeout for database operations
jest.setTimeout(10000);


