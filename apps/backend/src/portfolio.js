const express = require('express');
const db = require('./db');
const { authenticateToken, requireKYC } = require('./middleware');

const router = express.Router();

// Get user's portfolios
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, 
             COALESCE(SUM(ph.current_value), 0) as total_value,
             COALESCE(SUM(ph.unrealized_pnl), 0) as total_pnl
      FROM portfolios p
      LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      WHERE p.user_id = $1 AND p.is_active = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ message: 'Error fetching portfolios' });
  }
});

// Get specific portfolio with holdings
router.get('/:portfolioId', authenticateToken, async (req, res) => {
  const { portfolioId } = req.params;

  try {
    // Get portfolio details
    const portfolioResult = await db.query(`
      SELECT p.*, 
             COALESCE(SUM(ph.current_value), 0) as total_value,
             COALESCE(SUM(ph.unrealized_pnl), 0) as total_pnl
      FROM portfolios p
      LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      WHERE p.id = $1 AND p.user_id = $2 AND p.is_active = true
      GROUP BY p.id
    `, [portfolioId, req.user.userId]);

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    // Get portfolio holdings
    const holdingsResult = await db.query(`
      SELECT ph.*, s.symbol, s.name, s.type, s.exchange, s.sector, s.industry,
             md.price as current_price,
             md.change_amount, md.change_percentage
      FROM portfolio_holdings ph
      JOIN securities s ON ph.security_id = s.id
      LEFT JOIN LATERAL (
        SELECT price, change_amount, change_percentage
        FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE ph.portfolio_id = $1
      ORDER BY ph.current_value DESC
    `, [portfolioId]);

    const portfolio = portfolioResult.rows[0];
    portfolio.holdings = holdingsResult.rows;

    res.json(portfolio);
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ message: 'Error fetching portfolio' });
  }
});

// Create new portfolio
router.post('/', authenticateToken, async (req, res) => {
  const { name, description, strategy, riskLevel, targetReturn, rebalanceFrequency } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'Portfolio name is required and must be at least 2 characters' });
  }

  try {
    const result = await db.query(`
      INSERT INTO portfolios (user_id, name, description, strategy, risk_level, target_return, rebalance_frequency)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.userId, name, description, strategy, riskLevel, targetReturn, rebalanceFrequency]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ message: 'Error creating portfolio' });
  }
});

// Update portfolio
router.put('/:portfolioId', authenticateToken, async (req, res) => {
  const { portfolioId } = req.params;
  const { name, description, strategy, riskLevel, targetReturn, rebalanceFrequency } = req.body;

  try {
    const result = await db.query(`
      UPDATE portfolios 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          strategy = COALESCE($3, strategy),
          risk_level = COALESCE($4, risk_level),
          target_return = COALESCE($5, target_return),
          rebalance_frequency = COALESCE($6, rebalance_frequency),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8 AND is_active = true
      RETURNING *
    `, [name, description, strategy, riskLevel, targetReturn, rebalanceFrequency, portfolioId, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ message: 'Error updating portfolio' });
  }
});

// Delete portfolio
router.delete('/:portfolioId', authenticateToken, async (req, res) => {
  const { portfolioId } = req.params;

  try {
    // Check if portfolio has any holdings
    const holdingsResult = await db.query(`
      SELECT COUNT(*) as count FROM portfolio_holdings WHERE portfolio_id = $1
    `, [portfolioId]);

    if (parseInt(holdingsResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete portfolio with holdings. Please sell all positions first.' 
      });
    }

    const result = await db.query(`
      UPDATE portfolios 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [portfolioId, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ message: 'Error deleting portfolio' });
  }
});

// Get portfolio performance
router.get('/:portfolioId/performance', authenticateToken, async (req, res) => {
  const { portfolioId } = req.params;
  const { period = '1M' } = req.query; // 1D, 1W, 1M, 3M, 6M, 1Y, ALL

  try {
    // Verify portfolio ownership
    const portfolioCheck = await db.query(`
      SELECT id FROM portfolios WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [portfolioId, req.user.userId]);

    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    // Calculate performance based on period
    let dateFilter = '';
    switch (period) {
      case '1D':
        dateFilter = "AND t.executed_at >= NOW() - INTERVAL '1 day'";
        break;
      case '1W':
        dateFilter = "AND t.executed_at >= NOW() - INTERVAL '1 week'";
        break;
      case '1M':
        dateFilter = "AND t.executed_at >= NOW() - INTERVAL '1 month'";
        break;
      case '3M':
        dateFilter = "AND t.executed_at >= NOW() - INTERVAL '3 months'";
        break;
      case '6M':
        dateFilter = "AND t.executed_at >= NOW() - INTERVAL '6 months'";
        break;
      case '1Y':
        dateFilter = "AND t.executed_at >= NOW() - INTERVAL '1 year'";
        break;
      default:
        dateFilter = '';
    }

    // Get realized P&L from trades
    const realizedPnLResult = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN t.side = 'sell' THEN t.net_amount ELSE -t.net_amount END), 0) as realized_pnl,
        COUNT(*) as trade_count
      FROM trades t
      JOIN orders o ON t.order_id = o.id
      WHERE o.portfolio_id = $1 ${dateFilter}
    `, [portfolioId]);

    // Get current portfolio value and unrealized P&L
    const currentValueResult = await db.query(`
      SELECT 
        COALESCE(SUM(ph.current_value), 0) as current_value,
        COALESCE(SUM(ph.unrealized_pnl), 0) as unrealized_pnl
      FROM portfolio_holdings ph
      WHERE ph.portfolio_id = $1
    `, [portfolioId]);

    const performance = {
      period,
      realizedPnL: parseFloat(realizedPnLResult.rows[0].realized_pnl),
      unrealizedPnL: parseFloat(currentValueResult.rows[0].unrealized_pnl),
      totalPnL: parseFloat(realizedPnLResult.rows[0].realized_pnl) + parseFloat(currentValueResult.rows[0].unrealized_pnl),
      currentValue: parseFloat(currentValueResult.rows[0].current_value),
      tradeCount: parseInt(realizedPnLResult.rows[0].trade_count)
    };

    res.json(performance);
  } catch (error) {
    console.error('Get portfolio performance error:', error);
    res.status(500).json({ message: 'Error fetching portfolio performance' });
  }
});

// Get portfolio allocation by sector
router.get('/:portfolioId/allocation', authenticateToken, async (req, res) => {
  const { portfolioId } = req.params;

  try {
    const result = await db.query(`
      SELECT 
        s.sector,
        COUNT(*) as holding_count,
        SUM(ph.quantity) as total_quantity,
        SUM(ph.current_value) as total_value,
        ROUND(SUM(ph.current_value) / NULLIF(SUM(SUM(ph.current_value)) OVER(), 0) * 100, 2) as percentage
      FROM portfolio_holdings ph
      JOIN securities s ON ph.security_id = s.id
      WHERE ph.portfolio_id = $1
      GROUP BY s.sector
      ORDER BY total_value DESC
    `, [portfolioId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get portfolio allocation error:', error);
    res.status(500).json({ message: 'Error fetching portfolio allocation' });
  }
});

module.exports = router;


