import { createHttpServer } from '../factory';
import { FastifyAdapter } from '../adapters/fastify-adapter';
import { ExpressAdapter } from '../adapters/express-adapter';

describe('HTTP Server Factory', () => {
  afterEach(() => {
    // Clean up environment variables
    delete process.env.HTTP_ADAPTER;
  });

  it('should create Fastify adapter by default', () => {
    const server = createHttpServer();
    expect(server).toBeInstanceOf(FastifyAdapter);
    expect(server.getAdapterName()).toBe('fastify');
  });

  it('should create Fastify adapter when explicitly specified', () => {
    const server = createHttpServer({ adapter: 'fastify' });
    expect(server).toBeInstanceOf(FastifyAdapter);
    expect(server.getAdapterName()).toBe('fastify');
  });

  it('should create Express adapter when specified', () => {
    const server = createHttpServer({ adapter: 'express' });
    expect(server).toBeInstanceOf(ExpressAdapter);
    expect(server.getAdapterName()).toBe('express');
  });

  it('should use HTTP_ADAPTER environment variable', () => {
    process.env.HTTP_ADAPTER = 'express';
    const server = createHttpServer();
    expect(server).toBeInstanceOf(ExpressAdapter);
    expect(server.getAdapterName()).toBe('express');
  });

  it('should throw error for unknown adapter', () => {
    expect(() => {
      createHttpServer({ adapter: 'unknown' as any });
    }).toThrow('Unknown HTTP adapter: unknown');
  });

  it('should throw error for hono adapter (not implemented)', () => {
    expect(() => {
      createHttpServer({ adapter: 'hono' });
    }).toThrow('Hono adapter not implemented yet');
  });
});