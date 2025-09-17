const { transaction } = require('../config/database');
const { tradingEngine } = require('./tradingEngine');
const { logger } = require('../utils/logger');
const { BusinessLogicError } = require('../utils/errorHandler');
const twapStrategy = require('./strategies/twap');

class AlgorithmicTradingService {
  constructor() {
    this.activeStrategies = new Map();
    this.interval = setInterval(() => this.processActiveStrategies(), 5000); // Process every 5 seconds
  }

  async submitAlgoOrder(orderData, userId) {
    const { symbol, side, totalQuantity, strategy, parameters } = orderData;

    // Validate strategy and parameters
    if (strategy !== 'TWAP') {
      throw new BusinessLogicError('Unsupported trading strategy');
    }
    twapStrategy.validate(parameters);

    const { duration, sliceInterval } = parameters;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + twapStrategy.parseDuration(duration));

    // Create the parent algo order in the database
    const algoOrder = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO algo_orders (user_id, symbol, side, total_quantity, strategy, parameters, status, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
         RETURNING *`,
        [userId, symbol, side, totalQuantity, strategy, parameters, startTime, endTime]
      );
      return rows[0];
    });

    // Start the strategy runner for this order
    this.startStrategy(algoOrder);

    return algoOrder;
  }

  startStrategy(algoOrder) {
    logger.info('Starting new algorithmic strategy', { algoOrderId: algoOrder.id });
    const strategyRunner = twapStrategy.createRunner(algoOrder, (sliceOrder) => {
      // This callback submits the child order to the trading engine
      tradingEngine.placeOrder(sliceOrder, algoOrder.user_id);
    });
    this.activeStrategies.set(algoOrder.id, strategyRunner);
  }

  async processActiveStrategies() {
    if (this.activeStrategies.size === 0) return;
    
    logger.info(`Processing ${this.activeStrategies.size} active strategies...`);
    
    for (const [algoOrderId, strategyRunner] of this.activeStrategies.entries()) {
      const isComplete = await strategyRunner.executeNextSlice();
      if (isComplete) {
        this.activeStrategies.delete(algoOrderId);
        await this.completeAlgoOrder(algoOrderId);
      }
    }
  }

  async completeAlgoOrder(algoOrderId) {
    logger.info('Algorithmic strategy completed', { algoOrderId });
    await transaction(async (client) => {
      await client.query("UPDATE algo_orders SET status = 'completed' WHERE id = $1", [algoOrderId]);
    });
  }

  stopService() {
    clearInterval(this.interval);
  }
}

const algorithmicTradingService = new AlgorithmicTradingService();
module.exports = { algorithmicTradingService };
