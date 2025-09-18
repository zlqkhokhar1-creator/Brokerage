# Mutual Fund Management System

A comprehensive, production-ready microservice for mutual fund management, trading, and analytics in a fintech brokerage platform.

## 🚀 Features

### Core Functionality
- **Fund Catalog Management**: Complete mutual fund database with families, categories, and detailed fund information
- **Trading System**: Buy/sell mutual funds with real-time execution and settlement
- **Research & Analysis**: Advanced fund research tools with performance metrics and comparisons
- **Fund Screening**: Powerful filtering and screening capabilities
- **Performance Analytics**: Comprehensive performance tracking and reporting
- **Holdings Management**: Track fund holdings and portfolio composition
- **Tax Optimization**: Automated tax-loss harvesting and tax-efficient strategies
- **Portfolio Rebalancing**: Intelligent rebalancing recommendations and execution
- **Risk Management**: Real-time risk monitoring and compliance checking
- **Market Data**: Real-time NAV updates and market data integration

### Advanced Features
- **Compliance Monitoring**: Automated compliance checking and violation detection
- **Risk Analytics**: VaR, CVaR, Sharpe ratio, and other risk metrics
- **Tax Optimization**: Advanced tax strategies and optimization
- **Performance Attribution**: Detailed performance analysis and attribution
- **Factor Analysis**: Multi-factor risk model analysis
- **Peer Comparison**: Benchmark against similar funds
- **Real-time Updates**: WebSocket-based real-time data streaming
- **Comprehensive Reporting**: Detailed analytics and reporting

## 🏗️ Architecture

### Microservices Design
- **Modular Architecture**: Each service handles specific functionality
- **Service Manager**: Centralized service orchestration and management
- **Event-Driven**: Real-time updates and notifications
- **Scalable**: Horizontal scaling capabilities
- **Fault-Tolerant**: Graceful error handling and recovery

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Redis caching
- **Real-time**: Socket.io for WebSocket connections
- **Security**: JWT authentication, rate limiting, input validation
- **Monitoring**: Winston logging, health checks
- **Testing**: Jest for unit and integration tests

## 📁 Project Structure

```
apps/mutual-fund-management/
├── src/
│   ├── services/                 # Core business logic services
│   │   ├── fundCatalogService.js
│   │   ├── fundTradingService.js
│   │   ├── fundResearchService.js
│   │   ├── fundScreeningService.js
│   │   ├── fundPerformanceService.js
│   │   ├── fundHoldingsService.js
│   │   ├── fundTaxService.js
│   │   ├── fundRebalancingService.js
│   │   ├── fundAnalyticsService.js
│   │   ├── fundComplianceService.js
│   │   ├── fundRiskManagementService.js
│   │   ├── fundMarketDataService.js
│   │   ├── fundTaxOptimizationService.js
│   │   ├── fundPerformanceAnalyticsService.js
│   │   └── serviceManager.js
│   ├── routes/                   # API route handlers
│   │   ├── fundCatalog.js
│   │   ├── fundTrading.js
│   │   ├── fundResearch.js
│   │   ├── fundScreening.js
│   │   ├── fundPerformance.js
│   │   ├── fundHoldings.js
│   │   ├── fundTax.js
│   │   ├── fundRebalancing.js
│   │   └── fundAnalytics.js
│   ├── middleware/               # Express middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   └── rateLimiting.js
│   ├── utils/                    # Utility functions
│   │   ├── logger.js
│   │   ├── database.js
│   │   └── redis.js
│   └── index.js                  # Main application entry point
├── db/                          # Database schemas and migrations
│   └── schema.sql
├── tests/                       # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apps/mutual-fund-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb mutual_fund_management
   
   # Run database migrations
   npm run migrate
   ```

5. **Start the service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mutual_fund_management
DB_USER=your_username
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=3006
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 📊 API Endpoints

### Fund Catalog
- `GET /api/v1/funds/catalog` - List all funds
- `GET /api/v1/funds/catalog/:id` - Get fund details
- `POST /api/v1/funds/catalog` - Create new fund
- `PUT /api/v1/funds/catalog/:id` - Update fund
- `DELETE /api/v1/funds/catalog/:id` - Delete fund

### Fund Trading
- `POST /api/v1/funds/trading/buy` - Buy fund shares
- `POST /api/v1/funds/trading/sell` - Sell fund shares
- `GET /api/v1/funds/trading/history` - Get trading history
- `GET /api/v1/funds/trading/orders` - Get open orders

### Fund Research
- `GET /api/v1/funds/research/:id` - Get fund research data
- `GET /api/v1/funds/research/:id/performance` - Get performance metrics
- `GET /api/v1/funds/research/:id/holdings` - Get fund holdings
- `GET /api/v1/funds/research/:id/documents` - Get fund documents

### Fund Screening
- `POST /api/v1/funds/screening/search` - Search funds with filters
- `GET /api/v1/funds/screening/categories` - Get fund categories
- `GET /api/v1/funds/screening/families` - Get fund families

### Performance Analytics
- `GET /api/v1/funds/performance/:id` - Get fund performance
- `GET /api/v1/funds/performance/:id/benchmark` - Get benchmark comparison
- `GET /api/v1/funds/performance/:id/attribution` - Get performance attribution

### Portfolio Management
- `GET /api/v1/funds/holdings` - Get user holdings
- `POST /api/v1/funds/rebalancing/analyze` - Analyze rebalancing needs
- `POST /api/v1/funds/rebalancing/execute` - Execute rebalancing

### Tax Optimization
- `GET /api/v1/funds/tax/liability` - Get tax liability
- `POST /api/v1/funds/tax/optimize` - Get tax optimization recommendations
- `GET /api/v1/funds/tax/report` - Generate tax report

## 🔧 Services

### Fund Catalog Service
Manages the mutual fund database including:
- Fund families and categories
- Fund details and metadata
- Fund documents and prospectuses
- Fund screening and filtering

### Fund Trading Service
Handles all trading operations:
- Order placement and execution
- Trade settlement and clearing
- Order management and tracking
- Trade history and reporting

### Fund Research Service
Provides comprehensive fund research:
- Performance analysis and metrics
- Fund holdings and composition
- Risk analysis and ratings
- Peer comparison and benchmarking

### Fund Screening Service
Advanced fund filtering capabilities:
- Multi-criteria search and filtering
- Category and family-based filtering
- Performance-based screening
- Custom screening criteria

### Fund Performance Service
Real-time performance tracking:
- NAV updates and price feeds
- Performance calculations and metrics
- Historical performance data
- Performance attribution analysis

### Fund Holdings Service
Portfolio and holdings management:
- User portfolio tracking
- Holdings composition and analysis
- Portfolio performance monitoring
- Asset allocation tracking

### Fund Tax Service
Tax-related functionality:
- Tax liability calculations
- Tax form generation
- Tax reporting and compliance
- Tax optimization strategies

### Fund Rebalancing Service
Intelligent portfolio rebalancing:
- Rebalancing analysis and recommendations
- Automated rebalancing execution
- Tax-efficient rebalancing strategies
- Rebalancing history and tracking

### Fund Analytics Service
Comprehensive analytics and reporting:
- Performance analytics and insights
- Risk analytics and monitoring
- Tax analytics and optimization
- Custom reporting and dashboards

### Fund Compliance Service
Regulatory compliance and monitoring:
- Compliance rule checking
- Violation detection and reporting
- Regulatory reporting and filing
- Compliance monitoring and alerts

### Fund Risk Management Service
Advanced risk management:
- Risk metric calculations (VaR, CVaR, etc.)
- Risk monitoring and alerts
- Stress testing and scenario analysis
- Risk reporting and dashboards

### Fund Market Data Service
Real-time market data integration:
- NAV and price updates
- Market data feeds and integration
- Data quality monitoring
- Real-time data streaming

### Fund Tax Optimization Service
Advanced tax optimization:
- Tax-loss harvesting
- Tax-efficient rebalancing
- Tax optimization strategies
- Tax impact analysis

### Fund Performance Analytics Service
Comprehensive performance analysis:
- Performance attribution analysis
- Factor analysis and modeling
- Peer comparison and benchmarking
- Performance reporting and insights

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Test individual service methods
- **Integration Tests**: Test service interactions
- **E2E Tests**: Test complete user workflows

## 📈 Monitoring & Observability

### Health Checks
- `GET /health` - Service health status
- `GET /api/v1/stats` - Service statistics

### Logging
- Structured logging with Winston
- Log levels: error, warn, info, debug
- Log rotation and retention
- Centralized log aggregation

### Metrics
- Service performance metrics
- Database connection metrics
- Redis cache metrics
- API response time metrics

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- API key authentication
- OAuth 2.0 integration

### Security Features
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting and throttling
- CORS configuration

### Data Protection
- Data encryption at rest
- Data encryption in transit
- PII data masking
- Audit logging
- Data retention policies

## 🚀 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t mutual-fund-management .

# Run container
docker run -p 3006:3006 mutual-fund-management
```

### Production Considerations
- Environment-specific configurations
- Database connection pooling
- Redis clustering
- Load balancing
- Auto-scaling
- Monitoring and alerting
- Backup and recovery

## 📚 Documentation

### API Documentation
- Swagger/OpenAPI documentation
- Interactive API explorer
- Code examples and samples
- Integration guides

### Developer Documentation
- Service architecture overview
- Database schema documentation
- API reference
- Development guidelines

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- ESLint configuration
- Prettier formatting
- TypeScript types (if applicable)
- Comprehensive testing
- Documentation updates

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Getting Help
- Check the documentation
- Review existing issues
- Create a new issue
- Contact the development team

### Common Issues
- Database connection issues
- Redis connection problems
- Authentication errors
- Performance issues

## 🔄 Version History

### v1.0.0
- Initial release
- Core mutual fund management functionality
- Trading and portfolio management
- Performance analytics and reporting
- Tax optimization and compliance
- Real-time data and notifications

---

**Note**: This is a production-ready microservice designed for integration into a larger fintech brokerage platform. Ensure proper security, compliance, and testing before deploying to production.
