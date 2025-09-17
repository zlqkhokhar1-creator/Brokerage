import { CapturePaymentCommand, CapturePaymentCommandSchema, PaymentProvider } from '../types/index.js';
import { PaymentRepository } from '../types/index.js';
import { paymentEvents } from '../events/event-emitter.js';

export interface CapturePaymentResult {
  paymentId: string;
  status: 'captured' | 'failed';
  capturedAmount?: number;
  providerPaymentId?: string;
  metadata?: Record<string, any>;
}

export class CapturePaymentCommandHandler {
  constructor(
    private paymentRepository: PaymentRepository,
    private paymentProvider: PaymentProvider
  ) {}

  async execute(command: CapturePaymentCommand, traceId?: string): Promise<CapturePaymentResult> {
    // Validate command
    const validatedCommand = CapturePaymentCommandSchema.parse(command);
    
    const startTime = Date.now();

    try {
      // Get existing payment
      const payment = await this.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'authorized') {
        throw new Error(`Cannot capture payment in ${payment.status} status`);
      }

      // Determine capture amount
      const captureAmount = validatedCommand.amount || payment.authorizedAmount || payment.amount;
      const maxCapturable = payment.authorizedAmount || payment.amount;

      if (captureAmount > maxCapturable) {
        throw new Error(`Capture amount ${captureAmount} exceeds authorized amount ${maxCapturable}`);
      }

      // Capture payment with provider
      const providerResult = await this.paymentProvider.capture({
        paymentId: validatedCommand.paymentId,
        amount: captureAmount
      });

      if (!providerResult.success) {
        // Update payment status to failed
        await this.paymentRepository.update(payment.id, {
          status: 'failed',
          failureReason: providerResult.error
        });
        throw new Error(providerResult.error || 'Payment capture failed');
      }

      // Update payment record
      const updatedPayment = await this.paymentRepository.update(payment.id, {
        status: 'captured',
        capturedAmount: captureAmount,
        providerPaymentId: providerResult.providerPaymentId || payment.providerPaymentId
      });

      // Prepare result
      const result: CapturePaymentResult = {
        paymentId: updatedPayment.id,
        status: 'captured',
        capturedAmount: captureAmount,
        providerPaymentId: providerResult.providerPaymentId,
        metadata: providerResult.metadata
      };

      // Emit event
      paymentEvents.emitPaymentCaptured(
        updatedPayment.id,
        captureAmount,
        updatedPayment.currency,
        this.paymentProvider.name,
        traceId
      );

      // Log success
      const duration = Date.now() - startTime;
      console.info('Payment captured successfully', {
        paymentId: updatedPayment.id,
        capturedAmount: captureAmount,
        currency: updatedPayment.currency,
        provider: this.paymentProvider.name,
        duration,
        traceId
      });

      return result;

    } catch (error) {
      // Log failure
      const duration = Date.now() - startTime;
      console.error('Payment capture failed', {
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