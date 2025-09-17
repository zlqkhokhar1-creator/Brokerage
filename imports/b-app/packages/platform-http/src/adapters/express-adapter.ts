import {
  HttpServerAdapter,
  HttpRouteDefinition,
  MiddlewareFn,
  ServerConfig
} from '../interfaces';

/**
 * Express adapter placeholder - not implemented yet
 * TODO: Implement full Express adapter in future iterations
 */
export class ExpressAdapter implements HttpServerAdapter {
  constructor(config: Partial<ServerConfig> = {}) {
    // Store config for future implementation
  }

  async registerRoute(route: HttpRouteDefinition): Promise<void> {
    throw new Error('ExpressAdapter not implemented yet. Use FastifyAdapter instead.');
  }

  async registerMiddleware(middleware: MiddlewareFn): Promise<void> {
    throw new Error('ExpressAdapter not implemented yet. Use FastifyAdapter instead.');
  }

  async start(port: number, host?: string): Promise<void> {
    throw new Error('ExpressAdapter not implemented yet. Use FastifyAdapter instead.');
  }

  async stop(): Promise<void> {
    throw new Error('ExpressAdapter not implemented yet. Use FastifyAdapter instead.');
  }

  getInstance(): any {
    throw new Error('ExpressAdapter not implemented yet. Use FastifyAdapter instead.');
  }

  getAdapterName(): string {
    return 'express';
  }
}