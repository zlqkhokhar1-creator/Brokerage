import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  HttpServerAdapter,
  HttpRouteDefinition,
  MiddlewareFn,
  RequestContext,
  ResponseContext,
  RouteHandler,
  ServerConfig
} from '../interfaces';

export class FastifyAdapter implements HttpServerAdapter {
  private app: FastifyInstance;
  private globalMiddleware: MiddlewareFn[] = [];
  private isStarted = false;

  constructor(config: Partial<ServerConfig> = {}) {
    this.app = fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: req.headers,
            remoteAddress: req.ip,
            remotePort: req.connection?.remotePort,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
            headers: res.getHeaders?.(),
          }),
        },
      },
      trustProxy: config.trustProxy ?? true,
    });

    // Register CORS if configured
    if (config.cors) {
      this.app.register(import('@fastify/cors'), {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      });
    }

    // Add request ID generation
    this.app.addHook('onRequest', async (request) => {
      request.id = request.headers['x-request-id'] as string || uuidv4();
    });
  }

  async registerRoute(route: HttpRouteDefinition): Promise<void> {
    const handler = this.createRouteHandler(route);

    this.app.route({
      method: route.method,
      url: route.path,
      handler,
      schema: route.schema ? this.buildFastifySchema(route) : undefined,
    });
  }

  async registerMiddleware(middleware: MiddlewareFn): Promise<void> {
    this.globalMiddleware.push(middleware);
  }

  private createRouteHandler(route: HttpRouteDefinition) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();
      
      const ctx: RequestContext = {
        traceId: request.id,
        method: request.method,
        path: request.url,
        query: request.query as Record<string, any>,
        body: request.body,
        headers: request.headers as Record<string, string>,
        ip: request.ip,
        startTime,
      };

      try {
        // Execute middleware chain + route handler
        const middlewareChain = [
          ...this.globalMiddleware,
          ...(route.middleware || []),
        ];

        const response = await this.executeMiddlewareChain(
          middlewareChain,
          ctx,
          route.handler
        );

        // Set response headers
        Object.entries(response.headers || {}).forEach(([key, value]) => {
          reply.header(key, value);
        });

        reply.status(response.status).send(response.body);
      } catch (error) {
        const err = error as Error;
        this.app.log.error({
          traceId: ctx.traceId,
          error: err.message,
          stack: err.stack,
          command: route.metadata?.command,
          block: route.metadata?.block,
        }, 'Route handler error');

        reply.status(500).send({
          error: 'Internal server error',
          traceId: ctx.traceId,
        });
      }
    };
  }

  private async executeMiddlewareChain(
    middleware: MiddlewareFn[],
    ctx: RequestContext,
    handler: RouteHandler
  ): Promise<ResponseContext> {
    let index = 0;

    const dispatch = async (): Promise<ResponseContext> => {
      if (index >= middleware.length) {
        // Execute final handler
        return handler(ctx);
      }

      const middlewareFn = middleware[index++];
      return middlewareFn(ctx, dispatch);
    };

    return dispatch();
  }

  private buildFastifySchema(route: HttpRouteDefinition) {
    const schema: any = {};

    if (route.schema?.body) {
      schema.body = this.zodToJsonSchema(route.schema.body);
    }
    if (route.schema?.query) {
      schema.querystring = this.zodToJsonSchema(route.schema.query);
    }
    if (route.schema?.params) {
      schema.params = this.zodToJsonSchema(route.schema.params);
    }

    return schema;
  }

  private zodToJsonSchema(zodSchema: any) {
    // Simple Zod to JSON Schema conversion
    // In a real implementation, you'd use a proper converter like zod-to-json-schema
    return {}; // TODO: Implement proper Zod to JSON Schema conversion
  }

  async start(port: number, host: string = '0.0.0.0'): Promise<void> {
    if (this.isStarted) {
      throw new Error('Server is already started');
    }

    try {
      await this.app.listen({ port, host });
      this.isStarted = true;
      this.app.log.info({
        adapter: 'fastify',
        port,
        host,
        pid: process.pid,
      }, '🚀 HTTP Server started');
    } catch (error) {
      const err = error as Error;
      this.app.log.error({
        adapter: 'fastify',
        port,
        host,
        error: err.message,
      }, 'Failed to start HTTP server');
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    await this.app.close();
    this.isStarted = false;
    this.app.log.info({ adapter: 'fastify' }, 'HTTP Server stopped');
  }

  getInstance(): FastifyInstance {
    return this.app;
  }

  getAdapterName(): string {
    return 'fastify';
  }
}