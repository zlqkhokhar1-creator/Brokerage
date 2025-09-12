# Brokerage Platform - Monorepo

A production-ready, high-performance brokerage platform built with modern microservices architecture. This monorepo contains all services, libraries, and infrastructure code for the end-to-end trading platform.

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Brokerage Platform                                │
├──────────────────────────────────────────────────────────────────────────────┤
│  API Gateway  │  Risk Mgmt   │  Ledger      │  Feature     │  Matching   │
│  (Fastify)    │  (TypeScript)│  (Prisma)    │  Store (AI)  │  Engine     │
│  Port: 3001   │  Port: 3002  │  Port: 3003  │  Port: 3004  │  (Rust)     │
├──────────────────────────────────────────────────────────────────────────────┤
│           Event Bus (Kafka) │ Database (PostgreSQL) │ Cache (Redis)      │
├──────────────────────────────────────────────────────────────────────────────┤
│     Observability: Jaeger (Tracing) │ Prometheus (Metrics) │ Grafana    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Install from nodejs.org](https://nodejs.org/)
- **Docker & Docker Compose** - [Install Docker](https://docs.docker.com/get-docker/)
- **Rust** (optional) - [Install Rust](https://rustup.rs/) for matching engine development

### One-Command Setup

```bash
# Clone and setup everything
git clone <repository-url>
cd potential-broccoli
make setup
```

This will:
- Install all dependencies
- Start infrastructure (PostgreSQL, Kafka, Redis)
- Run database migrations
- Start observability stack
- Display service URLs and info

### Manual Setup

```bash
# Install dependencies
npm ci

# Start infrastructure
docker-compose up -d postgres redis kafka jaeger prometheus grafana

# Run database migrations
npm run migrate --workspace=services/ledger

# Start all services in development
npm run dev
```

3. Configure environment variables

**🔒 Security & Identity Foundation Setup**

Copy the environment template and configure JWT settings:
```bash
cp .env.example .env
# Edit .env with your specific configuration
```

Required JWT configuration:
```bash
# apps/backend/.env
JWT_ISSUER=brokerage-api
JWT_AUDIENCE=brokerage-web
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Choose your JWT algorithm:
# Option 1: HS256 (simple, for development)
JWT_ALG=HS256
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars

# Option 2: RS256 (recommended for production)
# JWT_ALG=RS256
# JWT_PRIVATE_KEY_PATH=./keys/jwt-private.pem
# JWT_PUBLIC_KEY_PATH=./keys/jwt-public.pem

# Other configuration
NODE_ENV=development
HTTP_PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgres://investpro:secure_password_123@localhost:5432/brokerage
# Supabase (if used)
# SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres
```

**Generate JWT Test Token:**
```bash
# Generate a test JWT token for API testing
npm run generate:jwt

# Test the endpoints
curl http://localhost:3000/healthz
curl -H "Authorization: Bearer <your-token>" http://localhost:3000/whoami
```

**🚨 Security Notes:**
- Never commit real secrets to version control
- Use `.env.local` for local development secrets
- See `SECURITY_NOTES.md` for comprehensive security guidelines
- Review `ARCHITECTURE.md` for security architecture details

Legacy configuration (still supported):
```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

## 🏃‍♂️ Running the Application

### Quick Start
```bash
# Start all services in development mode
make dev
```

### Manual Setup
```bash
# Backend
cd apps/backend && npm run dev

# Frontend
cd ../web && npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/v1
- Health: http://localhost:5000/api/v1/health

### WebSocket (Market Data)
- WS URL: `ws://localhost:5000/ws/market-data?token=<JWT>`
- Messages:
  - Subscribe: `{ "type":"subscribe", "symbols":["AAPL","MSFT"] }`
  - Unsubscribe: `{ "type":"unsubscribe", "symbols":["AAPL"] }`
  - Ping: `{ "type":"ping" }`
- Broadcasts: `{ "type":"market_data", "symbol":"AAPL", "data":{ price, change, changePercent, volume } }`

## 📋 Service Architecture

### Core Services

| Service | Technology | Port | Responsibility |
|---------|------------|------|----------------|
| **Gateway** | TypeScript + Fastify | 3001 | API Gateway, Authentication, Routing |
| **Risk** | TypeScript + Fastify | 3002 | Risk Management, Position Monitoring |
| **Ledger** | TypeScript + Prisma | 3003 | Double-Entry Bookkeeping, Accounting |
| **Feature Store** | TypeScript + Fastify | 3004 | AI/ML Feature Management |
| **Matching Engine** | Rust | Library | High-Performance Order Matching |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.

## 🛠️ Development Commands

```bash
# Quick start
make setup        # One-time development environment setup
make dev          # Start all services in development mode

# Building & Testing
make build        # Build all services
make test         # Run all tests (TypeScript + Rust)
make lint         # Lint all code
make type-check   # TypeScript type checking

# Infrastructure
make docker-up    # Start all Docker services
make infra-up     # Start only infrastructure services
make health       # Check health of all services
```

## 📚 API Documentation (v1)

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/profile`
- `PUT /api/v1/auth/profile`
- `PUT /api/v1/auth/change-password`

### KYC
- `GET /api/v1/kyc/status`
- `POST /api/v1/kyc/information`
- `POST /api/v1/kyc/documents` (multipart)
- `POST /api/v1/kyc/verify/:userId` (admin)
- `GET /api/v1/kyc/requirements`

### Portfolio
- `GET /api/v1/portfolio`
- `POST /api/v1/portfolio`
- `GET /api/v1/portfolio/:id`
- `PUT /api/v1/portfolio/:id`
- `DELETE /api/v1/portfolio/:id`
- `GET /api/v1/portfolio/:id/performance`

### Trading (basic)
- `GET /api/v1/trading/orders`
- `POST /api/v1/trading/orders`
- `GET /api/v1/trading/orders/:id`
- `PUT /api/v1/trading/orders/:id/cancel`
- `GET /api/v1/trading/trades`

### Advanced Orders
- `POST /api/v1/advanced-orders/place`
- `GET /api/v1/advanced-orders/types`
- `GET /api/v1/advanced-orders/my-orders`
- `DELETE /api/v1/advanced-orders/:orderId`

### Payments
- `GET /api/v1/payments/accounts`
- `GET /api/v1/payments/accounts/:accountId`
- `POST /api/v1/payments/deposit`
- `POST /api/v1/payments/withdraw`
- `POST /api/v1/payments/transfer`
- `GET /api/v1/payments/transactions`
- `GET /api/v1/payments/payment-methods`
- `GET /api/v1/payments/balance-summary`

### Market Data
- `GET /api/v1/market-data/realtime?symbols=...`
- `GET /api/v1/market-data/historical/:symbol?period=1D|1W|1M|3M|6M|1Y`
- `GET /api/v1/market-data/overview`
- `GET /api/v1/market-data/indices`
- `GET /api/v1/market-data/news`
- `GET /api/v1/market-data/ws-info`

### AI Recommendations
- `GET /api/v1/ai-recommendations/recommendations`
- `GET /api/v1/ai-recommendations/insights`

### Social Trading
- `GET /api/v1/social-trading/traders`
- `POST /api/v1/social-trading/follow/:traderId`
- `DELETE /api/v1/social-trading/follow/:traderId`
- `GET /api/v1/social-trading/traders/:traderId/trades`
- `GET /api/v1/social-trading/traders/:traderId/portfolio`
- `POST /api/v1/social-trading/copy-trade/:tradeId`
- `GET /api/v1/social-trading/following`
- `GET /api/v1/social-trading/followers`
- `GET /api/v1/social-trading/leaderboard`

### International Markets
- `GET /api/v1/international-markets/markets`
- `GET /api/v1/international-markets/markets/:marketId/status`
- `GET /api/v1/international-markets/securities`
- `GET /api/v1/international-markets/indices`
- `GET /api/v1/international-markets/news`
- `GET /api/v1/international-markets/currencies`
- `POST /api/v1/international-markets/convert`
- `GET /api/v1/international-markets/trading-hours`

## 🔒 Security

### Current Implementation (Phase 1 & 1b)
- JWT with configurable expiry, bcrypt hashing
- Helmet, CORS, rate limiting, JSON limits
- Joi input validation, parameterized SQL
- CSP/XSS hardening, error redaction in prod
- Two-Factor Authentication (2FA) with TOTP
- Encrypted document storage and privacy controls
- Comprehensive audit logging and security dashboard

### Security Roadmap
- **Phase 2 Planning**: [Security & Identity Phase 2 Architecture](docs/security/PHASE2_PLAN.md)
  - External KMS integration (AWS KMS, Azure Key Vault, HashiCorp Vault)
  - Automated key rotation with zero-downtime workflows
  - Granular RBAC with policy-based permissions
  - Enhanced token lifecycle (refresh tokens, revocation)
  - Service-to-service authentication (mTLS + JWT assertions)
  - Advanced audit logging and compliance reporting
  - Operational security runbooks and incident response
=======
See the [Makefile](./Makefile) for all available commands.
>>>>>>> main

## 🧪 Testing

The platform includes comprehensive testing:

- **Matching Engine**: 10 comprehensive test scenarios (100% pass rate)
- **Services**: Unit tests for domain logic  
- **Integration**: End-to-end API testing
- **CI/CD**: Automated testing in GitHub Actions

```bash
# Run all tests
make test

# Test specific components
cd engine/matching && cargo test         # Rust matching engine
npm test --workspace=services/gateway    # TypeScript services
```

## 📊 Monitoring

Access monitoring dashboards:

- **Grafana**: [http://localhost:3000](http://localhost:3000) (admin/admin) - Service metrics & dashboards
- **Jaeger**: [http://localhost:16686](http://localhost:16686) - Distributed tracing
- **Prometheus**: [http://localhost:9090](http://localhost:9090) - Metrics collection

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Detailed system design and technical decisions
- **[Matching Engine](./engine/matching/README.md)**: Rust implementation details
- **Service Documentation**: Each service has its own README with API docs

## 🚧 Current Implementation Status

### ✅ Completed

- **Monorepo Structure**: Turborepo with proper workspace configuration
- **Core Microservices**: Gateway, Risk, Ledger, Feature Store services
- **Matching Engine**: Production-ready Rust implementation with comprehensive tests
- **Event-Driven Architecture**: Kafka integration with domain events
- **Observability**: Full stack (Jaeger, Prometheus, Grafana)
- **Development Environment**: Docker Compose + Make commands
- **CI/CD Pipeline**: GitHub Actions with multi-language support

### 🚀 Next Phase

- [ ] Production Kubernetes deployment
- [ ] Advanced order types (Stop, Iceberg, Pegged)
- [ ] Real-time market data integration
- [ ] ML feature pipelines
- [ ] Performance optimization

## 🤝 Contributing

1. **Setup**: Run `make setup` for development environment
2. **Branch**: Create feature branch (`git checkout -b feature/amazing-feature`)
3. **Develop**: Make changes with tests
4. **Test**: Run `make ci` to verify all checks pass
5. **PR**: Submit pull request with description

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for high-performance financial markets**
