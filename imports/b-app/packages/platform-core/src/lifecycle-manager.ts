import { BlockContext, LoadedBlock, LifecycleManager as ILifecycleManager } from './types';
import { DependencyContainer } from './dependency-injection';

export class LifecycleManager implements ILifecycleManager {
  private blocks: Map<string, LoadedBlock> = new Map();
  private container: DependencyContainer;
  private initialized = false;

  constructor(container: DependencyContainer) {
    this.container = container;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Register basic services in the container if not already present
    if (!this.container.has('config')) {
      this.container.register('config', process.env);
    }

    this.initialized = true;
  }

  async registerBlock(block: LoadedBlock): Promise<void> {
    if (!this.initialized) {
      throw new Error('LifecycleManager must be initialized before registering blocks');
    }

    try {
      const blockName = block.metadata.name;
      
      if (this.blocks.has(blockName)) {
        throw new Error(`Block '${blockName}' is already registered`);
      }

      // Create block context
      const context = this.createBlockContext();

      // Execute block registration
      await block.definition.register(context);

      // Update block status
      block.status = 'registered';
      block.registeredAt = new Date();

      // Store the block
      this.blocks.set(blockName, block);

      console.log(`Block '${blockName}' registered successfully`);
    } catch (error) {
      block.status = 'error';
      block.error = error instanceof Error ? error.message : String(error);
      
      // Still store the block to track its error state
      this.blocks.set(block.metadata.name, block);
      
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    for (const [blockName, block] of this.blocks.entries()) {
      if (block.definition.shutdown) {
        shutdownPromises.push(
          block.definition.shutdown().catch(error => {
            console.error(`Error shutting down block '${blockName}':`, error);
          })
        );
      }
    }

    await Promise.all(shutdownPromises);
    this.blocks.clear();
    this.initialized = false;
  }

  async getHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    blocks: Record<string, {
      status: string;
      version: string;
      health?: any;
    }>;
  }> {
    const blockHealths: Record<string, any> = {};
    let overallHealthy = true;

    for (const [blockName, block] of this.blocks.entries()) {
      const blockHealth: any = {
        status: block.status,
        version: block.metadata.version
      };

      if (block.status === 'error') {
        overallHealthy = false;
        blockHealth.error = block.error;
      }

      // Check custom health endpoint if configured
      if (block.metadata.health?.endpoint && block.status === 'registered') {
        try {
          // This is a placeholder - in a real implementation, you'd call the health endpoint
          blockHealth.health = { status: 'ok' };
        } catch (error) {
          blockHealth.health = { status: 'error', error: String(error) };
          overallHealthy = false;
        }
      }

      blockHealths[blockName] = blockHealth;
    }

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      blocks: blockHealths
    };
  }

  getBlocks(): Map<string, LoadedBlock> {
    return new Map(this.blocks);
  }

  getBlock(name: string): LoadedBlock | undefined {
    return this.blocks.get(name);
  }

  private createBlockContext(): BlockContext {
    return {
      logger: this.container.resolve('logger') || console,
      eventBus: this.container.resolve('eventBus'),
      config: this.container.resolve('config') || {},
      registry: this.container.getRegistry(),
      tracer: this.container.resolve('tracer'),
      metrics: this.container.resolve('metrics')
    };
  }
}