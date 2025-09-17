import { RefundPaymentCommand, RefundPaymentCommandSchema, PaymentProvider } from '../types/index.js';
import { PaymentRepository } from '../types/index.js';
import { paymentEvents } from '../events/event-emitter.js';

export interface RefundPaymentResult {
  paymentId: string;
  status: 'refunded' | 'failed';
  refundedAmount?: number;
  totalRefunded?: number;
  providerPaymentId?: string;
  metadata?: Record<string, any>;
}

export class RefundPaymentCommandHandler {
  constructor(
    private paymentRepository: PaymentRepository,
    private paymentProvider: PaymentProvider
  ) {}

  async execute(command: RefundPaymentCommand, traceId?: string): Promise<RefundPaymentResult> {
    // Validate command
    const validatedCommand = RefundPaymentCommandSchema.parse(command);
    
    const startTime = Date.now();

    try {
      // Get existing payment
      const payment = await this.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'captured' && payment.status !== 'refunded') {
        throw new Error(`Cannot refund payment in ${payment.status} status`);
      }

      // Determine refund amount
      const capturedAmount = payment.capturedAmount || payment.amount;
      const alreadyRefunded = payment.refundedAmount || 0;
      const maxRefundable = capturedAmount - alreadyRefunded;
      const refundAmount = validatedCommand.amount || maxRefundable;

      if (refundAmount > maxRefundable) {
        throw new Error(`Refund amount ${refundAmount} exceeds refundable amount ${maxRefundable}`);
      }

      if (refundAmount <= 0) {
        throw new Error('Refund amount must be greater than 0');
      }

      // Refund payment with provider
      const providerResult = await this.paymentProvider.refund({
        paymentId: validatedCommand.paymentId,
        amount: refundAmount
      });

      if (!providerResult.success) {
        throw new Error(providerResult.error || 'Payment refund failed');
      }

      // Calculate new total refunded amount
      const newTotalRefunded = alreadyRefunded + refundAmount;
      const newStatus = newTotalRefunded >= capturedAmount ? 'refunded' : payment.status;

      // Update payment record
      const updatedPayment = await this.paymentRepository.update(payment.id, {
        status: newStatus,
        refundedAmount: newTotalRefunded,
        providerPaymentId: providerResult.providerPaymentId || payment.providerPaymentId
      });

      // Prepare result
      const result: RefundPaymentResult = {
        paymentId: updatedPayment.id,
        status: newStatus,
        refundedAmount: refundAmount,
        totalRefunded: newTotalRefunded,
        providerPaymentId: providerResult.providerPaymentId,
        metadata: providerResult.metadata
      };

      // Emit event
      paymentEvents.emitPaymentRefunded(
        updatedPayment.id,
        refundAmount,
        updatedPayment.currency,
        this.paymentProvider.name,
        traceId
      );

      // Log success
      const duration = Date.now() - startTime;
      console.info('Payment refunded successfully', {
        paymentId: updatedPayment.id,
        refundAmount: refundAmount,
        totalRefunded: newTotalRefunded,
        currency: updatedPayment.currency,
        provider: this.paymentProvider.name,
        duration,
        traceId
      });

      return result;

    } catch (error) {
      // Log failure
      const duration = Date.now() - startTime;
      console.error('Payment refund failed', {
        paymentId: validatedCommand.paymentId,
        amount: validatedCommand.amount,
        provider: this.paymentProvider.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        traceId
      });

      throw error;
    }
  }
}