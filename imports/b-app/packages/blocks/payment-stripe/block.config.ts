import { defineBlock, defineCommand, BlockContext } from '@b-app/platform-block-api';
import { 
  AuthorizePaymentInputSchema, 
  AuthorizePaymentOutputSchema,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  PaymentAuthorizedEvent
} from './src/schemas';

export default defineBlock({
  metadata: {
    name: 'payment-stripe',
    version: '0.1.0',
    kind: 'handler',
    description: 'Payment processing block with Stripe integration (stubbed)',
    author: 'B-App Platform',
    policies: {
      authLevel: 'user',
      permissions: ['payment:create'],
      rateLimit: {
        maxRequests: 10,
        windowMs: 60000 // 1 minute
      }
    }
  },

  async register(context: BlockContext) {
    context.logger.info('Payment Stripe block registered successfully');
  },

  commands: {
    AuthorizePayment: defineCommand<AuthorizePaymentInput, AuthorizePaymentOutput>({
      handler: async (input: AuthorizePaymentInput, context: BlockContext): Promise<AuthorizePaymentOutput> => {
        const { logger, eventBus } = context;
        
        logger.info('Processing payment authorization', {
          amount: input.amount,
          currency: input.currency,
          userId: input.userId
        });

        // Stub implementation - no real Stripe call yet
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        try {
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 100));

          // Simulate success/failure (90% success rate)
          const isSuccess = Math.random() > 0.1;

          if (!isSuccess) {
            return {
              paymentId,
              status: 'failed',
              amount: input.amount,
              currency: input.currency,
              createdAt: now,
              error: 'Simulated payment failure'
            };
          }

          // Create successful payment result
          const result: AuthorizePaymentOutput = {
            paymentId,
            status: 'authorized',
            amount: input.amount,
            currency: input.currency,
            createdAt: now,
            stripePaymentIntentId: `pi_${paymentId.replace('pay_', '')}`
          };

          // Publish payment authorized event
          const event: PaymentAuthorizedEvent = {
            paymentId,
            userId: input.userId,
            amount: input.amount,
            currency: input.currency,
            paymentMethodId: input.paymentMethodId,
            stripePaymentIntentId: result.stripePaymentIntentId,
            authorizedAt: now,
            metadata: input.metadata
          };

          if (eventBus) {
            await eventBus.publish('payment.authorized.v1', event, {
              source: 'payment-stripe',
              userId: input.userId
            });
          }

          logger.info('Payment authorized successfully', {
            paymentId: result.paymentId,
            userId: input.userId,
            amount: input.amount
          });

          return result;
        } catch (error) {
          logger.error('Payment authorization failed', {
            error: error instanceof Error ? error.message : String(error),
            userId: input.userId
          });

          return {
            paymentId,
            status: 'failed',
            amount: input.amount,
            currency: input.currency,
            createdAt: now,
            error: 'Internal processing error'
          };
        }
      },
      inputSchema: AuthorizePaymentInputSchema,
      outputSchema: AuthorizePaymentOutputSchema,
      policies: {
        authLevel: 'user',
        permissions: ['payment:authorize'],
        rateLimit: {
          maxRequests: 5,
          windowMs: 60000 // More restrictive for payment operations
        }
      }
    })
  }
});