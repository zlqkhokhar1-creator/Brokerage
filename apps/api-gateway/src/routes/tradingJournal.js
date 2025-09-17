const express = require('express');
const { authenticateToken } = require('../middleware/security');
const { transaction } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /api/v1/trading/journal
 * @description Get user's trading journal entries
 * @access Private
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status = 'all', symbol = '', strategy = '', page = 1, limit = 20 } = req.query;

    // Mock trading journal data - replace with real database query
    const mockTrades = [
      {
        id: '1',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        entryPrice: 150.00,
        exitPrice: 175.43,
        pnl: 2543.00,
        pnlPercent: 16.95,
        status: 'CLOSED',
        entryDate: '2024-01-15',
        exitDate: '2024-01-20',
        notes: 'Strong earnings beat, held for 5 days',
        tags: ['earnings', 'swing'],
        strategy: 'Momentum',
        emotions: ['confident', 'patient']
      },
      {
        id: '2',
        symbol: 'TSLA',
        side: 'SELL',
        quantity: 50,
        entryPrice: 200.00,
        exitPrice: 245.67,
        pnl: -2283.50,
        pnlPercent: -22.84,
        status: 'CLOSED',
        entryDate: '2024-01-10',
        exitDate: '2024-01-18',
        notes: 'Stop loss hit, poor risk management',
        tags: ['stop-loss', 'mistake'],
        strategy: 'Breakout',
        emotions: ['frustrated', 'impatient']
      },
      {
        id: '3',
        symbol: 'NVDA',
        side: 'BUY',
        quantity: 25,
        entryPrice: 400.00,
        status: 'OPEN',
        entryDate: '2024-01-25',
        stopLoss: 380.00,
        takeProfit: 450.00,
        notes: 'AI momentum play, watching closely',
        tags: ['AI', 'momentum'],
        strategy: 'Growth',
        emotions: ['optimistic', 'cautious']
      }
    ];

    // Apply filters
    let filteredTrades = mockTrades;
    
    if (status !== 'all') {
      filteredTrades = filteredTrades.filter(trade => trade.status === status);
    }
    
    if (symbol) {
      filteredTrades = filteredTrades.filter(trade => 
        trade.symbol.toLowerCase().includes(symbol.toLowerCase())
      );
    }
    
    if (strategy) {
      filteredTrades = filteredTrades.filter(trade => trade.strategy === strategy);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTrades = filteredTrades.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTrades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredTrades.length,
        totalPages: Math.ceil(filteredTrades.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching trading journal:', error);
    next(error);
  }
});

/**
 * @route POST /api/v1/trading/journal
 * @description Add new trade to journal
 * @access Private
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      symbol,
      side,
      quantity,
      entryPrice,
      stopLoss,
      takeProfit,
      notes,
      tags,
      strategy,
      emotions
    } = req.body;

    // Validate required fields
    if (!symbol || !side || !quantity || !entryPrice) {
      return res.status(400).json({
        success: false,
        message: 'Symbol, side, quantity, and entry price are required'
      });
    }

    // Mock trade creation - replace with real database insert
    const newTrade = {
      id: Date.now().toString(),
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      quantity: parseInt(quantity),
      entryPrice: parseFloat(entryPrice),
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      status: 'OPEN',
      entryDate: new Date().toISOString().split('T')[0],
      notes: notes || '',
      tags: tags || [],
      strategy: strategy || '',
      emotions: emotions || [],
      pnl: 0,
      pnlPercent: 0
    };

    res.status(201).json({
      success: true,
      data: newTrade,
      message: 'Trade added to journal successfully'
    });
  } catch (error) {
    logger.error('Error adding trade to journal:', error);
    next(error);
  }
});

/**
 * @route PUT /api/v1/trading/journal/:id
 * @description Update trade in journal
 * @access Private
 */
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Mock trade update - replace with real database update
    await new Promise(resolve => setTimeout(resolve, 300));

    res.json({
      success: true,
      message: 'Trade updated successfully'
    });
  } catch (error) {
    logger.error('Error updating trade in journal:', error);
    next(error);
  }
});

/**
 * @route POST /api/v1/trading/journal/:id/close
 * @description Close an open trade
 * @access Private
 */
router.post('/:id/close', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { exitPrice } = req.body;

    if (!exitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Exit price is required to close trade'
      });
    }

    // Mock trade closure - replace with real database update
    const exitPriceNum = parseFloat(exitPrice);
    const mockTrade = {
      id,
      entryPrice: 150.00,
      side: 'BUY',
      quantity: 100
    };

    const pnl = mockTrade.side === 'BUY' 
      ? (exitPriceNum - mockTrade.entryPrice) * mockTrade.quantity
      : (mockTrade.entryPrice - exitPriceNum) * mockTrade.quantity;
    
    const pnlPercent = (pnl / (mockTrade.entryPrice * mockTrade.quantity)) * 100;

    res.json({
      success: true,
      data: {
        id,
        exitPrice: exitPriceNum,
        pnl,
        pnlPercent,
        status: 'CLOSED',
        exitDate: new Date().toISOString().split('T')[0]
      },
      message: 'Trade closed successfully'
    });
  } catch (error) {
    logger.error('Error closing trade:', error);
    next(error);
  }
});

/**
 * @route DELETE /api/v1/trading/journal/:id
 * @description Delete trade from journal
 * @access Private
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Mock trade deletion - replace with real database delete
    await new Promise(resolve => setTimeout(resolve, 300));

    res.json({
      success: true,
      message: 'Trade deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting trade from journal:', error);
    next(error);
  }
});

/**
 * @route GET /api/v1/trading/journal/stats
 * @description Get trading journal statistics
 * @access Private
 */
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Mock statistics - replace with real database aggregation
    const stats = {
      totalTrades: 15,
      winningTrades: 9,
      losingTrades: 6,
      winRate: 60.0,
      totalPnl: 5420.50,
      avgPnl: 361.37,
      bestTrade: 2543.00,
      worstTrade: -2283.50,
      avgWin: 1204.83,
      avgLoss: -380.58,
      profitFactor: 1.58,
      sharpeRatio: 1.23,
      maxDrawdown: -12.5,
      avgHoldingPeriod: 5.2
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching trading journal statistics:', error);
    next(error);
  }
});

/**
 * @route GET /api/v1/trading/journal/export
 * @description Export trading journal data
 * @access Private
 */
router.get('/export', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { format = 'csv' } = req.query;

    // Mock export - replace with real data export
    const mockTrades = [
      {
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        entryPrice: 150.00,
        exitPrice: 175.43,
        pnl: 2543.00,
        pnlPercent: 16.95,
        status: 'CLOSED',
        entryDate: '2024-01-15',
        exitDate: '2024-01-20'
      }
    ];

    if (format === 'csv') {
      const csv = [
        'Symbol,Side,Quantity,Entry Price,Exit Price,P&L,P&L %,Status,Entry Date,Exit Date',
        ...mockTrades.map(trade => 
          `${trade.symbol},${trade.side},${trade.quantity},${trade.entryPrice},${trade.exitPrice || ''},${trade.pnl},${trade.pnlPercent},${trade.status},${trade.entryDate},${trade.exitDate || ''}`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=trading-journal.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: mockTrades
      });
    }
  } catch (error) {
    logger.error('Error exporting trading journal:', error);
    next(error);
  }
});

module.exports = router;
