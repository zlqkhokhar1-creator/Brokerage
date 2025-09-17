import { EventEmitter } from 'eventemitter3';
import { 
  EventBusInterface, 
  EventHandler, 
  EventMetadata, 
  EventEnvelope, 
  EventBusStats,
  EventBusOptions 
} from './types';

export class InMemoryEventBus implements EventBusInterface {
  private emitter: EventEmitter;
  private subscriptions: Map<string, { eventName: string; handler: EventHandler }> = new Map();
  private stats: EventBusStats = {
    totalPublished: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    errorCount: 0
  };
  private options: EventBusOptions;
  private connected = true;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxListeners: 100,
      enableStats: true,
      ...options
    };
    
    this.emitter = new EventEmitter();
    // Note: eventemitter3 doesn't have setMaxListeners
  }

  async publish<T = any>(
    eventName: string, 
    data: T, 
    metadata: EventMetadata = {}
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Event bus is not connected');
    }

    const envelope: EventEnvelope<T> = {
      eventName,
      data,
      metadata: {
        timestamp: new Date(),
        traceId: this.generateTraceId(),
        ...metadata
      },
      publishedAt: new Date()
    };

    try {
      this.emitter.emit(eventName, envelope);
      
      if (this.options.enableStats) {
        this.stats.totalPublished++;
      }
    } catch (error) {
      if (this.options.enableStats) {
        this.stats.errorCount++;
      }
      
      if (this.options.errorHandler) {
        this.options.errorHandler(error as Error, eventName, data);
      } else {
        throw error;
      }
    }
  }

  async subscribe<T = any>(
    eventName: string, 
    handler: EventHandler<T>
  ): Promise<string> {
    if (!this.connected) {
      throw new Error('Event bus is not connected');
    }

    const subscriptionId = this.generateSubscriptionId();
    
    const wrappedHandler = async (envelope: EventEnvelope<T>) => {
      try {
        await handler(envelope.data, envelope.metadata);
      } catch (error) {
        if (this.options.enableStats) {
          this.stats.errorCount++;
        }
        
        if (this.options.errorHandler) {
          this.options.errorHandler(error as Error, eventName, envelope.data);
        } else {
          console.error(`Error in event handler for '${eventName}':`, error);
        }
      }
    };

    this.emitter.on(eventName, wrappedHandler);
    this.subscriptions.set(subscriptionId, { eventName, handler: wrappedHandler });

    if (this.options.enableStats) {
      this.stats.totalSubscriptions++;
      this.stats.activeSubscriptions++;
    }

    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return; // Subscription not found, silently ignore
    }

    this.emitter.off(subscription.eventName, subscription.handler);
    this.subscriptions.delete(subscriptionId);

    if (this.options.enableStats) {
      this.stats.activeSubscriptions--;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emitter.removeAllListeners();
    this.subscriptions.clear();
    
    if (this.options.enableStats) {
      this.stats.activeSubscriptions = 0;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStats(): EventBusStats {
    return { ...this.stats };
  }

  // Get all active event names
  getActiveEvents(): string[] {
    return this.emitter.eventNames() as string[];
  }

  // Get listener count for specific event
  getListenerCount(eventName: string): number {
    return this.emitter.listenerCount(eventName);
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}