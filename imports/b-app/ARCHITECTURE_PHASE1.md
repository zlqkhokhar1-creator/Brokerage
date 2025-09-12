# Phase 1 Architecture: Monorepo Foundation

## Overview
This document describes the initial monorepo foundation for the trading brokerage platform, establishing secure patterns and tooling for future development phases.

## Directory Structure

```
├── apps/                       # Applications
│   ├── backend/               # Legacy Express backend (preserved)
│   ├── marketing/            # Marketing website (renamed from investpro-website)
│   ├── mobile/               # React Native mobile app
│   ├── portal/               # Future trading UI (placeholder)
│   └── web/                  # Web application
├── services/                  # Microservices
│   └── gateway/              # Fastify-based secure API gateway
├── packages/                  # Shared packages
│   ├── shared-types/         # Domain events & DTO types
│   ├── entitlements/         # Entitlement resolution logic
│   └── config/               # Environment & configuration utilities
└── engine/                   # Future trading engine services
```

## Monorepo Tooling

### Package Management
- **pnpm**: Efficient, secure package management with workspaces
- **Workspace Structure**: `apps/*`, `services/*`, `packages/*`, `engine/*`

### Build System
- **Turborepo**: Incremental builds with intelligent caching
- **Pipelines**: `build`, `dev`, `lint`, `typecheck`, `test`
- **Dependencies**: Proper task dependencies across packages

### TypeScript Configuration
- **Base Config**: Shared `tsconfig.base.json` with path aliases
- **Package References**: TypeScript project references for type checking
- **Path Mapping**: Clean imports using `@shared-types/*`, `@config/*`, etc.

## Shared Packages

### @shared-types/events
Domain event definitions with Zod validation:
- `UserRegisteredEvent`
- `SubscriptionPlanUpdatedEvent`
- Common DTOs (`ApiResponse`, `Pagination`)

### @entitlements/core
Pure entitlement resolution logic:
- `computeEntitlements(plan, flags)` - Deterministic entitlement calculation
- Feature flag override support
- Comprehensive test coverage

### @config/env
Environment validation and schema enforcement:
- Zod-based environment validation
- Required variables: `JWT_SECRET`, `PORT`, `NODE_ENV`, etc.
- Type-safe configuration loading

## Gateway Service Architecture

### Framework: Fastify
- High-performance HTTP server
- Plugin-based architecture
- Built-in schema validation

### Security Middleware
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: Per-client request throttling
- **JWT Authentication**: Pluggable key provider system

### Observability
- **Structured Logging**: Pino with sensitive data redaction
- **Request Tracing**: UUID-based correlation IDs
- **Health Endpoints**: `/health`, `/ready` with dependency checks
- **Metrics Endpoint**: `/metrics` (Prometheus-ready placeholder)

### Error Handling
- Global error handler with trace correlation
- Environment-aware error details
- Consistent JSON error responses

## Security Posture

### Authentication & Authorization
- JWT-based authentication scaffold
- Environment-enforced JWT secrets (minimum 32 characters)
- Request correlation for audit trails

### Input Validation
- Zod schema validation at API boundaries
- Type-safe request/response handling
- Sanitization of user inputs

### Secrets Management
- Environment variable validation
- Sensitive data redaction in logs
- No hardcoded secrets or credentials

### Network Security
- Configurable CORS origins
- Rate limiting to prevent abuse
- Security headers via Helmet

## Transitional Strategy

### Legacy Backend Preservation
- Existing Express backend remains untouched
- No breaking changes to current functionality
- Clear migration path for future extraction

### Incremental Migration
1. **Phase 1** (Current): Foundation + Gateway
2. **Phase 2**: Extract domain services from legacy backend
3. **Phase 3**: Event-driven architecture with message bus
4. **Phase 4**: Trading engine microservices

### Deployment Considerations
- Gateway can proxy to legacy backend during transition
- Independent scaling of new services
- Rolling deployment support

## Development Workflow

### Getting Started
```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev        # All services concurrently

# Build all packages
pnpm build

# Type checking
pnpm typecheck

# Run tests
pnpm test
```

### Package Development
- Shared packages have independent build cycles
- Type-safe imports across package boundaries
- Incremental compilation with TypeScript project references

## Future Enhancements

### Phase 2 Planned Features
- Domain service extraction (membership, onboarding, funding)
- Event bus integration (NATS/Kafka)
- Advanced observability (OpenTelemetry, distributed tracing)

### Phase 3 Planned Features
- Trading engine microservices
- Real-time market data ingestion
- Risk management services

### Long-term Vision
- Multi-region deployment
- Event sourcing for audit trails
- Advanced security scanning and compliance

## Security Rationale

### Defense in Depth
- Early isolation of edge concerns (auth, rate limiting) reduces lateral attack risk
- Environment validation prevents insecure service startup
- Structured logging with redaction enables secure audit trails

### Compliance Readiness
- Request correlation supports regulatory audit requirements
- Centralized authentication simplifies access control
- Immutable event types facilitate compliance reporting

### Operational Security
- Health checks enable reliable service monitoring
- Graceful shutdown handling prevents data corruption
- Error boundaries contain security-sensitive information leakage

This foundation provides a secure, scalable base for building enterprise-grade trading infrastructure while maintaining compatibility with existing systems.