import { GetPaymentCommand, GetPaymentCommandSchema, Payment } from '../types/index.js';
import { PaymentRepository } from '../types/index.js';

export interface GetPaymentResult {
  payment: Payment;
  metadata?: Record<string, any>;
}

export class GetPaymentCommandHandler {
  constructor(private paymentRepository: PaymentRepository) {}

  async execute(command: GetPaymentCommand, traceId?: string): Promise<GetPaymentResult> {
    // Validate command
    const validatedCommand = GetPaymentCommandSchema.parse(command);
    
    try {
      const payment = await this.paymentRepository.findById(validatedCommand.paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      console.info('Payment retrieved', {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        traceId
      });

      return {
        payment,
        metadata: {
          version: payment.version,
          age: Math.floor((Date.now() - payment.createdAt.getTime()) / 1000)
        }
      };

    } catch (error) {
      console.error('Get payment failed', {
        paymentId: validatedCommand.paymentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId
      });

      throw error;
    }
  }
}