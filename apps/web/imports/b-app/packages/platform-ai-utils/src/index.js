/**
 * Platform AI Utils
 * Cross-block orchestration utilities
 */

const { cosineSimilarity, euclideanDistance, dotProduct } = require('./similarity');
const { TraceContext } = require('./trace-context');
const { globalMetrics, MetricsCollector } = require('./metrics/collector');
const { validateEvent, getSupportedEventTypes, EVENT_SCHEMAS } = require('./events/schemas');

module.exports = {
  // Similarity functions
  cosineSimilarity,
  euclideanDistance,
  dotProduct,
  
  // Trace context
  TraceContext,
  
  // Metrics
  globalMetrics,
  MetricsCollector,
  
  // Event schemas and validation
  validateEvent,
  getSupportedEventTypes,
  EVENT_SCHEMAS
};