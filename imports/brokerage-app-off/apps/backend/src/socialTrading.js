const express = require('express');
const db = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// Get all traders (public profiles)
router.get('/traders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'performance', riskLevel } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE u.is_active = true AND u.kyc_status = \'approved\'';
    const params = [];
    let paramCount = 0;

    if (riskLevel) {
      paramCount++;
      whereClause += ` AND u.risk_profile = $${paramCount}`;
      params.push(riskLevel);
    }

    // Get trader profiles with performance metrics
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.risk_profile,
        u.created_at as member_since,
        COUNT(DISTINCT p.id) as portfolio_count,
        AVG(ph.quantity * md.price) as avg_portfolio_value,
        COUNT(DISTINCT f.follower_id) as followers_count,
        COUNT(DISTINCT f2.following_id) as following_count
      FROM users u
      LEFT JOIN portfolios p ON u.id = p.user_id AND p.is_active = true
      LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      LEFT JOIN LATERAL (
        SELECT price FROM market_data 
        WHERE security_id = ph.security_id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      LEFT JOIN follows f ON u.id = f.following_id
      LEFT JOIN follows f2 ON u.id = f2.follower_id
      ${whereClause}
      GROUP BY u.id, u.first_name, u.last_name, u.risk_profile, u.created_at
      ORDER BY ${getSortClause(sortBy)}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get performance data for each trader
    const tradersWithPerformance = await Promise.all(
      result.rows.map(async (trader) => {
        const performance = await getTraderPerformance(trader.id);
        return {
          ...trader,
          performance
        };
      })
    );

    res.json({
      traders: tradersWithPerformance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get traders error:', error);
    res.status(500).json({ message: 'Error fetching traders' });
  }
});

// Get trader performance metrics
async function getTraderPerformance(userId) {
  try {
    // Get portfolio performance over different time periods
    const performanceResult = await db.query(`
      SELECT 
        p.id, p.name,
        SUM(ph.quantity * ph.average_cost) as total_cost,
        SUM(ph.quantity * md.price) as current_value
      FROM portfolios p
      JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      JOIN LATERAL (
        SELECT price FROM market_data 
        WHERE security_id = ph.security_id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE p.user_id = $1 AND p.is_active = true
      GROUP BY p.id, p.name
    `, [userId]);

    let totalReturn = 0;
    let totalValue = 0;
    let totalCost = 0;

    performanceResult.rows.forEach(portfolio => {
      const portfolioReturn = portfolio.total_cost > 0 
        ? ((portfolio.current_value - portfolio.total_cost) / portfolio.total_cost) * 100 
        : 0;
      
      totalReturn += portfolioReturn * (portfolio.current_value / (totalValue + portfolio.current_value));
      totalValue += portfolio.current_value;
      totalCost += portfolio.total_cost;
    });

    // Get recent trades count
    const tradesResult = await db.query(`
      SELECT COUNT(*) as trade_count
      FROM trades t
      JOIN orders o ON t.order_id = o.id
      WHERE o.user_id = $1 AND t.created_at >= NOW() - INTERVAL '30 days'
    `, [userId]);

    return {
      totalReturn: totalReturn || 0,
      totalValue: totalValue || 0,
      totalCost: totalCost || 0,
      recentTrades: parseInt(tradesResult.rows[0].trade_count) || 0,
      riskScore: await calculateRiskScore(userId)
    };
  } catch (error) {
    console.error('Get trader performance error:', error);
    return {
      totalReturn: 0,
      totalValue: 0,
      totalCost: 0,
      recentTrades: 0,
      riskScore: 50
    };
  }
}

// Calculate trader risk score
async function calculateRiskScore(userId) {
  try {
    // Get portfolio volatility and concentration
    const portfolioResult = await db.query(`
      SELECT 
        COUNT(DISTINCT ph.security_id) as security_count,
        COUNT(DISTINCT s.sector) as sector_count,
        MAX(ph.quantity * md.price) as max_holding_value,
        SUM(ph.quantity * md.price) as total_value
      FROM portfolios p
      JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      JOIN securities s ON ph.security_id = s.id
      JOIN LATERAL (
        SELECT price FROM market_data 
        WHERE security_id = ph.security_id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE p.user_id = $1 AND p.is_active = true
    `, [userId]);

    if (portfolioResult.rows.length === 0) return 50;

    const { security_count, sector_count, max_holding_value, total_value } = portfolioResult.rows[0];
    
    let riskScore = 50; // Base score

    // Diversification score
    if (security_count < 5) riskScore += 20;
    if (sector_count < 3) riskScore += 15;

    // Concentration risk
    if (total_value > 0) {
      const maxConcentration = (max_holding_value / total_value) * 100;
      if (maxConcentration > 30) riskScore += 15;
      if (maxConcentration > 50) riskScore += 20;
    }

    return Math.min(100, Math.max(0, riskScore));
  } catch (error) {
    console.error('Calculate risk score error:', error);
    return 50;
  }
}

// Get sort clause for trader listing
function getSortClause(sortBy) {
  switch (sortBy) {
    case 'performance':
      return 'totalReturn DESC';
    case 'followers':
      return 'followers_count DESC';
    case 'newest':
      return 'member_since DESC';
    case 'risk':
      return 'risk_score ASC';
    default:
      return 'followers_count DESC';
  }
}

// Follow a trader
router.post('/follow/:traderId', authenticateToken, async (req, res) => {
  const { traderId } = req.params;

  if (traderId == req.user.userId) {
    return res.status(400).json({ message: 'Cannot follow yourself' });
  }

  try {
    // Check if already following
    const existingFollow = await db.query(`
      SELECT id FROM follows 
      WHERE follower_id = $1 AND following_id = $2
    `, [req.user.userId, traderId]);

    if (existingFollow.rows.length > 0) {
      return res.status(400).json({ message: 'Already following this trader' });
    }

    // Create follow relationship
    await db.query(`
      INSERT INTO follows (follower_id, following_id, created_at)
      VALUES ($1, $2, NOW())
    `, [req.user.userId, traderId]);

    res.json({ message: 'Successfully followed trader' });
  } catch (error) {
    console.error('Follow trader error:', error);
    res.status(500).json({ message: 'Error following trader' });
  }
});

// Unfollow a trader
router.delete('/follow/:traderId', authenticateToken, async (req, res) => {
  const { traderId } = req.params;

  try {
    const result = await db.query(`
      DELETE FROM follows 
      WHERE follower_id = $1 AND following_id = $2
    `, [req.user.userId, traderId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Not following this trader' });
    }

    res.json({ message: 'Successfully unfollowed trader' });
  } catch (error) {
    console.error('Unfollow trader error:', error);
    res.status(500).json({ message: 'Error unfollowing trader' });
  }
});

// Get trader's public trades
router.get('/traders/:traderId/trades', authenticateToken, async (req, res) => {
  const { traderId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Check if user is following this trader
    const followCheck = await db.query(`
      SELECT id FROM follows 
      WHERE follower_id = $1 AND following_id = $2
    `, [req.user.userId, traderId]);

    if (followCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Must follow trader to view their trades' });
    }

    // Get trader's public trades
    const result = await db.query(`
      SELECT 
        t.id, t.quantity, t.price, t.side, t.created_at,
        s.symbol, s.name as security_name,
        o.order_type, o.status as order_status
      FROM trades t
      JOIN orders o ON t.order_id = o.id
      JOIN securities s ON o.security_id = s.id
      WHERE o.user_id = $1 AND o.is_public = true
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [traderId, limit, offset]);

    res.json({
      trades: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get trader trades error:', error);
    res.status(500).json({ message: 'Error fetching trader trades' });
  }
});

// Get trader's portfolio summary
router.get('/traders/:traderId/portfolio', authenticateToken, async (req, res) => {
  const { traderId } = req.params;

  try {
    // Check if user is following this trader
    const followCheck = await db.query(`
      SELECT id FROM follows 
      WHERE follower_id = $1 AND following_id = $2
    `, [req.user.userId, traderId]);

    if (followCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Must follow trader to view their portfolio' });
    }

    // Get trader's public portfolio
    const result = await db.query(`
      SELECT 
        p.id, p.name, p.description, p.risk_level,
        ph.security_id, ph.quantity, ph.average_cost,
        s.symbol, s.name as security_name, s.type, s.sector,
        md.price as current_price
      FROM portfolios p
      JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      JOIN securities s ON ph.security_id = s.id
      LEFT JOIN LATERAL (
        SELECT price FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE p.user_id = $1 AND p.is_active = true AND p.is_public = true
      ORDER BY ph.quantity * md.price DESC
    `, [traderId]);

    // Calculate portfolio metrics
    const portfolioData = result.rows.reduce((acc, holding) => {
      if (!acc.holdings) acc.holdings = [];
      if (!acc.totalValue) acc.totalValue = 0;
      if (!acc.totalCost) acc.totalCost = 0;

      const currentValue = holding.quantity * (holding.current_price || 0);
      const costBasis = holding.quantity * holding.average_cost;

      acc.holdings.push({
        ...holding,
        currentValue,
        costBasis,
        pnl: currentValue - costBasis,
        pnlPercent: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0
      });

      acc.totalValue += currentValue;
      acc.totalCost += costBasis;

      return acc;
    }, {});

    const totalReturn = portfolioData.totalCost > 0 
      ? ((portfolioData.totalValue - portfolioData.totalCost) / portfolioData.totalCost) * 100 
      : 0;

    res.json({
      portfolio: {
        totalValue: portfolioData.totalValue,
        totalCost: portfolioData.totalCost,
        totalReturn,
        holdings: portfolioData.holdings
      }
    });
  } catch (error) {
    console.error('Get trader portfolio error:', error);
    res.status(500).json({ message: 'Error fetching trader portfolio' });
  }
});

// Copy a trader's trade
router.post('/copy-trade/:tradeId', authenticateToken, async (req, res) => {
  const { tradeId } = req.params;
  const { quantity, orderType = 'market' } = req.body;

  try {
    // Get the original trade
    const tradeResult = await db.query(`
      SELECT 
        t.*, o.security_id, o.side, o.user_id as original_trader_id,
        s.symbol, s.name as security_name
      FROM trades t
      JOIN orders o ON t.order_id = o.id
      JOIN securities s ON o.security_id = s.id
      WHERE t.id = $1 AND o.is_public = true
    `, [tradeId]);

    if (tradeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Trade not found or not public' });
    }

    const originalTrade = tradeResult.rows[0];

    // Check if user is following the original trader
    const followCheck = await db.query(`
      SELECT id FROM follows 
      WHERE follower_id = $1 AND following_id = $2
    `, [req.user.userId, originalTrade.original_trader_id]);

    if (followCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Must follow trader to copy their trades' });
    }

    // Get current market price
    const priceResult = await db.query(`
      SELECT price FROM market_data 
      WHERE security_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [originalTrade.security_id]);

    if (priceResult.rows.length === 0) {
      return res.status(400).json({ message: 'Current market price not available' });
    }

    const currentPrice = priceResult.rows[0].price;
    const tradeQuantity = quantity || Math.floor(originalTrade.quantity * 0.1); // Default to 10% of original

    // Create copy trade order
    const orderResult = await db.query(`
      INSERT INTO orders (
        user_id, security_id, order_type, side, quantity, price, 
        status, time_in_force, is_public, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'GTC', false, NOW())
      RETURNING *
    `, [
      req.user.userId,
      originalTrade.security_id,
      orderType,
      originalTrade.side,
      tradeQuantity,
      orderType === 'market' ? null : currentPrice
    ]);

    res.json({
      message: 'Copy trade order created successfully',
      order: orderResult.rows[0],
      originalTrade: {
        symbol: originalTrade.symbol,
        side: originalTrade.side,
        quantity: originalTrade.quantity,
        price: originalTrade.price
      }
    });
  } catch (error) {
    console.error('Copy trade error:', error);
    res.status(500).json({ message: 'Error creating copy trade' });
  }
});

// Get user's following list
router.get('/following', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.risk_profile,
        f.created_at as followed_since
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get following list error:', error);
    res.status(500).json({ message: 'Error fetching following list' });
  }
});

// Get user's followers list
router.get('/followers', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.risk_profile,
        f.created_at as followed_since
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get followers list error:', error);
    res.status(500).json({ message: 'Error fetching followers list' });
  }
});

// Get social trading leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { period = '1M', category = 'performance' } = req.query;

    let timeFilter = '';
    switch (period) {
      case '1W':
        timeFilter = "AND t.created_at >= NOW() - INTERVAL '1 week'";
        break;
      case '1M':
        timeFilter = "AND t.created_at >= NOW() - INTERVAL '1 month'";
        break;
      case '3M':
        timeFilter = "AND t.created_at >= NOW() - INTERVAL '3 months'";
        break;
      case '1Y':
        timeFilter = "AND t.created_at >= NOW() - INTERVAL '1 year'";
        break;
    }

    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.risk_profile,
        COUNT(DISTINCT f.follower_id) as followers_count,
        COUNT(DISTINCT t.id) as trades_count,
        AVG(CASE WHEN t.side = 'buy' THEN t.price ELSE NULL END) as avg_buy_price,
        AVG(CASE WHEN t.side = 'sell' THEN t.price ELSE NULL END) as avg_sell_price
      FROM users u
      LEFT JOIN follows f ON u.id = f.following_id
      LEFT JOIN orders o ON u.id = o.user_id AND o.is_public = true
      LEFT JOIN trades t ON o.id = t.order_id ${timeFilter}
      WHERE u.is_active = true AND u.kyc_status = 'approved'
      GROUP BY u.id, u.first_name, u.last_name, u.risk_profile
      HAVING COUNT(DISTINCT t.id) > 0
      ORDER BY ${getLeaderboardSortClause(category)}
      LIMIT 50
    `);

    res.json({
      leaderboard: result.rows,
      period,
      category,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

// Get leaderboard sort clause
function getLeaderboardSortClause(category) {
  switch (category) {
    case 'performance':
      return 'followers_count DESC, trades_count DESC';
    case 'trades':
      return 'trades_count DESC, followers_count DESC';
    case 'followers':
      return 'followers_count DESC, trades_count DESC';
    default:
      return 'followers_count DESC';
  }
}

module.exports = router;


