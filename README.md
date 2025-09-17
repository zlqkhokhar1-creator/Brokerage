# 🚀 Invest Pro Trading Platform

A comprehensive, production-ready trading platform built with modern web technologies, featuring advanced trading tools, real-time market data, and professional-grade analytics.

## ✨ Features

### 🎯 Frontend Features
- **React 19 Concurrent Features** - Enhanced UX with useTransition and useOptimistic
- **Virtual Scrolling** - High-performance market data lists with 1000+ items
- **Advanced Charting** - Professional candlestick charts with technical indicators
- **Order Book Visualization** - Real-time Level II market data
- **Position Sizing Calculator** - Risk management tools
- **Trading Journal** - Performance tracking and analytics
- **Keyboard Shortcuts** - Power user features (Ctrl+B for buy, Ctrl+S for sell)
- **Real-time Notifications** - WebSocket-based alerts and updates
- **Progressive Web App** - Offline functionality and mobile installation
- **Dark/Light Themes** - Customizable UI themes
- **Code Splitting** - Optimized bundle loading
- **Data Caching** - React Query for efficient data management

### ⚙️ Backend Features
- **RESTful API** - Comprehensive trading and portfolio APIs
- **WebSocket Support** - Real-time market data and notifications
- **Advanced Order Types** - Market, limit, stop, and stop-limit orders
- **Trading Journal API** - Complete trade tracking and analytics
- **Position Sizing API** - Risk management calculations
- **Export Functionality** - CSV/PDF export for reports
- **Authentication** - JWT-based with 2FA support
- **Rate Limiting** - API protection and abuse prevention
- **Database Optimization** - PostgreSQL with connection pooling
- **Caching Layer** - Redis for performance
- **Audit Logging** - Comprehensive activity tracking

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Database      │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • React 19      │    │ • REST APIs     │    │ • User Data     │
│ • TypeScript    │    │ • WebSocket     │    │ • Trades        │
│ • Tailwind CSS  │    │ • Authentication│    │ • Market Data   │
│ • PWA Support   │    │ • Rate Limiting │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Service       │    │   Cache Layer   │    │   File Storage  │
│   Worker        │    │   (Redis)       │    │   (Optional)    │
│                 │    │                 │    │                 │
│ • Offline Mode  │    │ • Session Data  │    │ • User Files    │
│ • Background    │    │ • Market Data   │    │ • Reports       │
│   Sync          │    │ • Notifications │    │ • Documents     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20.19.5+
- pnpm 9.15.1+
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Brokerage
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Frontend (.env.local)
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=ws://localhost:3001

   # Backend (.env)
   DATABASE_URL=postgresql://user:password@localhost:5432/investpro
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   cd apps/api-gateway
   psql -U postgres -c "CREATE DATABASE investpro;"
   psql -U postgres -d investpro -f db/feature_system_schema.sql
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1: Backend
   cd apps/api-gateway
   pnpm dev

   # Terminal 2: Frontend
   cd apps/web-portal
   pnpm dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## 📱 Progressive Web App

The application is a fully functional PWA with:
- **Offline Support** - Cached data and functionality
- **Mobile Installation** - Add to home screen
- **Background Sync** - Sync trading actions when online
- **Push Notifications** - Real-time alerts
- **Service Worker** - Background processing

### Install as PWA
1. Open the app in Chrome/Edge
2. Click the install button in the address bar
3. Or use the browser menu: "Install Invest Pro"

## 🎯 Trading Features

### Order Types
- **Market Orders** - Execute immediately at current price
- **Limit Orders** - Execute at specified price or better
- **Stop Orders** - Trigger when price reaches stop level
- **Stop-Limit Orders** - Combination of stop and limit

### Advanced Tools
- **Position Sizing Calculator** - Risk-based position sizing
- **Trading Journal** - Track performance and learn from trades
- **Order Book** - Level II market depth visualization
- **Technical Indicators** - SMA, EMA, RSI, MACD, Bollinger Bands
- **Real-time Charts** - Professional candlestick charts

### Risk Management
- **Stop Loss** - Automatic loss protection
- **Take Profit** - Automatic profit taking
- **Position Sizing** - Risk-based position calculation
- **Portfolio Analytics** - Performance metrics and analysis

## 🔧 Development

### Project Structure
```
Brokerage/
├── apps/
│   ├── web-portal/          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App router pages
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities and stores
│   │   └── public/          # Static assets
│   └── api-gateway/         # Express.js backend
│       ├── src/
│       │   ├── routes/      # API endpoints
│       │   ├── services/    # Business logic
│       │   └── middleware/  # Express middleware
│       └── db/              # Database schema
└── packages/                # Shared packages
```

### Available Scripts

**Frontend (web-portal)**
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

**Backend (api-gateway)**
```bash
pnpm dev          # Start development server
pnpm start        # Start production server
pnpm test         # Run tests
```

### Code Quality
- **TypeScript** - Type safety throughout
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **Husky** - Git hooks for quality checks

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd apps/web-portal
pnpm build

# Build backend
cd apps/api-gateway
pnpm build
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Environment Variables (Production)
```bash
# Frontend
NEXT_PUBLIC_API_URL=https://api.investpro.com
NEXT_PUBLIC_WS_URL=wss://api.investpro.com

# Backend
DATABASE_URL=postgresql://user:password@db:5432/investpro
REDIS_URL=redis://redis:6379
JWT_SECRET=your-production-secret
NODE_ENV=production
```

## 📊 Performance

### Frontend Optimizations
- **Code Splitting** - Dynamic imports for route-based splitting
- **Virtual Scrolling** - Efficient rendering of large lists
- **Image Optimization** - Next.js automatic image optimization
- **Bundle Analysis** - Webpack bundle analyzer integration
- **Caching** - React Query for intelligent data caching

### Backend Optimizations
- **Connection Pooling** - PostgreSQL connection optimization
- **Redis Caching** - In-memory caching for frequently accessed data
- **Rate Limiting** - API protection and resource management
- **Compression** - Gzip compression for API responses
- **Database Indexing** - Optimized database queries

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens** - Secure token-based authentication
- **2FA Support** - Two-factor authentication
- **Session Management** - Secure session handling
- **API Key Management** - User-generated API keys

### Data Protection
- **Input Validation** - Comprehensive request validation
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Content Security Policy
- **CSRF Protection** - Cross-site request forgery prevention
- **Rate Limiting** - API abuse prevention

### Audit & Compliance
- **Audit Logging** - Comprehensive activity tracking
- **Data Encryption** - Sensitive data encryption
- **Secure Headers** - Security-focused HTTP headers
- **Compliance Ready** - Built for financial regulations

## 🧪 Testing

### Frontend Testing
```bash
cd apps/web-portal
pnpm test              # Run unit tests
pnpm test:e2e          # Run end-to-end tests
pnpm test:coverage     # Run with coverage
```

### Backend Testing
```bash
cd apps/api-gateway
pnpm test              # Run unit tests
pnpm test:integration  # Run integration tests
```

## 📈 Monitoring

### Health Checks
- **Frontend Health** - Component-level health monitoring
- **Backend Health** - Service health endpoints
- **Database Health** - Connection and query monitoring
- **Cache Health** - Redis connection monitoring

### Metrics
- **Performance Metrics** - Response times and throughput
- **Error Tracking** - Comprehensive error logging
- **User Analytics** - Usage patterns and behavior
- **Trading Metrics** - Order execution and performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow the existing code style
- Ensure all checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation at `/api/docs`

## 🎉 Acknowledgments

- Built with modern web technologies
- Inspired by professional trading platforms
- Designed for scalability and performance
- Focused on user experience and security

---

**Invest Pro Trading Platform** - Professional trading made accessible.
