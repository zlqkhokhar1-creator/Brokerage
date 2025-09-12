/**
 * Payment Gateway API Services
 * Centralized payment processing for deposits, withdrawals, and transactions
 */

import { stripeApi, internalApi } from './client';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUTS } from './config';

// Types for payment operations
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal' | 'crypto';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  accountType?: string;
  isDefault: boolean;
  status: 'active' | 'inactive' | 'pending';
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'fee';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethodId?: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  fees?: number;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'cancelled';
  clientSecret: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface DepositRequest {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface WithdrawalRequest {
  amount: number;
  currency: string;
  paymentMethodId: string;
  metadata?: Record<string, any>;
}

/**
 * Payment Service Class
 */
class PaymentService {
  /**
   * Create a payment intent for deposits
   */
  async createDepositIntent(request: DepositRequest): Promise<PaymentIntent> {
    try {
      const response = await internalApi.post(
        API_ENDPOINTS.INTERNAL.PAYMENTS.DEPOSIT,
        request,
        { timeout: API_TIMEOUTS.PAYMENTS }
      );

      if (!response.success) {
        throw new Error(`Failed to create deposit intent: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error creating deposit intent:', error);
      throw error;
    }
  }

  /**
   * Process withdrawal request
   */
  async createWithdrawal(request: WithdrawalRequest): Promise<Transaction> {
    try {
      const response = await internalApi.post(
        API_ENDPOINTS.INTERNAL.PAYMENTS.WITHDRAW,
        request,
        { timeout: API_TIMEOUTS.PAYMENTS }
      );

      if (!response.success) {
        throw new Error(`Failed to create withdrawal: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get user's payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await internalApi.get(
        API_ENDPOINTS.INTERNAL.PAYMENTS.METHODS,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch payment methods: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * Add new payment method
   */
  async addPaymentMethod(paymentMethodData: {
    type: 'card' | 'bank_account';
    tokenId: string; // Token from Stripe Elements or similar
    setAsDefault?: boolean;
  }): Promise<PaymentMethod> {
    try {
      const response = await internalApi.post(
        API_ENDPOINTS.INTERNAL.PAYMENTS.METHODS,
        paymentMethodData,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to add payment method: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const response = await internalApi.delete(
        `${API_ENDPOINTS.INTERNAL.PAYMENTS.METHODS}/${paymentMethodId}`,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to remove payment method: ${response.error}`);
      }
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    limit: number = 50,
    offset: number = 0,
    type?: Transaction['type']
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(type && { type }),
      });

      const response = await internalApi.get(
        `${API_ENDPOINTS.INTERNAL.PAYMENTS.HISTORY}?${params}`,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch transaction history: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    try {
      const response = await internalApi.get(
        `${API_ENDPOINTS.INTERNAL.PAYMENTS.HISTORY}/${transactionId}`,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch transaction: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }

  /**
   * Confirm payment intent (for Stripe)
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<PaymentIntent> {
    try {
      const response = await internalApi.post(
        `/api/payments/confirm-intent`,
        {
          paymentIntentId,
          paymentMethodId,
        },
        { timeout: API_TIMEOUTS.PAYMENTS }
      );

      if (!response.success) {
        throw new Error(`Failed to confirm payment: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  /**
   * Process instant bank transfer (for supported regions)
   */
  async processInstantTransfer(request: {
    amount: number;
    currency: string;
    bankAccountId: string;
    type: 'deposit' | 'withdrawal';
  }): Promise<Transaction> {
    try {
      const response = await internalApi.post(
        '/api/payments/instant-transfer',
        request,
        { timeout: API_TIMEOUTS.PAYMENTS }
      );

      if (!response.success) {
        throw new Error(`Failed to process instant transfer: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error processing instant transfer:', error);
      throw error;
    }
  }

  /**
   * Get payment limits and fees
   */
  async getPaymentLimits(): Promise<{
    deposit: { min: number; max: number; dailyLimit: number };
    withdrawal: { min: number; max: number; dailyLimit: number };
    fees: { deposit: number; withdrawal: number; currency: string };
  }> {
    try {
      const response = await internalApi.get(
        '/api/payments/limits',
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to fetch payment limits: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching payment limits:', error);
      throw error;
    }
  }

  /**
   * Validate payment amount and method
   */
  async validatePayment(request: {
    amount: number;
    currency: string;
    paymentMethodId: string;
    type: 'deposit' | 'withdrawal';
  }): Promise<{
    valid: boolean;
    errors?: string[];
    fees: number;
    estimatedTotal: number;
  }> {
    try {
      const response = await internalApi.post(
        '/api/payments/validate',
        request,
        { timeout: API_TIMEOUTS.DEFAULT }
      );

      if (!response.success) {
        throw new Error(`Failed to validate payment: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error validating payment:', error);
      throw error;
    }
  }

  /**
   * Request refund for a transaction
   */
  async requestRefund(transactionId: string, reason?: string): Promise<Transaction> {
    try {
      const response = await internalApi.post(
        `/api/payments/refund`,
        {
          transactionId,
          reason,
        },
        { timeout: API_TIMEOUTS.PAYMENTS }
      );

      if (!response.success) {
        throw new Error(`Failed to request refund: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error requesting refund:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export { PaymentService };
