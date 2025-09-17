const express = require('express');
const db = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// Get available markets
router.get('/markets', authenticateToken, async (req, res) => {
  try {
    const markets = [
      {
        id: 'US',
        name: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
        tradingHours: {
          open: '09:30',
          close: '16:00',
          timezone: 'America/New_York'
        },
        exchanges: ['NYSE', 'NASDAQ', 'AMEX'],
        status: 'open',
        lastUpdate: new Date().toISOString()
      },
      {
        id: 'UK',
        name: 'United Kingdom',
        currency: 'GBP',
        timezone: 'Europe/London',
        tradingHours: {
          open: '08:00',
          close: '16:30',
          timezone: 'Europe/London'
        },
        exchanges: ['LSE', 'AIM'],
        status: 'open',
        lastUpdate: new Date().toISOString()
      },
      {
        id: 'JP',
        name: 'Japan',
        currency: 'JPY',
        timezone: 'Asia/Tokyo',
        tradingHours: {
          open: '09:00',
          close: '15:00',
          timezone: 'Asia/Tokyo'
        },
        exchanges: ['TSE', 'OSE'],
        status: 'closed',
        lastUpdate: new Date().toISOString()
      },
      {
        id: 'HK',
        name: 'Hong Kong',
        currency: 'HKD',
        timezone: 'Asia/Hong_Kong',
        tradingHours: {
          open: '09:30',
          close: '16:00',
          timezone: 'Asia/Hong_Kong'
        },
        exchanges: ['HKEX'],
        status: 'closed',
        lastUpdate: new Date().toISOString()
      },
      {
        id: 'DE',
        name: 'Germany',
        currency: 'EUR',
        timezone: 'Europe/Berlin',
        tradingHours: {
          open: '09:00',
          close: '17:30',
          timezone: 'Europe/Berlin'
        },
        exchanges: ['XETRA', 'FSE'],
        status: 'open',
        lastUpdate: new Date().toISOString()
      },
      {
        id: 'AU',
        name: 'Australia',
        currency: 'AUD',
        timezone: 'Australia/Sydney',
        tradingHours: {
          open: '10:00',
          close: '16:00',
          timezone: 'Australia/Sydney'
        },
        exchanges: ['ASX'],
        status: 'closed',
        lastUpdate: new Date().toISOString()
      },
      {
        id: 'CA',
        name: 'Canada',
        currency: 'CAD',
        timezone: 'America/Toronto',
        tradingHours: {
          open: '09:30',
          close: '16:00',
          timezone: 'America/Toronto'
        },
        exchanges: ['TSX', 'TSXV'],
        status: 'open',
        lastUpdate: new Date().toISOString()
      },
      {
        id: 'SG',
        name: 'Singapore',
        currency: 'SGD',
        timezone: 'Asia/Singapore',
        tradingHours: {
          open: '09:00',
          close: '17:00',
          timezone: 'Asia/Singapore'
        },
        exchanges: ['SGX'],
        status: 'closed',
        lastUpdate: new Date().toISOString()
      }
    ];

    res.json({
      markets,
      total: markets.length,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get markets error:', error);
    res.status(500).json({ message: 'Error fetching markets' });
  }
});

// Get market status
router.get('/markets/:marketId/status', authenticateToken, async (req, res) => {
  const { marketId } = req.params;

  try {
    const marketStatus = await getMarketStatus(marketId);
    
    if (!marketStatus) {
      return res.status(404).json({ message: 'Market not found' });
    }

    res.json(marketStatus);
  } catch (error) {
    console.error('Get market status error:', error);
    res.status(500).json({ message: 'Error fetching market status' });
  }
});

// Get market status for a specific market
async function getMarketStatus(marketId) {
  const marketConfigs = {
    'US': {
      name: 'United States',
      timezone: 'America/New_York',
      tradingHours: { open: '09:30', close: '16:00' },
      exchanges: ['NYSE', 'NASDAQ', 'AMEX']
    },
    'UK': {
      name: 'United Kingdom',
      timezone: 'Europe/London',
      tradingHours: { open: '08:00', close: '16:30' },
      exchanges: ['LSE', 'AIM']
    },
    'JP': {
      name: 'Japan',
      timezone: 'Asia/Tokyo',
      tradingHours: { open: '09:00', close: '15:00' },
      exchanges: ['TSE', 'OSE']
    },
    'HK': {
      name: 'Hong Kong',
      timezone: 'Asia/Hong_Kong',
      tradingHours: { open: '09:30', close: '16:00' },
      exchanges: ['HKEX']
    },
    'DE': {
      name: 'Germany',
      timezone: 'Europe/Berlin',
      tradingHours: { open: '09:00', close: '17:30' },
      exchanges: ['XETRA', 'FSE']
    },
    'AU': {
      name: 'Australia',
      timezone: 'Australia/Sydney',
      tradingHours: { open: '10:00', close: '16:00' },
      exchanges: ['ASX']
    },
    'CA': {
      name: 'Canada',
      timezone: 'America/Toronto',
      tradingHours: { open: '09:30', close: '16:00' },
      exchanges: ['TSX', 'TSXV']
    },
    'SG': {
      name: 'Singapore',
      timezone: 'Asia/Singapore',
      tradingHours: { open: '09:00', close: '17:00' },
      exchanges: ['SGX']
    }
  };

  const config = marketConfigs[marketId];
  if (!config) return null;

  const now = new Date();
  const marketTime = new Date(now.toLocaleString("en-US", { timeZone: config.timezone }));
  
  const [openHour, openMinute] = config.tradingHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = config.tradingHours.close.split(':').map(Number);
  
  const openTime = new Date(marketTime);
  openTime.setHours(openHour, openMinute, 0, 0);
  
  const closeTime = new Date(marketTime);
  closeTime.setHours(closeHour, closeMinute, 0, 0);

  const isOpen = marketTime >= openTime && marketTime <= closeTime;
  const isWeekend = marketTime.getDay() === 0 || marketTime.getDay() === 6;

  return {
    marketId,
    name: config.name,
    timezone: config.timezone,
    localTime: marketTime.toISOString(),
    status: isWeekend ? 'weekend' : (isOpen ? 'open' : 'closed'),
    tradingHours: config.tradingHours,
    nextOpen: getNextOpenTime(marketTime, openTime, closeTime, isWeekend),
    nextClose: getNextCloseTime(marketTime, closeTime, isWeekend),
    exchanges: config.exchanges
  };
}

// Get next market open time
function getNextOpenTime(currentTime, openTime, closeTime, isWeekend) {
  if (isWeekend) {
    // Next Monday
    const nextMonday = new Date(currentTime);
    nextMonday.setDate(currentTime.getDate() + (1 + 7 - currentTime.getDay()) % 7);
    nextMonday.setHours(openTime.getHours(), openTime.getMinutes(), 0, 0);
    return nextMonday.toISOString();
  }

  if (currentTime < openTime) {
    // Today's open
    return openTime.toISOString();
  } else if (currentTime > closeTime) {
    // Tomorrow's open
    const tomorrow = new Date(currentTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(openTime.getHours(), openTime.getMinutes(), 0, 0);
    return tomorrow.toISOString();
  }

  return null; // Market is currently open
}

// Get next market close time
function getNextCloseTime(currentTime, closeTime, isWeekend) {
  if (isWeekend) {
    return null; // Market is closed
  }

  if (currentTime < closeTime) {
    // Today's close
    return closeTime.toISOString();
  }

  return null; // Market is closed
}

// Get international securities
router.get('/securities', authenticateToken, async (req, res) => {
  try {
    const { market, exchange, type, sector, limit = 50, offset = 0 } = req.query;

    let whereClause = 'WHERE s.is_active = true';
    const params = [];
    let paramCount = 0;

    if (market) {
      paramCount++;
      whereClause += ` AND s.market = $${paramCount}`;
      params.push(market);
    }

    if (exchange) {
      paramCount++;
      whereClause += ` AND s.exchange = $${paramCount}`;
      params.push(exchange);
    }

    if (type) {
      paramCount++;
      whereClause += ` AND s.type = $${paramCount}`;
      params.push(type);
    }

    if (sector) {
      paramCount++;
      whereClause += ` AND s.sector = $${paramCount}`;
      params.push(sector);
    }

    const result = await db.query(`
      SELECT 
        s.*, md.price, md.change_percentage, md.volume,
        md.timestamp as last_update
      FROM securities s
      LEFT JOIN LATERAL (
        SELECT price, change_percentage, volume, timestamp
        FROM market_data 
        WHERE security_id = s.id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) md ON true
      ${whereClause}
      ORDER BY s.symbol
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    res.json({
      securities: result.rows,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get international securities error:', error);
    res.status(500).json({ message: 'Error fetching international securities' });
  }
});

// Get currency exchange rates
router.get('/currencies', authenticateToken, async (req, res) => {
  try {
    const { base = 'USD' } = req.query;

    // Mock currency data - in production, integrate with real currency API
    const currencies = {
      USD: { symbol: 'USD', name: 'US Dollar', rate: 1.0 },
      EUR: { symbol: 'EUR', name: 'Euro', rate: 0.85 },
      GBP: { symbol: 'GBP', name: 'British Pound', rate: 0.73 },
      JPY: { symbol: 'JPY', name: 'Japanese Yen', rate: 110.0 },
      HKD: { symbol: 'HKD', name: 'Hong Kong Dollar', rate: 7.8 },
      AUD: { symbol: 'AUD', name: 'Australian Dollar', rate: 1.35 },
      CAD: { symbol: 'CAD', name: 'Canadian Dollar', rate: 1.25 },
      SGD: { symbol: 'SGD', name: 'Singapore Dollar', rate: 1.35 },
      CHF: { symbol: 'CHF', name: 'Swiss Franc', rate: 0.92 },
      CNY: { symbol: 'CNY', name: 'Chinese Yuan', rate: 6.45 }
    };

    // Convert rates based on base currency
    const baseRate = currencies[base]?.rate || 1.0;
    const convertedCurrencies = Object.entries(currencies).map(([symbol, currency]) => ({
      ...currency,
      rate: currency.rate / baseRate
    }));

    res.json({
      base,
      currencies: convertedCurrencies,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({ message: 'Error fetching currencies' });
  }
});

// Convert currency
router.post('/convert', authenticateToken, async (req, res) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
      return res.status(400).json({ 
        message: 'Amount, from currency, and to currency are required' 
      });
    }

    // Mock conversion - in production, use real exchange rates
    const exchangeRates = {
      'USD-EUR': 0.85,
      'USD-GBP': 0.73,
      'USD-JPY': 110.0,
      'USD-HKD': 7.8,
      'USD-AUD': 1.35,
      'USD-CAD': 1.25,
      'USD-SGD': 1.35,
      'USD-CHF': 0.92,
      'USD-CNY': 6.45
    };

    const rateKey = `${from}-${to}`;
    const reverseRateKey = `${to}-${from}`;
    
    let rate = exchangeRates[rateKey];
    if (!rate && exchangeRates[reverseRateKey]) {
      rate = 1 / exchangeRates[reverseRateKey];
    }

    if (!rate) {
      return res.status(400).json({ 
        message: 'Currency conversion not supported' 
      });
    }

    const convertedAmount = amount * rate;

    res.json({
      amount: parseFloat(amount),
      from,
      to,
      rate,
      convertedAmount: parseFloat(convertedAmount.toFixed(4)),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ message: 'Error converting currency' });
  }
});

// Get market news
router.get('/news', authenticateToken, async (req, res) => {
  try {
    const { market, limit = 20 } = req.query;

    // Mock news data - in production, integrate with news API
    const newsData = [
      {
        id: 1,
        title: 'Global Markets Rally on Economic Recovery Hopes',
        summary: 'International markets show strong performance as economic indicators point to recovery',
        source: 'Financial Times',
        market: 'Global',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: '#',
        sentiment: 'positive'
      },
      {
        id: 2,
        title: 'Asian Markets Mixed on Trade Concerns',
        summary: 'Hong Kong and Japan markets show mixed results amid ongoing trade tensions',
        source: 'Reuters',
        market: 'Asia',
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        url: '#',
        sentiment: 'neutral'
      },
      {
        id: 3,
        title: 'European Central Bank Maintains Interest Rates',
        summary: 'ECB keeps rates unchanged, signals continued support for economic recovery',
        source: 'Bloomberg',
        market: 'Europe',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        url: '#',
        sentiment: 'positive'
      },
      {
        id: 4,
        title: 'US Federal Reserve Signals Potential Rate Changes',
        summary: 'Fed officials hint at possible policy adjustments in upcoming meetings',
        source: 'Wall Street Journal',
        market: 'US',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        url: '#',
        sentiment: 'neutral'
      }
    ];

    const filteredNews = market 
      ? newsData.filter(news => 
          news.market.toLowerCase() === market.toLowerCase() || 
          news.market.toLowerCase() === 'global'
        )
      : newsData;

    res.json({
      news: filteredNews.slice(0, parseInt(limit)),
      total: filteredNews.length,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get market news error:', error);
    res.status(500).json({ message: 'Error fetching market news' });
  }
});

// Get market indices
router.get('/indices', authenticateToken, async (req, res) => {
  try {
    const { market } = req.query;

    const indices = [
      {
        symbol: 'SPX',
        name: 'S&P 500',
        market: 'US',
        value: 4500.25,
        change: 15.75,
        changePercent: 0.35,
        lastUpdate: new Date().toISOString()
      },
      {
        symbol: 'DJI',
        name: 'Dow Jones Industrial Average',
        market: 'US',
        value: 35000.50,
        change: 125.30,
        changePercent: 0.36,
        lastUpdate: new Date().toISOString()
      },
      {
        symbol: 'IXIC',
        name: 'NASDAQ Composite',
        market: 'US',
        value: 15000.75,
        change: 45.20,
        changePercent: 0.30,
        lastUpdate: new Date().toISOString()
      },
      {
        symbol: 'FTSE',
        name: 'FTSE 100',
        market: 'UK',
        value: 7500.00,
        change: -25.50,
        changePercent: -0.34,
        lastUpdate: new Date().toISOString()
      },
      {
        symbol: 'N225',
        name: 'Nikkei 225',
        market: 'JP',
        value: 30000.00,
        change: 150.25,
        changePercent: 0.50,
        lastUpdate: new Date().toISOString()
      },
      {
        symbol: 'HSI',
        name: 'Hang Seng Index',
        market: 'HK',
        value: 25000.00,
        change: -100.75,
        changePercent: -0.40,
        lastUpdate: new Date().toISOString()
      },
      {
        symbol: 'DAX',
        name: 'DAX',
        market: 'DE',
        value: 16000.00,
        change: 75.50,
        changePercent: 0.47,
        lastUpdate: new Date().toISOString()
      },
      {
        symbol: 'ASX',
        name: 'S&P/ASX 200',
        market: 'AU',
        value: 7500.00,
        change: 30.25,
        changePercent: 0.40,
        lastUpdate: new Date().toISOString()
      }
    ];

    const filteredIndices = market 
      ? indices.filter(index => index.market === market)
      : indices;

    res.json({
      indices: filteredIndices,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get market indices error:', error);
    res.status(500).json({ message: 'Error fetching market indices' });
  }
});

// Get trading hours for all markets
router.get('/trading-hours', authenticateToken, async (req, res) => {
  try {
    const tradingHours = [
      {
        market: 'US',
        name: 'United States',
        timezone: 'America/New_York',
        sessions: [
          { name: 'Regular Trading', open: '09:30', close: '16:00' },
          { name: 'Pre-Market', open: '04:00', close: '09:30' },
          { name: 'After-Hours', open: '16:00', close: '20:00' }
        ]
      },
      {
        market: 'UK',
        name: 'United Kingdom',
        timezone: 'Europe/London',
        sessions: [
          { name: 'Regular Trading', open: '08:00', close: '16:30' }
        ]
      },
      {
        market: 'JP',
        name: 'Japan',
        timezone: 'Asia/Tokyo',
        sessions: [
          { name: 'Morning Session', open: '09:00', close: '11:30' },
          { name: 'Afternoon Session', open: '12:30', close: '15:00' }
        ]
      },
      {
        market: 'HK',
        name: 'Hong Kong',
        timezone: 'Asia/Hong_Kong',
        sessions: [
          { name: 'Morning Session', open: '09:30', close: '12:00' },
          { name: 'Afternoon Session', open: '13:00', close: '16:00' }
        ]
      },
      {
        market: 'DE',
        name: 'Germany',
        timezone: 'Europe/Berlin',
        sessions: [
          { name: 'Regular Trading', open: '09:00', close: '17:30' }
        ]
      },
      {
        market: 'AU',
        name: 'Australia',
        timezone: 'Australia/Sydney',
        sessions: [
          { name: 'Regular Trading', open: '10:00', close: '16:00' }
        ]
      },
      {
        market: 'CA',
        name: 'Canada',
        timezone: 'America/Toronto',
        sessions: [
          { name: 'Regular Trading', open: '09:30', close: '16:00' }
        ]
      },
      {
        market: 'SG',
        name: 'Singapore',
        timezone: 'Asia/Singapore',
        sessions: [
          { name: 'Regular Trading', open: '09:00', close: '17:00' }
        ]
      }
    ];

    res.json({
      tradingHours,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get trading hours error:', error);
    res.status(500).json({ message: 'Error fetching trading hours' });
  }
});

module.exports = router;


