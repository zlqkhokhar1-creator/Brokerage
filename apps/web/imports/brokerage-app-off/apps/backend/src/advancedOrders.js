const express = require('express');
const db = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// Place advanced order
router.post('/place', authenticateToken, async (req, res) => {
  const {
    securityId,
    orderType,
    side,
    quantity,
    price,
    stopPrice,
    limitPrice,
    timeInForce = 'GTC',
    expiresAt,
    isPublic = false,
    conditions = {}
  } = req.body;

  try {
    // Validate order type
    const validOrderTypes = [
      'market', 'limit', 'stop', 'stop_limit', 'trailing_stop',
      'bracket', 'one_cancels_other', 'iceberg', 'twap', 'vwap'
    ];

    if (!validOrderTypes.includes(orderType)) {
      return res.status(400).json({ 
        message: 'Invalid order type',
        validTypes: validOrderTypes
      });
    }

    // Get security details
    const securityResult = await db.query(`
      SELECT * FROM securities WHERE id = $1 AND is_active = true
    `, [securityId]);

    if (securityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Security not found' });
    }

    const security = securityResult.rows[0];

    // Get current market price
    const priceResult = await db.query(`
      SELECT price FROM market_data 
      WHERE security_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [securityId]);

    const currentPrice = priceResult.rows[0]?.price || 0;

    // Validate order based on type
    const validation = validateAdvancedOrder({
      orderType,
      side,
      quantity,
      price,
      stopPrice,
      limitPrice,
      currentPrice,
      conditions
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        message: validation.message,
        errors: validation.errors
      });
    }

    // Create the order
    const orderResult = await db.query(`
      INSERT INTO orders (
        user_id, security_id, order_type, side, quantity, price, 
        stop_price, limit_price, status, time_in_force, expires_at,
        is_public, conditions, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, NOW())
      RETURNING *
    `, [
      req.user.userId,
      securityId,
      orderType,
      side,
      quantity,
      price,
      stopPrice,
      limitPrice,
      timeInForce,
      expiresAt,
      isPublic,
      JSON.stringify(conditions)
    ]);

    // Process the order based on type
    const processedOrder = await processAdvancedOrder(orderResult.rows[0], currentPrice);

    res.json({
      message: 'Advanced order placed successfully',
      order: processedOrder
    });
  } catch (error) {
    console.error('Place advanced order error:', error);
    res.status(500).json({ message: 'Error placing advanced order' });
  }
});

// Validate advanced order
function validateAdvancedOrder({ orderType, side, quantity, price, stopPrice, limitPrice, currentPrice, conditions }) {
  const errors = [];

  // Basic validation
  if (!quantity || quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (!side || !['buy', 'sell'].includes(side)) {
    errors.push('Side must be buy or sell');
  }

  // Order type specific validation
  switch (orderType) {
    case 'market':
      // Market orders don't need price validation
      break;

    case 'limit':
      if (!price || price <= 0) {
        errors.push('Limit price is required and must be greater than 0');
      }
      break;

    case 'stop':
      if (!stopPrice || stopPrice <= 0) {
        errors.push('Stop price is required and must be greater than 0');
      }
      break;

    case 'stop_limit':
      if (!stopPrice || stopPrice <= 0) {
        errors.push('Stop price is required and must be greater than 0');
      }
      if (!limitPrice || limitPrice <= 0) {
        errors.push('Limit price is required and must be greater than 0');
      }
      if (stopPrice && limitPrice) {
        if (side === 'buy' && stopPrice > limitPrice) {
          errors.push('For buy stop-limit orders, stop price should be less than or equal to limit price');
        }
        if (side === 'sell' && stopPrice < limitPrice) {
          errors.push('For sell stop-limit orders, stop price should be greater than or equal to limit price');
        }
      }
      break;

    case 'trailing_stop':
      if (!stopPrice || stopPrice <= 0) {
        errors.push('Stop price is required and must be greater than 0');
      }
      if (!conditions.trailAmount || conditions.trailAmount <= 0) {
        errors.push('Trail amount is required for trailing stop orders');
      }
      break;

    case 'bracket':
      if (!price || price <= 0) {
        errors.push('Entry price is required for bracket orders');
      }
      if (!conditions.takeProfitPrice || conditions.takeProfitPrice <= 0) {
        errors.push('Take profit price is required for bracket orders');
      }
      if (!conditions.stopLossPrice || conditions.stopLossPrice <= 0) {
        errors.push('Stop loss price is required for bracket orders');
      }
      break;

    case 'iceberg':
      if (!price || price <= 0) {
        errors.push('Price is required for iceberg orders');
      }
      if (!conditions.displaySize || conditions.displaySize <= 0) {
        errors.push('Display size is required for iceberg orders');
      }
      if (conditions.displaySize >= quantity) {
        errors.push('Display size must be less than total quantity');
      }
      break;

    case 'twap':
    case 'vwap':
      if (!conditions.duration || conditions.duration <= 0) {
        errors.push('Duration is required for TWAP/VWAP orders');
      }
      if (!conditions.startTime || !conditions.endTime) {
        errors.push('Start and end times are required for TWAP/VWAP orders');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? 'Order validation failed' : 'Order is valid',
    errors
  };
}

// Process advanced order
async function processAdvancedOrder(order, currentPrice) {
  switch (order.order_type) {
    case 'market':
      return await processMarketOrder(order, currentPrice);
    
    case 'limit':
      return await processLimitOrder(order, currentPrice);
    
    case 'stop':
      return await processStopOrder(order, currentPrice);
    
    case 'stop_limit':
      return await processStopLimitOrder(order, currentPrice);
    
    case 'trailing_stop':
      return await processTrailingStopOrder(order, currentPrice);
    
    case 'bracket':
      return await processBracketOrder(order, currentPrice);
    
    case 'iceberg':
      return await processIcebergOrder(order, currentPrice);
    
    case 'twap':
    case 'vwap':
      return await processAlgorithmicOrder(order, currentPrice);
    
    default:
      return order;
  }
}

// Process market order
async function processMarketOrder(order, currentPrice) {
  // Market orders execute immediately at current price
  const executionPrice = currentPrice;
  
  // Create trade record
  const tradeResult = await db.query(`
    INSERT INTO trades (
      order_id, user_id, security_id, quantity, price, side, 
      commission, fees, net_amount, executed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *
  `, [
    order.id,
    order.user_id,
    order.security_id,
    order.quantity,
    executionPrice,
    order.side,
    calculateCommission(order.quantity, executionPrice),
    0,
    order.quantity * executionPrice - calculateCommission(order.quantity, executionPrice)
  ]);

  // Update order status
  await db.query(`
    UPDATE orders 
    SET status = 'filled', filled_quantity = $1, average_fill_price = $2
    WHERE id = $3
  `, [order.quantity, executionPrice, order.id]);

  return { ...order, status: 'filled', trade: tradeResult.rows[0] };
}

// Process limit order
async function processLimitOrder(order, currentPrice) {
  // Check if limit order can be filled
  const canFill = order.side === 'buy' 
    ? currentPrice <= order.price 
    : currentPrice >= order.price;

  if (canFill) {
    return await processMarketOrder(order, order.price);
  } else {
    // Order remains pending
    return order;
  }
}

// Process stop order
async function processStopOrder(order, currentPrice) {
  // Check if stop price has been triggered
  const stopTriggered = order.side === 'buy'
    ? currentPrice >= order.stop_price
    : currentPrice <= order.stop_price;

  if (stopTriggered) {
    // Convert to market order
    return await processMarketOrder(order, currentPrice);
  } else {
    // Order remains pending
    return order;
  }
}

// Process stop-limit order
async function processStopLimitOrder(order, currentPrice) {
  // Check if stop price has been triggered
  const stopTriggered = order.side === 'buy'
    ? currentPrice >= order.stop_price
    : currentPrice <= order.stop_price;

  if (stopTriggered) {
    // Convert to limit order
    return await processLimitOrder({ ...order, price: order.limit_price }, currentPrice);
  } else {
    // Order remains pending
    return order;
  }
}

// Process trailing stop order
async function processTrailingStopOrder(order, currentPrice) {
  const conditions = JSON.parse(order.conditions || '{}');
  const trailAmount = conditions.trailAmount || 0;
  
  // Update trailing stop price based on current price
  let newStopPrice = order.stop_price;
  
  if (order.side === 'buy') {
    // For buy orders, trail up
    if (currentPrice > order.stop_price + trailAmount) {
      newStopPrice = currentPrice - trailAmount;
    }
  } else {
    // For sell orders, trail down
    if (currentPrice < order.stop_price - trailAmount) {
      newStopPrice = currentPrice + trailAmount;
    }
  }

  // Update stop price if changed
  if (newStopPrice !== order.stop_price) {
    await db.query(`
      UPDATE orders SET stop_price = $1 WHERE id = $2
    `, [newStopPrice, order.id]);
  }

  // Check if stop has been triggered
  const stopTriggered = order.side === 'buy'
    ? currentPrice >= newStopPrice
    : currentPrice <= newStopPrice;

  if (stopTriggered) {
    return await processMarketOrder(order, currentPrice);
  } else {
    return { ...order, stop_price: newStopPrice };
  }
}

// Process bracket order
async function processBracketOrder(order, currentPrice) {
  const conditions = JSON.parse(order.conditions || '{}');
  
  // First, execute the main order
  const mainOrder = await processMarketOrder(order, currentPrice);
  
  if (mainOrder.status === 'filled') {
    // Create take profit order
    const takeProfitOrder = await db.query(`
      INSERT INTO orders (
        user_id, security_id, order_type, side, quantity, price,
        status, time_in_force, parent_order_id, created_at
      ) VALUES ($1, $2, 'limit', $3, $4, $5, 'pending', 'GTC', $6, NOW())
      RETURNING *
    `, [
      order.user_id,
      order.security_id,
      order.side === 'buy' ? 'sell' : 'buy',
      order.quantity,
      conditions.takeProfitPrice,
      order.id
    ]);

    // Create stop loss order
    const stopLossOrder = await db.query(`
      INSERT INTO orders (
        user_id, security_id, order_type, side, quantity, stop_price,
        status, time_in_force, parent_order_id, created_at
      ) VALUES ($1, $2, 'stop', $3, $4, $5, 'pending', 'GTC', $6, NOW())
      RETURNING *
    `, [
      order.user_id,
      order.security_id,
      order.side === 'buy' ? 'sell' : 'buy',
      order.quantity,
      conditions.stopLossPrice,
      order.id
    ]);

    return {
      ...mainOrder,
      childOrders: {
        takeProfit: takeProfitOrder.rows[0],
        stopLoss: stopLossOrder.rows[0]
      }
    };
  }

  return mainOrder;
}

// Process iceberg order
async function processIcebergOrder(order, currentPrice) {
  const conditions = JSON.parse(order.conditions || '{}');
  const displaySize = conditions.displaySize || order.quantity;
  const remainingQuantity = order.quantity - (order.filled_quantity || 0);

  if (remainingQuantity <= 0) {
    // Order is fully filled
    await db.query(`
      UPDATE orders SET status = 'filled' WHERE id = $1
    `, [order.id]);
    return { ...order, status: 'filled' };
  }

  // Execute display size or remaining quantity, whichever is smaller
  const executeQuantity = Math.min(displaySize, remainingQuantity);
  
  // Check if limit price is met
  const canFill = order.side === 'buy' 
    ? currentPrice <= order.price 
    : currentPrice >= order.price;

  if (canFill) {
    // Execute partial fill
    const tradeResult = await db.query(`
      INSERT INTO trades (
        order_id, user_id, security_id, quantity, price, side,
        commission, fees, net_amount, executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      order.id,
      order.user_id,
      order.security_id,
      executeQuantity,
      order.price,
      order.side,
      calculateCommission(executeQuantity, order.price),
      0,
      executeQuantity * order.price - calculateCommission(executeQuantity, order.price)
    ]);

    // Update order
    const newFilledQuantity = (order.filled_quantity || 0) + executeQuantity;
    const newStatus = newFilledQuantity >= order.quantity ? 'filled' : 'partially_filled';
    
    await db.query(`
      UPDATE orders 
      SET status = $1, filled_quantity = $2, average_fill_price = $3
      WHERE id = $4
    `, [newStatus, newFilledQuantity, order.price, order.id]);

    return { ...order, status: newStatus, filled_quantity: newFilledQuantity, trade: tradeResult.rows[0] };
  }

  return order;
}

// Process algorithmic orders (TWAP/VWAP)
async function processAlgorithmicOrder(order, currentPrice) {
  const conditions = JSON.parse(order.conditions || '{}');
  const startTime = new Date(conditions.startTime);
  const endTime = new Date(conditions.endTime);
  const now = new Date();

  if (now < startTime) {
    // Order not yet active
    return order;
  }

  if (now > endTime) {
    // Order expired
    await db.query(`
      UPDATE orders SET status = 'expired' WHERE id = $1
    `, [order.id]);
    return { ...order, status: 'expired' };
  }

  // Calculate time-based execution
  const totalDuration = endTime - startTime;
  const elapsed = now - startTime;
  const progress = Math.min(elapsed / totalDuration, 1);

  const targetQuantity = Math.floor(order.quantity * progress);
  const remainingQuantity = order.quantity - (order.filled_quantity || 0);
  const executeQuantity = Math.min(targetQuantity - (order.filled_quantity || 0), remainingQuantity);

  if (executeQuantity > 0) {
    // Execute partial quantity
    const tradeResult = await db.query(`
      INSERT INTO trades (
        order_id, user_id, security_id, quantity, price, side,
        commission, fees, net_amount, executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      order.id,
      order.user_id,
      order.security_id,
      executeQuantity,
      currentPrice,
      order.side,
      calculateCommission(executeQuantity, currentPrice),
      0,
      executeQuantity * currentPrice - calculateCommission(executeQuantity, currentPrice)
    ]);

    // Update order
    const newFilledQuantity = (order.filled_quantity || 0) + executeQuantity;
    const newStatus = newFilledQuantity >= order.quantity ? 'filled' : 'partially_filled';
    
    await db.query(`
      UPDATE orders 
      SET status = $1, filled_quantity = $2, average_fill_price = $3
      WHERE id = $4
    `, [newStatus, newFilledQuantity, currentPrice, order.id]);

    return { ...order, status: newStatus, filled_quantity: newFilledQuantity, trade: tradeResult.rows[0] };
  }

  return order;
}

// Calculate commission
function calculateCommission(quantity, price) {
  const notional = quantity * price;
  return Math.max(0.99, notional * 0.001); // $0.99 minimum or 0.1%
}

// Get advanced order types
router.get('/types', authenticateToken, (req, res) => {
  const orderTypes = {
    market: {
      name: 'Market Order',
      description: 'Execute immediately at current market price',
      parameters: ['quantity', 'side'],
      risk: 'low',
      execution: 'immediate'
    },
    limit: {
      name: 'Limit Order',
      description: 'Execute only at specified price or better',
      parameters: ['quantity', 'side', 'price'],
      risk: 'low',
      execution: 'conditional'
    },
    stop: {
      name: 'Stop Order',
      description: 'Convert to market order when stop price is reached',
      parameters: ['quantity', 'side', 'stopPrice'],
      risk: 'medium',
      execution: 'conditional'
    },
    stop_limit: {
      name: 'Stop-Limit Order',
      description: 'Convert to limit order when stop price is reached',
      parameters: ['quantity', 'side', 'stopPrice', 'limitPrice'],
      risk: 'medium',
      execution: 'conditional'
    },
    trailing_stop: {
      name: 'Trailing Stop',
      description: 'Stop order that follows favorable price movement',
      parameters: ['quantity', 'side', 'stopPrice', 'trailAmount'],
      risk: 'medium',
      execution: 'conditional'
    },
    bracket: {
      name: 'Bracket Order',
      description: 'Entry order with automatic take profit and stop loss',
      parameters: ['quantity', 'side', 'price', 'takeProfitPrice', 'stopLossPrice'],
      risk: 'low',
      execution: 'conditional'
    },
    iceberg: {
      name: 'Iceberg Order',
      description: 'Large order hidden by showing only small portion',
      parameters: ['quantity', 'side', 'price', 'displaySize'],
      risk: 'low',
      execution: 'partial'
    },
    twap: {
      name: 'TWAP Order',
      description: 'Time-Weighted Average Price execution',
      parameters: ['quantity', 'side', 'startTime', 'endTime'],
      risk: 'medium',
      execution: 'algorithmic'
    },
    vwap: {
      name: 'VWAP Order',
      description: 'Volume-Weighted Average Price execution',
      parameters: ['quantity', 'side', 'startTime', 'endTime'],
      risk: 'medium',
      execution: 'algorithmic'
    }
  };

  res.json(orderTypes);
});

// Get user's advanced orders
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const { status, orderType, limit = 50, offset = 0 } = req.query;

    let whereClause = 'WHERE o.user_id = $1';
    const params = [req.user.userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    if (orderType) {
      paramCount++;
      whereClause += ` AND o.order_type = $${paramCount}`;
      params.push(orderType);
    }

    const result = await db.query(`
      SELECT 
        o.*, s.symbol, s.name as security_name,
        COUNT(t.id) as trade_count
      FROM orders o
      JOIN securities s ON o.security_id = s.id
      LEFT JOIN trades t ON o.id = t.order_id
      ${whereClause}
      GROUP BY o.id, s.symbol, s.name
      ORDER BY o.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get advanced orders error:', error);
    res.status(500).json({ message: 'Error fetching advanced orders' });
  }
});

// Cancel advanced order
router.delete('/:orderId', authenticateToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await db.query(`
      UPDATE orders 
      SET status = 'cancelled' 
      WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'partially_filled')
      RETURNING *
    `, [orderId, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found or cannot be cancelled' });
    }

    res.json({ message: 'Order cancelled successfully', order: result.rows[0] });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Error cancelling order' });
  }
});

module.exports = router;


