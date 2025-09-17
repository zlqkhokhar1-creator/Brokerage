const { transaction } = require('../config/database');
const { tradingEngine } = require('./tradingEngine');
const roboAdvisorService = require('./roboAdvisorService');
const { logger } = require('../utils/logger');
const { getMarketPrice } = require('./marketDataService');

/**
 * Analyzes and rebalances a user's robo-advisory portfolio to match its target allocation.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<object>} A summary of the rebalancing actions taken.
 */
const rebalancePortfolio = async (userId) => {
  const roboAccount = await roboAdvisorService.getRoboAccount(userId);
  if (!roboAccount || !roboAccount.is_active) {
    throw new Error('No active robo-advisory account found for this user.');
  }

  const currentPortfolio = await tradingEngine.getPortfolio(userId);
  const targetAllocation = roboAccount.target_allocation;
  const portfolioTotalValue = currentPortfolio.totalValue;

  const tradesToExecute = [];

  // Determine current allocation percentages
  const currentAllocation = currentPortfolio.positions.reduce((acc, pos) => {
    acc[pos.symbol] = pos.marketValue / portfolioTotalValue;
    return acc;
  }, {});

  // 1. Calculate Sells: Identify and sell over-allocated assets
  for (const target of targetAllocation) {
    const currentPct = currentAllocation[target.symbol] || 0;
    if (currentPct > target.percentage) {
      const surplusValue = (currentPct - target.percentage) * portfolioTotalValue;
      const quantityToSell = surplusValue / (await getMarketPrice(target.symbol));
      tradesToExecute.push({ symbol: target.symbol, side: 'SELL', quantity: quantityToSell });
    }
  }

  // Execute sells first to free up cash
  for (const trade of tradesToExecute.filter(t => t.side === 'SELL')) {
    await tradingEngine.placeOrder(trade, userId);
  }

  // 2. Calculate Buys: Identify and buy under-allocated assets
  // (In a real system, you would refresh portfolio value here after sells)
  for (const target of targetAllocation) {
    const currentPct = currentAllocation[target.symbol] || 0;
    if (currentPct < target.percentage) {
      const deficitValue = (target.percentage - currentPct) * portfolioTotalValue;
      const quantityToBuy = deficitValue / (await getMarketPrice(target.symbol));
      tradesToExecute.push({ symbol: target.symbol, side: 'BUY', quantity: quantityToBuy });
    }
  }

  // Execute buys
  for (const trade of tradesToExecute.filter(t => t.side === 'BUY')) {
    await tradingEngine.placeOrder(trade, userId);
  }

  await transaction(client =>
    client.query('UPDATE user_robo_accounts SET last_rebalanced_at = NOW() WHERE user_id = $1', [userId])
  );

  return { success: true, trades: tradesToExecute };
};

module.exports = {
  rebalancePortfolio,
};
