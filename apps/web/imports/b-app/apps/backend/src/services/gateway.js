// Gateway service for block management and command dispatch
const path = require('path');

// Platform imports (these will be compiled JavaScript from TypeScript packages)
// For now, we'll create a simpler JavaScript implementation that integrates with the existing backend

class BlockGateway {
  constructor() {
    this.blocks = new Map();
    this.commands = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🔄 Initializing Block Gateway...');

    // TODO: In Phase 2, scan for compiled block.config.js files
    // For now, we'll register stub implementations directly
    
    await this.registerBuiltinBlocks();
    
    this.initialized = true;
    console.log('✅ Block Gateway initialized successfully');
  }

  async registerBuiltinBlocks() {
    // Register payment-stripe stub
    this.registerBlock({
      name: 'payment-stripe',
      version: '0.1.0',
      kind: 'handler',
      commands: {
        'AuthorizePayment': {
          handler: this.createPaymentHandler(),
          policies: {
            authLevel: 'user',
            permissions: ['payment:create']
          }
        }
      }
    });

    // Register ai-inference-openai stub
    this.registerBlock({
      name: 'ai-inference-openai',
      version: '0.1.0',
      kind: 'handler',
      commands: {
        'GenerateCompletion': {
          handler: this.createAIHandler(),
          policies: {
            authLevel: 'user',
            permissions: ['ai:generate']
          }
        }
      }
    });
  }

  registerBlock(blockInfo) {
    this.blocks.set(blockInfo.name, {
      ...blockInfo,
      status: 'registered',
      registeredAt: new Date()
    });

    // Register commands
    if (blockInfo.commands) {
      for (const [commandName, commandInfo] of Object.entries(blockInfo.commands)) {
        this.commands.set(commandName, {
          ...commandInfo,
          blockName: blockInfo.name
        });
      }
    }

    console.log(`📦 Registered block: ${blockInfo.name}@${blockInfo.version}`);
  }

  createPaymentHandler() {
    return async (input, context) => {
      const { logger } = context || { logger: console };

      logger.info('Processing payment authorization', {
        amount: input.amount,
        currency: input.currency,
        userId: input.userId
      });

      // Stub implementation - no real Stripe call yet
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

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

      const result = {
        paymentId,
        status: 'authorized',
        amount: input.amount,
        currency: input.currency,
        createdAt: now,
        stripePaymentIntentId: `pi_${paymentId.replace('pay_', '')}`
      };

      // TODO: Publish event when eventBus is available
      
      return result;
    };
  }

  createAIHandler() {
    return async (input, context) => {
      const { logger } = context || { logger: console };

      logger.info('Generating AI completion', {
        promptLength: input.prompt.length,
        model: input.model || 'gpt-3.5-turbo',
        userId: input.userId
      });

      const completionId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const model = input.model || 'gpt-3.5-turbo';

      // Simulate processing time based on prompt length
      const processingTime = Math.min(input.prompt.length * 2, 1000);
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Generate deterministic mock completion
      const mockCompletion = this.generateMockCompletion(input.prompt);

      const promptTokens = Math.ceil(input.prompt.length / 4);
      const completionTokens = Math.ceil(mockCompletion.length / 4);

      return {
        completionId,
        content: mockCompletion,
        model: model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        },
        finishReason: 'stop',
        createdAt: now
      };
    };
  }

  generateMockCompletion(prompt) {
    // Create a simple hash for deterministic output
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const templates = [
      "Based on your input, here's a thoughtful response that addresses your query comprehensively.",
      "Thank you for your question. This is an interesting topic that has multiple dimensions to explore.",
      "Your prompt raises important considerations. From an analytical perspective, there are several approaches.",
      "This is a fascinating subject that deserves careful examination with various key factors.",
      "I appreciate your inquiry about this topic. Here are some relevant points for your consideration."
    ];

    const templateIndex = Math.abs(hash) % templates.length;
    return templates[templateIndex];
  }

  async executeCommand(commandName, input, context = {}) {
    const command = this.commands.get(commandName);
    
    if (!command) {
      throw new Error(`Command '${commandName}' not found`);
    }

    // Add trace ID
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    context.traceId = traceId;

    // Execute command
    const startTime = Date.now();
    
    try {
      const result = await command.handler(input, context);
      const duration = Date.now() - startTime;

      console.log(`✅ Command '${commandName}' executed successfully`, {
        duration: `${duration}ms`,
        traceId,
        blockName: command.blockName
      });

      return {
        success: true,
        data: result,
        traceId,
        executedAt: new Date().toISOString(),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(`❌ Command '${commandName}' failed`, {
        error: error.message,
        duration: `${duration}ms`,
        traceId,
        blockName: command.blockName
      });

      return {
        success: false,
        error: error.message,
        traceId,
        executedAt: new Date().toISOString(),
        duration
      };
    }
  }

  getLoadedBlocks() {
    return Array.from(this.blocks.entries()).map(([name, block]) => ({
      name,
      version: block.version,
      kind: block.kind,
      status: block.status,
      registeredAt: block.registeredAt
    }));
  }

  getCommands() {
    return Array.from(this.commands.keys());
  }

  getHealth() {
    return {
      status: 'healthy',
      blocks: Object.fromEntries(
        Array.from(this.blocks.entries()).map(([name, block]) => [
          name,
          {
            status: block.status,
            version: block.version
          }
        ])
      ),
      totalBlocks: this.blocks.size,
      totalCommands: this.commands.size
    };
  }
}

// Global instance
const blockGateway = new BlockGateway();

module.exports = {
  BlockGateway,
  blockGateway
};