const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');

const logger = require('./utils/logger');
const eventBus = require('./services/eventBus');
const messageQueue = require('./services/messageQueue');
const webSocketManager = require('./services/webSocketManager');
const { authenticateToken } = require('./middleware/auth');
const { validateRequest, schemas } = require('./middleware/validation');

const app = express();
const server = createServer(app);

// Initialize WebSocket
webSocketManager.initialize(server);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const eventBusHealth = await eventBus.healthCheck();
    const messageQueueHealth = await messageQueue.healthCheck();
    
    const overallHealth = eventBusHealth.status === 'healthy' && messageQueueHealth.status === 'healthy';
    
    res.status(overallHealth ? 200 : 503).json({
      status: overallHealth ? 'healthy' : 'unhealthy',
      service: 'event-bus',
      timestamp: new Date().toISOString(),
      dependencies: {
        eventBus: eventBusHealth,
        messageQueue: messageQueueHealth
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'event-bus',
      error: error.message
    });
  }
});

// Event publishing endpoints
app.post('/api/events/publish', authenticateToken, validateRequest(schemas.publishEvent), async (req, res) => {
  try {
    const { eventType, data, targetServices, priority } = req.body;
    const result = await eventBus.publishEvent(eventType, data, targetServices, priority);
    
    // Send WebSocket update
    webSocketManager.broadcastEventUpdate({
      type: 'event_published',
      eventType,
      result,
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Event publishing error:', error);
    res.status(500).json({ error: 'Failed to publish event' });
  }
});

// Event subscription endpoints
app.post('/api/events/subscribe', authenticateToken, validateRequest(schemas.subscribeEvent), async (req, res) => {
  try {
    const { serviceName, eventTypes, callbackUrl } = req.body;
    const result = await eventBus.subscribeToEvents(serviceName, eventTypes, callbackUrl);
    
    res.json(result);
  } catch (error) {
    logger.error('Event subscription error:', error);
    res.status(500).json({ error: 'Failed to subscribe to events' });
  }
});

app.delete('/api/events/unsubscribe/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const result = await eventBus.unsubscribeFromEvents(subscriptionId);
    
    res.json(result);
  } catch (error) {
    logger.error('Event unsubscription error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from events' });
  }
});

// Message queue endpoints
app.post('/api/queue/send', authenticateToken, validateRequest(schemas.sendMessage), async (req, res) => {
  try {
    const { queueName, message, priority, delay } = req.body;
    const result = await messageQueue.sendMessage(queueName, message, priority, delay);
    
    res.json(result);
  } catch (error) {
    logger.error('Message sending error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/queue/:queueName/messages', authenticateToken, async (req, res) => {
  try {
    const { queueName } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    const result = await messageQueue.getMessages(queueName, parseInt(limit), parseInt(offset));
    
    res.json(result);
  } catch (error) {
    logger.error('Message retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// Service registry endpoints
app.get('/api/services', authenticateToken, async (req, res) => {
  try {
    const services = await eventBus.getRegisteredServices();
    res.json(services);
  } catch (error) {
    logger.error('Service registry error:', error);
    res.status(500).json({ error: 'Failed to get registered services' });
  }
});

app.post('/api/services/register', authenticateToken, validateRequest(schemas.registerService), async (req, res) => {
  try {
    const { serviceName, serviceUrl, healthCheckUrl, capabilities } = req.body;
    const result = await eventBus.registerService(serviceName, serviceUrl, healthCheckUrl, capabilities);
    
    res.json(result);
  } catch (error) {
    logger.error('Service registration error:', error);
    res.status(500).json({ error: 'Failed to register service' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await eventBus.close();
  await messageQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await eventBus.close();
  await messageQueue.close();
  process.exit(0);
});

const PORT = process.env.PORT || 3020;
server.listen(PORT, () => {
  logger.info(`Event Bus Service running on port ${PORT}`);
});

module.exports = app;

