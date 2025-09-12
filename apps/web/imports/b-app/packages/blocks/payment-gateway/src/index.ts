// Main exports for the payment gateway block
export { PaymentGatewayBlock, paymentGatewayBlock } from './payment-gateway-block.js';
export { paymentEvents } from './events/event-emitter.js';

// Export types
export type * from './types/index.js';

// Export providers
export { MockPaymentProvider } from './providers/mock.provider.js';
export { StripePaymentProvider } from './providers/stripe.provider.js';
export { PaymentProviderFactory } from './providers/provider-factory.js';

// Export services for advanced usage
export { InMemoryPaymentRepository, PostgreSQLPaymentRepository } from './repositories/payment.repository.js';
export { InMemoryIdempotencyService, RedisIdempotencyService } from './services/idempotency.service.js';

// Export command handlers for advanced usage
export { InitializePaymentCommandHandler } from './commands/initialize-payment.command.js';
export { AuthorizePaymentCommandHandler } from './commands/authorize-payment.command.js';
export { CapturePaymentCommandHandler } from './commands/capture-payment.command.js';
export { RefundPaymentCommandHandler } from './commands/refund-payment.command.js';
export { GetPaymentCommandHandler } from './commands/get-payment.command.js';

// Export event emitter types
export type { PaymentEvent, PaymentEventHandler } from './events/event-emitter.js';