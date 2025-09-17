# Contributing to Trading Platform Monorepo

## Development Setup

### Prerequisites
- Node.js 20+
- npm 9+
- Docker & Docker Compose
- Git

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd potential-broccoli

# Install dependencies
npm install

# Copy environment template
cp config/env/.env.example .env

# Start development infrastructure
docker-compose -f docker-compose.monorepo.yml up -d postgres redis
```

## Monorepo Structure

This repository uses **Turborepo** for efficient monorepo management with **npm workspaces**.

### Workspace Categories
- `apps/*` - Frontend applications (Next.js, React, React Native)
- `services/*` - Backend microservices (Node.js, Rust)  
- `packages/*` - Shared libraries and utilities

### Adding New Packages
```bash
# Create new service
mkdir services/my-service
cd services/my-service
npm init -y

# Create new shared package  
mkdir packages/my-package
cd packages/my-package
npm init -y
```

## Development Workflow

### Running Services
```bash
# Start all services in parallel
npm run dev

# Start specific workspace
npm run dev --workspace=services/membership-service

# Build all packages
npm run build

# Run tests across workspaces
npm run test
```

### Code Quality
```bash
# Lint all code
npm run lint

# Type check TypeScript
npm run typecheck

# Format code
npx prettier --write .
```

## Code Standards

### TypeScript
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Export types from `packages/shared-types`
- Use proper return types for functions

### File Naming
- Use kebab-case for directories: `membership-service`
- Use PascalCase for React components: `UserProfile.tsx`
- Use camelCase for utilities: `formatCurrency.ts`

### Import Organization
```typescript
// 1. Node modules
import React from 'react';
import { FastifyInstance } from 'fastify';

// 2. Internal packages
import { SubscriptionCreated } from '@platform/shared-types';
import { resolveEntitlements } from '@platform/entitlements';

// 3. Relative imports
import { UserService } from './UserService';
import type { Config } from '../types';
```

## Service Development

### Creating New Services

1. **Choose Technology Stack**
   - Node.js + Fastify: High-level business logic
   - Rust: Ultra-high performance requirements
   - Go: Systems-level services with concurrency

2. **Service Template Structure**
```
services/my-service/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── models/          # Data models
│   └── utils/           # Utilities
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

3. **API Conventions**
   - Use RESTful endpoints: `GET /api/users`, `POST /api/subscriptions`
   - Include health check: `GET /health`
   - Use proper HTTP status codes
   - Include correlation IDs in logs

### Database Migrations
```bash
# Create migration (when implemented)
npm run migrate:create --workspace=services/membership-service

# Run migrations
npm run migrate:up --workspace=services/membership-service
```

## Package Development

### Shared Types Package
```typescript
// packages/shared-types/src/events.ts
export interface BaseEvent<T, P> {
  eventId: string;
  type: T;
  payload: P;
  occurredAt: string;
}

// Export from index
export * from './events';
```

### Package Versioning
- Use semantic versioning (semver)
- Update version in package.json
- Document breaking changes

## Testing Strategy

### Unit Tests
```bash
# Test specific package
npm run test --workspace=packages/entitlements

# Test with coverage
npm run test:coverage --workspace=services/membership-service
```

### Integration Tests
```bash
# Start test database
docker-compose up -d postgres-test

# Run integration tests
npm run test:integration --workspace=services/membership-service
```

### End-to-End Tests
```bash
# Start all services
npm run dev

# Run E2E tests
npm run test:e2e --workspace=apps/portal
```

## Git Workflow

### Branch Naming
- Feature: `feature/subscription-management`
- Bug fix: `fix/payment-callback-validation`
- Hotfix: `hotfix/security-vulnerability`

### Commit Messages
Use conventional commits:
```
feat(membership): add JazzCash payment integration
fix(trading-core): resolve order acknowledgment delay
docs(architecture): update service communication patterns
```

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure CI passes (lint, typecheck, test)
4. Update documentation if needed
5. Submit PR with clear description
6. Address review feedback

## Environment Management

### Development
```bash
# Local development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/trading_platform_dev
```

### Testing
```bash
# Test environment
NODE_ENV=test  
DATABASE_URL=postgresql://localhost:5432/trading_platform_test
```

### Production
```bash
# Production environment
NODE_ENV=production
DATABASE_URL=postgresql://prod-host:5432/trading_platform
```

## Security Guidelines

### Environment Variables
- Never commit secrets to git
- Use `.env.example` for templates
- Rotate secrets regularly in production

### API Security
- Validate all inputs with schemas
- Use rate limiting on public endpoints
- Implement proper authentication/authorization
- Log security events

### Dependencies
- Regularly audit dependencies: `npm audit`
- Keep dependencies up to date
- Use exact versions in package-lock.json

## Documentation

### Code Documentation
- Document complex business logic
- Use TSDoc for TypeScript functions
- Include examples in README files

### API Documentation
- Document all public endpoints
- Include request/response examples
- Specify error responses

### Architecture Documentation
- Update architecture diagrams when services change
- Document event flows and data models
- Maintain deployment guides

## Performance Guidelines

### Backend Services
- Use connection pooling for databases
- Implement proper caching strategies
- Monitor response times and throughput
- Use async/await properly

### Frontend Applications
- Implement lazy loading for large components
- Optimize bundle sizes
- Use proper state management
- Monitor Core Web Vitals

## Deployment

### Local Deployment
```bash
# Build all services
npm run build

# Start with Docker Compose
docker-compose -f docker-compose.monorepo.yml up
```

### Production Deployment
- Use proper secrets management
- Implement health checks
- Set up monitoring and alerting
- Use rolling deployments

## Troubleshooting

### Common Issues
1. **Port conflicts**: Check `.env` file for service ports
2. **Database connection**: Ensure PostgreSQL is running
3. **Redis connection**: Verify Redis server status
4. **Build failures**: Clear node_modules and reinstall

### Debugging
```bash
# Check service logs
docker-compose logs membership-service

# Connect to database
psql postgresql://localhost:5432/trading_platform

# Monitor Redis
redis-cli monitor
```

## Getting Help

- Check existing documentation
- Search GitHub issues
- Ask in team chat/discussions
- Create detailed issue with reproduction steps

## License

This project is proprietary software. See LICENSE file for details.