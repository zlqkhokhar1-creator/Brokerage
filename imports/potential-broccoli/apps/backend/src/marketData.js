const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const db = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// WebSocket server for real-time market data
let wss;
let marketDataClients = new Map();

// Initialize WebSocket server
const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ 
    server,
    path: '/ws/market-data',
    verifyClient: (info) => {
      // Simple token verification for WebSocket
      const token = info.req.url.split('token=')[1];
      return !!token; // In production, verify JWT token
    }
  });

  wss.on('connection', (ws, req) => {
    const token = req.url.split('token=')[1];
    const clientId = Date.now() + Math.random();
    
    marketDataClients.set(clientId, {
      ws,
      token,
      subscribedSymbols: new Set()
    });

    console.log(`Market data client connected: ${clientId}`);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(clientId, data);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      marketDataClients.delete(clientId);
      console.log(`Market data client disconnected: ${clientId}`);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      clientId
    }));
  });
};

// Handle client messages
const handleClientMessage = (clientId, data) => {
  const client = marketDataClients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case 'subscribe':
      if (data.symbols && Array.isArray(data.symbols)) {
        data.symbols.forEach(symbol => {
          client.subscribedSymbols.add(symbol);
        });
        client.ws.send(JSON.stringify({
          type: 'subscription',
          symbols: Array.from(client.subscribedSymbols),
          status: 'subscribed'
        }));
      }
      break;
    
    case 'unsubscribe':
      if (data.symbols && Array.isArray(data.symbols)) {
        data.symbols.forEach(symbol => {
          client.subscribedSymbols.delete(symbol);
        });
        client.ws.send(JSON.stringify({
          type: 'subscription',
          symbols: Array.from(client.subscribedSymbols),
          status: 'unsubscribed'
        }));
      }
      break;
    
    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
};

// Broadcast market data to subscribed clients
const broadcastMarketData = (symbol, data) => {
  marketDataClients.forEach((client, clientId) => {
    if (client.subscribedSymbols.has(symbol) && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify({
          type: 'market_data',
          symbol,
          data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error(`Error sending data to client ${clientId}:`, error);
        marketDataClients.delete(clientId);
      }
    }
  });
};

// Simulate real-time market data updates
const startMarketDataSimulation = () => {
  setInterval(async () => {
    try {
      // Get all active securities
      const securities = await db.query(`
        SELECT id, symbol FROM securities WHERE is_active = true
      `);

      for (const security of securities.rows) {
        // Generate realistic price movements
        const currentPrice = await getCurrentPrice(security.id);
        const changePercent = (Math.random() - 0.5) * 0.02; // ±1% change
        const newPrice = currentPrice * (1 + changePercent);
        const changeAmount = newPrice - currentPrice;
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        // Update market data
        await db.query(`
          INSERT INTO market_data (
            security_id, price, volume, change_amount, change_percentage, timestamp
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [security.id, newPrice, volume, changeAmount, changePercent * 100]);

        // Broadcast to subscribed clients
        broadcastMarketData(security.symbol, {
          price: newPrice,
          change: changeAmount,
          changePercent: changePercent * 100,
          volume: volume,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Market data simulation error:', error);
    }
  }, 5000); // Update every 5 seconds
};

// Get current price for a security
const getCurrentPrice = async (securityId) => {
  try {
    const result = await db.query(`
      SELECT price FROM market_data 
      WHERE security_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [securityId]);
    
    return result.rows[0]?.price || 100; // Default price if none found
  } catch (error) {
    console.error('Error getting current price:', error);
    return 100;
  }
};

// REST API endpoints for market data

// Get real-time market data for multiple symbols
router.get('/realtime', authenticateToken, async (req, res) => {
  const { symbols } = req.query;
  
  if (!symbols) {
    return res.status(400).json({ message: 'Symbols parameter is required' });
  }

  const symbolList = symbols.split(',');

  try {
    const result = await db.query(`
      SELECT 
        s.symbol, s.name, s.type, s.exchange,
        md.price, md.volume, md.change_amount, md.change_percentage,
        md.timestamp
      FROM securities s
      LEFT JOIN LATERAL (
        SELECT price, volume, change_amount, change_percentage, timestamp
        FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE s.symbol = ANY($1) AND s.is_active = true
    `, [symbolList]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get real-time data error:', error);
    res.status(500).json({ message: 'Error fetching real-time data' });
  }
});

// Get historical market data
router.get('/historical/:symbol', authenticateToken, async (req, res) => {
  const { symbol } = req.params;
  const { period = '1D', interval = '1m' } = req.query;

  try {
    // Get security ID
    const securityResult = await db.query(`
      SELECT id FROM securities WHERE symbol = $1 AND is_active = true
    `, [symbol]);

    if (securityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Security not found' });
    }

    const securityId = securityResult.rows[0].id;

    // Calculate time range based on period
    let timeRange;
    switch (period) {
      case '1D':
        timeRange = "NOW() - INTERVAL '1 day'";
        break;
      case '1W':
        timeRange = "NOW() - INTERVAL '1 week'";
        break;
      case '1M':
        timeRange = "NOW() - INTERVAL '1 month'";
        break;
      case '3M':
        timeRange = "NOW() - INTERVAL '3 months'";
        break;
      case '6M':
        timeRange = "NOW() - INTERVAL '6 months'";
        break;
      case '1Y':
        timeRange = "NOW() - INTERVAL '1 year'";
        break;
      default:
        timeRange = "NOW() - INTERVAL '1 day'";
    }

    // Get historical data
    const result = await db.query(`
      SELECT 
        price, volume, change_amount, change_percentage, timestamp
      FROM market_data 
      WHERE security_id = $1 AND timestamp >= ${timeRange}
      ORDER BY timestamp ASC
    `, [securityId]);

    res.json({
      symbol,
      period,
      interval,
      data: result.rows
    });
  } catch (error) {
    console.error('Get historical data error:', error);
    res.status(500).json({ message: 'Error fetching historical data' });
  }
});

// Get market overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    // Get top gainers
    const gainers = await db.query(`
      SELECT 
        s.symbol, s.name, md.price, md.change_amount, md.change_percentage
      FROM securities s
      JOIN LATERAL (
        SELECT price, change_amount, change_percentage
        FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE s.is_active = true AND md.change_percentage > 0
      ORDER BY md.change_percentage DESC
      LIMIT 10
    `);

    // Get top losers
    const losers = await db.query(`
      SELECT 
        s.symbol, s.name, md.price, md.change_amount, md.change_percentage
      FROM securities s
      JOIN LATERAL (
        SELECT price, change_amount, change_percentage
        FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE s.is_active = true AND md.change_percentage < 0
      ORDER BY md.change_percentage ASC
      LIMIT 10
    `);

    // Get most active
    const mostActive = await db.query(`
      SELECT 
        s.symbol, s.name, md.price, md.volume, md.change_percentage
      FROM securities s
      JOIN LATERAL (
        SELECT price, volume, change_percentage
        FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE s.is_active = true
      ORDER BY md.volume DESC
      LIMIT 10
    `);

    res.json({
      gainers: gainers.rows,
      losers: losers.rows,
      mostActive: mostActive.rows
    });
  } catch (error) {
    console.error('Get market overview error:', error);
    res.status(500).json({ message: 'Error fetching market overview' });
  }
});

// Get market indices
router.get('/indices', authenticateToken, async (req, res) => {
  try {
    const indices = await db.query(`
      SELECT 
        s.symbol, s.name, md.price, md.change_amount, md.change_percentage
      FROM securities s
      JOIN LATERAL (
        SELECT price, change_amount, change_percentage
        FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      WHERE s.type = 'etf' AND s.symbol IN ('SPY', 'QQQ', 'IWM', 'DIA')
      ORDER BY s.symbol
    `);

    res.json(indices.rows);
  } catch (error) {
    console.error('Get market indices error:', error);
    res.status(500).json({ message: 'Error fetching market indices' });
  }
});

// Get market news (mock data)
router.get('/news', authenticateToken, async (req, res) => {
  const { symbol, limit = 10 } = req.query;

  try {
    // Mock news data - in production, integrate with news API
    const mockNews = [
      {
        id: 1,
        title: "Tech Stocks Rally on Strong Earnings Reports",
        summary: "Major technology companies report better-than-expected quarterly results, driving market optimism.",
        source: "Financial Times",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: "#",
        sentiment: "positive"
      },
      {
        id: 2,
        title: "Federal Reserve Signals Potential Rate Cut",
        summary: "Central bank officials hint at possible interest rate reduction in upcoming meeting.",
        source: "Reuters",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        url: "#",
        sentiment: "positive"
      },
      {
        id: 3,
        title: "Energy Sector Faces Headwinds from Oil Price Volatility",
        summary: "Uncertainty in global oil markets impacts energy sector performance.",
        source: "Bloomberg",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        url: "#",
        sentiment: "negative"
      }
    ];

    const filteredNews = symbol 
      ? mockNews.filter(news => news.title.toLowerCase().includes(symbol.toLowerCase()))
      : mockNews;

    res.json(filteredNews.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Get market news error:', error);
    res.status(500).json({ message: 'Error fetching market news' });
  }
});

// WebSocket connection info
router.get('/ws-info', authenticateToken, (req, res) => {
  res.json({
    wsUrl: `ws://localhost:5001/ws/market-data?token=${req.token}`,
    supportedOperations: ['subscribe', 'unsubscribe', 'ping'],
    supportedSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY', 'QQQ', 'BTC', 'ETH']
  });
});

module.exports = {
  router,
  initializeWebSocket,
  startMarketDataSimulation
};


