# Persistence Architecture - Phase 5

This document describes the enhanced persistence architecture implemented in Phase 5, which introduces comprehensive database and Redis persistence for users, payments, and ledger transactions.

## Overview

Phase 5 implements a dual-write persistence strategy that allows safe migration from legacy in-memory systems to durable Postgres and Redis storage. The architecture supports feature flags for gradual rollout and includes comprehensive data consistency verification.

## Architecture Components

### 1. Database Layer

#### Kysely ORM Integration
- **Technology**: Kysely with TypeScript for type-safe database operations
- **Database**: PostgreSQL with proper indexing and constraints
- **Connection**: Reuses existing connection pool configuration
- **Transactions**: Full ACID transaction support for multi-table operations

#### Schema Enhancements (Migrations 0007-0009)

**0007_users_indexes.sql**
- Adds Argon2id password hash metadata columns
- Creates refresh_tokens table for secure token management
- Implements proper indexing for performance

**0008_payments_enhance.sql** 
- Adds payments and payment_events tables
- Implements idempotency_keys table for duplicate request prevention
- Includes proper enum types and constraints

**0009_ledger_core.sql**
- Creates ledger_transactions and ledger_balances tables
- Implements atomic balance updates with UPSERT operations
- Includes comprehensive indexing for performance

### 2. Repository Layer

#### UserRepository
- **Argon2id Password Hashing**: Secure password storage with configurable parameters
- **Refresh Token Management**: Secure token storage with automatic rotation
- **Migration Support**: Automatic rehashing of legacy bcrypt passwords
- **Methods**: `createUser`, `findByEmail`, `findById`, `updatePasswordHashVersion`

#### PaymentRepository  
- **Status Management**: Enum-based status with audit trail
- **Event Auditing**: Complete payment event history in JSON format
- **Currency Support**: ISO 4217 currency codes with validation
- **Methods**: `initializePayment`, `updateStatus`, `appendEvent`, `getPaymentById`

#### LedgerRepository
- **Atomic Transactions**: ACID-compliant ledger entries with balance updates
- **Balance Consistency**: UPSERT operations prevent race conditions
- **Transaction History**: Complete audit trail with metadata support
- **Methods**: `recordTransaction`, `getBalance`, `listTransactions`

#### IdempotencyRepository
- **Redis SETNX**: Prevents concurrent duplicate requests
- **DB Persistence**: Permanent storage of response data
- **TTL Management**: Automatic cleanup of expired keys
- **Methods**: `reserveKey`, `storeResponse`, `getStoredResponse`

### 3. Service Layer

#### AuthService
- **Dual-Write Support**: Writes to both legacy and new systems during migration
- **Feature Flag Integration**: Configurable behavior based on deployment flags
- **Token Management**: JWT access tokens with secure refresh token rotation
- **Password Migration**: Automatic upgrade from bcrypt to Argon2id

#### PaymentService  
- **Idempotency Support**: Duplicate request prevention with stored responses
- **Ledger Integration**: Automatic ledger entries for payment status changes
- **Dual-Write Mode**: Supports gradual migration from legacy payment systems
- **Error Handling**: Comprehensive error recovery and logging

### 4. Feature Flag System

#### Configuration Flags
```javascript
FEATURE_DUAL_WRITE_USERS: false        // Enable dual-write for user operations
FEATURE_DUAL_WRITE_PAYMENTS: false     // Enable dual-write for payment operations  
FEATURE_LEDGER_ENABLED: false          // Enable ledger transaction recording
FEATURE_IDEMPOTENCY_ENABLED: true      // Enable idempotent request handling
FEATURE_ARGON2_ENABLED: true           // Enable Argon2id password hashing
FEATURE_REFRESH_TOKENS_ENABLED: true   // Enable refresh token management
```

#### Safe Migration Strategy
1. **Phase 1**: Deploy with dual-write disabled - new code paths available
2. **Phase 2**: Enable dual-write - writes go to both systems
3. **Phase 3**: Verify data consistency using DriftVerifier
4. **Phase 4**: Switch reads to new system while maintaining dual-write
5. **Phase 5**: Disable dual-write - fully migrated to new system

### 5. Redis Integration

#### Client Configuration
- **Connection Management**: Exponential backoff with circuit breaker
- **Failure Handling**: Graceful degradation when Redis unavailable
- **Health Monitoring**: Continuous connection health checks
- **TLS Support**: Configurable TLS for managed Redis services

#### Use Cases
- **Idempotency Keys**: SETNX operations for duplicate prevention
- **Session Caching**: Optional caching layer for performance
- **Rate Limiting**: Request throttling (existing functionality)

### 6. Data Consistency & Verification

#### DriftVerifier Service
- **Count Comparison**: Verifies record counts between systems
- **Hash Verification**: Sample-based data integrity checks
- **Automated Monitoring**: Scheduled consistency verification
- **CLI Support**: Manual verification with JSON output

#### Ledger Replay System
- **Balance Verification**: Recalculates balances from transaction history
- **Consistency Checks**: Identifies and reports discrepancies
- **Recovery Support**: Tools for fixing inconsistent states
- **Audit Trail**: Complete verification history with timestamps

## Implementation Details

### Password Security

#### Argon2id Configuration
```javascript
{
  timeCost: 3,        // 3 iterations
  memoryCost: 65536,  // 64MB memory usage
  parallelism: 1      // Single thread
}
```

#### Migration Strategy
- New users automatically get Argon2id hashes
- Existing users upgraded on next login
- Legacy bcrypt hashes remain valid during transition
- Hash algorithm and parameters stored with each password

### Transaction Management

#### Payment Capture Flow
```javascript
// Atomic transaction ensuring consistency
await kysely.transaction().execute(async (trx) => {
  // 1. Update payment status
  const payment = await trx.updateTable('payments')...
  
  // 2. Record payment event  
  await trx.insertInto('payment_events')...
  
  // 3. Create ledger transaction
  await trx.insertInto('ledger_transactions')...
  
  // 4. Update user balance
  await trx.insertInto('ledger_balances')...onConflict()...
});
```

#### Balance Consistency
- All balance updates use UPSERT operations
- Concurrent updates handled with atomic increment/decrement
- Transaction isolation prevents race conditions
- Balance verification available via replay system

### Idempotency Implementation

#### Request Flow
1. Check for existing response in database
2. If found, return cached response immediately  
3. Reserve key using Redis SETNX with TTL
4. Process request if key reservation succeeds
5. Store response permanently in database
6. Return response to client

#### Key Management
- Scoped keys: `{scope}:{key}` format
- Redis TTL: 24 hours default
- Database retention: Configurable cleanup
- Automatic cleanup via scheduled jobs

## Performance Considerations

### Database Optimization
- **Indexes**: Strategic indexing on query patterns
- **Connection Pooling**: Reuses existing pool configuration
- **Query Optimization**: Kysely query builder prevents N+1 issues
- **Prepared Statements**: Automatic SQL injection prevention

### Redis Performance  
- **Pipelining**: Batch operations where possible
- **Circuit Breaker**: Prevents cascade failures
- **Connection Reuse**: Persistent connections with keepalive
- **Fallback Strategy**: Database-only operation when Redis unavailable

### Memory Management
- **Streaming**: Large result sets handled with cursor pagination
- **Cleanup**: Automatic cleanup of expired data
- **Monitoring**: Health checks and performance metrics

## Security Features

### Authentication Security
- **Argon2id**: Industry-standard password hashing
- **Token Rotation**: Automatic refresh token rotation
- **Secure Storage**: Hashed tokens in database
- **Revocation**: Immediate token invalidation support

### Data Protection
- **SQL Injection**: Kysely prevents SQL injection attacks
- **Input Validation**: Type-safe operations with TypeScript
- **Audit Trail**: Complete operation history for compliance
- **Encryption**: TLS support for Redis and database connections

## Monitoring & Observability

### Health Checks
- Database connection health
- Redis connection health  
- Service availability endpoints
- Feature flag status reporting

### Logging
- Structured logging with correlation IDs
- Performance metrics for operations
- Error tracking and alerting
- Audit logs for sensitive operations

### Metrics
- Transaction success/failure rates
- Response time percentiles  
- Cache hit/miss ratios
- Error rates by operation type

## Deployment & Operations

### Migration Process
1. Run database migrations: `npm run migrate`
2. Deploy application with feature flags disabled
3. Enable dual-write mode gradually
4. Verify consistency with drift verification
5. Switch to new system and disable dual-write

### Maintenance Scripts
- **Migration Runner**: `npm run migrate`
- **Ledger Replay**: `npm run ledger:replay`
- **Idempotency Cleanup**: `npm run idempotency:cleanup`
- **Drift Verification**: Manual verification tools

### Rollback Strategy
- Feature flags allow instant rollback
- Dual-write ensures no data loss during migration
- Database migrations are additive-only
- Legacy systems remain functional throughout migration

## Future Enhancements

### Planned Features
- **Vector Store Integration**: pgvector for AI features
- **RS256 + JWKS**: Enhanced JWT security
- **Ledger Hash Chain**: Tamper-proof transaction history
- **Advanced Metrics**: OpenTelemetry instrumentation

### Scalability Improvements
- **Read Replicas**: Database read scaling
- **Redis Clustering**: Horizontal Redis scaling  
- **Connection Pooling**: Enhanced connection management
- **Caching Strategy**: Multi-layer caching optimization
