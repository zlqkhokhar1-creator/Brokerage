const cron = require('node-cron');
const { logger } = require('../utils/logger');
const { transaction } = require('../config/database');
const { rebalancePortfolio } = require('./rebalancingService');
const { processScheduledBuys } = require('./recurringBuysService');

const startAllJobs = () => {
  logger.info('Starting all scheduled jobs...');

  // Schedule 1: Daily Robo-Advisor Rebalancing
  // Runs every day at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    logger.info('CRON: Starting daily robo-advisor rebalancing job.');
    try {
      const { rows: accounts } = await transaction(client =>
        client.query('SELECT user_id FROM user_robo_accounts WHERE is_active = TRUE')
      );
      for (const account of accounts) {
        await rebalancePortfolio(account.user_id);
      }
      logger.info('CRON: Daily robo-advisor rebalancing job finished successfully.');
    } catch (error) {
      logger.error('CRON: Error during automated rebalancing job', { error: error.message });
    }
  });

  // Schedule 2: Daily Recurring Buys Processing
  // Runs every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('CRON: Starting daily recurring buys processing job.');
    try {
      await processScheduledBuys();
      logger.info('CRON: Daily recurring buys processing job finished successfully.');
    } catch (error) {
      logger.error('CRON: Error during recurring buys processing job', { error: error.message });
    }
  });

  logger.info('All scheduled jobs have been started.');
};

module.exports = {
  startAllJobs,
};
