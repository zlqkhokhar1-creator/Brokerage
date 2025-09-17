# Trading Brokerage Platform

Enterprise-grade trading platform built with modern microservices architecture.

## 🏗️ Monorepo Structure

This project uses a monorepo approach with pnpm workspaces and Turborepo for efficient development and deployment.

### Applications
- **apps/backend** - Legacy Express backend (preserved during transition)
- **apps/marketing** - Marketing website (Vite + React) 
- **apps/web** - Main web application
- **apps/mobile** - React Native mobile app
- **apps/portal** - Trading UI (placeholder for future development)

### Services  
- **services/gateway** - Secure Fastify-based API gateway with authentication, rate limiting, and observability

### Shared Packages
- **packages/shared-types** - Domain events and DTO types with Zod validation
- **packages/entitlements** - Pure entitlement resolution logic with feature flags
- **packages/config** - Environment validation and configuration utilities

## 🚀 Quick Start

### Prerequisites
- Node.js 20.19.5+ (see `.nvmrc`)
- pnpm 9.15.1+

### Development

```bash
# Install dependencies
pnpm install

# Start all services in development mode
pnpm dev

# Build all packages and services
pnpm build

# Run type checking
pnpm typecheck

# Run tests
pnpm test
```

### Gateway Service

The secure API gateway runs on port 3001 by default:

```bash
# Start gateway service only
cd services/gateway
pnpm dev

# Health check
curl http://localhost:3001/health

# Readiness check  
curl http://localhost:3001/ready

# Metrics (placeholder)
curl http://localhost:3001/metrics
```

## 📋 Architecture

See [ARCHITECTURE_PHASE1.md](./ARCHITECTURE_PHASE1.md) for detailed information about:
- Monorepo tooling and structure
- Security architecture and rationale  
- Shared package design
- Migration strategy from legacy systems
- Future development phases

## 🔒 Security Features

- JWT-based authentication with environment-enforced secrets
- Request correlation IDs for audit trails
- Rate limiting and CORS protection
- Structured logging with sensitive data redaction
- Environment validation preventing insecure startup

## 🧪 Testing

### Entitlements Package
```bash
cd packages/entitlements
pnpm test
```

### Gateway Service  
```bash
cd services/gateway
# TODO: Add tests in future PR
```

## 📦 Package Dependencies

- **Turborepo**: Build system with intelligent caching
- **Fastify**: High-performance HTTP framework for gateway
- **Zod**: Runtime type validation and parsing
- **Pino**: Structured logging with redaction support
- **JWT**: Secure authentication tokens

---

# Legacy Features (Preserved)
Below is the existing feature set that is preserved during the monorepo transition:

## 🚀 Features

### Tiered Membership System
- **Basic ($0/month)**: Essential features for getting started
  - Portfolio management (1 portfolio)
  - Basic market data & charts
  - Market & limit orders (10 trades/month)
  - KYC verification & mobile access
- **Premium ($9.99/month)**: Advanced trading and social features
  - Everything in Basic + advanced analytics (5 portfolios)
  - Social trading & copy trading
  - Advanced charting & technical indicators
  - Price alerts & research tools (100 trades/month)
- **Professional ($19.99/month)**: Full access to all features
  - Everything in Premium + AI recommendations
  - International markets & options trading
  - Advanced risk management & compliance tools
  - API access & unlimited usage

### Core Platform Features
- **User Authentication & Authorization**: Secure JWT-based auth with role-based access control
- **Feature Gating System**: Dynamic feature access based on membership tier with real-time toggles
- **KYC/AML Compliance**: Multi-step identity verification with document upload and admin review
- **Portfolio Management**: Create, manage, and track multiple portfolios and holdings (tier-limited)
- **Trading System**: Market, limit, stop, and stop-limit orders with execution flow
- **Payments & Funding**: Deposits, withdrawals, transfers, balance summaries, and payment methods
- **Market Data Integration**: Real-time WebSocket price stream, REST realtime/historical/overview
- **Security**: Bank-grade security with Helmet, CORS, rate limiting, validation, auditability
- **Monitoring & Logging**: Winston logger, performance metrics, health checks and alerts

### Advanced Features (Premium/Pro Tiers)
- **AI-Powered Recommendations**: Asset allocation, diversification, sector rotation, and security picks
- **Social Trading**: Follow/unfollow traders, view public portfolios/trades, copy trading, leaderboard
- **Advanced Order Types**: Trailing stop, bracket, iceberg, TWAP, VWAP + validations and lifecycle
- **International Markets**: Multi-market support, status/hours, indices, currencies, conversion, news
- **Advanced Charting & Analytics**: Technical indicators (SMA, EMA, RSI, MACD), multi-chart types
- **Options Trading**: Options chain, strategy builder, positions management
- **Risk Management**: Advanced risk analytics, VaR, stress testing
- **Compliance Tools**: Enhanced KYC, AML monitoring, regulatory reporting

## 🏗️ Modular Architecture

### Landing Page (Static Marketing Site)
```
apps/landing/
├── src/
│   ├── app/
│   │   ├── page.tsx              # InvestPro home page (from minimax website)
│   │   ├── pricing/page.tsx      # Pricing tiers
│   │   ├── features/page.tsx     # Feature overview
│   │   └── about/page.tsx        # About page
│   ├── components/
│   │   ├── Header.tsx            # Navigation with web portal links
│   │   ├── Footer.tsx            # Footer with company info
│   │   ├── PricingSection.tsx    # Tier comparison
│   │   └── ui/                   # Shared UI components
│   └── lib/utils.ts              # Utilities
└── package.json
```

### Web Portal (Authenticated Dashboard)
```
apps/web/
├── src/
│   ├── app/
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── portfolio/page.tsx    # Portfolio management
│   │   ├── trading/page.tsx      # Trading interface
│   │   ├── social/page.tsx       # Social trading (Premium+)
│   │   ├── ai/page.tsx           # AI insights (Pro only)
│   │   └── memberships/page.tsx  # Subscription management
│   ├── components/
│   │   ├── FeatureGate.tsx       # Feature access control
│   │   ├── RealTimeMarketData.tsx
│   │   ├── AdvancedCharts.tsx    # Premium+ feature
│   │   ├── AIAnalytics.tsx       # Pro only feature
│   │   └── ui/*                  # Shared UI components
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Authentication state
│   │   └── MembershipContext.tsx # Membership & feature flags
│   └── hooks/use-toast.ts        # Toast notifications
└── package.json
```

### Mobile App (React Native + Expo)
```
apps/mobile/
├── src/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── dashboard.tsx     # Dashboard tab
│   │   │   ├── portfolio.tsx    # Portfolio tab
│   │   │   ├── trade.tsx        # Trading tab
│   │   │   ├── social.tsx       # Social tab (Premium+)
│   │   │   └── profile.tsx      # Profile & settings
│   │   ├── auth/
│   │   │   ├── login.tsx        # Login screen
│   │   │   └── register.tsx     # Registration
│   │   └── memberships/
│   │       └── upgrade.tsx      # Upgrade flow
│   ├── components/
│   │   ├── FeatureGate.tsx      # Mobile feature gating
│   │   ├── Charts/              # Chart components
│   │   └── UI/                  # Mobile UI components
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Auth with AsyncStorage
│   │   └── MembershipContext.tsx # Mobile membership context
│   └── services/
│       └── api.ts               # API client
└── package.json
```

### Backend API (Node.js + Express + PostgreSQL)
```
apps/backend/
├── src/
│   ├── routes/
│   │   ├── api.js                # Main API router with all features integrated
│   │   ├── health.js             # Health check endpoints
│   │   └── memberships.js        # Subscription management
│   ├── services/
│   │   ├── tradingEngine.js      # Order execution engine
│   │   ├── riskManagementSystem.js
│   │   ├── complianceSystem.js
│   │   ├── marketDataService.js
│   │   ├── slideToExecuteService.js
│   │   ├── authService.js        # Authentication service
│   │   ├── orderManagementSystem.js
│   │   └── notificationSystem.js
│   ├── middleware/
│   │   ├── featureToggle.js      # Feature gating middleware
│   │   └── middleware.js         # Auth & validation
│   ├── config/
│   │   ├── database.js           # PostgreSQL connection
│   │   └── redis.js              # Redis for caching
│   ├── utils/
│   │   ├── logger.js             # Winston logging
│   │   ├── errorHandler.js       # Error handling
│   │   └── validation.js         # Input validation
│   ├── auth.js                   # Authentication routes
│   ├── trading.js                # Trading endpoints
│   ├── portfolio.js              # Portfolio management
│   ├── kyc.js                    # KYC verification with file upload
│   ├── payments.js               # Payment processing
│   ├── socialTrading.js          # Social features
│   ├── aiRecommendations.js      # AI insights
│   ├── advancedOrders.js         # Advanced order types
│   ├── internationalMarkets.js   # Global markets
│   ├── marketData.js             # Market data & WebSocket
│   └── index.js                  # Server entry point
├── db/
│   ├── schema.sql                # Core database schema
│   ├── membership_schema.sql     # Membership & feature flags
│   └── seed.sql                  # Sample data
├── tests/
│   ├── auth.test.js              # Authentication tests
│   ├── portfolio.test.js         # Portfolio tests
│   └── setup.js                  # Test setup
└── package.json
```

### Database Schema (Enhanced with Membership System)
- **Users & Sessions**: Users with profiles, KYC status/docs, sessions store, membership_tier_id
- **Membership System**: 
  - `membership_tiers` - Available subscription tiers with features and limits
  - `user_memberships` - Current user subscriptions with Stripe integration
  - `feature_flags` - Global feature toggles and A/B testing
  - `user_feature_overrides` - Individual user feature access overrides
  - `usage_tracking` - Monthly usage tracking per feature per user
  - `subscription_history` - Complete subscription change history
- **Accounts & Transactions**: Multiple account types, balances, deposits/withdrawals/transfers
- **Securities & Market Data**: Instruments and price/volume ticks (realtime + historical)
- **Portfolios & Holdings**: Positions with valuation and P&L (tier-limited quantities)
- **Orders & Trades**: Complete order lifecycle and executions (tier-limited)
- **Watchlists, Alerts, Settings**: Personalization and system configs (tier-limited)
- **Social**: `follows` table, public flags on `portfolios` and `orders` (Premium+ only)

## 🛠️ Technology Stack

### Backend
- Node.js 18+, Express.js, PostgreSQL 15+
- Auth: JWT (`jsonwebtoken`), hashing (`bcrypt`)
- Security: Helmet, CORS, Rate limiting, Joi validation
- WS: `ws` for WebSocket streaming
- Logging/Monitoring: Winston, custom monitoring/health

### Frontend
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS, Radix UI, Recharts, Lucide icons
- Context API + hooks

### Infrastructure
- Docker & Docker Compose (Postgres, Backend, Frontend, Redis, Nginx)
- Optional Kubernetes manifests under `infra/kubernetes/*`

## 🚀 Quick Start

### Phase 5 Persistence Quick Start

**Prerequisites**: PostgreSQL database running locally or connection string available.

1. **Database Setup**
   ```bash
   # Copy environment template
   cp .env.example.postgres .env
   # Edit .env with your DATABASE_URL
   
   # Apply database migrations
   npm run db:migrate
   
   # Verify migration status
   npm run db:migrate:plan
   
   # Run drift verification
   npm run db:drift-check
   ```

2. **Development Dependencies**
   ```bash
   # Install TypeScript dependencies
   npm install --legacy-peer-deps
   
   # Build persistence package
   cd packages/platform-persistence && npm run build
   ```

3. **Migration System Usage**
   ```bash
   # Check pending migrations
   npm run db:migrate:plan
   
   # Apply all pending migrations
   npm run db:migrate
   
   # Run database drift verification
   npm run db:drift-check
   ```

**Architecture**: See [ARCHITECTURE_PERSISTENCE.md](./ARCHITECTURE_PERSISTENCE.md) for detailed persistence layer documentation.

### Development Setup (Quick Start)

1. **Start the Database**
   ```bash
   # Start PostgreSQL in Docker
   docker-compose -f docker-compose.db.yml up -d
   ```

2. **Set Up Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Update with your database credentials
   npm run migrate       # Run database migrations
   npm start             # Start the backend server (runs on port 8000)
   ```

3. **Set Up Frontend**
   ```bash
   cd apps/web
   npm install
   npm run dev          # Start the Next.js development server (runs on port 3000)
   ```

4. **Access the Application**
   - Open http://localhost:3000 in your browser
   - Use the test credentials below to log in

## 🔧 HTTP Server Configuration (Phase 2A)

The platform now includes a framework-agnostic HTTP server abstraction layer that enables switching between different HTTP frameworks without changing business logic.

### Available HTTP Adapters

- **Fastify** (default): High-performance HTTP framework
- **Express** (placeholder): Traditional Node.js framework (not yet implemented)

### Switching HTTP Adapters

Use the `HTTP_ADAPTER` environment variable to select the HTTP framework:

```bash
# Use Fastify (default)
HTTP_ADAPTER=fastify pnpm dev:gateway

# Use Express (when implemented - will throw NotImplemented error currently)
HTTP_ADAPTER=express pnpm dev:gateway
```

### Legacy Adapter Block

The `legacy-adapter` block enables gradual migration from existing backend services:

```bash
# Configure legacy backend URL
LEGACY_BASE_URL=http://localhost:5001

# Test CreateUser command
curl -X POST http://localhost:3000/api/commands/CreateUser \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"John","lastName":"Doe"}'
```

The legacy adapter:
- Maps new commands to existing backend endpoints
- Publishes domain events (e.g., `user.registered.v1`) 
- Provides consistent observability with `adapter: "legacy"` metadata
- Enables the strangler pattern for gradual system migration

See [ARCHITECTURE_BLOCKS.md](./ARCHITECTURE_BLOCKS.md) for detailed technical documentation.

### Test User Credentials
For development, you can use the following test credentials:
- **Email:** test@example.com
- **Password:** password123

> **Note:** The login system is currently bypassed in development mode. You can click "Sign In" with any credentials to access the application.

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (recommended)

### 1) Setup via helper script
```
./setup.sh
```
This will build images, start services, apply schema/seed, and get you ready locally.

### 2) Manual install (alternative)

1. Clone repository
```
git clone <repository-url>
cd brokerage app
```

2. Install dependencies
```
# Backend
cd apps/backend && npm install

# Frontend
cd ../web && npm install
```

3. Configure environment variables
```
# apps/backend/.env
# Local Postgres (optional)
DATABASE_URL=postgres://investpro:secure_password_123@localhost:5432/brokerage
# Supabase Postgres (recommended if you have provided credentials)
# SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres
# DB_SSL=true
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=24h
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

4. Database (Docker or local)
```
# Using Docker Compose
docker-compose up -d postgres

# Apply schema/seed (if not auto-applied by compose init scripts)
psql "$DATABASE_URL" -f backend/db/schema.sql
psql "$DATABASE_URL" -f backend/db/seed.sql
```

5. Run apps
```
# Backend
cd apps/backend && npm run dev

# Frontend
cd ../web && npm run dev
```

6. Access
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
- JWT with configurable expiry, bcrypt hashing
- Helmet, CORS, rate limiting, JSON limits
- Joi input validation, parameterized SQL
- CSP/XSS hardening, error redaction in prod

## 🧪 Testing
```
cd apps/backend
npm test              # run Jest + Supertest
npm run test:watch
```

## 📈 Monitoring
- Request metrics, error rates, response times
- Health checks (DB/memory/disk placeholders)
- Winston logs: console + files under `logs/`

## 🐳 Docker
```
# Build and start full stack
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

## ☸️ Kubernetes (optional)
Manifests under `infra/kubernetes/*`:
- `namespace.yaml`, `postgres.yaml`, `backend.yaml`, `frontend.yaml`

## 📈 Migration & Integration Status

### ✅ Completed
- **Modular Architecture**: Separated landing, web portal, mobile, and backend
- **Membership System**: Tiered subscriptions with feature flags and Stripe integration
- **Backend Migration**: All features from old structure integrated into new apps/backend
- **Feature Gating**: Dynamic feature access based on membership tier
- **Advanced Features**: AI recommendations, social trading, international markets, advanced orders
- **Database Schema**: Enhanced with membership tables and feature flags
- **Docker Configuration**: Updated for modular structure with proper service separation

### ✅ Backend Feature Integration
- **Authentication**: JWT-based auth with role-based access control
- **Trading System**: Market/limit/stop orders with slide-to-execute technology
- **Portfolio Management**: Multi-portfolio support with real-time updates
- **KYC/Compliance**: Document upload, verification workflow, admin review
- **Payment Processing**: Deposits, withdrawals, Stripe subscription handling
- **Market Data**: Real-time WebSocket feeds, historical data, international markets
- **Social Trading**: Follow traders, copy trades, leaderboards
- **AI Analytics**: Portfolio optimization, risk assessment, market insights
- **Risk Management**: VaR calculations, stress testing, compliance monitoring
- **Advanced Orders**: Bracket, trailing stop, iceberg, TWAP/VWAP execution

### ✅ Frontend Integration
- **Web Portal**: Complete dashboard with all advanced features
- **Mobile App**: React Native structure with membership context
- **Landing Page**: Professional marketing site with web portal integration
- **Feature Gates**: Conditional rendering based on membership tier
- **Real-time Updates**: WebSocket integration for live market data

### 🔧 Technical Implementation
- **Legacy Compatibility**: Old backend endpoints preserved in new structure
- **Service Architecture**: Microservice-style organization with specialized services
- **Middleware Stack**: Feature toggles, authentication, validation, logging
- **Testing Framework**: Jest/Supertest setup with comprehensive test coverage
- **Monitoring**: Winston logging, performance metrics, health checks

---

## 🆕 Phase 3: Blocks Architecture (NEW)

### Modern Block-Based System
The platform now includes a new modular block architecture alongside the existing backend for gradual migration:

#### Membership Block (`packages/blocks/membership`)
Handles user authentication and profile management:
- **Password Security**: Argon2id hashing with bcrypt fallback
- **JWT Management**: Key rotation, JWKS endpoint, configurable TTL
- **Event-Driven**: Emits user.registered.v1, user.authenticated.v1 events
- **Commands**: RegisterUser, AuthenticateUser, GetProfile, UpdateProfile

#### Payment Gateway Block (`packages/blocks/payment-gateway`) 
Provider-agnostic payment processing:
- **Mock Provider**: Deterministic testing with predictable IDs
- **Stripe Provider**: Stub ready for real API integration
- **Idempotency**: Built-in duplicate request prevention
- **Commands**: InitializePayment, AuthorizePayment, CapturePayment, RefundPayment

#### Platform Security Block (`packages/blocks/platform-security`)
Authentication and authorization:
- **JWT Verification**: Token validation using membership block
- **Security Policies**: Command-level authorization rules  
- **Auth Context**: User context injection for commands

#### Legacy Adapter Block (`packages/blocks/legacy-adapter`)
Backward compatibility bridge:
- **Deprecation Warnings**: Gradual migration from legacy endpoints
- **API Compatibility**: Maintains existing API contracts
- **Command Delegation**: Routes to new blocks internally

### 🚀 Quick Start (Phase 3 Blocks)

#### User Registration & Authentication
```bash
# Register a new user
curl -X POST http://localhost:5000/api/commands/RegisterUser \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Authenticate user  
curl -X POST http://localhost:5000/api/commands/AuthenticateUser \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com", 
    "password": "SecurePass123!"
  }'
```

#### Payment Processing
```bash
# Initialize payment (requires authentication)
curl -X POST http://localhost:5000/api/commands/InitializePayment \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: payment-123" \
  -d '{
    "amount": 100.00,
    "currency": "USD", 
    "method": "card"
  }'

# Authorize payment
curl -X POST http://localhost:5000/api/commands/AuthorizePayment \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_mock_1"
  }'

# Capture payment
curl -X POST http://localhost:5000/api/commands/CapturePayment \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_mock_1"
  }'
```

#### JWT Key Management
```bash
# Rotate JWT signing keys
npm run membership:rotate-keys

# Get JWKS for verification
curl http://localhost:5000/internal/jwks.json
```

### Architecture Documentation
- [Membership Block Architecture](./ARCHITECTURE_MEMBERSHIP.md)
- [Payment Gateway Architecture](./ARCHITECTURE_PAYMENTS.md)

### Block Development
```bash
# Build all blocks
npm run build:blocks

# Install block dependencies
cd packages/blocks/membership && npm install
cd packages/blocks/payment-gateway && npm install

# Run integration test
node test-integration.js
```

---

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit (`git commit -m "feat: add your feature"`)
4. Push (`git push origin feature/your-feature`)
5. Open a PR

## 📄 License
MIT

## 🆘 Support
- Open a GitHub issue
- Contact the maintainers

---

**InvestPro** — Professional Investment Platform for Modern Investors
