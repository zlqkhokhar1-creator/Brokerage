const { transaction } = require('../config/database');
const { BusinessLogicError } = require('../utils/errorHandler');

/**
 * Calculates advanced portfolio analytics over a given period.
 * @param {string} userId - The user's UUID.
 * @param {string} period - The time period (e.g., '1m', '1y').
 * @returns {Promise<object>} An object containing advanced analytics metrics.
 */
const getPortfolioAnalytics = async (userId, period) => {
  // Fetch the user's portfolio history for the given period
  const portfolioHistory = await fetchPortfolioHistory(userId, period);

  if (portfolioHistory.length < 2) {
    throw new BusinessLogicError('Not enough data to calculate analytics for the selected period.');
  }

  const returns = calculateReturns(portfolioHistory);
  const sharpeRatio = calculateSharpeRatio(returns);
  const maxDrawdown = calculateMaxDrawdown(returns);

  return {
    period,
    sharpeRatio,
    maxDrawdown,
    totalReturn: returns.reduce((acc, r) => acc + r, 0),
    monthlyReturns: returns // Simplified for this example
  };
};

// --- Calculation Helpers ---

const calculateReturns = (history) => {
  const returns = [];
  for (let i = 1; i < history.length; i++) {
    const dailyReturn = (history[i].value - history[i-1].value) / history[i-1].value;
    returns.push(dailyReturn);
  }
  return returns;
};

const calculateSharpeRatio = (returns, riskFreeRate = 0.02) => {
  const avgReturn = returns.reduce((acc, r) => acc + r, 0) / returns.length;
  const stdDev = Math.sqrt(returns.map(r => Math.pow(r - avgReturn, 2)).reduce((acc, v) => acc + v, 0) / returns.length);
  
  if (stdDev === 0) return 0;

  // Annualize the Sharpe Ratio (assuming daily returns)
  return ((avgReturn * 252) - riskFreeRate) / (stdDev * Math.sqrt(252));
};

const calculateMaxDrawdown = (returns) => {
  let maxDrawdown = 0;
  let peak = -Infinity;
  
  returns.forEach(returnValue => {
    if (returnValue > peak) {
      peak = returnValue;
    }
    const drawdown = (peak - returnValue) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });
  
  return maxDrawdown;
};


// --- Data Fetching Logic (dummy implementation) ---
const fetchPortfolioHistory = async (userId, period) => {
  // In a real application, this would query a table that stores daily snapshots
  // of the user's portfolio value.
  return [
    { date: '2025-08-01', value: 10000 },
    { date: '2025-08-02', value: 10100 },
    { date: '2025-08-03', value: 10050 },
    { date: '2025-08-04', value: 10200 },
    { date: '2025-08-05', value: 10150 },
    { date: '2025-08-06', value: 10300 }
  ];
};

module.exports = {
  getPortfolioAnalytics
};
