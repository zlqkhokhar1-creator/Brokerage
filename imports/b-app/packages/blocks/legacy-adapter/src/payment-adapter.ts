import { 
  LegacyPaymentResponse, 
  DeprecationWarning 
} from './types.js';

// Import types from payment gateway block
export interface PaymentGatewayBlock {
  initializePayment: {
    execute(command: any, idempotencyKey?: string, traceId?: string): Promise<any>;
  };
  authorizePayment: {
    execute(command: any, idempotencyKey?: string, traceId?: string): Promise<any>;
  };
  capturePayment: {
    execute(command: any, traceId?: string): Promise<any>;
  };
  getPayment: {
    execute(command: any, traceId?: string): Promise<any>;
  };
}

/**
 * Legacy adapter for payment operations - delegates to payment gateway block
 * @deprecated Use payment gateway block directly for new integrations
 */
export class LegacyPaymentAdapter {
  constructor(private paymentGateway: PaymentGatewayBlock) {}

  /**
   * Create payment (legacy endpoint)
   * @deprecated Use payment gateway InitializePayment command directly
   */
  async createPayment(paymentData: {
    amount: number;
    currency: string;
    method?: string;
  }, traceId?: string): Promise<LegacyPaymentResponse> {
    
    this.logDeprecationWarning({
      command: 'CreatePayment',
      reason: 'Legacy payment creation endpoint',
      replacement: 'Use payment gateway InitializePayment command',
      deprecatedSince: '2024-01-01'
    });

    try {
      // Delegate to payment gateway block
      const result = await this.paymentGateway.initializePayment.execute({
        amount: paymentData.amount,
        currency: paymentData.currency as any,
        method: (paymentData.method || 'card') as any
      }, undefined, traceId);

      // Get payment details for full response
      const payment = await this.paymentGateway.getPayment.execute({
        paymentId: result.paymentId
      }, traceId);

      // Convert to legacy format
      return {
        id: result.paymentId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: result.status,
        createdAt: payment.payment.createdAt.toISOString(),
        updatedAt: payment.payment.updatedAt.toISOString()
      };

    } catch (error) {
      console.error('Legacy CreatePayment failed', {
        amount: paymentData.amount,
        currency: paymentData.currency,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });
      throw error;
    }
  }

  /**
   * Process payment (legacy endpoint)
   * @deprecated Use payment gateway AuthorizePayment + CapturePayment commands
   */
  async processPayment(paymentId: string, traceId?: string): Promise<LegacyPaymentResponse> {
    this.logDeprecationWarning({
      command: 'ProcessPayment',
      reason: 'Legacy payment processing endpoint',
      replacement: 'Use payment gateway AuthorizePayment and CapturePayment commands',
      deprecatedSince: '2024-01-01'
    });

    try {
      // Authorize payment
      const authResult = await this.paymentGateway.authorizePayment.execute({
        paymentId
      }, undefined, traceId);

      // Capture payment
      const captureResult = await this.paymentGateway.capturePayment.execute({
        paymentId
      }, traceId);

      // Get updated payment details
      const payment = await this.paymentGateway.getPayment.execute({
        paymentId
      }, traceId);

      // Convert to legacy format
      return {
        id: paymentId,
        amount: payment.payment.amount,
        currency: payment.payment.currency,
        status: captureResult.status,
        createdAt: payment.payment.createdAt.toISOString(),
        updatedAt: payment.payment.updatedAt.toISOString()
      };

    } catch (error) {
      console.error('Legacy ProcessPayment failed', {
        paymentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });
      throw error;
    }
  }

  /**
   * Get payment by ID (legacy endpoint)
   * @deprecated Use payment gateway GetPayment command directly
   */
  async getPaymentById(paymentId: string, traceId?: string): Promise<LegacyPaymentResponse> {
    this.logDeprecationWarning({
      command: 'GetPaymentById',
      reason: 'Legacy payment retrieval endpoint',
      replacement: 'Use payment gateway GetPayment command',
      deprecatedSince: '2024-01-01'
    });

    try {
      const result = await this.paymentGateway.getPayment.execute({
        paymentId
      }, traceId);

      return {
        id: result.payment.id,
        amount: result.payment.amount,
        currency: result.payment.currency,
        status: result.payment.status,
        createdAt: result.payment.createdAt.toISOString(),
        updatedAt: result.payment.updatedAt.toISOString()
      };

    } catch (error) {
      console.error('Legacy GetPaymentById failed', {
        paymentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });
      throw error;
    }
  }

  private logDeprecationWarning(warning: DeprecationWarning): void {
    console.warn('DEPRECATION WARNING', {
      command: warning.command,
      reason: warning.reason,
      replacement: warning.replacement,
      deprecatedSince: warning.deprecatedSince,
      removeIn: warning.removeIn,
      timestamp: new Date().toISOString()
    });
  }
}