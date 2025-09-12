 
# Architecture: Block System

## Overview

The brokerage platform uses a modular block architecture where each block encapsulates specific business capabilities. This document describes the transport abstraction layer and block system design.

## Transport Abstraction

### HTTP Server Abstraction Layer

The platform includes a framework-agnostic HTTP server abstraction layer (`@brokerage/platform-http`) that allows switching between different HTTP frameworks without changing business logic.

#### Key Components

1. **HttpServerAdapter Interface**
   - Framework-agnostic abstraction for HTTP servers
   - Supports route registration, middleware, and lifecycle management
   - Provides consistent request/response handling across different frameworks

2. **Adapter Implementations**
   - **FastifyAdapter**: Production-ready adapter using Fastify framework
   - **ExpressAdapter**: Placeholder for future Express.js support (currently throws NotImplemented)
   - **Future**: Hono, uWebSockets adapters planned

3. **Middleware System**
   - Koa-style middleware chain with async/await support
   - Standard middleware stack: error boundary, request ID, logging, auth, policy enforcement
   - Framework-independent middleware functions

#### Adapter Strategy

The adapter pattern enables:
- **Framework Flexibility**: Switch between Fastify, Express, Hono without changing business logic
- **Performance Optimization**: Choose the fastest framework for specific use cases
- **Risk Mitigation**: Reduce vendor lock-in and enable gradual migrations
- **Testing**: Mock adapters for unit testing

#### Usage

```typescript
import { createHttpServer } from '@brokerage/platform-http';

// Create server with default (Fastify) adapter
const server = createHttpServer({
  port: 3000,
  cors: { origin: true, credentials: true }
});

// Register routes
await server.registerRoute({
  method: 'POST',
  path: '/api/commands/:command',
  handler: commandHandler,
  middleware: [authMiddleware, rateLimitMiddleware]
});

// Start server
await server.start(3000);
```

#### Environment Configuration

Switch adapters using the `HTTP_ADAPTER` environment variable:

```bash
# Use Fastify (default)
HTTP_ADAPTER=fastify pnpm dev:gateway

# Use Express (when implemented)
HTTP_ADAPTER=express pnpm dev:gateway
```

## Block System

### Block Types

1. **Command Blocks**: Handle business commands (CreateUser, PlaceOrder)
2. **Query Blocks**: Handle read operations (GetUser, GetPortfolio)
3. **Adapter Blocks**: Interface with external systems (legacy-adapter, payment-adapter)
4. **Event Blocks**: Handle domain events and workflows

### Legacy Adapter Block

The `legacy-adapter` block enables the strangler pattern migration by providing a bridge to existing backend services.

#### Purpose
- **Reuse Existing Features**: Leverage existing backend endpoints during migration
- **Gradual Migration**: Replace legacy functionality incrementally
- **Event Integration**: Publish domain events even when using legacy services
- **Observability**: Consistent logging and metrics across legacy and new systems

#### Configuration

```typescript
// Block metadata
{
  name: 'legacy-adapter',
  kind: 'adapter',
  version: '0.1.0',
  commands: ['CreateUser'],
  events: ['user.registered.v1']
}
```

#### Implementation

The legacy adapter:
1. Receives commands via HTTP routes (`POST /api/commands/CreateUser`)
2. Validates input using Zod schemas
3. Calls legacy backend via HTTP client (`POST /api/v1/register`)
4. Transforms response to standardized format
5. Publishes domain events (`user.registered.v1`)
6. Provides structured logging with adapter metadata

#### Observability

All legacy adapter operations include metadata:
```json
{
  "traceId": "req_123",
  "command": "CreateUser", 
  "block": "legacy-adapter",
  "adapter": "legacy",
  "durationMs": 150,
  "success": true
}
```

Metrics include `legacy="true"` label for legacy operations.

### Event System

The block system uses an event-driven architecture:

1. **Event Publishing**: Blocks publish domain events after successful operations
2. **Event Schemas**: Versioned Zod schemas ensure contract compatibility  
3. **Event Bus**: Pluggable event bus (in-memory for dev, Redis for production)
4. **Schema Evolution**: Contract testing prevents breaking changes

### Standard Middleware Pipeline

All command routes use the standard middleware pipeline:

1. **Error Boundary**: Catches and formats unhandled errors
2. **Request ID**: Generates unique trace ID for request tracking
3. **Logging**: Structured request/response logging
4. **Rate Limiting**: Prevents abuse (stub implementation)
5. **Authentication**: JWT token verification (stub implementation)
6. **Policy Enforcement**: Authorization and business rules (stub implementation)

### Benefits

- **Modularity**: Independent blocks with clear boundaries
- **Testability**: Mock adapters and event publishers for testing
- **Observability**: Consistent logging, metrics, and tracing
- **Evolution**: Gradual migration from legacy to modern architecture
- **Flexibility**: Framework-agnostic transport layer
- **Reliability**: Standard error handling and middleware pipeline

### Future Enhancements

- Real Express and Hono adapter implementations
- Redis-based event bus integration
- Advanced rate limiting and authentication
- Policy engine integration
- Distributed tracing integration
- Advanced schema validation and migration tools
 
# Block Architecture Documentation

## Overview

The B-App platform implements a plug-and-play block architecture that enables rapid addition and replacement of capability blocks with minimal core changes. This architecture provides a foundation for building modular, scalable applications.

## Core Concepts

### Blocks

A **block** is a self-contained unit of functionality that can be dynamically loaded and registered with the platform. Each block defines:

- **Metadata**: Name, version, kind, description, policies
- **Commands**: Named functions that can be invoked via API
- **Events**: Messages published to the event bus
- **HTTP Routes**: Optional REST endpoints (if needed)
- **Lifecycle**: Registration and shutdown procedures

### Block Metadata

Every block must define metadata in its `block.config.ts` file:

```typescript
{
  name: 'my-block',           // Unique identifier (kebab-case)
  version: '1.0.0',           // Semantic version
  kind: 'service' | 'handler' | 'middleware',
  description: 'Block description',
  author: 'Developer name',
  dependencies: ['other-block'], // Optional dependencies
  policies: {
    authLevel: 'none' | 'user' | 'admin',
    permissions: ['permission:name'],
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000
    }
  },
  edge: false,                // If true, routes not prefixed with /api/blocks/<name>
  health: {
    endpoint: '/health',      // Optional custom health endpoint
    interval: 30000           // Health check interval
  }
}
```

### Block Lifecycle

1. **Discovery**: Gateway scans `packages/blocks/**/block.config.js`
2. **Loading**: Block configuration is loaded and validated
3. **Registration**: Block's `register()` function is called with context
4. **Activation**: Commands and routes become available
5. **Shutdown**: Block's optional `shutdown()` function is called

## Platform Packages

### @b-app/platform-core

Provides core services:
- `BlockScanner`: Discovers and loads blocks
- `LifecycleManager`: Manages block lifecycle
- `DependencyContainer`: Dependency injection system

### @b-app/platform-block-api

Provides block definition utilities:
- `defineBlock()`: Type-safe block definition
- `defineCommand()`: Command definition helper
- `defineRoute()`: HTTP route definition helper

### @b-app/platform-eventbus

Event system:
- `InMemoryEventBus`: Publish/subscribe messaging
- Pluggable interface for external systems (NATS, Kafka)

### @b-app/platform-observability

Monitoring and logging:
- `LoggerFactory`: Structured logging with Pino
- `PrometheusMetrics`: Metrics collection
- `TracerFactory`: Distributed tracing (OpenTelemetry)

### @b-app/platform-security

Security services:
- `JWTVerifier`: JWT token validation
- `PolicyEvaluator`: Authorization policies
- `RateLimiter`: Rate limiting (in-memory, Redis-ready)

### @b-app/platform-feature-flags

Feature management:
- `InMemoryFeatureFlagProvider`: Feature flag evaluation
- Conditional logic and rollout support

### @b-app/platform-serialization

Schema and validation:
- `SchemaGenerator`: JSON Schema generation
- `ValidationWrapper`: Runtime validation with Zod
- Contract validation and versioning

## Command Dispatch

Commands are invoked via the REST API:

```
POST /api/v1/blocks/commands/{commandName}
```

### Example Request

```bash
curl -X POST http://localhost:5001/api/v1/blocks/commands/GenerateCompletion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the capital of France?",
    "model": "gpt-3.5-turbo",
    "maxTokens": 100,
    "temperature": 0.7,
    "userId": "user123"
  }'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "completionId": "comp_123",
    "content": "The capital of France is Paris.",
    "model": "gpt-3.5-turbo",
    "usage": {
      "promptTokens": 8,
      "completionTokens": 12,
      "totalTokens": 20
    },
    "finishReason": "stop",
    "createdAt": "2025-01-01T12:00:00.000Z"
  },
  "traceId": "trace_123",
  "executedAt": "2025-01-01T12:00:00.000Z",
  "duration": 150
}
```

## Event System

Blocks can publish and subscribe to events:

```typescript
// Publishing an event
await eventBus.publish('payment.authorized.v1', {
  paymentId: 'pay_123',
  userId: 'user_456',
  amount: 1000,
  currency: 'USD'
}, {
  source: 'payment-stripe',
  userId: 'user_456'
});

// Subscribing to events
const subscriptionId = await eventBus.subscribe('payment.authorized.v1', async (data, metadata) => {
  console.log('Payment authorized:', data);
});
```

## Block Management API

### List Blocks

```
GET /api/v1/blocks/internal/blocks
Headers: x-service-token: <service-token>
```

### Block Health

```
GET /api/v1/blocks/health
```

### Available Commands

```
GET /api/v1/blocks/commands
```

## Development Workflow

### Creating a New Block

1. **Scaffold**: Use the CLI scaffolder
   ```bash
   npm run scaffold:block my-new-block
   ```

2. **Install Dependencies**:
   ```bash
   cd packages/blocks/my-new-block
   npm install
   ```

3. **Implement**: Update `block.config.ts` and `src/schemas.ts`

4. **Build**: Compile TypeScript
   ```bash
   npm run build
   ```

5. **Test**: Start gateway and test commands
   ```bash
   npm run dev:gateway
   ```

### Schema Generation

Generate contract schemas for CI validation:

```bash
npm run generate:schemas
```

This creates JSON schemas in `artifacts/contracts/` for:
- Command input/output validation
- Event schema validation
- Breaking change detection

## Security Model

### Authentication Levels

- **none**: No authentication required
- **user**: Valid user session required
- **admin**: Admin privileges required

### Permissions

Fine-grained permissions can be enforced:
- Format: `resource:action` (e.g., `payment:create`, `ai:generate`)
- Evaluated against user's permission set
- Can be overridden per command

### Rate Limiting

- Per-user or per-IP rate limiting
- Configurable windows and limits
- In-memory implementation (Redis-ready)

## Monitoring and Observability

### Metrics

Default metrics collected:
- `block_commands_total{block,command,success}`: Command execution count
- `block_command_duration_ms{block,command}`: Command duration
- `blocks_loaded_total{status}`: Loaded blocks count

### Logging

Structured logging with automatic redaction:
- Sensitive headers redacted (Authorization, Cookie, etc.)
- Request/response correlation with trace IDs
- Block-specific log contexts

### Tracing

Distributed tracing with OpenTelemetry:
- Automatic span creation per command
- Trace ID propagation via `x-trace-id` header
- Integration-ready for external tracers

## Deployment

### Development

```bash
# Start gateway with blocks
npm run dev:gateway

# Generate schemas
npm run generate:schemas
```

### Production Considerations

1. **External Dependencies**: Redis for rate limiting, PostgreSQL for state
2. **Event Bus**: Replace with NATS/Kafka for production scale
3. **Metrics**: Export to Prometheus/Grafana
4. **Tracing**: Configure OpenTelemetry exporters
5. **Security**: Implement proper JWT validation and RBAC

## Example Blocks

### Payment Processing

- **Block**: `payment-stripe`
- **Commands**: `AuthorizePayment`
- **Events**: `payment.authorized.v1`
- **Features**: Stripe integration (stubbed)

### AI Inference

- **Block**: `ai-inference-openai`
- **Commands**: `GenerateCompletion`
- **Events**: `ai.completion.generated.v1`
- **Features**: OpenAI integration (stubbed)

## Versioning and Contracts

### Semantic Versioning

- **Major**: Breaking changes (remove fields, change types)
- **Minor**: Backwards-compatible additions
- **Patch**: Bug fixes, no schema changes

### Contract Validation

The schema generation process validates:
- Required field removal detection
- Type change detection
- Automatic CI integration for breaking change prevention

### Migration Path

1. Implement new version alongside existing
2. Update consumers to use new version
3. Deprecate old version
4. Remove old version in next major release

## Troubleshooting

### Common Issues

1. **Block not loading**: Check `block.config.js` syntax and dependencies
2. **Command not found**: Ensure block is registered and built
3. **Permission denied**: Check user permissions and auth level
4. **Rate limited**: Adjust rate limit policies or user quotas

### Debug Mode

Enable debug logging:
```bash
DEBUG=blocks:* npm run dev:gateway
```

### Health Checks

Monitor block health:
```bash
curl http://localhost:5001/api/v1/blocks/health
```
 
