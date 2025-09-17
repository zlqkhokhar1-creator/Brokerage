/**
 * AI Blocks API Routes
 * Phase 4 Implementation: AI Embeddings, Vector Store, Ledger Shadow
 */

const express = require('express');
const { AIEmbeddingsBlock } = require('../../../../packages/blocks/ai-embeddings/src/index');
const { VectorStoreBlock } = require('../../../../packages/blocks/vector-store/src/index');
const { LedgerShadowBlock } = require('../../../../packages/blocks/ledger-shadow/src/index');
const { TraceContext, globalMetrics } = require('../../../../packages/platform-ai-utils/src/index');
const { EmbedAndStoreCommand } = require('../../../../packages/blocks/ai-embeddings/src/commands/embed-and-store');

const router = express.Router();

// Initialize blocks
const aiEmbeddingsBlock = new AIEmbeddingsBlock();
const vectorStoreBlock = new VectorStoreBlock();
const ledgerShadowBlock = new LedgerShadowBlock();

// Initialize orchestration command
const embedAndStoreCommand = new EmbedAndStoreCommand(
  aiEmbeddingsBlock.provider,
  vectorStoreBlock.provider
);

// Middleware to create trace context
router.use((req, res, next) => {
  req.traceContext = TraceContext.fromHeaders(req.headers);
  res.set(req.traceContext.toHeaders());
  next();
});

// AI Embeddings routes
router.post('/commands/GenerateEmbedding', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('GenerateEmbedding', { 
      block: 'ai-embeddings' 
    });

    const startTime = Date.now();
    
    const result = await aiEmbeddingsBlock.executeCommand(
      'generateEmbedding',
      { ...req.body, traceId: req.traceContext.traceId },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    const duration = Date.now() - startTime;
    
    // Record metrics
    globalMetrics.recordEmbeddingGenerated(
      result.model,
      result.dimensions,
      result.texts.length,
      duration
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

router.post('/commands/BatchGenerateEmbeddings', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('BatchGenerateEmbeddings', { 
      block: 'ai-embeddings' 
    });

    const result = await aiEmbeddingsBlock.executeCommand(
      'batchGenerateEmbeddings',
      { ...req.body, traceId: req.traceContext.traceId },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

router.get('/commands/ListEmbeddingModels', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('ListEmbeddingModels', { 
      block: 'ai-embeddings' 
    });

    const result = await aiEmbeddingsBlock.executeCommand(
      'listEmbeddingModels',
      { traceId: req.traceContext.traceId },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

// Vector Store routes
router.post('/commands/UpsertVector', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('UpsertVector', { 
      block: 'vector-store' 
    });

    const result = await vectorStoreBlock.executeCommand(
      'upsertVector',
      { ...req.body, traceId: req.traceContext.traceId },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

router.post('/commands/QuerySimilar', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('QuerySimilar', { 
      block: 'vector-store' 
    });

    const startTime = Date.now();

    const result = await vectorStoreBlock.executeCommand(
      'querySimilar',
      { ...req.body, traceId: req.traceContext.traceId },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    const duration = Date.now() - startTime;

    // Record metrics
    globalMetrics.recordVectorQuery(
      req.body.embedding?.length || 0,
      req.body.topK || 10,
      result.results.length,
      duration
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

router.delete('/commands/DeleteVector', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('DeleteVector', { 
      block: 'vector-store' 
    });

    const result = await vectorStoreBlock.executeCommand(
      'deleteVector',
      { id: req.query.id || req.body.id, traceId: req.traceContext.traceId },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

// Ledger Shadow routes
router.post('/commands/RecordTransaction', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('RecordTransaction', { 
      block: 'ledger-shadow' 
    });

    const startTime = Date.now();

    const result = await ledgerShadowBlock.executeCommand(
      'recordTransaction',
      { ...req.body, traceId: req.traceContext.traceId },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    const duration = Date.now() - startTime;

    // Record metrics
    globalMetrics.recordLedgerTransaction(
      req.body.sourceEventType,
      req.body.currency,
      req.body.direction,
      req.body.amountMinor,
      duration
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

router.get('/commands/GetTransaction/:transactionId', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('GetTransaction', { 
      block: 'ledger-shadow' 
    });

    const result = await ledgerShadowBlock.executeCommand(
      'getTransaction',
      { 
        transactionId: req.params.transactionId,
        traceId: req.traceContext.traceId 
      },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

router.get('/commands/ListTransactionsForEntity/:entityId', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('ListTransactionsForEntity', { 
      block: 'ledger-shadow' 
    });

    const result = await ledgerShadowBlock.executeCommand(
      'listTransactionsForEntity',
      { 
        entityId: req.params.entityId,
        limit: parseInt(req.query.limit) || undefined,
        offset: parseInt(req.query.offset) || undefined,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
        traceId: req.traceContext.traceId 
      },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

router.get('/commands/GetBalance/:entityId/:currency', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('GetBalance', { 
      block: 'ledger-shadow' 
    });

    const result = await ledgerShadowBlock.executeCommand(
      'getBalance',
      { 
        entityId: req.params.entityId,
        currency: req.params.currency,
        traceId: req.traceContext.traceId 
      },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

// Orchestration routes
router.post('/commands/EmbedAndStore', async (req, res) => {
  try {
    const span = req.traceContext.createSpan('EmbedAndStore', { 
      orchestration: true
    });

    const result = await embedAndStoreCommand.execute(
      { ...req.body, traceId: req.traceContext.traceId },
      { 
        eventEmitter: req.app.get('eventEmitter'),
        traceContext: req.traceContext
      }
    );

    req.traceContext.finishSpan(span.spanId, result);

    res.json({
      success: true,
      data: result,
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

// Metrics endpoints
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', 'application/json');
    res.json({
      success: true,
      data: globalMetrics.toJSON(),
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

router.get('/metrics/prometheus', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain');
    res.send(globalMetrics.toPrometheusFormat());
  } catch (error) {
    res.status(500).send(`# Error generating metrics: ${error.message}`);
  }
});

router.get('/metrics/summary', async (req, res) => {
  try {
    res.json({
      success: true,
      data: globalMetrics.getSummary(),
      traceId: req.traceContext.traceId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      traceId: req.traceContext.traceId
    });
  }
});

module.exports = router;