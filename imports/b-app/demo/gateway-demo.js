#!/usr/bin/env node
/**
 * Demo script showing HTTP abstraction and legacy adapter integration
 * This demonstrates Phase 2A functionality without modifying existing backend
 */

const path = require('path');

// Import from built packages
const { createHttpServer, standardMiddlewareStack } = require('../packages/platform-http/dist');
const { CreateUserHandler, InMemoryEventPublisher } = require('../packages/blocks/legacy-adapter/dist');

async function startGatewayDemo() {
  console.log('🚀 Starting Gateway Demo with HTTP Abstraction...\n');

  // Create HTTP server with adapter abstraction
  const server = createHttpServer({
    adapter: process.env.HTTP_ADAPTER || 'fastify',
    port: 3001,
    host: '0.0.0.0',
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // Set up event publisher
  const eventPublisher = new InMemoryEventPublisher();
  
  // Set up legacy adapter
  const createUserHandler = new CreateUserHandler(
    eventPublisher,
    process.env.LEGACY_BASE_URL || 'http://localhost:5001'
  );

  console.log('📦 Configuring middleware stack...');
  
  // Apply standard middleware stack
  for (const middleware of standardMiddlewareStack) {
    await server.registerMiddleware(middleware);
  }

  console.log('🔗 Registering command routes...');

  // Register CreateUser command route
  await server.registerRoute({
    method: 'POST',
    path: '/api/commands/CreateUser',
    handler: async (ctx) => {
      console.log(`\n📝 Processing CreateUser command (traceId: ${ctx.traceId})`);
      return createUserHandler.handle(ctx);
    },
    metadata: {
      command: 'CreateUser',
      block: 'legacy-adapter',
      requiresAuth: false, // For demo purposes
    },
  });

  // Health check route
  await server.registerRoute({
    method: 'GET',
    path: '/health',
    handler: async (ctx) => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        status: 'healthy',
        adapter: server.getAdapterName(),
        timestamp: new Date().toISOString(),
        service: 'gateway-demo',
        environment: process.env.NODE_ENV || 'development',
      },
    }),
  });

  // Events endpoint for demo
  await server.registerRoute({
    method: 'GET',
    path: '/api/events',
    handler: async (ctx) => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        events: eventPublisher.getEvents(),
        count: eventPublisher.getEventCount(),
      },
    }),
  });

  // Start server
  const port = 3001;
  await server.start(port);

  console.log('\n✅ Gateway Demo started successfully!');
  console.log(`📡 HTTP Server: http://localhost:${port}`);
  console.log(`🔍 Health Check: http://localhost:${port}/health`);
  console.log(`📊 Events: http://localhost:${port}/api/events`);
  console.log(`🚀 Adapter: ${server.getAdapterName()}\n`);

  console.log('📋 Test Commands:');
  console.log(`
# Test health check
curl http://localhost:${port}/health

# Test CreateUser command (will fail to legacy backend but shows validation)
curl -X POST http://localhost:${port}/api/commands/CreateUser \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"password123","firstName":"John","lastName":"Doe"}'

# Check events published
curl http://localhost:${port}/api/events

# Switch to Express adapter (will show error since not implemented)
HTTP_ADAPTER=express node demo/gateway-demo.js
`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down Gateway Demo...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Gateway Demo...');
    await server.stop();
    process.exit(0);
  });
}

// Start demo if called directly
if (require.main === module) {
  startGatewayDemo().catch((error) => {
    console.error('❌ Failed to start Gateway Demo:', error);
    process.exit(1);
  });
}

module.exports = { startGatewayDemo };