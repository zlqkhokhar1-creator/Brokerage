/**
 * Trace Context for cross-block correlation
 */

const { v4: uuidv4 } = require('uuid');

class TraceContext {
  constructor(traceId = null, parentSpanId = null) {
    this.traceId = traceId || uuidv4();
    this.parentSpanId = parentSpanId;
    this.spans = new Map();
  }

  /**
   * Create a new span for an operation
   */
  createSpan(operationName, metadata = {}) {
    const spanId = uuidv4();
    const span = {
      spanId,
      traceId: this.traceId,
      parentSpanId: this.parentSpanId,
      operationName,
      startTime: Date.now(),
      metadata: { ...metadata },
      logs: []
    };

    this.spans.set(spanId, span);
    return span;
  }

  /**
   * Finish a span
   */
  finishSpan(spanId, result = null, error = null) {
    const span = this.spans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.result = result;
      span.error = error;
    }
    return span;
  }

  /**
   * Log to a span
   */
  logToSpan(spanId, level, message, data = {}) {
    const span = this.spans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        data
      });
    }
  }

  /**
   * Create child trace context
   */
  createChild(parentSpanId) {
    return new TraceContext(this.traceId, parentSpanId);
  }

  /**
   * Extract context from HTTP headers
   */
  static fromHeaders(headers) {
    const traceId = headers['x-trace-id'];
    const parentSpanId = headers['x-parent-span-id'];
    
    return new TraceContext(traceId, parentSpanId);
  }

  /**
   * Inject context into HTTP headers
   */
  toHeaders() {
    return {
      'x-trace-id': this.traceId,
      'x-parent-span-id': this.parentSpanId
    };
  }

  /**
   * Get all spans for this trace
   */
  getSpans() {
    return Array.from(this.spans.values());
  }

  /**
   * Get trace summary
   */
  getSummary() {
    const spans = this.getSpans();
    const totalDuration = spans.reduce((sum, span) => sum + (span.duration || 0), 0);
    const errorCount = spans.filter(span => span.error).length;

    return {
      traceId: this.traceId,
      spanCount: spans.length,
      totalDuration,
      errorCount,
      success: errorCount === 0
    };
  }
}

module.exports = { TraceContext };