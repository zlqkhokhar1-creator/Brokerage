# InvestPro - Professional Investment Platform

A comprehensive, production-ready brokerage and investment platform built with modern technologies, similar to Sarwa.co. This platform provides advanced portfolio management, real-time trading, KYC onboarding, payments, social trading, AI-powered recommendations, international markets, and professional analytics.

## 🚀 Features

### Core Platform Features
- **User Authentication & Authorization**: Secure JWT-based auth with role-based access control
- **KYC/AML Compliance**: Multi-step identity verification with document upload and admin review
- **Portfolio Management**: Create, manage, and track multiple portfolios and holdings
- **Trading System**: Market, limit, stop, and stop-limit orders with execution flow
- **Payments & Funding**: Deposits, withdrawals, transfers, balance summaries, and payment methods
- **Market Data Integration**: Real-time WebSocket price stream, REST realtime/historical/overview
- **Security**: Bank-grade security with Helmet, CORS, rate limiting, validation, auditability
- **Monitoring & Logging**: Winston logger, performance metrics, health checks and alerts

### Advanced Features
- **AI-Powered Recommendations**: Asset allocation, diversification, sector rotation, and security picks
- **Social Trading**: Follow/unfollow traders, view public portfolios/trades, copy trading, leaderboard
- **Advanced Order Types**: Trailing stop, bracket, iceberg, TWAP, VWAP + validations and lifecycle
- **International Markets**: Multi-market support, status/hours, indices, currencies, conversion, news
- **Advanced Charting & Analytics**: Technical indicators (SMA, EMA, RSI, MACD), multi-chart types

## 🏗️ Architecture

### Backend (Node.js + Express + PostgreSQL)
```
apps/backend/
├── src/
│   ├── api.js                    # Main API router (v1)
│   ├── index.js                  # Server entry (HTTP + WebSocket)
│   ├── db.js                     # Database connection (pg Pool)
│   ├── middleware.js             # Auth, validation, rate limiting
│   ├── auth.js                   # Registration/login/profile/password
│   ├── portfolio.js              # Portfolios, holdings, performance
│   ├── trading.js                # Basic orders/trades/watchlists
│   ├── advancedOrders.js         # Advanced order types (trailing/TWAP/VWAP/etc.)
│   ├── kyc.js                    # KYC information + document upload
│   ├── payments.js               # Deposits, withdrawals, transfers, balances
│   ├── marketData.js             # WebSocket + REST realtime/historical/overview/news
│   ├── aiRecommendations.js      # AI portfolio analysis & suggestions
│   ├── socialTrading.js          # Follow, copy trade, public portfolios, leaderboard
│   ├── internationalMarkets.js   # Markets, hours, indices, currencies, conversion
│   ├── logger.js                 # Winston logger (console + files)
│   └── monitoring.js             # Performance metrics, health checks, alerts
└── package.json
```

### Frontend (Next.js + React + TypeScript)
```
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── login/page.tsx        # Login
│   │   ├── register/page.tsx     # Registration
│   │   ├── dashboard/page.tsx    # Authenticated dashboard
│   │   └── kyc/page.tsx          # KYC onboarding flow
│   ├── components/
│   │   ├── RealTimeMarketData.tsx
│   │   ├── AdvancedCharts.tsx
│   │   └── ui/*                  # Button, Input, Select, Toast, Progress, Tabs, etc.
│   ├── contexts/AuthContext.tsx  # Global auth state
│   └── hooks/use-toast.ts        # Toast helper
└── package.json
```

### Database Schema (high-level)
- **Users & Sessions**: Users with profiles, KYC status/docs, sessions store
- **Accounts & Transactions**: Multiple account types, balances, deposits/withdrawals/transfers
- **Securities & Market Data**: Instruments and price/volume ticks (realtime + historical)
- **Portfolios & Holdings**: Positions with valuation and P&L
- **Orders & Trades**: Complete order lifecycle and executions
- **Watchlists, Alerts, Settings**: Personalization and system configs
- **Social**: `follows` table, public flags on `portfolios` and `orders`

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
DATABASE_URL=postgres://investpro:secure_password_123@localhost:5432/brokerage
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

## 📈 Roadmap (Status)
- ✅ Real-time market data integration
- ✅ Advanced charting and analytics
- ✅ Mobile app foundations (React Native scaffolding-ready)
- ✅ Payment processing integration (simulated flows)
- ✅ AI-powered investment recommendations
- ✅ Social trading features
- ✅ Advanced order types (trailing/bracket/iceberg/TWAP/VWAP)
- ✅ International market support

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
