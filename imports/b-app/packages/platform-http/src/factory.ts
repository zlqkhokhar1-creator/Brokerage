import { HttpServerAdapter, ServerConfig } from './interfaces';
import { FastifyAdapter } from './adapters/fastify-adapter';
import { ExpressAdapter } from './adapters/express-adapter';

/**
 * Create HTTP server adapter based on environment configuration
 */
export function createHttpServer(config: Partial<ServerConfig> = {}): HttpServerAdapter {
  const adapterType = process.env.HTTP_ADAPTER || config.adapter || 'fastify';
  
  switch (adapterType) {
    case 'fastify':
      return new FastifyAdapter(config);
    case 'express':
      return new ExpressAdapter(config);
    case 'hono':
      throw new Error('Hono adapter not implemented yet. Use FastifyAdapter instead.');
    default:
      throw new Error(`Unknown HTTP adapter: ${adapterType}. Supported adapters: fastify, express`);
  }
}

/**
 * Get available adapter names
 */
export function getAvailableAdapters(): string[] {
  return ['fastify', 'express'];
}