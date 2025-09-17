# Integration Tests

This directory contains integration tests for the Phase 5 implementation:

- `user_lifecycle.test.js` - Tests user creation, login, and refresh token rotation
- `payment_idempotency.test.js` - Tests idempotent payment operations
- `ledger_consistency.test.js` - Tests ledger transaction atomicity and balance consistency
- `test_helpers.js` - Common test utilities and setup functions

## Running Tests

Tests require a running PostgreSQL and Redis instance. Use the following commands:

```bash
# Run all integration tests
npm run test:integration

# Run specific test
npm run test:integration -- user_lifecycle.test.js
```

## Test Database Setup

Tests use environment variables for database connection:
- `TEST_DATABASE_URL` - PostgreSQL connection string for testing
- `TEST_REDIS_URL` - Redis connection string for testing

If not set, tests will skip database-dependent functionality.