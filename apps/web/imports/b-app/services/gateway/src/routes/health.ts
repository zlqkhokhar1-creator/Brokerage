import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      service: 'gateway',
      version: '0.1.0'
    };
  });

  // Readiness check endpoint  
  fastify.get('/ready', async (request, reply) => {
    // TODO: Add actual readiness checks (database, external services, etc.)
    const checks = {
      config: { status: 'ok', message: 'Environment configuration loaded' },
      // database: { status: 'ok' },  // Future: check DB connection
      // cache: { status: 'ok' }      // Future: check Redis connection
    };

    return {
      status: 'ready' as const,
      timestamp: new Date().toISOString(),
      checks
    };
  });

  // Basic metrics endpoint (placeholder)
  fastify.get('/metrics', async (request, reply) => {
    // TODO: Integrate with OpenTelemetry/Prometheus
    reply.type('application/json');
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      // TODO: Add actual metrics collection
      placeholder: 'Future Prometheus integration'
    };
  });
};

export default healthRoutes;