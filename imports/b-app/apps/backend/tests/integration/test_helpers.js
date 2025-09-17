/**
 * Test Helpers for Integration Tests
 */

const crypto = require('crypto');
const { logger } = require('../../src/utils/logger');

// Mock database connections for testing
let mockDb = null;
let mockRedis = null;

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  
  // Enable all features for testing
  process.env.FEATURE_DUAL_WRITE_USERS = 'true';
  process.env.FEATURE_DUAL_WRITE_PAYMENTS = 'true';
  process.env.FEATURE_LEDGER_ENABLED = 'true';
  process.env.FEATURE_IDEMPOTENCY_ENABLED = 'true';
  process.env.FEATURE_ARGON2_ENABLED = 'true';
  process.env.FEATURE_REFRESH_TOKENS_ENABLED = 'true';
  
  logger.info('Test environment setup complete');
}

/**
 * Cleanup test environment
 */
async function cleanupTestEnvironment() {
  // Reset environment variables
  delete process.env.JWT_SECRET;
  delete process.env.FEATURE_DUAL_WRITE_USERS;
  delete process.env.FEATURE_DUAL_WRITE_PAYMENTS;
  delete process.env.FEATURE_LEDGER_ENABLED;
  delete process.env.FEATURE_IDEMPOTENCY_ENABLED;
  delete process.env.FEATURE_ARGON2_ENABLED;
  delete process.env.FEATURE_REFRESH_TOKENS_ENABLED;
  
  logger.info('Test environment cleanup complete');
}

/**
 * Generate test user data
 */
function generateTestUser(suffix = '') {
  const randomId = crypto.randomBytes(4).toString('hex');
  return {
    email: `test${suffix}_${randomId}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890'
  };
}

/**
 * Generate test payment data
 */
function generateTestPayment(userId, options = {}) {
  return {
    userId,
    amountMinor: options.amountMinor || 10000, // $100.00 in cents
    currency: options.currency || 'USD',
    paymentMethodId: options.paymentMethodId || 'pm_test_123',
    externalId: options.externalId || `ext_${crypto.randomBytes(8).toString('hex')}`,
    metadata: options.metadata || { test: true, source: 'integration_test' }
  };
}

/**
 * Generate idempotency key
 */
function generateIdempotencyKey(prefix = 'test') {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Assert helper functions
 */
const assert = {
  /**
   * Assert that a value is truthy
   */
  ok(value, message = 'Expected value to be truthy') {
    if (!value) {
      throw new Error(message);
    }
  },

  /**
   * Assert equality
   */
  equal(actual, expected, message = `Expected ${actual} to equal ${expected}`) {
    if (actual !== expected) {
      throw new Error(message);
    }
  },

  /**
   * Assert deep equality for objects
   */
  deepEqual(actual, expected, message = 'Objects are not deeply equal') {
    const actualStr = JSON.stringify(actual, null, 2);
    const expectedStr = JSON.stringify(expected, null, 2);
    if (actualStr !== expectedStr) {
      throw new Error(`${message}\nActual: ${actualStr}\nExpected: ${expectedStr}`);
    }
  },

  /**
   * Assert that a function throws
   */
  async throws(fn, expectedError, message = 'Expected function to throw') {
    try {
      await fn();
      throw new Error(message);
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Expected error containing "${expectedError}", got: ${error.message}`);
      }
    }
  },

  /**
   * Assert that a value is null or undefined
   */
  isNull(value, message = 'Expected value to be null') {
    if (value !== null && value !== undefined) {
      throw new Error(message);
    }
  },

  /**
   * Assert that a value is not null
   */
  isNotNull(value, message = 'Expected value to not be null') {
    if (value === null || value === undefined) {
      throw new Error(message);
    }
  }
};

/**
 * Test runner helper
 */
class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Add a test case
   */
  test(testName, testFn) {
    this.tests.push({ name: testName, fn: testFn });
  }

  /**
   * Run all tests in the suite
   */
  async run() {
    console.log(`\n=== Running ${this.suiteName} ===`);
    
    for (const test of this.tests) {
      try {
        console.log(`Running: ${test.name}...`);
        await test.fn();
        console.log(`✅ PASS: ${test.name}`);
        this.passed++;
      } catch (error) {
        console.error(`❌ FAIL: ${test.name}`);
        console.error(`   Error: ${error.message}`);
        if (process.env.VERBOSE_TESTS) {
          console.error(`   Stack: ${error.stack}`);
        }
        this.failed++;
      }
    }

    console.log(`\n=== Results for ${this.suiteName} ===`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total: ${this.tests.length}`);
    
    return this.failed === 0;
  }
}

/**
 * Database availability check
 */
async function isDatabaseAvailable() {
  try {
    // Try to load database config
    const db = require('../../src/config/database');
    const result = await db.healthCheck();
    return result.status === 'healthy';
  } catch (error) {
    return false;
  }
}

/**
 * Redis availability check
 */
async function isRedisAvailable() {
  try {
    const { redisHealthCheck } = require('../../src/config/redisClient');
    const result = await redisHealthCheck();
    return result.status === 'healthy';
  } catch (error) {
    return false;
  }
}

/**
 * Skip test if database not available
 */
function skipIfNoDB(testName = 'Database test') {
  return async function() {
    const isAvailable = await isDatabaseAvailable();
    if (!isAvailable) {
      console.log(`⏭️  SKIP: ${testName} (database not available)`);
      return;
    }
    // If we get here, database is available - continue with actual test
  };
}

/**
 * Skip test if Redis not available
 */
function skipIfNoRedis(testName = 'Redis test') {
  return async function() {
    const isAvailable = await isRedisAvailable();
    if (!isAvailable) {
      console.log(`⏭️  SKIP: ${testName} (Redis not available)`);
      return;
    }
    // If we get here, Redis is available - continue with actual test
  };
}

/**
 * Delay helper for testing async operations
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  setupTestEnvironment,
  cleanupTestEnvironment,
  generateTestUser,
  generateTestPayment,
  generateIdempotencyKey,
  assert,
  TestRunner,
  isDatabaseAvailable,
  isRedisAvailable,
  skipIfNoDB,
  skipIfNoRedis,
  delay
};