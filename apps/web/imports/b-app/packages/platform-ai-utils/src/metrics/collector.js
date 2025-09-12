/**
 * Metrics Collector for Phase 4 AI Blocks
 * Collects and exposes metrics for embeddings, vector queries, and ledger transactions
 */

class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.counters = new Map();
    this.timers = new Map();
    this.histograms = new Map();
    this.startTime = Date.now();
  }

  // Counter metrics
  incrementCounter(name, value = 1, labels = {}) {
    const key = this._makeKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  getCounter(name, labels = {}) {
    const key = this._makeKey(name, labels);
    return this.counters.get(key) || 0;
  }

  // Histogram metrics (for tracking durations, sizes, etc.)
  recordHistogram(name, value, labels = {}) {
    const key = this._makeKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key).push({
      value,
      timestamp: Date.now()
    });
  }

  getHistogramStats(name, labels = {}) {
    const key = this._makeKey(name, labels);
    const values = this.histograms.get(key) || [];
    
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
    }

    const nums = values.map(v => v.value).sort((a, b) => a - b);
    const count = nums.length;
    const sum = nums.reduce((a, b) => a + b, 0);

    return {
      count,
      min: nums[0],
      max: nums[count - 1],
      avg: sum / count,
      p50: nums[Math.floor(count * 0.5)],
      p95: nums[Math.floor(count * 0.95)],
      p99: nums[Math.floor(count * 0.99)]
    };
  }

  // Timer utilities
  startTimer(name, labels = {}) {
    const key = this._makeKey(name, labels);
    this.timers.set(key, Date.now());
    return key;
  }

  endTimer(timerKey) {
    const startTime = this.timers.get(timerKey);
    if (!startTime) {
      throw new Error(`Timer not found: ${timerKey}`);
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(timerKey);
    
    // Extract name and labels from key to record histogram
    const [name, labelsStr] = timerKey.split('|');
    const labels = labelsStr ? JSON.parse(labelsStr) : {};
    this.recordHistogram(`${name}_duration_ms`, duration, labels);
    
    return duration;
  }

  // AI Embeddings specific metrics
  recordEmbeddingGenerated(model, dimensions, textCount, duration) {
    this.incrementCounter('embeddings_generated_total', textCount, { model });
    this.incrementCounter('embedding_requests_total', 1, { model });
    this.recordHistogram('embedding_generation_duration_ms', duration, { model });
    this.recordHistogram('embedding_dimensions', dimensions, { model });
    this.recordHistogram('embedding_text_count', textCount, { model });
  }

  recordEmbeddingBatch(model, dimensions, textCount, duration) {
    this.incrementCounter('embeddings_batch_generated_total', textCount, { model });
    this.incrementCounter('embedding_batch_requests_total', 1, { model });
    this.recordHistogram('embedding_batch_duration_ms', duration, { model });
    this.recordHistogram('embedding_batch_size', textCount, { model });
  }

  // Vector Store specific metrics
  recordVectorUpsert(dimensions, duration) {
    this.incrementCounter('vectors_upserted_total', 1);
    this.recordHistogram('vector_upsert_duration_ms', duration);
    this.recordHistogram('vector_dimensions', dimensions);
  }

  recordVectorQuery(dimensions, topK, resultCount, duration) {
    this.incrementCounter('vector_queries_total', 1);
    this.recordHistogram('vector_query_duration_ms', duration);
    this.recordHistogram('vector_query_topk', topK);
    this.recordHistogram('vector_query_results', resultCount);
    this.recordHistogram('vector_query_dimensions', dimensions);
  }

  recordVectorDelete(deleted, duration) {
    this.incrementCounter('vectors_deleted_total', 1);
    this.incrementCounter('vectors_deleted_success_total', deleted ? 1 : 0);
    this.recordHistogram('vector_delete_duration_ms', duration);
  }

  // Ledger Shadow specific metrics
  recordLedgerTransaction(sourceEventType, currency, direction, amountMinor, duration) {
    this.incrementCounter('ledger_transactions_total', 1, { 
      source_event_type: sourceEventType,
      currency,
      direction
    });
    this.recordHistogram('ledger_transaction_duration_ms', duration, { direction });
    this.recordHistogram('ledger_transaction_amount_minor', Math.abs(amountMinor), { 
      currency,
      direction 
    });
  }

  recordLedgerBalance(currency, balanceMinor, duration) {
    this.incrementCounter('ledger_balance_queries_total', 1, { currency });
    this.recordHistogram('ledger_balance_query_duration_ms', duration);
    this.recordHistogram('ledger_balance_minor', Math.abs(balanceMinor), { currency });
  }

  // Export metrics in Prometheus format
  toPrometheusFormat() {
    const lines = [];
    const timestamp = Date.now();

    // Counters
    for (const [key, value] of this.counters.entries()) {
      const [name, labelsStr] = key.split('|');
      const labelsFormatted = labelsStr ? 
        `{${Object.entries(JSON.parse(labelsStr)).map(([k, v]) => `${k}="${v}"`).join(',')}}` : '';
      lines.push(`${name}${labelsFormatted} ${value} ${timestamp}`);
    }

    // Histograms (as summary metrics)
    for (const [key, values] of this.histograms.entries()) {
      const [name, labelsStr] = key.split('|');
      const labels = labelsStr ? JSON.parse(labelsStr) : {};
      const stats = this.getHistogramStats(name.replace(/_duration_ms$/, '').replace(/_/g, ''), labels);
      
      const baseLabels = labelsStr ? 
        `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` : '';
      
      lines.push(`${name}_count${baseLabels} ${stats.count} ${timestamp}`);
      lines.push(`${name}_sum${baseLabels} ${(stats.avg * stats.count).toFixed(2)} ${timestamp}`);
      lines.push(`${name}_avg${baseLabels} ${stats.avg.toFixed(2)} ${timestamp}`);
      lines.push(`${name}_p95${baseLabels} ${stats.p95} ${timestamp}`);
      lines.push(`${name}_p99${baseLabels} ${stats.p99} ${timestamp}`);
    }

    return lines.join('\n');
  }

  // Export metrics as JSON
  toJSON() {
    const counters = {};
    for (const [key, value] of this.counters.entries()) {
      const [name, labelsStr] = key.split('|');
      const labels = labelsStr ? JSON.parse(labelsStr) : {};
      if (!counters[name]) counters[name] = [];
      counters[name].push({ labels, value });
    }

    const histograms = {};
    for (const [key, values] of this.histograms.entries()) {
      const [name, labelsStr] = key.split('|');
      const labels = labelsStr ? JSON.parse(labelsStr) : {};
      const stats = this.getHistogramStats(name, labels);
      if (!histograms[name]) histograms[name] = [];
      histograms[name].push({ labels, ...stats });
    }

    return {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      counters,
      histograms,
      collected_at: new Date().toISOString()
    };
  }

  // Get summary statistics
  getSummary() {
    const summary = {
      ai_embeddings: {
        total_embeddings_generated: this.getCounter('embeddings_generated_total'),
        total_requests: this.getCounter('embedding_requests_total'),
        avg_generation_time: this.getHistogramStats('embedding_generation_duration_ms').avg
      },
      vector_store: {
        total_vectors_stored: this.getCounter('vectors_upserted_total'),
        total_queries: this.getCounter('vector_queries_total'),
        avg_query_time: this.getHistogramStats('vector_query_duration_ms').avg,
        avg_results_per_query: this.getHistogramStats('vector_query_results').avg
      },
      ledger_shadow: {
        total_transactions: this.getCounter('ledger_transactions_total'),
        total_balance_queries: this.getCounter('ledger_balance_queries_total'),
        avg_transaction_time: this.getHistogramStats('ledger_transaction_duration_ms').avg
      }
    };

    return summary;
  }

  // Clear all metrics
  clear() {
    this.metrics.clear();
    this.counters.clear();
    this.timers.clear();
    this.histograms.clear();
    this.startTime = Date.now();
  }

  _makeKey(name, labels = {}) {
    const labelsStr = Object.keys(labels).length > 0 ? JSON.stringify(labels) : '';
    return `${name}|${labelsStr}`;
  }
}

// Global metrics collector instance
const globalMetrics = new MetricsCollector();

module.exports = {
  MetricsCollector,
  globalMetrics
};