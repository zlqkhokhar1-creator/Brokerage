const { transaction } = require('../config/database');
const { marketDataService } = require('./marketDataService');

/**
 * Creates a paper trading account for a user if one doesn't exist.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<object>} The paper trading account.
 */
const createPaperAccount = async (userId) => {
  let { rows } = await transaction(client =>
    client.query('SELECT * FROM paper_trading_accounts WHERE user_id = $1', [userId])
  );
  if (rows.length === 0) {
    ({ rows } = await transaction(client =>
      client.query('INSERT INTO paper_trading_accounts (user_id) VALUES ($1) RETURNING *', [userId])
    ));
  }
  return rows[0];
};

/**
 * Gets the user's paper trading account.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<object>} The paper trading account.
 */
const getPaperAccount = async (userId) => {
  return await createPaperAccount(userId); // Ensures account exists
};

/**
 * Simulates placing a trade in the paper trading environment.
 * @param {string} userId - The user's UUID.
 * @param {object} orderData - The order to simulate.
 * @returns {Promise<object>} A summary of the simulated trade.
 */
const placePaperTrade = async (userId, orderData) => {
  const account = await getPaperAccount(userId);
  const marketData = await marketDataService.getRealtimeQuote(orderData.symbol);
  const tradeValue = marketData.price * orderData.quantity;

  if (orderData.side === 'BUY' && tradeValue > account.balance) {
    throw new Error('Insufficient paper trading balance.');
  }

  // Simulate the trade without actually creating orders or positions
  const newBalance = orderData.side === 'BUY'
    ? account.balance - tradeValue
    : account.balance + tradeValue;

  await transaction(client =>
    client.query('UPDATE paper_trading_accounts SET balance = $1 WHERE user_id = $2', [newBalance, userId])
  );

  return {
    success: true,
    message: `Successfully simulated ${orderData.side} ${orderData.quantity} ${orderData.symbol}.`,
    newBalance: newBalance,
  };
};

/**
 * Resets a user's paper trading account to the default state.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<object>} The reset paper trading account.
 */
const resetPaperAccount = async (userId) => {
  const { rows } = await transaction(client =>
    client.query(
      'UPDATE paper_trading_accounts SET balance = DEFAULT, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING *',
      [userId]
    )
  );
  return rows[0];
};

module.exports = {
  getPaperAccount,
  placePaperTrade,
  resetPaperAccount
};
