import { InitializePaymentCommand, InitializePaymentCommandSchema, Payment, PaymentProvider } from '../types/index.js';
import { PaymentRepository, IdempotencyService } from '../types/index.js';
import { paymentEvents } from '../events/event-emitter.js';

export interface InitializePaymentResult {
  paymentId: string;
  status: 'initialized' | 'failed';
  providerPaymentId?: string;
  metadata?: Record<string, any>;
}

export class InitializePaymentCommandHandler {
  constructor(
    private paymentRepository: PaymentRepository,
    private paymentProvider: PaymentProvider,
    private idempotencyService?: IdempotencyService
  ) {}

  async execute(
    command: InitializePaymentCommand, 
    idempotencyKey?: string,
    traceId?: string
  ): Promise<InitializePaymentResult> {
    // Validate command
    const validatedCommand = InitializePaymentCommandSchema.parse(command);
    
    // Check idempotency if key provided
    if (idempotencyKey && this.idempotencyService) {
      const existing = await this.idempotencyService.checkKey(idempotencyKey, 'InitializePayment');
      if (existing.exists) {
        console.info('Returning cached result for idempotent InitializePayment', {
          idempotencyKey,
          paymentId: existing.result.paymentId,
          traceId
        });
        return existing.result;
      }
    }

    const startTime = Date.now();

    try {
      // Validate provider supports currency and method
      if (!this.paymentProvider.supportedCurrencies.includes(validatedCommand.currency)) {
        throw new Error(`Currency ${validatedCommand.currency} not supported by provider ${this.paymentProvider.name}`);
      }

      if (!this.paymentProvider.supportedMethods.includes(validatedCommand.method)) {
        throw new Error(`Payment method ${validatedCommand.method} not supported by provider ${this.paymentProvider.name}`);
      }

      // Initialize payment with provider
      const providerResult = await this.paymentProvider.initialize(validatedCommand);

      if (!providerResult.success) {
        throw new Error(providerResult.error || 'Payment initialization failed');
      }

      // Create payment record
      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
        amount: validatedCommand.amount,
        currency: validatedCommand.currency,
        status: 'initialized',
        method: validatedCommand.method,
        metadata: validatedCommand.metadata,
        providerPaymentId: providerResult.providerPaymentId,
        version: 1
      };

      const payment = await this.paymentRepository.create(paymentData);

      // Prepare result
      const result: InitializePaymentResult = {
        paymentId: payment.id,
        status: 'initialized',
        providerPaymentId: providerResult.providerPaymentId,
        metadata: providerResult.metadata
      };

      // Store result for idempotency if key provided
      if (idempotencyKey && this.idempotencyService) {
        await this.idempotencyService.storeResult(idempotencyKey, 'InitializePayment', result);
      }

      // Emit event
      paymentEvents.emitPaymentInitialized(
        payment.id,
        payment.amount,
        payment.currency,
        payment.method,
        this.paymentProvider.name,
        traceId
      );

      // Log success
      const duration = Date.now() - startTime;
      console.info('Payment initialized successfully', {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        provider: this.paymentProvider.name,
        duration,
        traceId
      });

      return result;

    } catch (error) {
      // Log failure
      const duration = Date.now() - startTime;
      console.error('Payment initialization failed', {
        amount: validatedCommand.amount,
        currency: validatedCommand.currency,
        method: validatedCommand.method,
        provider: this.paymentProvider.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        traceId
      });

      const failureResult: InitializePaymentResult = {
        paymentId: '',
        status: 'failed'
      };

      // Store failure result for idempotency if key provided
      if (idempotencyKey && this.idempotencyService) {
        await this.idempotencyService.storeResult(idempotencyKey, 'InitializePayment', failureResult);
      }

      throw error;
    }
  }
}