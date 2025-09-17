import Fastify from 'fastify';
import requestIdPlugin from './plugins/requestId';
import healthRoutes from './routes/health';

// Temporary inline env loading - will be replaced with @config/env later
const loadEnv = () => ({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  JWT_SECRET: process.env.JWT_SECRET || '',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim()),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
});

async function buildServer() {
  const env = loadEnv();
  
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      } : undefined
    },
    requestIdLogLabel: 'traceId',
    genReqId: () => crypto.randomUUID()
  });

  // Register plugins
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      }
    }
  });

  await fastify.register(require('@fastify/cors'), {
    origin: env.CORS_ORIGINS,
    credentials: true
  });

  await fastify.register(require('@fastify/rate-limit'), {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS
  });

  await fastify.register(requestIdPlugin);

  // Register routes
  await fastify.register(healthRoutes);

  // 404 handler with trace ID
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'Route not found',
      traceId: request.headers['x-request-id'],
      timestamp: new Date().toISOString()
    });
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ error, traceId: request.headers['x-request-id'] }, 'Request error');
    
    reply.status(error.statusCode || 500).send({
      success: false,
      error: env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      traceId: request.headers['x-request-id'],
      timestamp: new Date().toISOString()
    });
  });

  return fastify;
}

async function start() {
  try {
    const env = loadEnv();
    const server = await buildServer();
    
    await server.listen({ 
      port: env.PORT, 
      host: '0.0.0.0' 
    });
    
    server.log.info(`🚀 Gateway server running on port ${env.PORT}`);
    server.log.info(`📊 Environment: ${env.NODE_ENV}`);
    server.log.info(`🔒 CORS Origins: ${env.CORS_ORIGINS.join(', ')}`);
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

if (require.main === module) {
  start();
}

export { buildServer };