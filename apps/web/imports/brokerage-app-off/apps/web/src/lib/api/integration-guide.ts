/**
 * API Integration Guide
 * Quick setup guide for integrating the API utilities into your existing components
 */

/* 
=== STEP 1: Replace old API calls ===

OLD WAY (replace this):
const response = await fetch('/api/stocks/AAPL');
const quote = await response.json();

NEW WAY (use this):
import { marketDataService } from '@/lib/api';
const quote = await marketDataService.getStockQuote('AAPL');
*/

/* 
=== STEP 2: Update portfolio components ===

OLD WAY:
const portfolio = await fetch('/api/portfolio').then(r => r.json());

NEW WAY:
import { apiServices } from '@/lib/api';
const portfolio = await apiServices.trading.getPortfolio();
*/

/* 
=== STEP 3: Add error handling throughout your app ===

import { apiUtils } from '@/lib/api';

try {
  const data = await apiServices.marketData.getStockQuote('AAPL');
} catch (error) {
  const userMessage = apiUtils.formatError(error);
  // Show userMessage to the user
}
*/

/* 
=== STEP 4: Use hooks in React components ===

import { useStockQuote, useAuth, usePortfolio } from '@/lib/api/examples';

function TradingDashboard() {
  const { user } = useAuth();
  const { portfolio, loading: portfolioLoading } = usePortfolio();
  const { quote: appleQuote } = useStockQuote('AAPL');

  if (!user) return <LoginForm />;
  
  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      {portfolioLoading ? (
        <div>Loading portfolio...</div>
      ) : (
        <PortfolioSummary portfolio={portfolio} />
      )}
      <StockQuoteCard quote={appleQuote} />
    </div>
  );
}
*/

/* 
=== STEP 5: Batch API calls for better performance ===

import { apiUtils, marketDataService } from '@/lib/api';

const watchlistSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
const requests = watchlistSymbols.map(symbol => 
  () => marketDataService.getStockQuote(symbol)
);

const quotes = await apiUtils.batchRequests(requests, 3);
*/

/* 
=== STEP 6: Use environment-specific configs ===

import { getEnvironmentConfig } from '@/lib/api';

const config = getEnvironmentConfig();
if (config.enableLogging) {
  console.log('API call made:', endpoint);
}
*/

/* 
=== STEP 7: Add to your existing error boundaries ===

import { ApiErrorBoundary } from '@/lib/api/examples';

function App() {
  return (
    <ApiErrorBoundary>
      <YourExistingComponents />
    </ApiErrorBoundary>
  );
}
*/

/* 
=== STEP 8: Update your environment variables (.env.local) ===

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key
STRIPE_SECRET_KEY=your_stripe_key
OPENAI_API_KEY=your_openai_key

# Environment
NODE_ENV=development
*/

// Export placeholder to make this a valid module
export default {};
