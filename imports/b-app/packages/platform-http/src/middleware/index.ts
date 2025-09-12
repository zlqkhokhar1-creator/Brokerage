import { MiddlewareFn, RequestContext, ResponseContext } from '../interfaces';

/**
 * Request ID middleware - ensures every request has a unique trace ID
 */
export const requestIdMiddleware: MiddlewareFn = async (ctx, next) => {
  if (!ctx.traceId) {
    ctx.traceId = ctx.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return next();
};

/**
 * Logging middleware - structured request/response logging
 */
export const loggingMiddleware: MiddlewareFn = async (ctx, next) => {
  const startTime = Date.now();
  
  console.log({
    traceId: ctx.traceId,
    method: ctx.method,
    path: ctx.path,
    ip: ctx.ip,
    userAgent: ctx.headers['user-agent'],
    timestamp: new Date().toISOString(),
  }, 'HTTP Request');

  try {
    const response = await next();
    const durationMs = Date.now() - startTime;

    console.log({
      traceId: ctx.traceId,
      method: ctx.method,
      path: ctx.path,
      status: response.status,
      durationMs,
      success: response.status < 400,
      timestamp: new Date().toISOString(),
    }, 'HTTP Response');

    return response;
  } catch (error) {
    const err = error as Error;
    const durationMs = Date.now() - startTime;
    
    console.error({
      traceId: ctx.traceId,
      method: ctx.method,
      path: ctx.path,
      error: err.message,
      durationMs,
      success: false,
      timestamp: new Date().toISOString(),
    }, 'HTTP Error');

    throw error;
  }
};

/**
 * Rate limiting middleware (stub implementation)
 */
export const rateLimitMiddleware = (options: { windowMs: number; max: number }): MiddlewareFn => {
  // TODO: Implement proper rate limiting with Redis or in-memory store
  return async (ctx, next) => {
    // Stub implementation - always allow
    return next();
  };
};

/**
 * Authentication middleware (stub implementation)
 */
export const authMiddleware: MiddlewareFn = async (ctx, next) => {
  // TODO: Implement JWT verification
  const authHeader = ctx.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Stub: extract user info from JWT token
    ctx.user = { id: 'stub_user', email: 'stub@example.com' };
  }
  
  return next();
};

/**
 * Policy enforcement middleware (stub implementation)
 */
export const policyMiddleware: MiddlewareFn = async (ctx, next) => {
  // TODO: Implement policy enforcement based on user and request
  return next();
};

/**
 * Error boundary middleware - catches and formats errors
 */
export const errorBoundaryMiddleware: MiddlewareFn = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    const err = error as Error;
    console.error({
      traceId: ctx.traceId,
      error: err.message,
      stack: err.stack,
    }, 'Unhandled error in middleware chain');

    return {
      status: 500,
      headers: { 'content-type': 'application/json' },
      body: {
        error: 'Internal server error',
        traceId: ctx.traceId,
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    };
  }
};

/**
 * Standard middleware stack for commands
 */
export const standardMiddlewareStack: MiddlewareFn[] = [
  errorBoundaryMiddleware,
  requestIdMiddleware,
  loggingMiddleware,
  authMiddleware,
  policyMiddleware,
];