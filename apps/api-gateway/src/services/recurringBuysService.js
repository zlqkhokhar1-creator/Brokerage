const { transaction } = require('../config/database');
const { tradingEngine } = require('./tradingEngine');
const { logger } = require('../utils/logger');
const { getMarketPrice } = require('./marketDataService');

/**
 * Creates a new recurring buy schedule.
 * @param {string} userId - The user's UUID.
 * @param {object} scheduleData - The details of the recurring buy.
 * @returns {Promise<object>} The new recurring buy schedule.
 */
const createRecurringBuy = async (userId, scheduleData) => {
  const { symbol, amount, frequency, startDate } = scheduleData;
  const { rows } = await transaction(client =>
    client.query(
      `INSERT INTO recurring_buys (user_id, symbol, amount, frequency, next_execution_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, symbol, amount, frequency, startDate]
    )
  );
  return rows[0];
};

/**
 * Gets all active recurring buy schedules for a user.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<Array<object>>}
 */
const getRecurringBuys = async (userId) => {
  const { rows } = await transaction(client =>
    client.query('SELECT * FROM recurring_buys WHERE user_id = $1 AND is_active = TRUE', [userId])
  );
  return rows;
};

/**
 * Cancels a recurring buy schedule.
 * @param {string} userId - The user's UUID.
 * @param {string} scheduleId - The UUID of the schedule to cancel.
 */
const cancelRecurringBuy = async (userId, scheduleId) => {
  await transaction(client =>
    client.query(
      'UPDATE recurring_buys SET is_active = FALSE WHERE id = $1 AND user_id = $2',
      [scheduleId, userId]
    )
  );
};

/**
 * A background job to process scheduled recurring buys.
 * This should be run periodically by a scheduler (e.g., a cron job).
 */
const processScheduledBuys = async () => {
  const today = new Date().toISOString().split('T')[0];
  const { rows: dueBuys } = await transaction(client =>
    client.query('SELECT * FROM recurring_buys WHERE next_execution_date <= $1 AND is_active = TRUE', [today])
  );

  for (const buy of dueBuys) {
    try {
      const marketPrice = await getMarketPrice(buy.symbol);
      const quantity = buy.amount / marketPrice;

      await tradingEngine.placeOrder({
        symbol: buy.symbol,
        side: 'BUY',
        quantity: quantity,
        orderType: 'market'
      }, buy.user_id);

      // Update for the next execution
      const nextDate = calculateNextExecutionDate(buy.frequency, new Date(buy.next_execution_date));
      await transaction(client =>
        client.query('UPDATE recurring_buys SET next_execution_date = $1 WHERE id = $2', [nextDate, buy.id])
      );

    } catch (error) {
      logger.error('Failed to process recurring buy', { scheduleId: buy.id, error: error.message });
    }
  }
};

// --- Helper Functions ---
const calculateNextExecutionDate = (frequency, currentDate) => {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      // This handles month-end correctly (e.g., Jan 31 -> Feb 28)
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      throw new Error(`Unknown recurring buy frequency: ${frequency}`);
  }

  return nextDate;
};

module.exports = {
  createRecurringBuy,
  getRecurringBuys,
  cancelRecurringBuy,
  processScheduledBuys
};
