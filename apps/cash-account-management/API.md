# 🏦 Cash Account Management API Documentation

## Overview

The Cash Account Management API provides comprehensive functionality for managing cash accounts, processing payments, handling multi-currency transactions, and ensuring compliance for both Pakistani and international markets.

## Base URL
```
http://localhost:3007/api/v1
```

## Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "message": "Description of the result",
  "data": {}, // Response data (if successful)
  "error": "Error message" // Only present if success is false
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

---

## 🏦 Cash Account Management

### Get Account Balance

**GET** `/accounts/balance`

Get the current balance for the authenticated user's cash account.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| currency | string | No | Currency code (PKR, USD, EUR, GBP, CAD, AUD) |

#### Response
```json
{
  "success": true,
  "data": {
    "base_currency": "PKR",
    "balances": {
      "pkr": {
        "available": 1000000.00,
        "pending": 50000.00,
        "reserved": 25000.00,
        "total": 1075000.00
      },
      "usd": {
        "available": 5000.00,
        "pending": 0.00,
        "reserved": 0.00,
        "total": 5000.00
      }
    },
    "account_number": "CA1703123456789",
    "status": "active"
  }
}
```

### Create Cash Account

**POST** `/accounts/create`

Create a new cash account for the authenticated user.

#### Request Body
```json
{
  "base_currency": "PKR",
  "account_type": "individual",
  "cnic": "12345-1234567-1",
  "iban": "PK36SCBL0000001123456702",
  "tax_id": "1234567890"
}
```

#### Response
```json
{
  "success": true,
  "message": "Cash account created successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "account_number": "CA1703123456789",
    "base_currency": "PKR",
    "account_type": "individual",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Process Buy Order

**POST** `/accounts/buy-order`

Process a buy order for any asset type (stocks, ETFs, mutual funds, etc.).

#### Request Body
```json
{
  "asset_type": "STOCK",
  "asset_symbol": "OGDC",
  "asset_name": "Oil & Gas Development Company",
  "quantity": 100,
  "price_per_unit": 150.50,
  "currency": "PKR",
  "market": "PSX",
  "exchange": "Pakistan Stock Exchange"
}
```

#### Response
```json
{
  "success": true,
  "message": "Buy order processed successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "account_id": "uuid",
    "transaction_type": "BUY",
    "asset_type": "STOCK",
    "asset_symbol": "OGDC",
    "asset_name": "Oil & Gas Development Company",
    "quantity": 100,
    "price_per_unit": 150.50,
    "total_amount": 15050.00,
    "currency": "PKR",
    "commission": 15.05,
    "taxes": 15.05,
    "total_fees": 30.10,
    "net_amount": 15080.10,
    "status": "pending",
    "market": "PSX",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Process Sell Order

**POST** `/accounts/sell-order`

Process a sell order for any asset type.

#### Request Body
```json
{
  "asset_type": "STOCK",
  "asset_symbol": "OGDC",
  "asset_name": "Oil & Gas Development Company",
  "quantity": 100,
  "price_per_unit": 155.75,
  "currency": "PKR",
  "market": "PSX"
}
```

#### Response
```json
{
  "success": true,
  "message": "Sell order processed successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "account_id": "uuid",
    "transaction_type": "SELL",
    "asset_type": "STOCK",
    "asset_symbol": "OGDC",
    "asset_name": "Oil & Gas Development Company",
    "quantity": 100,
    "price_per_unit": 155.75,
    "total_amount": 15575.00,
    "currency": "PKR",
    "commission": 15.58,
    "taxes": 15.58,
    "total_fees": 31.16,
    "net_amount": 15543.84,
    "status": "pending",
    "market": "PSX",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Execute Trade

**POST** `/accounts/execute-trade`

Execute a pending trade with actual execution details.

#### Request Body
```json
{
  "transaction_id": "uuid",
  "execution_price": 152.25,
  "execution_time": "2024-01-01T10:30:00Z",
  "execution_venue": "PSX"
}
```

#### Response
```json
{
  "success": true,
  "message": "Trade executed successfully",
  "data": {
    "id": "uuid",
    "status": "executed",
    "execution_price": 152.25,
    "execution_time": "2024-01-01T10:30:00Z",
    "execution_venue": "PSX",
    "executed_at": "2024-01-01T10:30:00Z"
  }
}
```

---

## 💳 Payment Processing

### Process Deposit

**POST** `/payments/deposit`

Process a deposit using various payment methods.

#### Request Body (Raast)
```json
{
  "amount": 100000,
  "currency": "PKR",
  "payment_method": "RAAST",
  "payment_provider": "RAAST",
  "raast_reference": "RAAST_123456789"
}
```

#### Request Body (Stripe)
```json
{
  "amount": 1000,
  "currency": "USD",
  "payment_method": "CARD",
  "payment_provider": "STRIPE",
  "payment_method_id": "pm_1234567890"
}
```

#### Response
```json
{
  "success": true,
  "message": "Deposit processed successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "account_id": "uuid",
    "transaction_type": "DEPOSIT",
    "amount": 100000,
    "currency": "PKR",
    "payment_method": "RAAST",
    "payment_provider": "RAAST",
    "provider_transaction_id": "RAAST_123456789",
    "status": "completed",
    "net_amount": 100000,
    "created_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:00:00Z"
  }
}
```

### Process Withdrawal

**POST** `/payments/withdraw`

Process a withdrawal using various payment methods.

#### Request Body
```json
{
  "amount": 50000,
  "currency": "PKR",
  "payment_method": "RAAST",
  "payment_provider": "RAAST",
  "bank_account_id": "bank-account-uuid"
}
```

#### Response
```json
{
  "success": true,
  "message": "Withdrawal processed successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "account_id": "uuid",
    "transaction_type": "WITHDRAWAL",
    "amount": 50000,
    "currency": "PKR",
    "payment_method": "RAAST",
    "payment_provider": "RAAST",
    "provider_transaction_id": "RAAST_987654321",
    "status": "processing",
    "net_amount": 50000,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Get Supported Payment Methods

**GET** `/payments/methods`

Get supported payment methods for a specific country and currency.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| country | string | Yes | Country code (PAK, US, GB, etc.) |
| currency | string | Yes | Currency code (PKR, USD, EUR, etc.) |

#### Response
```json
{
  "success": true,
  "data": [
    {
      "code": "RAAST",
      "name": "Raast Network",
      "operations": ["DEPOSIT", "WITHDRAWAL", "TRANSFER"],
      "limits": {
        "daily_limit": 1000000,
        "monthly_limit": 10000000,
        "max_transaction": 500000
      },
      "fees": {
        "deposit_fee": 0,
        "withdrawal_fee": 0,
        "transfer_fee": 0
      }
    },
    {
      "code": "JAZZCASH",
      "name": "JazzCash",
      "operations": ["DEPOSIT", "WITHDRAWAL"],
      "limits": {
        "daily_limit": 500000,
        "monthly_limit": 5000000,
        "max_transaction": 100000
      },
      "fees": {
        "deposit_fee": 0.01,
        "withdrawal_fee": 0.01,
        "transfer_fee": 0.01
      }
    }
  ]
}
```

---

## 💱 Currency Exchange

### Get Exchange Rate

**GET** `/currencies/exchange-rate`

Get the current exchange rate between two currencies.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | string | Yes | Source currency code |
| to | string | Yes | Target currency code |
| date | string | No | Date in YYYY-MM-DD format (default: today) |

#### Response
```json
{
  "success": true,
  "data": {
    "from_currency": "PKR",
    "to_currency": "USD",
    "exchange_rate": 0.0036,
    "date": "2024-01-01"
  }
}
```

### Convert Currency

**POST** `/currencies/convert`

Convert an amount from one currency to another.

#### Request Body
```json
{
  "amount": 100000,
  "from_currency": "PKR",
  "to_currency": "USD",
  "date": "2024-01-01"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "original_amount": 100000,
    "original_currency": "PKR",
    "converted_amount": 360.00,
    "target_currency": "USD",
    "exchange_rate": 0.0036,
    "conversion_date": "2024-01-01"
  }
}
```

### Get Multiple Exchange Rates

**POST** `/currencies/exchange-rates`

Get exchange rates for multiple currency pairs.

#### Request Body
```json
{
  "base_currency": "USD",
  "target_currencies": ["PKR", "EUR", "GBP"],
  "date": "2024-01-01"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "base_currency": "USD",
    "target_currencies": ["PKR", "EUR", "GBP"],
    "rates": {
      "PKR": 280.0,
      "EUR": 0.92,
      "GBP": 0.78
    },
    "date": "2024-01-01"
  }
}
```

### Get Historical Exchange Rates

**GET** `/currencies/historical-rates`

Get historical exchange rates for a currency pair.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | string | Yes | Source currency code |
| to | string | Yes | Target currency code |
| start_date | string | Yes | Start date in YYYY-MM-DD format |
| end_date | string | Yes | End date in YYYY-MM-DD format |

#### Response
```json
{
  "success": true,
  "data": {
    "from_currency": "PKR",
    "to_currency": "USD",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "rates": [
      {
        "rate_date": "2024-01-01",
        "exchange_rate": 0.0036,
        "source": "SBP"
      },
      {
        "rate_date": "2024-01-02",
        "exchange_rate": 0.0035,
        "source": "SBP"
      }
    ]
  }
}
```

---

## 🔒 Compliance

### KYC Verification

**POST** `/compliance/kyc`

Perform Know Your Customer (KYC) verification.

#### Request Body
```json
{
  "document_type": "CNIC",
  "document_number": "12345-1234567-1",
  "document_image": "base64-encoded-image",
  "personal_info": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-01-01",
    "nationality": "PK",
    "address": {
      "street": "123 Main Street",
      "city": "Karachi",
      "state": "Sindh",
      "postal_code": "75000",
      "country": "PK"
    }
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "KYC verification completed",
  "data": {
    "status": "verified",
    "score": 0.95,
    "details": {
      "document": {
        "verified": true,
        "confidence": 0.98
      },
      "identity": {
        "verified": true,
        "confidence": 0.92
      },
      "address": {
        "verified": true,
        "confidence": 0.88
      },
      "pep": {
        "is_pep": false,
        "confidence": 0.99
      },
      "sanctions": {
        "is_sanctioned": false,
        "confidence": 0.99
      }
    }
  }
}
```

### AML Screening

**POST** `/compliance/aml-screening`

Perform Anti-Money Laundering (AML) screening.

#### Request Body
```json
{
  "amount": 100000,
  "currency": "PKR",
  "transaction_type": "DEPOSIT",
  "counterparty": {
    "name": "John Doe",
    "account_number": "1234567890"
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "AML screening completed",
  "data": {
    "status": "cleared",
    "score": 0.2,
    "details": {
      "transaction": {
        "suspicious": false,
        "score": 0.1
      },
      "customer": {
        "risk_level": "LOW",
        "score": 0.2
      },
      "counterparty": {
        "verified": true,
        "score": 0.3
      },
      "risk": {
        "overall_risk": 0.2,
        "risk_level": "LOW"
      }
    }
  }
}
```

---

## 📊 Transaction History

### Get Transaction History

**GET** `/transactions`

Get transaction history for the authenticated user.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | Transaction type (all, trading, cash, deposit, withdrawal) |
| currency | string | No | Currency code |
| start_date | string | No | Start date in YYYY-MM-DD format |
| end_date | string | No | End date in YYYY-MM-DD format |
| limit | integer | No | Number of records to return (default: 100) |
| offset | integer | No | Number of records to skip (default: 0) |

#### Response
```json
{
  "success": true,
  "data": [
    {
      "transaction_category": "trading",
      "id": "uuid",
      "transaction_type": "BUY",
      "asset_type": "STOCK",
      "asset_symbol": "OGDC",
      "asset_name": "Oil & Gas Development Company",
      "quantity": 100,
      "price_per_unit": 150.50,
      "total_amount": 15050.00,
      "currency": "PKR",
      "net_amount": 15080.10,
      "status": "executed",
      "created_at": "2024-01-01T00:00:00Z",
      "executed_at": "2024-01-01T00:00:00Z"
    },
    {
      "transaction_category": "cash",
      "id": "uuid",
      "transaction_type": "DEPOSIT",
      "amount": 100000,
      "currency": "PKR",
      "payment_method": "RAAST",
      "payment_provider": "RAAST",
      "status": "completed",
      "net_amount": 100000,
      "created_at": "2024-01-01T00:00:00Z",
      "completed_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 🔗 Webhooks

### Payment Gateway Webhooks

**POST** `/webhooks/:gateway`

Handle webhooks from payment gateways.

#### Supported Gateways
- `raast` - Raast Network
- `jazzcash` - JazzCash
- `easypaisa` - EasyPaisa
- `stripe` - Stripe
- `paypal` - PayPal
- `wise` - Wise

#### Webhook Headers
```json
{
  "Content-Type": "application/json",
  "X-Webhook-Signature": "signature",
  "X-Webhook-Timestamp": "timestamp"
}
```

#### Response
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "transaction_id": "uuid",
    "status": "completed",
    "amount": 100000,
    "currency": "PKR"
  }
}
```

---

## 🚀 Real-time Updates

The API supports real-time updates via WebSocket connections.

### WebSocket Events

#### Connection
```javascript
const socket = io('http://localhost:3007');

// Join user room
socket.emit('joinUser', userId);

// Listen for events
socket.on('buyOrderPlaced', (data) => {
  console.log('Buy order placed:', data);
});

socket.on('sellOrderPlaced', (data) => {
  console.log('Sell order placed:', data);
});

socket.on('tradeExecuted', (data) => {
  console.log('Trade executed:', data);
});

socket.on('depositProcessed', (data) => {
  console.log('Deposit processed:', data);
});

socket.on('withdrawalProcessed', (data) => {
  console.log('Withdrawal processed:', data);
});

socket.on('kycCompleted', (data) => {
  console.log('KYC completed:', data);
});

socket.on('amlScreeningCompleted', (data) => {
  console.log('AML screening completed:', data);
});
```

---

## 📝 Rate Limits

The API implements rate limiting to ensure fair usage:

- **General API**: 1000 requests per 15 minutes per IP
- **Payment Processing**: 100 requests per 15 minutes per user
- **Currency Exchange**: 500 requests per 15 minutes per user
- **Compliance**: 50 requests per 15 minutes per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## 🔧 Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

### Common Error Codes
- `INSUFFICIENT_FUNDS` - Not enough balance for transaction
- `INVALID_CURRENCY` - Unsupported currency
- `PAYMENT_FAILED` - Payment processing failed
- `KYC_REQUIRED` - KYC verification required
- `AML_FLAGGED` - Transaction flagged by AML screening
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INVALID_TOKEN` - Invalid or expired JWT token

---

## 📚 SDKs and Libraries

### JavaScript/Node.js
```bash
npm install cash-account-management-sdk
```

```javascript
const CashAccountAPI = require('cash-account-management-sdk');

const api = new CashAccountAPI({
  baseURL: 'http://localhost:3007/api/v1',
  apiKey: 'your-api-key'
});

// Get balance
const balance = await api.accounts.getBalance();

// Process deposit
const deposit = await api.payments.deposit({
  amount: 100000,
  currency: 'PKR',
  payment_method: 'RAAST',
  payment_provider: 'RAAST'
});
```

### Python
```bash
pip install cash-account-management
```

```python
from cash_account_management import CashAccountAPI

api = CashAccountAPI(
    base_url='http://localhost:3007/api/v1',
    api_key='your-api-key'
)

# Get balance
balance = api.accounts.get_balance()

# Process deposit
deposit = api.payments.deposit({
    'amount': 100000,
    'currency': 'PKR',
    'payment_method': 'RAAST',
    'payment_provider': 'RAAST'
})
```

---

## 🆘 Support

For API support and questions:

- **Documentation**: [API Documentation](http://localhost:3007/docs)
- **Status Page**: [System Status](http://localhost:3007/status)
- **Support Email**: support@example.com
- **GitHub Issues**: [Report Issues](https://github.com/your-repo/issues)

---

**Last Updated**: January 2024  
**API Version**: v1.0.0  
**Base URL**: http://localhost:3007/api/v1
