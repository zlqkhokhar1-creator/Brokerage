# API Utilities Documentation

This comprehensive API utility system provides a centralized, type-safe way to manage all external API integrations for the brokerage platform.

## 🚀 Quick Start

```typescript
import { apiServices, marketDataService, authService } from '@/lib/api';

// Get stock quote
const quote = await apiServices.marketData.getQuote('AAPL');

// Authenticate user
const user = await apiServices.auth.login({ email, password });

// Direct service access
const portfolio = await marketDataService.getPortfolio();
```

## 📁 File Structure

```
src/lib/api/
├── config.ts           # Centralized API configuration
├── client.ts          # Core API client and instances
├── auth.ts            # Authentication services
├── market-data.ts     # Market data services (Alpha Vantage, Finnhub)
├── payments.ts        # Payment gateway services (Stripe)
├── trading.ts         # Trading and portfolio services
├── index.ts           # Main export point
└── README.md          # This documentation
```

## 🔧 Core Components

### Configuration (`config.ts`)
Centralized configuration for all APIs including:
- API keys and endpoints
- Timeout settings
- Rate limiting rules
- Error codes
- Default headers

### API Client (`client.ts`)
Core HTTP client with:
- Automatic retry logic
- Rate limiting
- Error handling
- Request/response interceptors
- Multiple API instances (Alpha Vantage, Finnhub, etc.)

### Services
Type-safe service classes for:
- **Authentication**: Login, registration, profile management
- **Market Data**: Stock quotes, charts, news, company profiles
- **Payments**: Deposits, withdrawals, payment methods
- **Trading**: Orders, positions, portfolio analytics

## 📊 Service Examples

### Market Data Service

```typescript
import { marketDataService } from '@/lib/api';

// Get real-time quote
const quote = await marketDataService.getQuote('AAPL');

// Get historical data
const candles = await marketDataService.getCandles('AAPL', '1D', 30);

// Search stocks
const results = await marketDataService.searchStocks('Tesla');

// Get company profile
const profile = await marketDataService.getCompanyProfile('TSLA');

// Get market news
const news = await marketDataService.getNews('technology', 10);
```

### Authentication Service

```typescript
import { authService } from '@/lib/api';

// Login
const authResponse = await authService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Register
const user = await authService.register({
  email: 'new@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});

// Get profile
const profile = await authService.getProfile();

// Update profile
await authService.updateProfile({
  firstName: 'Jane',
  preferences: { theme: 'dark' }
});
```

### Trading Service

```typescript
import { tradingService } from '@/lib/api';

// Place market order
const order = await tradingService.placeOrder({
  symbol: 'AAPL',
  quantity: 10,
  side: 'buy',
  type: 'market'
});

// Get portfolio
const portfolio = await tradingService.getPortfolio();

// Get positions
const positions = await tradingService.getPositions();

// Get portfolio analytics
const analytics = await tradingService.getPortfolioAnalytics();
```

### Payment Service

```typescript
import { paymentService } from '@/lib/api';

// Add payment method
const paymentMethod = await paymentService.addPaymentMethod({
  type: 'card',
  token: 'stripe_token_here'
});

// Create deposit
const deposit = await paymentService.createDeposit({
  amount: 1000,
  paymentMethodId: 'pm_123'
});

// Create withdrawal
const withdrawal = await paymentService.createWithdrawal({
  amount: 500,
  bankAccountId: 'ba_123'
});
```

## 🛠 Utility Functions

### Error Handling

```typescript
import { apiUtils } from '@/lib/api';

try {
  const data = await marketDataService.getQuote('AAPL');
} catch (error) {
  // Format error for user display
  const message = apiUtils.formatError(error);
  
  // Check error types
  if (apiUtils.isNetworkError(error)) {
    console.log('Network issue detected');
  } else if (apiUtils.isAuthError(error)) {
    console.log('Authentication required');
  } else if (apiUtils.isRateLimitError(error)) {
    console.log('Rate limit exceeded');
  }
}
```

### Retry Logic

```typescript
import { apiUtils } from '@/lib/api';

// Retry with exponential backoff
const data = await apiUtils.retryWithBackoff(
  () => marketDataService.getQuote('AAPL'),
  3,    // max retries
  1000  // base delay (ms)
);
```

### Batch Requests

```typescript
import { apiUtils } from '@/lib/api';

const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
const requests = symbols.map(symbol => 
  () => marketDataService.getQuote(symbol)
);

// Process with concurrency control
const results = await apiUtils.batchRequests(requests, 3);
```

## 🔐 Environment Configuration

The system automatically adapts to your environment:

```typescript
import { getEnvironmentConfig } from '@/lib/api';

const config = getEnvironmentConfig();
// Returns different settings for development, staging, production
```

### Development
- Logging enabled
- Mock data support
- Rate limit warnings
- Extended timeouts

### Production
- Optimized performance
- Shorter timeouts
- Minimal logging
- No mock data

## 🎯 Type Safety

All services are fully typed with TypeScript:

```typescript
// Responses are fully typed
const quote: StockQuote = await marketDataService.getQuote('AAPL');
const portfolio: Portfolio = await tradingService.getPortfolio();

// Request parameters are validated
const order: Order = await tradingService.placeOrder({
  symbol: 'AAPL',     // string
  quantity: 10,       // number
  side: 'buy',        // 'buy' | 'sell'
  type: 'market'      // 'market' | 'limit' | 'stop'
});
```

## 🔄 React Integration

For React components, use the provided hooks:

```typescript
import { createApiHooks } from '@/lib/api';

const apiHooks = createApiHooks();

function StockQuote({ symbol }: { symbol: string }) {
  const { data: quote, loading, error } = apiHooks.useMarketData(symbol);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{quote?.price}</div>;
}
```

## 📈 Rate Limiting

Built-in rate limiting respects API provider limits:

- **Alpha Vantage**: 5 calls/minute (free tier)
- **Finnhub**: 60 calls/minute (free tier)
- **Internal API**: 100 calls/minute
- **Stripe**: 100 calls/second

## 🌐 Supported APIs

### Market Data
- **Alpha Vantage**: Real-time quotes, historical data, technical indicators
- **Finnhub**: Company profiles, news, financials
- **Yahoo Finance**: Alternative data source

### Payments
- **Stripe**: Payment processing, subscriptions, payouts

### AI & Analytics
- **OpenAI**: AI-powered insights and analysis

### Internal
- **Backend API**: User data, trading, portfolio management

## 🚨 Error Handling

Comprehensive error handling with:

```typescript
// Network errors
if (apiUtils.isNetworkError(error)) {
  // Show offline message, retry logic
}

// Authentication errors
if (apiUtils.isAuthError(error)) {
  // Redirect to login, refresh tokens
}

// Rate limit errors
if (apiUtils.isRateLimitError(error)) {
  // Show rate limit message, implement backoff
}

// General API errors
const userMessage = apiUtils.formatError(error);
```

## 🔧 Customization

### Adding New API Services

1. Create service class in appropriate file
2. Export from index.ts
3. Add to apiServices object
4. Update TypeScript types

### Custom Configuration

```typescript
// Override default configuration
import { API_CONFIG } from '@/lib/api/config';

API_CONFIG.ALPHA_VANTAGE.TIMEOUT = 10000; // Custom timeout
```

## 📝 Best Practices

1. **Always use services through the main index**: `import { apiServices } from '@/lib/api'`
2. **Handle errors gracefully**: Use apiUtils.formatError() for user messages
3. **Respect rate limits**: Use built-in rate limiting and batch requests
4. **Type everything**: Leverage TypeScript for better development experience
5. **Use environment configs**: Different settings for dev/staging/production
6. **Cache when possible**: Implement caching for frequently accessed data

## 🔍 Debugging

Enable detailed logging in development:

```typescript
// In development, API calls are logged with:
// - Request URL and method
// - Request headers and body
// - Response status and data
// - Timing information
// - Error details
```

## 📞 Support

For issues or questions:
1. Check TypeScript errors first
2. Verify API keys in environment variables
3. Check rate limiting status
4. Review error messages using apiUtils.formatError()
5. Enable debug logging in development

---

This API utility system is designed to be plug-and-play, scalable, and maintainable. It provides a solid foundation for all external API integrations in your brokerage platform.
