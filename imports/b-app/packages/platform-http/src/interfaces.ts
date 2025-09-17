import { z } from 'zod';

/**
 * HTTP request context containing request information and utilities
 */
export interface RequestContext {
  /** Unique request identifier */
  traceId: string;
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Query parameters */
  query: Record<string, any>;
  /** Request body */
  body: any;
  /** Request headers */
  headers: Record<string, string>;
  /** Request IP address */
  ip: string;
  /** Authenticated user information (if any) */
  user?: any;
  /** Request start time for performance tracking */
  startTime: number;
}

/**
 * HTTP response interface
 */
export interface ResponseContext {
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body: any;
}

/**
 * Middleware function type - Koa-style async middleware
 */
export type MiddlewareFn = (
  ctx: RequestContext,
  next: () => Promise<ResponseContext>
) => Promise<ResponseContext>;

/**
 * Route handler function
 */
export type RouteHandler = (ctx: RequestContext) => Promise<ResponseContext>;

/**
 * HTTP route definition
 */
export interface HttpRouteDefinition {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  /** Route path pattern */
  path: string;
  /** Route handler */
  handler: RouteHandler;
  /** Route-specific middleware */
  middleware?: MiddlewareFn[];
  /** Zod schema for request validation (optional) */
  schema?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  /** Route metadata */
  metadata?: {
    command?: string;
    block?: string;
    requiresAuth?: boolean;
    rateLimit?: {
      windowMs: number;
      max: number;
    };
  };
}

/**
 * HTTP Server adapter interface - framework-agnostic abstraction
 */
export interface HttpServerAdapter {
  /** Register a route */
  registerRoute(route: HttpRouteDefinition): Promise<void>;
  
  /** Register global middleware */
  registerMiddleware(middleware: MiddlewareFn): Promise<void>;
  
  /** Start the server */
  start(port: number, host?: string): Promise<void>;
  
  /** Stop the server */
  stop(): Promise<void>;
  
  /** Get server instance (framework-specific) */
  getInstance(): any;
  
  /** Get adapter name */
  getAdapterName(): string;
}

/**
 * Server configuration options
 */
export interface ServerConfig {
  /** HTTP adapter to use */
  adapter: 'fastify' | 'express' | 'hono';
  /** Server port */
  port: number;
  /** Server host */
  host: string;
  /** CORS configuration */
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
  /** Trust proxy settings */
  trustProxy?: boolean;
}