const express = require('express');
const db = require('./db');
const { authenticateToken, requireKYC } = require('./middleware');

const router = express.Router();

// Get user's orders
router.get('/orders', authenticateToken, async (req, res) => {
  const { status, portfolioId, limit = 50, offset = 0 } = req.query;

  try {
    let whereClause = 'WHERE o.user_id = $1';
    const params = [req.user.userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    if (portfolioId) {
      paramCount++;
      whereClause += ` AND o.portfolio_id = $${paramCount}`;
      params.push(portfolioId);
    }

    const result = await db.query(`
      SELECT o.*, s.symbol, s.name, s.type, s.exchange,
             p.name as portfolio_name
      FROM orders o
      JOIN securities s ON o.security_id = s.id
      LEFT JOIN portfolios p ON o.portfolio_id = p.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get specific order
router.get('/orders/:orderId', authenticateToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await db.query(`
      SELECT o.*, s.symbol, s.name, s.type, s.exchange,
             p.name as portfolio_name
      FROM orders o
      JOIN securities s ON o.security_id = s.id
      LEFT JOIN portfolios p ON o.portfolio_id = p.id
      WHERE o.id = $1 AND o.user_id = $2
    `, [orderId, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// Create new order
router.post('/orders', authenticateToken, requireKYC, async (req, res) => {
  const {
    portfolioId,
    securityId,
    orderType,
    side,
    quantity,
    price,
    stopPrice,
    timeInForce = 'GTC',
    expiresAt
  } = req.body;

  // Validation
  if (!portfolioId || !securityId || !orderType || !side || !quantity) {
    return res.status(400).json({ 
      message: 'Portfolio ID, security ID, order type, side, and quantity are required' 
    });
  }

  if (!['buy', 'sell'].includes(side)) {
    return res.status(400).json({ message: 'Side must be either "buy" or "sell"' });
  }

  if (!['market', 'limit', 'stop', 'stop_limit'].includes(orderType)) {
    return res.status(400).json({ 
      message: 'Order type must be market, limit, stop, or stop_limit' 
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be greater than 0' });
  }

  if ((orderType === 'limit' || orderType === 'stop_limit') && !price) {
    return res.status(400).json({ message: 'Price is required for limit orders' });
  }

  if ((orderType === 'stop' || orderType === 'stop_limit') && !stopPrice) {
    return res.status(400).json({ message: 'Stop price is required for stop orders' });
  }

  try {
    // Verify portfolio ownership
    const portfolioCheck = await db.query(`
      SELECT id FROM portfolios WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [portfolioId, req.user.userId]);

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    // Verify security exists
    const securityCheck = await db.query(`
      SELECT id, symbol, name FROM securities WHERE id = $1 AND is_active = true
    `, [securityId]);

    if (securityCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Security not found' });
    }

    // For sell orders, check if user has enough shares
    if (side === 'sell') {
      const holdingsResult = await db.query(`
        SELECT COALESCE(SUM(quantity), 0) as total_quantity
        FROM portfolio_holdings
        WHERE portfolio_id = $1 AND security_id = $2
      `, [portfolioId, securityId]);

      const totalQuantity = parseFloat(holdingsResult.rows[0].total_quantity);
      if (totalQuantity < quantity) {
        return res.status(400).json({ 
          message: `Insufficient shares. You have ${totalQuantity} shares available.` 
        });
      }
    }

    // For buy orders, check account balance (simplified check)
    if (side === 'buy') {
      const accountResult = await db.query(`
        SELECT a.balance, a.available_balance
        FROM accounts a
        JOIN portfolios p ON a.user_id = p.user_id
        WHERE p.id = $1 AND a.account_type_id = 1
      `, [portfolioId]);

      if (accountResult.rows.length > 0) {
        const availableBalance = parseFloat(accountResult.rows[0].available_balance);
        const estimatedCost = quantity * (price || 0); // Use price if available, otherwise 0 for market orders
        
        if (estimatedCost > availableBalance) {
          return res.status(400).json({ 
            message: 'Insufficient funds for this order' 
          });
        }
      }
    }

    // Create order
    const result = await db.query(`
      INSERT INTO orders (
        user_id, portfolio_id, security_id, order_type, side, quantity, 
        price, stop_price, time_in_force, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [req.user.userId, portfolioId, securityId, orderType, side, quantity, 
        price, stopPrice, timeInForce, expiresAt]);

    const order = result.rows[0];

    // For market orders, attempt immediate execution
    if (orderType === 'market') {
      await executeMarketOrder(order.id);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Cancel order
router.put('/orders/:orderId/cancel', authenticateToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await db.query(`
      UPDATE orders 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'partially_filled')
      RETURNING *
    `, [orderId, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Order not found or cannot be cancelled' 
      });
    }

    res.json({ message: 'Order cancelled successfully', order: result.rows[0] });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Error cancelling order' });
  }
});

// Get user's trades
router.get('/trades', authenticateToken, async (req, res) => {
  const { portfolioId, securityId, limit = 50, offset = 0 } = req.query;

  try {
    let whereClause = 'WHERE t.user_id = $1';
    const params = [req.user.userId];
    let paramCount = 1;

    if (portfolioId) {
      paramCount++;
      whereClause += ` AND o.portfolio_id = $${paramCount}`;
      params.push(portfolioId);
    }

    if (securityId) {
      paramCount++;
      whereClause += ` AND t.security_id = $${paramCount}`;
      params.push(securityId);
    }

    const result = await db.query(`
      SELECT t.*, s.symbol, s.name, s.type, s.exchange,
             p.name as portfolio_name
      FROM trades t
      JOIN securities s ON t.security_id = s.id
      JOIN orders o ON t.order_id = o.id
      LEFT JOIN portfolios p ON o.portfolio_id = p.id
      ${whereClause}
      ORDER BY t.executed_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ message: 'Error fetching trades' });
  }
});

// Get market data for a security
router.get('/market-data/:securityId', authenticateToken, async (req, res) => {
  const { securityId } = req.params;
  const { period = '1D' } = req.query; // 1D, 1W, 1M, 3M, 6M, 1Y

  try {
    // Verify security exists
    const securityCheck = await db.query(`
      SELECT id, symbol, name, type, exchange FROM securities WHERE id = $1 AND is_active = true
    `, [securityId]);

    if (securityCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Security not found' });
    }

    // Get current price
    const currentPriceResult = await db.query(`
      SELECT price, volume, open_price, high_price, low_price, 
             previous_close, change_amount, change_percentage, timestamp
      FROM market_data
      WHERE security_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [securityId]);

    // Get historical data based on period
    let dateFilter = '';
    switch (period) {
      case '1D':
        dateFilter = "AND timestamp >= NOW() - INTERVAL '1 day'";
        break;
      case '1W':
        dateFilter = "AND timestamp >= NOW() - INTERVAL '1 week'";
        break;
      case '1M':
        dateFilter = "AND timestamp >= NOW() - INTERVAL '1 month'";
        break;
      case '3M':
        dateFilter = "AND timestamp >= NOW() - INTERVAL '3 months'";
        break;
      case '6M':
        dateFilter = "AND timestamp >= NOW() - INTERVAL '6 months'";
        break;
      case '1Y':
        dateFilter = "AND timestamp >= NOW() - INTERVAL '1 year'";
        break;
    }

    const historicalResult = await db.query(`
      SELECT price, volume, timestamp
      FROM market_data
      WHERE security_id = $1 ${dateFilter}
      ORDER BY timestamp ASC
    `, [securityId]);

    const response = {
      security: securityCheck.rows[0],
      current: currentPriceResult.rows[0] || null,
      historical: historicalResult.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Get market data error:', error);
    res.status(500).json({ message: 'Error fetching market data' });
  }
});

// Search securities
router.get('/securities/search', authenticateToken, async (req, res) => {
  const { q, type, limit = 20 } = req.query;

  if (!q || q.trim().length < 1) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    let whereClause = 'WHERE (s.symbol ILIKE $1 OR s.name ILIKE $1) AND s.is_active = true';
    const params = [`%${q}%`];
    let paramCount = 1;

    if (type) {
      paramCount++;
      whereClause += ` AND s.type = $${paramCount}`;
      params.push(type);
    }

    const result = await db.query(`
      SELECT s.*, md.price as current_price, md.change_amount, md.change_percentage
      FROM securities s
      LEFT JOIN LATERAL (
        SELECT price, change_amount, change_percentage
        FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      ${whereClause}
      ORDER BY s.symbol
      LIMIT $${paramCount + 1}
    `, [...params, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Search securities error:', error);
    res.status(500).json({ message: 'Error searching securities' });
  }
});

// Helper function to execute market orders
async function executeMarketOrder(orderId) {
  try {
    // Get order details
    const orderResult = await db.query(`
      SELECT o.*, s.symbol, s.name
      FROM orders o
      JOIN securities s ON o.security_id = s.id
      WHERE o.id = $1 AND o.status = 'pending'
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return;
    }

    const order = orderResult.rows[0];

    // Get current market price (simplified - in real implementation, this would come from market data feed)
    const marketDataResult = await db.query(`
      SELECT price FROM market_data
      WHERE security_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [order.security_id]);

    if (marketDataResult.rows.length === 0) {
      await db.query(`
        UPDATE orders SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [orderId]);
      return;
    }

    const marketPrice = parseFloat(marketDataResult.rows[0].price);
    const commission = 0.99; // Fixed commission for now
    const netAmount = order.quantity * marketPrice;

    // Execute the trade
    await db.query('BEGIN');

    // Create trade record
    const tradeResult = await db.query(`
      INSERT INTO trades (order_id, user_id, security_id, quantity, price, side, commission, net_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [orderId, order.user_id, order.security_id, order.quantity, marketPrice, 
        order.side, commission, netAmount]);

    // Update order status
    await db.query(`
      UPDATE orders 
      SET status = 'filled', filled_quantity = $1, average_fill_price = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [order.quantity, marketPrice, orderId]);

    // Update portfolio holdings
    if (order.side === 'buy') {
      await db.query(`
        INSERT INTO portfolio_holdings (portfolio_id, security_id, quantity, average_cost)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (portfolio_id, security_id)
        DO UPDATE SET 
          quantity = portfolio_holdings.quantity + $3,
          average_cost = (portfolio_holdings.quantity * portfolio_holdings.average_cost + $3 * $4) / (portfolio_holdings.quantity + $3),
          updated_at = CURRENT_TIMESTAMP
      `, [order.portfolio_id, order.security_id, order.quantity, marketPrice]);
    } else {
      await db.query(`
        UPDATE portfolio_holdings 
        SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
        WHERE portfolio_id = $2 AND security_id = $3
      `, [order.quantity, order.portfolio_id, order.security_id]);
    }

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Execute market order error:', error);
  }
}

module.exports = router;


