import { TokenRegistry } from './types';

export class DependencyContainer {
  private registry: TokenRegistry = new Map();

  register<T>(token: string, instance: T): void {
    this.registry.set(token, instance);
  }

  resolve<T>(token: string): T | undefined {
    return this.registry.get(token) as T;
  }

  has(token: string): boolean {
    return this.registry.has(token);
  }

  unregister(token: string): boolean {
    return this.registry.delete(token);
  }

  clear(): void {
    this.registry.clear();
  }

  getRegistry(): TokenRegistry {
    return this.registry;
  }

  // Factory method for creating instances with dependencies
  createWithDependencies<T>(
    factory: (container: DependencyContainer) => T,
    ...dependencies: string[]
  ): T {
    // Validate that all required dependencies are available
    for (const dep of dependencies) {
      if (!this.has(dep)) {
        throw new Error(`Dependency '${dep}' not found in container`);
      }
    }
    return factory(this);
  }
}

// Global instance for the platform
export const globalContainer = new DependencyContainer();

// Common tokens
export const TOKENS = {
  LOGGER: 'logger',
  EVENT_BUS: 'eventBus',
  TRACER: 'tracer',
  METRICS: 'metrics',
  CONFIG: 'config',
  SECURITY_EVALUATOR: 'securityEvaluator',
  FEATURE_FLAGS: 'featureFlags'
} as const;