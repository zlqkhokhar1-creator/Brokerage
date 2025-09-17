// TODO: OpenTelemetry tracer bootstrap (no exporter wiring yet)
// This is a placeholder implementation for the tracing interface

export interface Span {
  setTag(key: string, value: any): Span;
  setError(error: Error): Span;
  finish(): void;
  context(): SpanContext;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
}

export interface TracerInterface {
  startSpan(operationName: string, parentSpan?: Span): Span;
  extract(format: string, carrier: any): SpanContext | null;
  inject(spanContext: SpanContext, format: string, carrier: any): void;
}

// Simple in-memory tracer implementation
export class SimpleTracer implements TracerInterface {
  private spans: Map<string, SimpleSpan> = new Map();

  startSpan(operationName: string, parentSpan?: Span): Span {
    const traceId = parentSpan?.context().traceId || this.generateId();
    const spanId = this.generateId();
    
    const span = new SimpleSpan(operationName, traceId, spanId, parentSpan);
    this.spans.set(spanId, span);
    
    return span;
  }

  extract(format: string, carrier: any): SpanContext | null {
    // TODO: Implement when needed for distributed tracing
    return null;
  }

  inject(spanContext: SpanContext, format: string, carrier: any): void {
    // TODO: Implement when needed for distributed tracing
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Helper to get all spans (for debugging)
  getSpans(): Map<string, SimpleSpan> {
    return new Map(this.spans);
  }
}

class SimpleSpan implements Span {
  private tags: Map<string, any> = new Map();
  private startTime: number = Date.now();
  private finished = false;

  constructor(
    private operationName: string,
    private traceId: string,
    private spanId: string,
    private parentSpan?: Span
  ) {}

  setTag(key: string, value: any): Span {
    this.tags.set(key, value);
    return this;
  }

  setError(error: Error): Span {
    this.tags.set('error', true);
    this.tags.set('error.message', error.message);
    this.tags.set('error.stack', error.stack);
    return this;
  }

  finish(): void {
    if (this.finished) return;
    
    this.finished = true;
    const duration = Date.now() - this.startTime;
    this.tags.set('duration.ms', duration);
    
    // In a real implementation, this would be sent to a tracing backend
    console.debug('Span finished', {
      operationName: this.operationName,
      traceId: this.traceId,
      spanId: this.spanId,
      duration,
      tags: Object.fromEntries(this.tags)
    });
  }

  context(): SpanContext {
    return {
      traceId: this.traceId,
      spanId: this.spanId
    };
  }

  getTags(): Map<string, any> {
    return new Map(this.tags);
  }

  getOperationName(): string {
    return this.operationName;
  }
}

// Factory for creating tracers
export class TracerFactory {
  private static instance: TracerInterface;

  static getTracer(): TracerInterface {
    if (!TracerFactory.instance) {
      TracerFactory.instance = new SimpleTracer();
    }
    return TracerFactory.instance;
  }

  static setTracer(tracer: TracerInterface): void {
    TracerFactory.instance = tracer;
  }
}

// Helper function to create spans with automatic finishing
export function withSpan<T>(
  tracer: TracerInterface,
  operationName: string,
  fn: (span: Span) => Promise<T> | T,
  parentSpan?: Span
): Promise<T> {
  const span = tracer.startSpan(operationName, parentSpan);
  
  try {
    const result = fn(span);
    
    if (result instanceof Promise) {
      return result
        .then(value => {
          span.finish();
          return value;
        })
        .catch(error => {
          span.setError(error);
          span.finish();
          throw error;
        });
    } else {
      span.finish();
      return Promise.resolve(result);
    }
  } catch (error) {
    span.setError(error as Error);
    span.finish();
    throw error;
  }
}