const express = require('express');
const { blockGateway } = require('../services/gateway');

const router = express.Router();

// Command dispatch endpoint
router.post('/commands/:commandName', async (req, res) => {
  try {
    const { commandName } = req.params;
    const input = req.body;
    const traceId = req.headers['x-trace-id'] || `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set trace ID in response header
    res.setHeader('x-trace-id', traceId);

    // Basic input validation
    if (!input || typeof input !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Request body must be a valid JSON object',
        traceId
      });
    }

    // Create execution context
    const context = {
      traceId,
      logger: {
        info: (msg, data) => console.log(`[${traceId}] ${msg}`, data || ''),
        error: (msg, data) => console.error(`[${traceId}] ${msg}`, data || ''),
        warn: (msg, data) => console.warn(`[${traceId}] ${msg}`, data || '')
      },
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip
    };

    // Execute command
    const result = await blockGateway.executeCommand(commandName, input, context);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        traceId: result.traceId,
        executedAt: result.executedAt,
        duration: result.duration
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        traceId: result.traceId,
        executedAt: result.executedAt,
        duration: result.duration
      });
    }
  } catch (error) {
    const traceId = res.getHeader('x-trace-id') || req.headers['x-trace-id'];
    
    console.error('Command dispatch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      traceId
    });
  }
});

// Get loaded blocks (secured with service token)
router.get('/internal/blocks', (req, res) => {
  // Basic service token check
  const serviceToken = req.headers['x-service-token'];
  const expectedToken = process.env.SERVICE_TOKEN || 'dev-service-token-123';
  
  if (serviceToken !== expectedToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Valid service token required'
    });
  }

  try {
    const blocks = blockGateway.getLoadedBlocks();
    const health = blockGateway.getHealth();

    res.json({
      success: true,
      data: {
        blocks,
        health,
        commands: blockGateway.getCommands()
      }
    });
  } catch (error) {
    console.error('Blocks listing error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check for blocks
router.get('/health', (req, res) => {
  try {
    const health = blockGateway.getHealth();
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Blocks health check error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available commands
router.get('/commands', (req, res) => {
  try {
    const commands = blockGateway.getCommands();
    
    res.json({
      success: true,
      data: {
        commands,
        total: commands.length
      }
    });
  } catch (error) {
    console.error('Commands listing error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;