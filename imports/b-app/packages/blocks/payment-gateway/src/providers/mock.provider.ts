import { 
  PaymentProvider, 
  PaymentProviderResult,
  InitializePaymentCommand,
  AuthorizePaymentCommand,
  CapturePaymentCommand,
  RefundPaymentCommand,
  GetPaymentCommand,
  PaymentMethod,
  Currency,
  PaymentStatus
} from '../types/index.js';

interface MockPaymentState {
  id: string;
  status: PaymentStatus;
  amount: number;
  authorizedAmount?: number;
  capturedAmount?: number;
  refundedAmount?: number;
  currency: Currency;
  method: PaymentMethod;
  metadata?: Record<string, any>;
}

/**
 * Mock payment provider for testing and development
 * Produces deterministic payment IDs and predictable state transitions
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  readonly supportedMethods: PaymentMethod[] = ['card', 'bank_transfer', 'wallet'];
  readonly supportedCurrencies: Currency[] = ['USD', 'EUR', 'GBP', 'CAD'];

  private payments: Map<string, MockPaymentState> = new Map();
  private counter = 0;

  constructor(private config: { deterministicIds?: boolean } = {}) {}

  async initialize(command: InitializePaymentCommand): Promise<PaymentProviderResult> {
    // Validate currency and method support
    if (!this.supportedCurrencies.includes(command.currency)) {
      return {
        success: false,
        paymentId: '',
        status: 'failed',
        error: `Currency ${command.currency} not supported by mock provider`
      };
    }

    if (!this.supportedMethods.includes(command.method)) {
      return {
        success: false,
        paymentId: '',
        status: 'failed', 
        error: `Payment method ${command.method} not supported by mock provider`
      };
    }

    // Generate deterministic or random payment ID
    const paymentId = this.config.deterministicIds 
      ? `pay_mock_${++this.counter}`
      : `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Create payment state
    const payment: MockPaymentState = {
      id: paymentId,
      status: 'initialized',
      amount: command.amount,
      currency: command.currency,
      method: command.method,
      metadata: command.metadata
    };

    this.payments.set(paymentId, payment);

    console.info('Mock payment initialized', {
      paymentId,
      amount: command.amount,
      currency: command.currency,
      method: command.method
    });

    return {
      success: true,
      paymentId,
      providerPaymentId: paymentId,
      status: 'initialized',
      amount: command.amount,
      metadata: { provider: 'mock', simulatedDelay: 100 }
    };
  }

  async authorize(command: AuthorizePaymentCommand): Promise<PaymentProviderResult> {
    if (command.paymentId) {
      // Authorize existing payment
      const payment = this.payments.get(command.paymentId);
      if (!payment) {
        return {
          success: false,
          paymentId: command.paymentId,
          status: 'failed',
          error: 'Payment not found'
        };
      }

      if (payment.status !== 'initialized') {
        return {
          success: false,
          paymentId: command.paymentId,
          status: payment.status,
          error: `Cannot authorize payment in ${payment.status} status`
        };
      }

      // Mock authorization logic - simulate some failures for testing
      const shouldFail = this.shouldSimulateFailure(payment.amount);
      
      if (shouldFail) {
        payment.status = 'failed';
        return {
          success: false,
          paymentId: command.paymentId,
          status: 'failed',
          error: 'Mock authorization failure (simulated)'
        };
      }

      payment.status = 'authorized';
      payment.authorizedAmount = payment.amount;

      console.info('Mock payment authorized', {
        paymentId: command.paymentId,
        authorizedAmount: payment.authorizedAmount
      });

      return {
        success: true,
        paymentId: command.paymentId,
        providerPaymentId: command.paymentId,
        status: 'authorized',
        amount: payment.authorizedAmount,
        metadata: { provider: 'mock', authorizationCode: 'mock_auth_123' }
      };
    } else {
      // Direct authorization with amount and source
      return {
        success: false,
        paymentId: '',
        status: 'failed',
        error: 'Direct authorization not implemented in mock provider'
      };
    }
  }

  async capture(command: CapturePaymentCommand): Promise<PaymentProviderResult> {
    const payment = this.payments.get(command.paymentId);
    if (!payment) {
      return {
        success: false,
        paymentId: command.paymentId,
        status: 'failed',
        error: 'Payment not found'
      };
    }

    if (payment.status !== 'authorized') {
      return {
        success: false,
        paymentId: command.paymentId,
        status: payment.status,
        error: `Cannot capture payment in ${payment.status} status`
      };
    }

    const captureAmount = command.amount || payment.authorizedAmount || 0;
    const maxCapturable = payment.authorizedAmount || 0;

    if (captureAmount > maxCapturable) {
      return {
        success: false,
        paymentId: command.paymentId,
        status: payment.status,
        error: `Capture amount ${captureAmount} exceeds authorized amount ${maxCapturable}`
      };
    }

    payment.status = 'captured';
    payment.capturedAmount = captureAmount;

    console.info('Mock payment captured', {
      paymentId: command.paymentId,
      capturedAmount: captureAmount
    });

    return {
      success: true,
      paymentId: command.paymentId,
      providerPaymentId: command.paymentId,
      status: 'captured',
      amount: captureAmount,
      metadata: { provider: 'mock', captureCode: 'mock_cap_456' }
    };
  }

  async refund(command: RefundPaymentCommand): Promise<PaymentProviderResult> {
    const payment = this.payments.get(command.paymentId);
    if (!payment) {
      return {
        success: false,
        paymentId: command.paymentId,
        status: 'failed',
        error: 'Payment not found'
      };
    }

    if (payment.status !== 'captured') {
      return {
        success: false,
        paymentId: command.paymentId,
        status: payment.status,
        error: `Cannot refund payment in ${payment.status} status`
      };
    }

    const refundAmount = command.amount || payment.capturedAmount || 0;
    const maxRefundable = (payment.capturedAmount || 0) - (payment.refundedAmount || 0);

    if (refundAmount > maxRefundable) {
      return {
        success: false,
        paymentId: command.paymentId,
        status: payment.status,
        error: `Refund amount ${refundAmount} exceeds refundable amount ${maxRefundable}`
      };
    }

    payment.status = 'refunded';
    payment.refundedAmount = (payment.refundedAmount || 0) + refundAmount;

    console.info('Mock payment refunded', {
      paymentId: command.paymentId,
      refundAmount: refundAmount,
      totalRefunded: payment.refundedAmount
    });

    return {
      success: true,
      paymentId: command.paymentId,
      providerPaymentId: command.paymentId,
      status: 'refunded',
      amount: refundAmount,
      metadata: { provider: 'mock', refundCode: 'mock_ref_789' }
    };
  }

  async get(command: GetPaymentCommand): Promise<PaymentProviderResult> {
    const payment = this.payments.get(command.paymentId);
    if (!payment) {
      return {
        success: false,
        paymentId: command.paymentId,
        status: 'failed',
        error: 'Payment not found'
      };
    }

    return {
      success: true,
      paymentId: command.paymentId,
      providerPaymentId: command.paymentId,
      status: payment.status,
      amount: payment.amount,
      metadata: {
        provider: 'mock',
        authorizedAmount: payment.authorizedAmount,
        capturedAmount: payment.capturedAmount,
        refundedAmount: payment.refundedAmount,
        originalMetadata: payment.metadata
      }
    };
  }

  /**
   * Simulate failures for testing purposes
   */
  private shouldSimulateFailure(amount: number): boolean {
    // Simulate failure for specific amounts to enable testing
    if (amount === 666.66) return true; // Evil amount always fails
    if (amount === 999.99) return true; // High amount fails
    
    // Random 5% failure rate for other amounts
    return Math.random() < 0.05;
  }

  /**
   * Get provider statistics
   */
  getStats(): { paymentCount: number; statusBreakdown: Record<PaymentStatus, number> } {
    const statusBreakdown = {} as Record<PaymentStatus, number>;
    
    this.payments.forEach(payment => {
      statusBreakdown[payment.status] = (statusBreakdown[payment.status] || 0) + 1;
    });

    return {
      paymentCount: this.payments.size,
      statusBreakdown
    };
  }

  /**
   * Clear all payments (for testing)
   */
  clear(): void {
    this.payments.clear();
    this.counter = 0;
  }
}