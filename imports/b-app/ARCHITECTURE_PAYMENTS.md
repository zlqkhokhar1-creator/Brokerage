# Payment Gateway Architecture

The payment gateway block (`packages/blocks/payment-gateway`) provides a provider-agnostic payment processing system with comprehensive idempotency, event-driven architecture, and pluggable payment provider support.

## Core Architecture

### Provider Interface Pattern
The payment gateway uses a provider pattern to abstract payment processing logic:

```typescript
interface PaymentProvider {
  initialize(command): Promise<PaymentProviderResult>
  authorize(command): Promise<PaymentProviderResult>  
  capture(command): Promise<PaymentProviderResult>
  refund(command): Promise<PaymentProviderResult>
  get(command): Promise<PaymentProviderResult>
}
```

### Command Flow State Diagram

```
[Initialized] --authorize--> [Authorized] --capture--> [Captured] --refund--> [Refunded]
     |                           |                        |
     |                           |                        |
     v                           v                        v
  [Failed]                   [Failed]                 [Failed]
```

### Provider Implementations

#### MockProvider
- **Purpose**: Testing and development with predictable behavior
- **IDs**: Deterministic `pay_mock_<n>` or random based on configuration
- **State Machine**: Complete payment lifecycle with configurable failure scenarios
- **Testing Features**: Specific amounts trigger failures (666.66, 999.99)

#### StripeProvider  
- **Current**: Stub implementation with real API integration TODOs
- **Structure**: Ready for Stripe PaymentIntents, webhooks, and error handling
- **Migration**: Existing backend Stripe logic can be migrated here
- **TODO**: Real API integration, webhook signature validation

#### CustomProvider
- **Scaffold**: Directory structure and README for custom implementations
- **Interface**: Complete PaymentProvider interface compliance required
- **Loading**: Dynamic provider loading mechanism (TODO)
- **Configuration**: Environment-based enablement

## Command Architecture

### Core Commands

#### InitializePayment
- **Purpose**: Create payment intent with provider
- **Idempotency**: Supported via `x-idempotency-key` header
- **Validation**: Currency and method support checked against provider
- **Output**: Payment ID, provider payment ID, status

#### AuthorizePayment  
- **Purpose**: Authorize payment for capture
- **Modes**: Payment ID (existing) or direct authorization (amount + source)
- **Idempotency**: Supported for reliability
- **Validation**: Payment status transitions enforced

#### CapturePayment
- **Purpose**: Capture authorized funds
- **Amount**: Partial capture supported (amount ≤ authorized)  
- **Validation**: Status checks, amount limits
- **Finality**: Moves payment to captured state

#### RefundPayment
- **Purpose**: Refund captured payments
- **Amount**: Partial refunds supported
- **Tracking**: Total refunded amount maintained
- **Validation**: Refund amount ≤ (captured - already refunded)

#### GetPayment
- **Purpose**: Retrieve payment status and details
- **Performance**: Repository-based, no provider call needed
- **Metadata**: Includes version, age, provider information

## Idempotency Strategy

### Implementation
- **Service**: `IdempotencyService` interface with in-memory implementation
- **Key Format**: `{commandType}:{idempotency-key}`
- **TTL**: Configurable expiration (1 hour default)
- **Cleanup**: Automatic expired record removal

### Supported Commands
- **InitializePayment**: Prevents duplicate payment creation
- **AuthorizePayment**: Prevents duplicate authorization attempts
- **Others**: Can be extended as needed

### Redis Migration Path
- **Current**: In-memory with cleanup intervals
- **Production**: Redis-based with distributed support
- **Interface**: Same `IdempotencyService` interface

## Event-Driven Architecture

### Event Types
- `payment.initialized.v1`: Payment creation
- `payment.authorized.v1`: Authorization completion  
- `payment.captured.v1`: Capture completion
- `payment.refunded.v1`: Refund processing

### Event Structure
```typescript
{
  type: 'payment.captured.v1',
  paymentId: string,
  capturedAmount: number,
  currency: Currency,
  provider: string,
  at: string,
  traceId?: string
}
```

### Event Processing
- **Development**: In-memory EventEmitter with logging
- **Production Ready**: Interface supports Redis Streams, RabbitMQ
- **Consumers**: Ledger block (Phase 4) will consume payment events
- **Ordering**: Events maintain chronological order per payment

## Provider Selection & Configuration

### Environment-Based Selection
```bash
PAYMENT_PROVIDER=mock|stripe|custom
```

### Provider Configuration
```typescript
{
  defaultProvider: 'mock',
  providers: {
    mock: { enabled: true, deterministicIds: true },
    stripe: { enabled: false, apiKey: '...', webhookSecret: '...' },
    custom: { enabled: false, implementation: 'path/to/provider' }
  }
}
```

### Runtime Provider Switching
- **Per-Command**: Different providers per operation (advanced use case)
- **Factory Pattern**: `PaymentProviderFactory` manages provider instances
- **Validation**: Provider support for currency/method checked at runtime

## Data Model & Repository

### Payment Entity
```typescript
{
  id: string,
  amount: number,
  currency: Currency,
  status: PaymentStatus,
  method: PaymentMethod,
  metadata?: Record<string, any>,
  providerPaymentId?: string,
  authorizedAmount?: number,
  capturedAmount?: number,
  refundedAmount?: number,
  version: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Repository Pattern
- **Interface**: `PaymentRepository` for persistence abstraction
- **Current**: `InMemoryPaymentRepository` for development
- **Production**: `PostgreSQLPaymentRepository` (TODO)
- **Features**: Status filtering, statistics, memory usage tracking

## Security & Compliance

### Authentication Integration
- **Requirement**: All payment commands require authenticated user context
- **Integration**: Platform Security block provides AuthVerifier
- **Validation**: User context injection before command execution

### PCI Compliance Readiness
- **Data Handling**: Minimal card data storage (rely on provider tokenization)
- **Logging**: No sensitive payment data in logs
- **Provider Integration**: Delegate PCI compliance to certified providers

### Audit Trail
- **Events**: Complete payment lifecycle tracked
- **Correlation**: Trace IDs for request correlation
- **Provider Logs**: Provider operations logged with correlation

## Monitoring & Observability

### Metrics (TODO - Phase 4)
```
payments_flow_total{stage, provider, success}
payment_stage_duration_ms (histogram)
idempotency_hit_ratio
provider_error_rate{provider}
```

### Logging Structure
```json
{
  "level": "info",
  "message": "Payment captured successfully",
  "paymentId": "pay_123",
  "capturedAmount": 100.00,
  "currency": "USD", 
  "provider": "stripe",
  "duration": 250,
  "traceId": "trace-456"
}
```

### Health Checks
- **Provider Health**: Periodic provider availability checks
- **Repository Health**: Database connection and performance
- **Idempotency Service**: Memory usage and cleanup efficiency

## Error Handling & Resilience

### Provider Error Handling
- **Timeout**: Configurable timeouts for provider operations
- **Retry**: Exponential backoff for transient failures (TODO)
- **Fallback**: Provider fallback strategy (TODO)
- **Circuit Breaker**: Provider circuit breaker pattern (TODO)

### Payment State Consistency
- **Atomic Updates**: Repository operations maintain consistency
- **Event Ordering**: Events emitted after successful state changes
- **Recovery**: Payment status recovery from provider on startup (TODO)

### Validation & Business Rules
- **Amount Validation**: Positive amounts, precision handling
- **Status Transitions**: Valid state machine transitions enforced
- **Currency Support**: Provider currency support validation
- **Method Support**: Provider method support validation

## Testing Strategy

### Unit Testing
- **Provider Implementations**: Mock and Stripe provider logic
- **Command Handlers**: Business logic and validation
- **Idempotency Service**: Key management and expiration
- **Repository**: CRUD operations and constraints

### Integration Testing  
- **Payment Lifecycle**: Initialize → Authorize → Capture → Refund flow
- **Event Emission**: Event generation and ordering
- **Idempotency**: Duplicate request handling
- **Provider Switching**: Multiple provider configurations

### Contract Testing
- **Provider Interface**: All providers implement interface correctly
- **Event Schema**: Event structure validation and versioning
- **API Compatibility**: Backward compatibility with legacy systems

## Performance Characteristics

### Throughput
- **Command Processing**: Sub-100ms for in-memory operations
- **Provider Latency**: Depends on external provider (100-500ms typical)
- **Database Operations**: Optimized for payment ID lookups

### Memory Usage
- **Payments**: ~500B per payment record
- **Idempotency**: ~200B per idempotency record
- **Events**: Configurable retention policy

### Scalability
- **Horizontal**: Stateless design supports multiple instances
- **Provider Pooling**: Connection pooling for provider APIs (TODO)
- **Database Sharding**: Payment ID-based sharding ready (TODO)

## Migration from Legacy

### Legacy Payment System
- **Current**: Direct Stripe integration in backend
- **Migration**: Wrap existing logic in StripeProvider
- **Compatibility**: Legacy adapter provides backward compatible API
- **Deprecation**: Gradual migration with deprecation warnings

### Data Migration
- **Payment History**: Import existing payments to new schema
- **Status Mapping**: Map legacy statuses to new payment states
- **Provider IDs**: Maintain provider payment ID relationships

## Future Enhancements

### Phase 4 Roadmap
- **Real Stripe Integration**: Complete API integration with webhooks
- **PostgreSQL Repository**: Production-grade persistence
- **Redis Idempotency**: Distributed idempotency support
- **Advanced Providers**: Multiple provider support, routing rules
- **Monitoring**: Complete metrics and alerting integration

### Advanced Features (Later Phases)
- **Multi-Currency**: Advanced currency conversion
- **Recurring Payments**: Subscription and recurring payment support
- **Marketplace**: Split payments and marketplace functionality
- **Crypto Payments**: Cryptocurrency provider integration
- **Fraud Detection**: ML-based fraud detection integration