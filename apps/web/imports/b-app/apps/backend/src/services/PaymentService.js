/**
 * Enhanced Payment Service with Idempotency and Ledger Integration
 */

const { logger } = require('../utils/logger');
const db = require('../config/database');
const featureFlags = require('../config/featureFlags');

// Import TypeScript repositories
let PaymentRepository, IdempotencyRepository, LedgerRepository;
try {
  // Try to load via ts-node
  const tsNode = require('ts-node').register();
  const { PaymentRepository: PaymentRepo } = require('../repositories/PaymentRepository.ts');
  const { IdempotencyRepository: IdempotencyRepo } = require('../repositories/IdempotencyRepository.ts');
  const { LedgerRepository: LedgerRepo } = require('../repositories/LedgerRepository.ts');
  
  PaymentRepository = PaymentRepo;
  IdempotencyRepository = IdempotencyRepo;
  LedgerRepository = LedgerRepo;
} catch (error) {
  logger.warn('TypeScript payment repositories not available, using legacy payments only');
}

class PaymentService {
  constructor() {
    this.paymentRepo = PaymentRepository ? new PaymentRepository() : null;
    this.idempotencyRepo = IdempotencyRepository ? new IdempotencyRepository() : null;
    this.ledgerRepo = LedgerRepository ? new LedgerRepository() : null;
  }

  /**
   * Initialize a payment with idempotency support
   */
  async initializePayment(paymentData, idempotencyKey = null) {
    const { userId, amountMinor, currency, paymentMethodId, metadata = {} } = paymentData;
    
    try {
      // Handle idempotency if enabled and key provided
      if (idempotencyKey && this.idempotencyRepo && featureFlags.FEATURE_IDEMPOTENCY_ENABLED) {
        return await this.initializePaymentWithIdempotency(paymentData, idempotencyKey);
      }

      // Direct payment initialization
      return await this.createPayment(paymentData);

    } catch (error) {
      logger.error('Payment initialization failed', { 
        error: error.message, 
        userId, 
        amountMinor: amountMinor?.toString(),
        currency,
        idempotencyKey
      });
      throw error;
    }
  }

  /**
   * Initialize payment with idempotency checking
   */
  async initializePaymentWithIdempotency(paymentData, idempotencyKey) {
    const scope = 'payment_initialize';
    
    // Check if response already exists
    const existingResponse = await this.idempotencyRepo.getStoredResponse(scope, idempotencyKey);
    if (existingResponse) {
      logger.info('Returning cached payment response', { 
        idempotencyKey, 
        statusCode: existingResponse.statusCode 
      });
      return {
        fromCache: true,
        statusCode: existingResponse.statusCode,
        data: existingResponse.response
      };
    }

    // Reserve idempotency key
    const reserved = await this.idempotencyRepo.reserveKey(scope, idempotencyKey);
    if (!reserved) {
      // Key already reserved by another request
      throw new Error('Payment request already in progress');
    }

    try {
      // Create the payment
      const result = await this.createPayment(paymentData);
      
      // Store successful response
      await this.idempotencyRepo.storeResponse(scope, idempotencyKey, {
        statusCode: 201,
        response: result
      });

      return {
        fromCache: false,
        statusCode: 201,
        data: result
      };

    } catch (error) {
      // Store error response for idempotency
      await this.idempotencyRepo.storeResponse(scope, idempotencyKey, {
        statusCode: 400,
        response: { error: error.message }
      });
      throw error;
    }
  }

  /**
   * Create payment using new or legacy system
   */
  async createPayment(paymentData) {
    const { userId, amountMinor, currency, paymentMethodId, externalId, metadata = {} } = paymentData;

    if (this.paymentRepo && featureFlags.FEATURE_DUAL_WRITE_PAYMENTS) {
      // Use new repository
      const payment = await this.paymentRepo.initializePayment({
        userId,
        amountMinor: BigInt(amountMinor),
        currency,
        paymentMethodId,
        externalId,
        metadata
      });

      logger.info('Payment created with new repository', { 
        paymentId: payment.id, 
        userId, 
        amountMinor: amountMinor.toString(),
        currency 
      });

      // Dual-write to legacy system if needed
      try {
        await this.createLegacyPayment(paymentData);
        logger.info('Payment dual-written to legacy system', { paymentId: payment.id });
      } catch (legacyError) {
        logger.warn('Legacy payment creation failed during dual-write', {
          error: legacyError.message,
          paymentId: payment.id
        });
      }

      return this.formatPaymentResponse(payment);
    } else {
      // Use legacy payment creation
      return await this.createLegacyPayment(paymentData);
    }
  }

  /**
   * Update payment status with ledger integration
   */
  async updatePaymentStatus(paymentId, status, metadata = {}) {
    try {
      let payment = null;

      if (this.paymentRepo && featureFlags.FEATURE_DUAL_WRITE_PAYMENTS) {
        // Update using new repository
        payment = await this.paymentRepo.updateStatus(paymentId, status, metadata);
        
        if (!payment) {
          throw new Error('Payment not found');
        }

        // Create ledger entries for specific status changes
        if (featureFlags.FEATURE_LEDGER_ENABLED && this.ledgerRepo) {
          await this.createLedgerEntriesForStatusChange(payment, status);
        }

        // Dual-write status update to legacy system
        if (featureFlags.FEATURE_DUAL_WRITE_PAYMENTS) {
          try {
            await this.updateLegacyPaymentStatus(paymentId, status, metadata);
          } catch (legacyError) {
            logger.warn('Legacy payment status update failed', {
              error: legacyError.message,
              paymentId,
              status
            });
          }
        }

        return this.formatPaymentResponse(payment);
      } else {
        // Legacy status update
        return await this.updateLegacyPaymentStatus(paymentId, status, metadata);
      }

    } catch (error) {
      logger.error('Payment status update failed', {
        error: error.message,
        paymentId,
        status
      });
      throw error;
    }
  }

  /**
   * Create ledger entries for payment status changes
   */
  async createLedgerEntriesForStatusChange(payment, newStatus) {
    const userId = payment.user_id;
    const amountMinor = BigInt(payment.amount_minor);
    const currency = payment.currency;

    try {
      switch (newStatus) {
        case 'captured':
          // Credit user's account when payment is captured
          await this.ledgerRepo.recordTransaction({
            paymentId: payment.id,
            entityType: 'user',
            entityId: userId,
            amountMinor,
            currency,
            direction: 'credit',
            description: `Payment ${payment.id} captured`,
            metadata: { paymentStatus: newStatus }
          });
          
          logger.info('Ledger entry created for payment capture', {
            paymentId: payment.id,
            userId,
            amountMinor: amountMinor.toString(),
            currency
          });
          break;

        case 'refunded':
          // Debit user's account when payment is refunded
          await this.ledgerRepo.recordTransaction({
            paymentId: payment.id,
            entityType: 'user',
            entityId: userId,
            amountMinor,
            currency,
            direction: 'debit',
            description: `Payment ${payment.id} refunded`,
            metadata: { paymentStatus: newStatus }
          });
          
          logger.info('Ledger entry created for payment refund', {
            paymentId: payment.id,
            userId,
            amountMinor: amountMinor.toString(),
            currency
          });
          break;

        default:
          // No ledger entries needed for other status changes
          break;
      }
    } catch (error) {
      logger.error('Failed to create ledger entries for payment status change', {
        error: error.message,
        paymentId: payment.id,
        newStatus
      });
      // Don't throw error - ledger failure shouldn't break payment flow
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId) {
    if (this.paymentRepo && featureFlags.FEATURE_DUAL_WRITE_PAYMENTS) {
      const payment = await this.paymentRepo.getPaymentById(paymentId);
      return payment ? this.formatPaymentResponse(payment) : null;
    } else {
      return await this.getLegacyPaymentById(paymentId);
    }
  }

  /**
   * Get payments for user
   */
  async getPaymentsForUser(userId, limit = 50, offset = 0) {
    if (this.paymentRepo && featureFlags.FEATURE_DUAL_WRITE_PAYMENTS) {
      const payments = await this.paymentRepo.getPaymentsByUserId(userId, limit, offset);
      return payments.map(p => this.formatPaymentResponse(p));
    } else {
      return await this.getLegacyPaymentsForUser(userId, limit, offset);
    }
  }

  /**
   * Get user's ledger balance
   */
  async getUserBalance(userId, currency = 'USD') {
    if (this.ledgerRepo && featureFlags.FEATURE_LEDGER_ENABLED) {
      const balance = await this.ledgerRepo.getBalance('user', userId, currency);
      return {
        balance: balance.toString(),
        currency,
        timestamp: new Date()
      };
    } else {
      // Fallback to legacy balance calculation
      return await this.getLegacyUserBalance(userId, currency);
    }
  }

  /**
   * Legacy payment creation
   */
  async createLegacyPayment(paymentData) {
    // Implementation would depend on existing payment system
    logger.info('Creating legacy payment', { paymentData });
    throw new Error('Legacy payment creation not implemented');
  }

  /**
   * Legacy payment status update
   */
  async updateLegacyPaymentStatus(paymentId, status, metadata) {
    // Implementation would depend on existing payment system
    logger.info('Updating legacy payment status', { paymentId, status });
    throw new Error('Legacy payment status update not implemented');
  }

  /**
   * Legacy payment lookup
   */
  async getLegacyPaymentById(paymentId) {
    // Implementation would depend on existing payment system
    return null;
  }

  /**
   * Legacy user payments lookup
   */
  async getLegacyPaymentsForUser(userId, limit, offset) {
    // Implementation would depend on existing payment system
    return [];
  }

  /**
   * Legacy user balance calculation
   */
  async getLegacyUserBalance(userId, currency) {
    // Implementation would depend on existing balance system
    return {
      balance: '0',
      currency,
      timestamp: new Date()
    };
  }

  /**
   * Format payment response for API
   */
  formatPaymentResponse(payment) {
    return {
      id: payment.id,
      userId: payment.user_id,
      amount: {
        minor: payment.amount_minor,
        currency: payment.currency
      },
      status: payment.status,
      paymentMethodId: payment.payment_method_id,
      externalId: payment.external_id,
      metadata: payment.metadata,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at
    };
  }
}

module.exports = { PaymentService };