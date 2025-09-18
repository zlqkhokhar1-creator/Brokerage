const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');

class PaymentGatewayService extends EventEmitter {
  constructor() {
    super();
    this.gateways = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      await this.loadPaymentProviders();
      this._initialized = true;
      logger.info('PaymentGatewayService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PaymentGatewayService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('PaymentGatewayService closed');
    } catch (error) {
      logger.error('Error closing PaymentGatewayService:', error);
    }
  }

  async loadPaymentProviders() {
    try {
      const result = await pool.query(`
        SELECT * FROM payment_providers 
        WHERE is_active = true 
        ORDER BY provider_name
      `);

      for (const provider of result.rows) {
        this.gateways.set(provider.provider_code, provider);
      }

      logger.info(`Loaded ${result.rows.length} payment providers`);
    } catch (error) {
      logger.error('Error loading payment providers:', error);
      throw error;
    }
  }

  // Process payment through specific gateway
  async processPayment(gatewayCode, paymentData) {
    try {
      const gateway = this.gateways.get(gatewayCode);
      if (!gateway) {
        throw new Error(`Payment gateway not found: ${gatewayCode}`);
      }

      const processor = this.getGatewayProcessor(gatewayCode);
      if (!processor) {
        throw new Error(`Payment processor not implemented for: ${gatewayCode}`);
      }

      const result = await processor.processPayment(paymentData, gateway);
      
      // Log gateway transaction
      await this.logGatewayTransaction({
        user_id: paymentData.user_id,
        gateway_code: gatewayCode,
        transaction_type: paymentData.transaction_type,
        amount: paymentData.amount,
        currency: paymentData.currency,
        gateway_transaction_id: result.transaction_id,
        gateway_reference: result.reference,
        status: result.status,
        gateway_response: result.response
      });

      return result;
    } catch (error) {
      logger.error(`Error processing payment through ${gatewayCode}:`, error);
      throw error;
    }
  }

  // Get gateway processor instance
  getGatewayProcessor(gatewayCode) {
    const processors = {
      'RAAST': new RaastProcessor(),
      'JAZZCASH': new JazzCashProcessor(),
      'EASYPAISA': new EasyPaisaProcessor(),
      'STRIPE': new StripeProcessor(),
      'PAYPAL': new PayPalProcessor(),
      'WISE': new WiseProcessor(),
      'SQUARE': new SquareProcessor(),
      'BRAINTREE': new BraintreeProcessor()
    };

    return processors[gatewayCode];
  }

  // Log gateway transaction
  async logGatewayTransaction(transactionData) {
    try {
      await pool.query(`
        INSERT INTO payment_gateway_transactions (
          user_id, gateway_transaction_id, gateway_reference, gateway_status,
          amount, currency, payment_method, gateway_response
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        transactionData.user_id,
        transactionData.gateway_transaction_id,
        transactionData.gateway_reference,
        transactionData.status,
        transactionData.amount,
        transactionData.currency,
        transactionData.transaction_type,
        JSON.stringify(transactionData.gateway_response)
      ]);
    } catch (error) {
      logger.error('Error logging gateway transaction:', error);
    }
  }

  // Handle webhook from payment gateway
  async handleWebhook(gatewayCode, webhookData) {
    try {
      const gateway = this.gateways.get(gatewayCode);
      if (!gateway) {
        throw new Error(`Payment gateway not found: ${gatewayCode}`);
      }

      const processor = this.getGatewayProcessor(gatewayCode);
      const result = await processor.handleWebhook(webhookData, gateway);

      // Emit event for real-time updates
      this.emit('webhookReceived', {
        gateway: gatewayCode,
        transaction_id: result.transaction_id,
        status: result.status,
        data: result
      });

      return result;
    } catch (error) {
      logger.error(`Error handling webhook from ${gatewayCode}:`, error);
      throw error;
    }
  }

  // Get supported payment methods for country/currency
  async getSupportedPaymentMethods(country, currency) {
    try {
      const result = await pool.query(`
        SELECT provider_code, provider_name, supported_operations, limits, fees
        FROM payment_providers 
        WHERE country = $1 AND currency = $2 AND is_active = true
        ORDER BY provider_name
      `, [country, currency]);

      return result.rows.map(provider => ({
        code: provider.provider_code,
        name: provider.provider_name,
        operations: provider.supported_operations,
        limits: provider.limits,
        fees: provider.fees
      }));
    } catch (error) {
      logger.error('Error getting supported payment methods:', error);
      throw error;
    }
  }

  // Validate payment method
  async validatePaymentMethod(gatewayCode, paymentData) {
    try {
      const gateway = this.gateways.get(gatewayCode);
      if (!gateway) {
        throw new Error(`Payment gateway not found: ${gatewayCode}`);
      }

      const processor = this.getGatewayProcessor(gatewayCode);
      return await processor.validatePayment(paymentData, gateway);
    } catch (error) {
      logger.error(`Error validating payment method ${gatewayCode}:`, error);
      throw error;
    }
  }
}

// Base Gateway Processor
class BaseGatewayProcessor {
  constructor() {
    this.timeout = 30000;
    this.retryAttempts = 3;
  }

  async processPayment(paymentData, gateway) {
    throw new Error('processPayment method must be implemented');
  }

  async handleWebhook(webhookData, gateway) {
    throw new Error('handleWebhook method must be implemented');
  }

  async validatePayment(paymentData, gateway) {
    throw new Error('validatePayment method must be implemented');
  }

  async makeRequest(url, data, headers = {}) {
    try {
      const response = await axios({
        method: 'POST',
        url: url,
        data: data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: this.timeout
      });

      return response.data;
    } catch (error) {
      logger.error('Gateway request failed:', error);
      throw error;
    }
  }

  generateSignature(data, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  verifySignature(signature, data, secret) {
    const expectedSignature = this.generateSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

// Raast Network Processor (Pakistani Government Payment System)
class RaastProcessor extends BaseGatewayProcessor {
  async processPayment(paymentData, gateway) {
    try {
      const config = gateway.configuration;
      const apiUrl = config.api_base_url;
      
      const requestData = {
        transaction_id: this.generateTransactionId(),
        amount: paymentData.amount,
        currency: paymentData.currency,
        sender_iban: paymentData.sender_iban,
        receiver_iban: paymentData.receiver_iban,
        reference: paymentData.reference,
        description: paymentData.description || 'Investment deposit',
        timestamp: moment().toISOString()
      };

      // Add signature
      const signature = this.generateSignature(requestData, config.api_secret);
      requestData.signature = signature;

      const response = await this.makeRequest(
        `${apiUrl}/process`,
        requestData,
        {
          'Authorization': `Bearer ${config.api_key}`,
          'X-API-Version': '1.0'
        }
      );

      return {
        transaction_id: response.transaction_id,
        reference: response.reference,
        status: response.status,
        response: response
      };
    } catch (error) {
      logger.error('Raast payment processing failed:', error);
      throw error;
    }
  }

  async handleWebhook(webhookData, gateway) {
    try {
      // Verify webhook signature
      const signature = webhookData.headers['x-raast-signature'];
      const isValid = this.verifySignature(
        signature,
        webhookData.body,
        gateway.configuration.api_secret
      );

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const data = webhookData.body;
      
      return {
        transaction_id: data.transaction_id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        reference: data.reference
      };
    } catch (error) {
      logger.error('Raast webhook handling failed:', error);
      throw error;
    }
  }

  async validatePayment(paymentData, gateway) {
    // Validate Raast payment data
    const requiredFields = ['amount', 'currency', 'sender_iban', 'receiver_iban'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate IBAN format
    if (!this.isValidPakistaniIBAN(paymentData.sender_iban)) {
      throw new Error('Invalid sender IBAN format');
    }

    if (!this.isValidPakistaniIBAN(paymentData.receiver_iban)) {
      throw new Error('Invalid receiver IBAN format');
    }

    return { valid: true };
  }

  isValidPakistaniIBAN(iban) {
    // Pakistani IBAN format: PK + 2 check digits + 4 bank code + 16 account number
    const ibanRegex = /^PK[0-9]{2}[A-Z]{4}[0-9]{16}$/;
    return ibanRegex.test(iban);
  }

  generateTransactionId() {
    return `RAAST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// JazzCash Processor (Pakistani Digital Wallet)
class JazzCashProcessor extends BaseGatewayProcessor {
  async processPayment(paymentData, gateway) {
    try {
      const config = gateway.configuration;
      const apiUrl = config.api_base_url;
      
      const requestData = {
        merchant_id: config.merchant_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        order_id: this.generateOrderId(),
        customer_phone: paymentData.customer_phone,
        customer_email: paymentData.customer_email,
        description: paymentData.description || 'Investment deposit',
        return_url: config.return_url,
        cancel_url: config.cancel_url
      };

      // Add signature
      const signature = this.generateSignature(requestData, config.api_secret);
      requestData.signature = signature;

      const response = await this.makeRequest(
        `${apiUrl}/payment/request`,
        requestData,
        {
          'Authorization': `Bearer ${config.api_key}`,
          'X-Merchant-ID': config.merchant_id
        }
      );

      return {
        transaction_id: response.transaction_id,
        reference: response.order_id,
        status: response.status,
        payment_url: response.payment_url,
        response: response
      };
    } catch (error) {
      logger.error('JazzCash payment processing failed:', error);
      throw error;
    }
  }

  async handleWebhook(webhookData, gateway) {
    try {
      const data = webhookData.body;
      
      return {
        transaction_id: data.transaction_id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        reference: data.order_id
      };
    } catch (error) {
      logger.error('JazzCash webhook handling failed:', error);
      throw error;
    }
  }

  async validatePayment(paymentData, gateway) {
    const requiredFields = ['amount', 'currency', 'customer_phone'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return { valid: true };
  }

  generateOrderId() {
    return `JC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// EasyPaisa Processor (Pakistani Digital Wallet)
class EasyPaisaProcessor extends BaseGatewayProcessor {
  async processPayment(paymentData, gateway) {
    try {
      const config = gateway.configuration;
      const apiUrl = config.api_base_url;
      
      const requestData = {
        merchant_id: config.merchant_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        order_id: this.generateOrderId(),
        customer_phone: paymentData.customer_phone,
        customer_email: paymentData.customer_email,
        description: paymentData.description || 'Investment deposit'
      };

      const response = await this.makeRequest(
        `${apiUrl}/payment/initiate`,
        requestData,
        {
          'Authorization': `Bearer ${config.api_key}`,
          'X-Merchant-ID': config.merchant_id
        }
      );

      return {
        transaction_id: response.transaction_id,
        reference: response.order_id,
        status: response.status,
        response: response
      };
    } catch (error) {
      logger.error('EasyPaisa payment processing failed:', error);
      throw error;
    }
  }

  async handleWebhook(webhookData, gateway) {
    try {
      const data = webhookData.body;
      
      return {
        transaction_id: data.transaction_id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        reference: data.order_id
      };
    } catch (error) {
      logger.error('EasyPaisa webhook handling failed:', error);
      throw error;
    }
  }

  async validatePayment(paymentData, gateway) {
    const requiredFields = ['amount', 'currency', 'customer_phone'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return { valid: true };
  }

  generateOrderId() {
    return `EP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Stripe Processor (International Card Processing)
class StripeProcessor extends BaseGatewayProcessor {
  async processPayment(paymentData, gateway) {
    try {
      const config = gateway.configuration;
      const apiUrl = config.api_base_url;
      
      const requestData = {
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency.toLowerCase(),
        source: paymentData.payment_method_id,
        description: paymentData.description || 'Investment deposit',
        metadata: {
          user_id: paymentData.user_id,
          transaction_type: paymentData.transaction_type
        }
      };

      const response = await this.makeRequest(
        `${apiUrl}/v1/charges`,
        requestData,
        {
          'Authorization': `Bearer ${config.secret_key}`,
          'Stripe-Version': '2020-08-27'
        }
      );

      return {
        transaction_id: response.id,
        reference: response.id,
        status: response.status === 'succeeded' ? 'completed' : 'failed',
        response: response
      };
    } catch (error) {
      logger.error('Stripe payment processing failed:', error);
      throw error;
    }
  }

  async handleWebhook(webhookData, gateway) {
    try {
      const data = webhookData.body;
      
      return {
        transaction_id: data.id,
        status: data.status === 'succeeded' ? 'completed' : 'failed',
        amount: data.amount / 100, // Convert from cents
        currency: data.currency.toUpperCase(),
        reference: data.id
      };
    } catch (error) {
      logger.error('Stripe webhook handling failed:', error);
      throw error;
    }
  }

  async validatePayment(paymentData, gateway) {
    const requiredFields = ['amount', 'currency', 'payment_method_id'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return { valid: true };
  }
}

// PayPal Processor (International Digital Wallet)
class PayPalProcessor extends BaseGatewayProcessor {
  async processPayment(paymentData, gateway) {
    try {
      const config = gateway.configuration;
      const apiUrl = config.api_base_url;
      
      // First, create payment
      const paymentData_paypal = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        transactions: [{
          amount: {
            total: paymentData.amount.toString(),
            currency: paymentData.currency
          },
          description: paymentData.description || 'Investment deposit'
        }],
        redirect_urls: {
          return_url: config.return_url,
          cancel_url: config.cancel_url
        }
      };

      const response = await this.makeRequest(
        `${apiUrl}/v1/payments/payment`,
        paymentData_paypal,
        {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json'
        }
      );

      return {
        transaction_id: response.id,
        reference: response.id,
        status: 'pending',
        approval_url: response.links.find(link => link.rel === 'approval_url')?.href,
        response: response
      };
    } catch (error) {
      logger.error('PayPal payment processing failed:', error);
      throw error;
    }
  }

  async handleWebhook(webhookData, gateway) {
    try {
      const data = webhookData.body;
      
      return {
        transaction_id: data.id,
        status: data.state === 'approved' ? 'completed' : 'failed',
        amount: parseFloat(data.transactions[0].amount.total),
        currency: data.transactions[0].amount.currency,
        reference: data.id
      };
    } catch (error) {
      logger.error('PayPal webhook handling failed:', error);
      throw error;
    }
  }

  async validatePayment(paymentData, gateway) {
    const requiredFields = ['amount', 'currency'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return { valid: true };
  }
}

// Wise Processor (International Money Transfer)
class WiseProcessor extends BaseGatewayProcessor {
  async processPayment(paymentData, gateway) {
    try {
      const config = gateway.configuration;
      const apiUrl = config.api_base_url;
      
      const requestData = {
        targetCurrency: paymentData.currency,
        sourceCurrency: paymentData.source_currency || paymentData.currency,
        targetAmount: paymentData.amount,
        sourceAmount: paymentData.source_amount || paymentData.amount,
        recipient: {
          name: paymentData.recipient_name,
          accountDetails: {
            iban: paymentData.iban,
            address: paymentData.address
          }
        },
        reference: paymentData.reference || `Investment ${paymentData.transaction_type}`
      };

      const response = await this.makeRequest(
        `${apiUrl}/v1/transfers`,
        requestData,
        {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json'
        }
      );

      return {
        transaction_id: response.id,
        reference: response.reference,
        status: response.status,
        response: response
      };
    } catch (error) {
      logger.error('Wise payment processing failed:', error);
      throw error;
    }
  }

  async handleWebhook(webhookData, gateway) {
    try {
      const data = webhookData.body;
      
      return {
        transaction_id: data.id,
        status: data.status,
        amount: parseFloat(data.targetAmount),
        currency: data.targetCurrency,
        reference: data.reference
      };
    } catch (error) {
      logger.error('Wise webhook handling failed:', error);
      throw error;
    }
  }

  async validatePayment(paymentData, gateway) {
    const requiredFields = ['amount', 'currency', 'iban', 'recipient_name'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return { valid: true };
  }
}

// Square Processor (International Card Processing)
class SquareProcessor extends BaseGatewayProcessor {
  async processPayment(paymentData, gateway) {
    try {
      const config = gateway.configuration;
      const apiUrl = config.api_base_url;
      
      const requestData = {
        source_id: paymentData.payment_method_id,
        amount_money: {
          amount: Math.round(paymentData.amount * 100), // Convert to cents
          currency: paymentData.currency
        },
        idempotency_key: this.generateIdempotencyKey(),
        reference_id: paymentData.reference_id
      };

      const response = await this.makeRequest(
        `${apiUrl}/v2/payments`,
        requestData,
        {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json'
        }
      );

      return {
        transaction_id: response.payment.id,
        reference: response.payment.reference_id,
        status: response.payment.status === 'COMPLETED' ? 'completed' : 'failed',
        response: response
      };
    } catch (error) {
      logger.error('Square payment processing failed:', error);
      throw error;
    }
  }

  async handleWebhook(webhookData, gateway) {
    try {
      const data = webhookData.body;
      
      return {
        transaction_id: data.id,
        status: data.status === 'COMPLETED' ? 'completed' : 'failed',
        amount: parseFloat(data.amount_money.amount) / 100, // Convert from cents
        currency: data.amount_money.currency,
        reference: data.reference_id
      };
    } catch (error) {
      logger.error('Square webhook handling failed:', error);
      throw error;
    }
  }

  async validatePayment(paymentData, gateway) {
    const requiredFields = ['amount', 'currency', 'payment_method_id'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return { valid: true };
  }

  generateIdempotencyKey() {
    return `SQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Braintree Processor (International Card Processing)
class BraintreeProcessor extends BaseGatewayProcessor {
  async processPayment(paymentData, gateway) {
    try {
      const config = gateway.configuration;
      const apiUrl = config.api_base_url;
      
      const requestData = {
        amount: paymentData.amount,
        payment_method_nonce: paymentData.payment_method_id,
        merchant_account_id: config.merchant_account_id,
        options: {
          submit_for_settlement: true
        }
      };

      const response = await this.makeRequest(
        `${apiUrl}/v1/transactions`,
        requestData,
        {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json'
        }
      );

      return {
        transaction_id: response.transaction.id,
        reference: response.transaction.id,
        status: response.transaction.status === 'settled' ? 'completed' : 'failed',
        response: response
      };
    } catch (error) {
      logger.error('Braintree payment processing failed:', error);
      throw error;
    }
  }

  async handleWebhook(webhookData, gateway) {
    try {
      const data = webhookData.body;
      
      return {
        transaction_id: data.id,
        status: data.status === 'settled' ? 'completed' : 'failed',
        amount: parseFloat(data.amount),
        currency: data.currency_iso_code,
        reference: data.id
      };
    } catch (error) {
      logger.error('Braintree webhook handling failed:', error);
      throw error;
    }
  }

  async validatePayment(paymentData, gateway) {
    const requiredFields = ['amount', 'payment_method_id'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return { valid: true };
  }
}

module.exports = PaymentGatewayService;
