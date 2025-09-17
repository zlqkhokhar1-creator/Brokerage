import { PaymentGatewayConfig, PaymentRepository, IdempotencyService } from './types/index.js';
import { InMemoryPaymentRepository } from './repositories/payment.repository.js';
import { InMemoryIdempotencyService } from './services/idempotency.service.js';
import { PaymentProviderFactory } from './providers/provider-factory.js';
import { InitializePaymentCommandHandler } from './commands/initialize-payment.command.js';
import { AuthorizePaymentCommandHandler } from './commands/authorize-payment.command.js';
import { CapturePaymentCommandHandler } from './commands/capture-payment.command.js';
import { RefundPaymentCommandHandler } from './commands/refund-payment.command.js';
import { GetPaymentCommandHandler } from './commands/get-payment.command.js';
import { paymentEvents } from './events/event-emitter.js';

/**
 * Payment Gateway block - handles payment processing with provider abstraction
 */
export class PaymentGatewayBlock {
  public readonly paymentRepository: PaymentRepository;
  public readonly idempotencyService?: IdempotencyService;
  public readonly providerFactory: PaymentProviderFactory;

  // Command handlers
  public readonly initializePayment: InitializePaymentCommandHandler;
  public readonly authorizePayment: AuthorizePaymentCommandHandler;
  public readonly capturePayment: CapturePaymentCommandHandler;
  public readonly refundPayment: RefundPaymentCommandHandler;
  public readonly getPayment: GetPaymentCommandHandler;

  constructor(config?: PaymentGatewayConfig) {
    const defaultConfig: PaymentGatewayConfig = {
      defaultProvider: 'mock',
      providers: {
        mock: { enabled: true, deterministicIds: true },
        stripe: { enabled: false },
        custom: { enabled: false }
      },
      idempotency: {
        enabled: true,
        ttlSeconds: 3600
      }
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Initialize services
    this.paymentRepository = new InMemoryPaymentRepository();
    
    if (finalConfig.idempotency?.enabled) {
      this.idempotencyService = new InMemoryIdempotencyService(
        finalConfig.idempotency.ttlSeconds
      );
    }

    this.providerFactory = new PaymentProviderFactory(finalConfig);

    // Initialize command handlers with default provider
    const defaultProvider = this.providerFactory.getDefaultProvider();

    this.initializePayment = new InitializePaymentCommandHandler(
      this.paymentRepository,
      defaultProvider,
      this.idempotencyService
    );

    this.authorizePayment = new AuthorizePaymentCommandHandler(
      this.paymentRepository,
      defaultProvider,
      this.idempotencyService
    );

    this.capturePayment = new CapturePaymentCommandHandler(
      this.paymentRepository,
      defaultProvider
    );

    this.refundPayment = new RefundPaymentCommandHandler(
      this.paymentRepository,
      defaultProvider
    );

    this.getPayment = new GetPaymentCommandHandler(this.paymentRepository);

    console.info('Payment gateway block initialized', {
      defaultProvider: finalConfig.defaultProvider,
      availableProviders: this.providerFactory.getAvailableProviders(),
      idempotencyEnabled: !!this.idempotencyService
    });
  }

  /**
   * Get command handlers for specific provider
   */
  getHandlersForProvider(providerName: string) {
    const provider = this.providerFactory.getProvider(providerName);

    return {
      initializePayment: new InitializePaymentCommandHandler(
        this.paymentRepository,
        provider,
        this.idempotencyService
      ),
      authorizePayment: new AuthorizePaymentCommandHandler(
        this.paymentRepository,
        provider,
        this.idempotencyService
      ),
      capturePayment: new CapturePaymentCommandHandler(
        this.paymentRepository,
        provider
      ),
      refundPayment: new RefundPaymentCommandHandler(
        this.paymentRepository,
        provider
      ),
      getPayment: this.getPayment // Same for all providers
    };
  }

  /**
   * Get available payment providers
   */
  getAvailableProviders(): string[] {
    return this.providerFactory.getAvailableProviders();
  }

  /**
   * Check if a provider is supported
   */
  isProviderSupported(providerName: string): boolean {
    return this.providerFactory.isProviderSupported(providerName);
  }

  /**
   * Get payment gateway statistics
   */
  getStats() {
    const paymentStats = 'getStats' in this.paymentRepository 
      ? this.paymentRepository.getStats() 
      : { paymentCount: 0, statusBreakdown: {}, memoryUsage: 0 };

    const idempotencyStats = this.idempotencyService?.getStats() || {
      recordCount: 0,
      memoryUsage: 0
    };

    const eventStats = paymentEvents.getStats();
    const providerStats = this.providerFactory.getProviderStats();

    return {
      payments: paymentStats,
      idempotency: idempotencyStats,
      events: eventStats,
      providers: providerStats
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.info('Shutting down payment gateway block...');
    
    // Clear event listeners
    paymentEvents.removeAllListeners();
    
    // Shutdown idempotency service
    if (this.idempotencyService && 'shutdown' in this.idempotencyService) {
      this.idempotencyService.shutdown();
    }
    
    // TODO: Close database connections, persist state, etc.
    
    console.info('Payment gateway block shut down complete');
  }
}

// Default instance for convenience
export const paymentGatewayBlock = new PaymentGatewayBlock();