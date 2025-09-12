import * as promClient from 'prom-client';

export interface MetricsInterface {
  counter(name: string, help: string, labelNames?: string[]): Counter;
  histogram(name: string, help: string, labelNames?: string[], buckets?: number[]): Histogram;
  gauge(name: string, help: string, labelNames?: string[]): Gauge;
  getMetrics(): Promise<string>;
  register: promClient.Registry;
}

export interface Counter {
  inc(value?: number, labels?: Record<string, string>): void;
  get(): Promise<any>;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
  startTimer(labels?: Record<string, string>): () => void;
  get(): Promise<any>;
}

export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(value?: number, labels?: Record<string, string>): void;
  dec(value?: number, labels?: Record<string, string>): void;
  get(): Promise<any>;
}

export class PrometheusMetrics implements MetricsInterface {
  public register: promClient.Registry;
  private metrics: Map<string, any> = new Map();

  constructor() {
    this.register = new promClient.Registry();
    
    // Collect default metrics
    promClient.collectDefaultMetrics({ 
      register: this.register,
      prefix: 'platform_'
    });
  }

  counter(name: string, help: string, labelNames: string[] = []): Counter {
    if (this.metrics.has(name)) {
      return this.metrics.get(name);
    }

    const counter = new promClient.Counter({
      name,
      help,
      labelNames,
      registers: [this.register]
    });

    const wrapper: Counter = {
      inc: (value?: number, labels?: Record<string, string>) => {
        counter.inc(labels || {}, value);
      },
      get: () => counter.get()
    };

    this.metrics.set(name, wrapper);
    return wrapper;
  }

  histogram(
    name: string, 
    help: string, 
    labelNames: string[] = [], 
    buckets?: number[]
  ): Histogram {
    if (this.metrics.has(name)) {
      return this.metrics.get(name);
    }

    const histogram = new promClient.Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [this.register]
    });

    const wrapper: Histogram = {
      observe: (value: number, labels?: Record<string, string>) => {
        histogram.observe(labels || {}, value);
      },
      startTimer: (labels?: Record<string, string>) => {
        return histogram.startTimer(labels || {});
      },
      get: () => histogram.get()
    };

    this.metrics.set(name, wrapper);
    return wrapper;
  }

  gauge(name: string, help: string, labelNames: string[] = []): Gauge {
    if (this.metrics.has(name)) {
      return this.metrics.get(name);
    }

    const gauge = new promClient.Gauge({
      name,
      help,
      labelNames,
      registers: [this.register]
    });

    const wrapper: Gauge = {
      set: (value: number, labels?: Record<string, string>) => {
        gauge.set(labels || {}, value);
      },
      inc: (value?: number, labels?: Record<string, string>) => {
        gauge.inc(labels || {}, value);
      },
      dec: (value?: number, labels?: Record<string, string>) => {
        gauge.dec(labels || {}, value);
      },
      get: () => gauge.get()
    };

    this.metrics.set(name, wrapper);
    return wrapper;
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  // Helper method to clear all metrics (useful for testing)
  clear(): void {
    this.register.clear();
    this.metrics.clear();
  }
}

// Pre-defined platform metrics
export class PlatformMetrics {
  private metrics: MetricsInterface;
  
  public readonly blockCommands: Counter;
  public readonly blockCommandDuration: Histogram;
  public readonly blocksLoaded: Gauge;
  public readonly eventsBusPublished: Counter;
  public readonly eventBusErrors: Counter;

  constructor(metrics: MetricsInterface) {
    this.metrics = metrics;

    this.blockCommands = metrics.counter(
      'block_commands_total',
      'Total number of block commands executed',
      ['block', 'command', 'success']
    );

    this.blockCommandDuration = metrics.histogram(
      'block_command_duration_ms',
      'Duration of block command execution in milliseconds',
      ['block', 'command'],
      [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    );

    this.blocksLoaded = metrics.gauge(
      'blocks_loaded_total',
      'Total number of loaded blocks',
      ['status']
    );

    this.eventsBusPublished = metrics.counter(
      'eventbus_published_total',
      'Total number of events published to event bus',
      ['event_name']
    );

    this.eventBusErrors = metrics.counter(
      'eventbus_errors_total',
      'Total number of event bus errors',
      ['event_name', 'error_type']
    );
  }
}