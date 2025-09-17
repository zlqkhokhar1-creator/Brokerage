import { defineBlock, defineCommand, BlockContext } from '@b-app/platform-block-api';
import { 
  ExampleCommandInputSchema, 
  ExampleCommandOutputSchema,
  ExampleCommandInput,
  ExampleCommandOutput,
  ExampleEvent
} from './src/schemas';

export default defineBlock({
  metadata: {
    name: 'test-example',
    version: '0.1.0',
    kind: 'handler',
    description: 'test-example block for B-App platform',
    author: 'B-App Platform',
    policies: {
      authLevel: 'user',
      permissions: ['test-example:execute'],
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000 // 1 minute
      }
    }
  },

  async register(context: BlockContext) {
    context.logger.info('test-example block registered successfully');
  },

  commands: {
    ExampleCommand: defineCommand<ExampleCommandInput, ExampleCommandOutput>({
      handler: async (input: ExampleCommandInput, context: BlockContext): Promise<ExampleCommandOutput> => {
        const { logger, eventBus } = context;
        
        logger.info('Processing example command', {
          message: input.message,
          userId: input.userId
        });

        // Process the command
        const id = `${blockName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        try {
          // Simulate processing
          await new Promise(resolve => setTimeout(resolve, 50));

          // Create result
          const result: ExampleCommandOutput = {
            id,
            result: `Processed: ${input.message}`,
            processedAt: now,
            status: 'success'
          };

          // Publish event
          const event: ExampleEvent = {
            id,
            userId: input.userId,
            message: input.message,
            processedAt: now,
            metadata: input.options
          };

          if (eventBus) {
            await eventBus.publish('test-example.example.processed.v1', event, {
              source: 'test-example',
              userId: input.userId
            });
          }

          logger.info('Example command processed successfully', {
            id: result.id,
            userId: input.userId
          });

          return result;
        } catch (error) {
          logger.error('Example command processing failed', {
            error: error instanceof Error ? error.message : String(error),
            userId: input.userId
          });

          return {
            id,
            result: 'Error processing command',
            processedAt: now,
            status: 'error'
          };
        }
      },
      inputSchema: ExampleCommandInputSchema,
      outputSchema: ExampleCommandOutputSchema,
      policies: {
        authLevel: 'user',
        permissions: ['test-example:example'],
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000
        }
      }
    })
  }
});
