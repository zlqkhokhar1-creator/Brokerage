import { AuthorizePaymentCommand, AuthorizePaymentCommandSchema, PaymentProvider } from '../types/index.js';
import { PaymentRepository, IdempotencyService } from '../types/index.js';
import { paymentEvents } from '../events/event-emitter.js';

export interface AuthorizePaymentResult {
  paymentId: string;
  status: 'authorized' | 'failed';
  authorizedAmount?: number;
  providerPaymentId?: string;
  metadata?: Record<string, any>;
}

export class AuthorizePaymentCommandHandler {
  constructor(
    private paymentRepository: PaymentRepository,
    private paymentProvider: PaymentProvider,
    private idempotencyService?: IdempotencyService
  ) {}

  async execute(
    command: AuthorizePaymentCommand,
    idempotencyKey?: string,
    traceId?: string
  ): Promise<AuthorizePaymentResult> {
    // Validate command
    const validatedCommand = AuthorizePaymentCommandSchema.parse(command);
    
    // Check idempotency if key provided
    if (idempotencyKey && this.idempotencyService) {
      const existing = await this.idempotencyService.checkKey(idempotencyKey, 'AuthorizePayment');
      if (existing.exists) {
        console.info('Returning cached result for idempotent AuthorizePayment', {
          idempotencyKey,
          paymentId: existing.result.paymentId,
          traceId
        });
        return existing.result;
      }
    }

    const startTime = Date.now();
    let payment = null;

    try {
      // If paymentId provided, get existing payment
      if (validatedCommand.paymentId) {
        payment = await this.paymentRepository.findById(validatedCommand.paymentId);
        if (!payment) {
          throw new Error('Payment not found');
        }

        if (payment.status !== 'initialized') {
          throw new Error(`Cannot authorize payment in ${payment.status} status`);
        }
      }

      // Authorize payment with provider
      const providerResult = await this.paymentProvider.authorize(validatedCommand);

      if (!providerResult.success) {
        // Update payment status to failed if we have a payment
        if (payment) {
          await this.paymentRepository.update(payment.id, {
            status: 'failed',
            failureReason: providerResult.error
          });
        }
        throw new Error(providerResult.error || 'Payment authorization failed');
      }

      // Update payment record if we have one
      if (payment) {
        payment = await this.paymentRepository.update(payment.id, {
          status: 'authorized',
          authorizedAmount: providerResult.amount || payment.amount,
          providerPaymentId: providerResult.providerPaymentId || payment.providerPaymentId
        });
      }

      // Prepare result
      const result: AuthorizePaymentResult = {
        paymentId: payment?.id || providerResult.paymentId,
        status: 'authorized',
        authorizedAmount: providerResult.amount || payment?.amount,
        providerPaymentId: providerResult.providerPaymentId,
        metadata: providerResult.metadata
      };

      // Store result for idempotency if key provided
      if (idempotencyKey && this.idempotencyService) {
        await this.idempotencyService.storeResult(idempotencyKey, 'AuthorizePayment', result);
      }

      // Emit event
      if (payment) {
        paymentEvents.emitPaymentAuthorized(
          payment.id,
          payment.authorizedAmount || payment.amount,
          payment.currency,
          this.paymentProvider.name,
          traceId
        );
      }

      // Log success
      const duration = Date.now() - startTime;
      console.info('Payment authorized successfully', {
        paymentId: result.paymentId,
        authorizedAmount: result.authorizedAmount,
        provider: this.paymentProvider.name,
        duration,
        traceId
      });

      return result;

    } catch (error) {
      // Log failure
      const duration = Date.now() - startTime;
      console.error('Payment authorization failed', {
        paymentId: validatedCommand.paymentId,
        provider: this.paymentProvider.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        traceId
      });

      const failureResult: AuthorizePaymentResult = {
        paymentId: validatedCommand.paymentId || '',
        status: 'failed'
      };

      // Store failure result for idempotency if key provided
      if (idempotencyKey && this.idempotencyService) {
        await this.idempotencyService.storeResult(idempotencyKey, 'AuthorizePayment', failureResult);
      }

      throw error;
    }
  }
}