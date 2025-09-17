// Test setup file
// This runs before each test file

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Empty test to satisfy Jest requirement
describe('Setup', () => {
  it('should configure test environment', () => {
    expect(true).toBe(true);
  });
});