// Test setup file
const { logger } = require('../src/utils/logger');

// Mock logger for tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'mutual_fund_management_test';
process.env.REDIS_DB = '1';

// Global test timeout
jest.setTimeout(10000);

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
