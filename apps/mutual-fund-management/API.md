# Mutual Fund Management API Documentation

## Overview

The Mutual Fund Management API provides comprehensive functionality for managing mutual funds, trading, portfolio management, and analytics in a fintech brokerage platform.

## Base URL

```
Development: http://localhost:3006
Production: https://api.brokerage.com
```

## Authentication

All API endpoints require authentication using JWT tokens.

```http
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting

- **Rate Limit**: 1000 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Response Format

All responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Endpoints

### Fund Catalog

#### Get All Funds
```http
GET /api/v1/funds/catalog
```

**Query Parameters:**
- `limit` (number): Number of funds to return (default: 100)
- `offset` (number): Number of funds to skip (default: 0)
- `category` (string): Filter by category ID
- `family` (string): Filter by fund family ID
- `search` (string): Search by fund name or symbol
- `sort` (string): Sort field (name, symbol, expense_ratio)
- `order` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "funds": [
      {
        "id": "uuid",
        "symbol": "VFIAX",
        "name": "Vanguard 500 Index Fund",
        "fund_family": "Vanguard",
        "category": "Large Blend",
        "expense_ratio": 0.04,
        "minimum_investment": 3000,
        "nav": 450.25,
        "change_percentage": 0.15
      }
    ],
    "total": 1500,
    "limit": 100,
    "offset": 0
  }
}
```

#### Get Fund Details
```http
GET /api/v1/funds/catalog/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "symbol": "VFIAX",
    "name": "Vanguard 500 Index Fund",
    "fund_family": "Vanguard",
    "category": "Large Blend",
    "subcategory": "Large Growth",
    "investment_objective": "Seeks to track the performance of the S&P 500 Index",
    "expense_ratio": 0.04,
    "management_fee": 0.04,
    "minimum_investment": 3000,
    "load_type": "No Load",
    "performance": {
      "1_year": 12.5,
      "3_year": 15.2,
      "5_year": 13.8,
      "10_year": 11.9
    }
  }
}
```

### Fund Trading

#### Place Buy Order
```http
POST /api/v1/funds/trading/buy
```

**Request Body:**
```json
{
  "fund_id": "uuid",
  "amount": 5000,
  "order_type": "market",
  "account_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "fund_id": "uuid",
    "symbol": "VFIAX",
    "shares": 11.11,
    "price_per_share": 450.25,
    "total_amount": 5000,
    "fees": 0,
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Place Sell Order
```http
POST /api/v1/funds/trading/sell
```

**Request Body:**
```json
{
  "fund_id": "uuid",
  "shares": 11.11,
  "order_type": "market",
  "account_id": "uuid"
}
```

#### Get Trading History
```http
GET /api/v1/funds/trading/history
```

**Query Parameters:**
- `start_date` (string): Start date (ISO 8601)
- `end_date` (string): End date (ISO 8601)
- `fund_id` (string): Filter by fund ID
- `status` (string): Filter by order status

### Fund Research

#### Get Fund Research
```http
GET /api/v1/funds/research/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fund_id": "uuid",
    "analyst_rating": "Buy",
    "risk_rating": "Medium",
    "expense_ratio_rank": 1,
    "performance_rank": 2,
    "risk_rank": 3,
    "overall_rank": 2,
    "recommendations": [
      {
        "type": "positive",
        "message": "Low expense ratio compared to peers"
      }
    ]
  }
}
```

#### Get Fund Performance
```http
GET /api/v1/funds/research/:id/performance
```

**Query Parameters:**
- `period` (string): Performance period (1y, 3y, 5y, 10y, ytd)
- `benchmark` (string): Benchmark ID for comparison

### Fund Screening

#### Search Funds
```http
POST /api/v1/funds/screening/search
```

**Request Body:**
```json
{
  "filters": {
    "category": "Large Blend",
    "expense_ratio_max": 0.5,
    "minimum_investment_max": 10000,
    "performance_1y_min": 5.0,
    "risk_level": "Medium"
  },
  "sort": {
    "field": "expense_ratio",
    "order": "asc"
  },
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

### Performance Analytics

#### Get Fund Performance
```http
GET /api/v1/funds/performance/:id
```

**Query Parameters:**
- `start_date` (string): Start date (ISO 8601)
- `end_date` (string): End date (ISO 8601)
- `benchmark_id` (string): Benchmark for comparison

**Response:**
```json
{
  "success": true,
  "data": {
    "fund_id": "uuid",
    "period": {
      "start_date": "2023-01-01",
      "end_date": "2023-12-31"
    },
    "performance": {
      "total_return": 12.5,
      "annualized_return": 12.5,
      "volatility": 15.2,
      "sharpe_ratio": 0.82,
      "max_drawdown": -8.5
    },
    "benchmark_comparison": {
      "excess_return": 2.1,
      "information_ratio": 0.15,
      "beta": 0.98,
      "alpha": 1.2
    }
  }
}
```

### Portfolio Management

#### Get Holdings
```http
GET /api/v1/funds/holdings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "holdings": [
      {
        "fund_id": "uuid",
        "symbol": "VFIAX",
        "name": "Vanguard 500 Index Fund",
        "shares": 11.11,
        "current_value": 5000,
        "cost_basis": 4500,
        "unrealized_gain_loss": 500,
        "percentage": 25.5
      }
    ],
    "total_value": 19600,
    "total_gain_loss": 1200
  }
}
```

#### Analyze Rebalancing
```http
POST /api/v1/funds/rebalancing/analyze
```

**Request Body:**
```json
{
  "target_allocation": {
    "VFIAX": 30,
    "VTSAX": 40,
    "VBTLX": 30
  },
  "rebalancing_threshold": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rebalancing_needed": true,
    "current_allocation": {
      "VFIAX": 25.5,
      "VTSAX": 45.2,
      "VBTLX": 29.3
    },
    "target_allocation": {
      "VFIAX": 30,
      "VTSAX": 40,
      "VBTLX": 30
    },
    "recommendations": [
      {
        "fund_id": "uuid",
        "symbol": "VFIAX",
        "action": "buy",
        "shares": 2.5,
        "amount": 1125
      }
    ]
  }
}
```

### Tax Optimization

#### Get Tax Liability
```http
GET /api/v1/funds/tax/liability
```

**Query Parameters:**
- `year` (number): Tax year (default: current year)
- `include_unrealized` (boolean): Include unrealized gains/losses

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "realized_gains": {
      "short_term": 500,
      "long_term": 1200,
      "total": 1700
    },
    "unrealized_gains": {
      "short_term": 300,
      "long_term": 800,
      "total": 1100
    },
    "tax_liability": {
      "short_term_tax": 110,
      "long_term_tax": 180,
      "total_tax": 290
    }
  }
}
```

#### Get Tax Optimization Recommendations
```http
POST /api/v1/funds/tax/optimize
```

**Request Body:**
```json
{
  "max_loss": 3000,
  "min_gain": 1000,
  "target_date": "2024-12-31"
}
```

### Analytics

#### Get Analytics Report
```http
GET /api/v1/funds/analytics/report
```

**Query Parameters:**
- `start_date` (string): Start date (ISO 8601)
- `end_date` (string): End date (ISO 8601)
- `include_performance` (boolean): Include performance analytics
- `include_risk` (boolean): Include risk analytics
- `include_tax` (boolean): Include tax analytics

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Invalid request parameters |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource conflict |
| `RATE_LIMITED` | Rate limit exceeded |
| `VALIDATION_ERROR` | Input validation failed |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | External service unavailable |
| `INTERNAL_ERROR` | Internal server error |

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3006');

// Join user room
socket.emit('join-user-room', userId);

// Join fund room
socket.emit('join-fund-room', fundId);
```

### Events

#### Fund Updates
```javascript
socket.on('fundDataUpdated', (data) => {
  console.log('Fund data updated:', data);
});
```

#### Trade Updates
```javascript
socket.on('tradeExecuted', (data) => {
  console.log('Trade executed:', data);
});
```

#### Performance Updates
```javascript
socket.on('performanceUpdated', (data) => {
  console.log('Performance updated:', data);
});
```

## SDK Examples

### JavaScript/Node.js
```javascript
const MutualFundAPI = require('@brokerage/mutual-fund-api');

const api = new MutualFundAPI({
  baseURL: 'http://localhost:3006',
  apiKey: 'your-api-key'
});

// Get funds
const funds = await api.funds.list({
  category: 'Large Blend',
  limit: 50
});

// Place order
const order = await api.trading.buy({
  fund_id: 'uuid',
  amount: 5000
});
```

### Python
```python
from brokerage_mutual_fund import MutualFundAPI

api = MutualFundAPI(
    base_url='http://localhost:3006',
    api_key='your-api-key'
)

# Get funds
funds = api.funds.list(category='Large Blend', limit=50)

# Place order
order = api.trading.buy(fund_id='uuid', amount=5000)
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | 1000 requests | 15 minutes |
| Trading endpoints | 100 requests | 1 hour |
| Research endpoints | 500 requests | 1 hour |
| Analytics endpoints | 200 requests | 1 hour |

## Changelog

### v1.0.0 (2024-01-01)
- Initial release
- Fund catalog management
- Trading functionality
- Portfolio management
- Performance analytics
- Tax optimization
- Real-time updates
