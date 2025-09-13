# Enterprise Brokerage Platform API Documentation

## Overview

This is a comprehensive REST API for an enterprise-grade brokerage platform that surpasses IBKR and Robinhood in terms of features, performance, and robustness.

### Base URL
```
https://api.brokerage.com/api/v1
```

### Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Features

- **Ultra-low latency order management** (sub-millisecond processing)
- **Advanced risk management** with real-time monitoring
- **Comprehensive compliance** (KYC, AML, PDT, Options suitability)
- **Real-time market data** with Level II quotes
- **Advanced execution algorithms** (TWAP, VWAP, Implementation Shortfall, Iceberg)
- **Intelligent notifications** with multi-channel delivery
- **Options trading** with Greeks calculation
- **Portfolio analytics** with stress testing
- **Smart order routing** across multiple venues

## API Endpoints

### Trading Endpoints

#### Submit Order
```http
POST /orders
```

Submit a new order with comprehensive risk and compliance checks.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": 100,
  "orderType": "LIMIT",
  "price": 150.00,
  "timeInForce": "DAY",
  "securityType": "STOCK",
  "algorithm": "TWAP"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD_123456789",
    "status": "PENDING_EXECUTION",
    "timestamp": 1640995200000,
    "latency": 2.5
  }
}
```

#### Cancel Order
```http
DELETE /orders/{orderId}
```

Cancel an existing order.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD_123456789",
    "status": "CANCELLED",
    "latency": 1.2
  }
}
```

#### Modify Order
```http
PUT /orders/{orderId}
```

Modify an existing order (cancel and replace).

**Request Body:**
```json
{
  "quantity": 150,
  "price": 149.50
}
```

#### Get Order Status
```http
GET /orders/{orderId}
```

Get current status of a specific order.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD_123456789",
    "status": "PARTIALLY_FILLED",
    "symbol": "AAPL",
    "side": "BUY",
    "quantity": 100,
    "totalFilled": 50,
    "avgFillPrice": 149.75,
    "leaves": 50,
    "fills": [
      {
        "fillId": "FILL_001",
        "quantity": 30,
        "price": 149.80,
        "timestamp": 1640995210000
      },
      {
        "fillId": "FILL_002",
        "quantity": 20,
        "price": 149.70,
        "timestamp": 1640995215000
      }
    ]
  }
}
```

#### Get Order History
```http
GET /orders?limit=50&offset=0
```

Get order history for the authenticated user.

### Market Data Endpoints

#### Get Real-time Quote
```http
GET /market/quote/{symbol}
```

Get real-time quote with millisecond precision.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "price": 150.25,
    "bid": 150.23,
    "ask": 150.27,
    "bidSize": 500,
    "askSize": 300,
    "volume": 1250000,
    "change": 2.15,
    "changePercent": 1.45,
    "high": 151.00,
    "low": 148.50,
    "open": 149.00,
    "previousClose": 148.10,
    "timestamp": 1640995230000,
    "marketStatus": "OPEN"
  }
}
```

#### Get Level II Market Data
```http
GET /market/level2/{symbol}
```

Get order book data (Level II quotes).

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "timestamp": 1640995230000,
    "bids": [
      {"price": 150.23, "size": 500, "mpid": "NASDAQ"},
      {"price": 150.22, "size": 200, "mpid": "NYSE"},
      {"price": 150.21, "size": 300, "mpid": "BATS"}
    ],
    "asks": [
      {"price": 150.27, "size": 300, "mpid": "NASDAQ"},
      {"price": 150.28, "size": 400, "mpid": "NYSE"},
      {"price": 150.29, "size": 250, "mpid": "BATS"}
    ],
    "spread": 0.04,
    "spreadPercent": 0.027
  }
}
```

#### Get Options Chain
```http
GET /market/options/{symbol}?expiration=2024-01-19
```

Get options chain with Greeks calculation.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "strike": 150,
      "expiration": "2024-01-19",
      "type": "call",
      "bid": 5.20,
      "ask": 5.30,
      "last": 5.25,
      "volume": 1500,
      "openInterest": 12000,
      "impliedVolatility": 0.28,
      "delta": 0.52,
      "gamma": 0.018,
      "theta": -0.045,
      "vega": 0.12,
      "rho": 0.08
    }
  ]
}
```

#### Get Technical Indicators
```http
GET /market/technicals/{symbol}?period=1d&indicators=sma,ema,rsi,macd
```

Get technical analysis indicators.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "timestamp": 1640995230000,
    "indicators": {
      "sma": [
        {"timestamp": 1640908800000, "value": 148.50},
        {"timestamp": 1640995200000, "value": 149.25}
      ],
      "ema": [
        {"timestamp": 1640908800000, "value": 148.75},
        {"timestamp": 1640995200000, "value": 149.50}
      ],
      "rsi": [
        {"timestamp": 1640995200000, "value": 65.2}
      ],
      "macd": {
        "macdLine": [{"timestamp": 1640995200000, "value": 1.25}],
        "signalLine": [{"timestamp": 1640995200000, "value": 1.15}],
        "histogram": [{"timestamp": 1640995200000, "value": 0.10}]
      }
    }
  }
}
```

#### Stock Screener
```http
POST /market/screen
```

Screen stocks based on criteria.

**Request Body:**
```json
{
  "minPrice": 10,
  "maxPrice": 500,
  "minVolume": 1000000,
  "minMarketCap": 1000000000,
  "sectors": ["Technology", "Healthcare"],
  "technicalIndicators": {
    "rsi": {"min": 30, "max": 70}
  }
}
```

### Risk Management Endpoints

#### Get Portfolio Risk Analysis
```http
GET /risk/portfolio
```

Get comprehensive portfolio risk analysis.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "totalValue": 250000,
    "totalExposure": 240000,
    "concentrationRisk": 0.12,
    "var95": -5000,
    "var99": -8500,
    "sharpeRatio": 1.25,
    "maxDrawdown": -0.08,
    "sectorExposure": {
      "Technology": 75000,
      "Healthcare": 50000,
      "Finance": 40000
    },
    "alerts": [
      {
        "type": "CONCENTRATION_RISK",
        "severity": "MEDIUM",
        "message": "Technology sector exposure: 30%"
      }
    ],
    "riskScore": 6.5
  }
}
```

#### Perform Stress Test
```http
POST /risk/stress-test
```

Perform portfolio stress testing.

**Request Body:**
```json
{
  "scenarios": [
    {
      "name": "Market Crash",
      "description": "20% market decline",
      "stockMultiplier": 0.8,
      "volatilityMultiplier": 2.0
    }
  ]
}
```

#### Calculate Optimal Position Size
```http
POST /risk/position-size
```

Calculate optimal position size based on Kelly Criterion.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "riskTolerance": 0.02
}
```

### Notification Endpoints

#### Create Price Alert
```http
POST /alerts/price
```

Create a price alert for a symbol.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "condition": "above",
  "targetPrice": 155.00,
  "options": {
    "expiresAt": 1643673600000,
    "notificationPreferences": {
      "push": true,
      "email": true,
      "sms": false
    }
  }
}
```

#### Get Notification History
```http
GET /notifications?limit=50&offset=0&type=PRICE_ALERT&priority=high
```

#### Update Notification Preferences
```http
PUT /notifications/preferences
```

**Request Body:**
```json
{
  "enabledAlerts": ["PRICE_ALERT", "ORDER_FILLED", "MARGIN_CALL"],
  "channels": {
    "push": true,
    "email": true,
    "sms": false
  },
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00",
    "timezone": "America/New_York"
  }
}
```

### Portfolio Endpoints

#### Get Portfolio Overview
```http
GET /portfolio
```

Get complete portfolio information.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValue": 250000,
    "dayChange": 2500,
    "dayChangePercent": 1.0,
    "cashBalance": 10000,
    "buyingPower": 50000,
    "marginUsed": 75000,
    "positions": [
      {
        "symbol": "AAPL",
        "quantity": 100,
        "avgCost": 145.00,
        "currentPrice": 150.25,
        "marketValue": 15025,
        "unrealizedPnL": 525,
        "unrealizedPnLPercent": 3.62
      }
    ]
  }
}
```

#### Get Portfolio Performance
```http
GET /portfolio/performance?timeframe=1y
```

Get historical portfolio performance.

### Account Endpoints

#### Get Account Information
```http
GET /account
```

Get account details and balances.

**Response:**
```json
{
  "success": true,
  "data": {
    "accountId": "ACC_123456",
    "accountType": "MARGIN",
    "totalEquity": 250000,
    "cashBalance": 10000,
    "marginBalance": 75000,
    "buyingPower": 50000,
    "dayTradingBuyingPower": 200000,
    "maintenanceMargin": 18750,
    "isPDT": true,
    "optionsLevel": 4
  }
}
```

## WebSocket API

For real-time data streaming, connect to:
```
wss://api.brokerage.com/ws
```

### Subscribe to Market Data
```json
{
  "type": "subscribe",
  "channel": "quotes",
  "symbols": ["AAPL", "GOOGL", "TSLA"]
}
```

### Subscribe to Order Updates
```json
{
  "type": "subscribe",
  "channel": "orders",
  "userId": "user_123"
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": 1640995230000,
  "requestId": "req_123456789"
}
```

### Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Authentication required or failed
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `RISK_VIOLATION` - Order rejected by risk management
- `COMPLIANCE_VIOLATION` - Compliance check failed
- `MARKET_DATA_ERROR` - Market data service error
- `EXECUTION_ERROR` - Order execution failed
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Rate Limits

- **Market Data**: 1000 requests per minute
- **Trading**: 100 orders per minute
- **General API**: 500 requests per minute

## Performance Metrics

Our platform delivers:

- **Order Latency**: < 2ms average
- **Market Data Latency**: < 0.5ms
- **Uptime**: 99.99%
- **Order Fill Rate**: > 99.5%
- **Smart Routing**: Best execution across 15+ venues

## Support

For API support, contact:
- Email: api-support@brokerage.com
- Documentation: https://docs.brokerage.com
- Status Page: https://status.brokerage.com
