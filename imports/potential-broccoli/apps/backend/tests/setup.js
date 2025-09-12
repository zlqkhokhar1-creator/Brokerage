// Test setup file
require('dotenv').config({ path: '.env.test' });

const { Pool } = require('pg');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://investpro:secure_password_123@localhost:5432/brokerage_test';

// Set required JWT environment variables for testing
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'test-issuer';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'test-audience';
process.env.JWT_ALG = process.env.JWT_ALG || 'HS256';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-32-characters-long-for-security-testing';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-characters-long-for-security-testing';
process.env.HTTP_PORT = process.env.HTTP_PORT || '3001';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'warn';

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


