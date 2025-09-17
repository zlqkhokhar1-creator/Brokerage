const { transaction } = require('../../config/database');
const { BusinessLogicError } = require('../../utils/errorHandler');

// Helper to parse duration strings like "4h", "30m", "1d" into milliseconds
const parseDuration = (durationStr) => {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) throw new BusinessLogicError('Invalid duration format. Use s, m, h, or d.');
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new BusinessLogicError('Invalid duration unit.');
  }
};

const validate = (parameters) => {
  if (!parameters.duration || !parameters.sliceInterval) {
    throw new BusinessLogicError('TWAP strategy requires "duration" and "sliceInterval" parameters.');
  }
  // Further validation can be added here (e.g., max duration)
  return true;
};

const createRunner = (algoOrder, submitOrderCallback) => {
  const { total_quantity, parameters, start_time, end_time, id: algo_order_id } = algoOrder;
  const { sliceInterval } = parameters;
  
  const totalDurationMs = new Date(end_time).getTime() - new Date(start_time).getTime();
  const sliceIntervalMs = parseDuration(sliceInterval);
  const totalSlices = Math.floor(totalDurationMs / sliceIntervalMs);
  const sliceQuantity = total_quantity / totalSlices;
  
  let slicesExecuted = 0;
  let lastExecutionTime = 0;

  const executeNextSlice = async () => {
    const now = Date.now();

    // Check if the strategy duration has ended
    if (now >= new Date(end_time).getTime()) {
      return true; // Strategy is complete
    }

    // Check if it's time to execute the next slice
    if (now - lastExecutionTime < sliceIntervalMs) {
      return false; // Not time yet
    }

    // Update last execution time
    lastExecutionTime = now;

    const orderToSend = {
      symbol: algoOrder.symbol,
      side: algoOrder.side,
      quantity: sliceQuantity,
      orderType: 'market', // TWAP slices are typically market orders
      algo_order_id
    };

    submitOrderCallback(orderToSend);
    slicesExecuted++;

    // Check if all slices have been executed
    return slicesExecuted >= totalSlices;
  };

  return { executeNextSlice };
};

module.exports = {
  validate,
  createRunner,
  parseDuration
};
