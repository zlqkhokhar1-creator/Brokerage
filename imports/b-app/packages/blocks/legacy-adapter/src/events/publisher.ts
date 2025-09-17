import { UserRegisteredEventV1 } from '../schemas';

/**
 * Event publisher interface for publishing domain events
 * In a real implementation, this would integrate with event bus (Redis, RabbitMQ, etc.)
 */
export interface EventPublisher {
  publish(event: UserRegisteredEventV1): Promise<void>;
}

/**
 * In-memory event publisher implementation for testing and development
 * Stores events in memory and provides access for verification
 */
export class InMemoryEventPublisher implements EventPublisher {
  private events: UserRegisteredEventV1[] = [];

  async publish(event: UserRegisteredEventV1): Promise<void> {
    console.log({
      eventId: event.eventId,
      eventType: event.eventType,
      version: event.version,
      traceId: event.metadata.traceId,
      userId: event.data.userId,
    }, 'Publishing event');

    // Store event in memory
    this.events.push(event);
    
    // Simulate async publishing
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Get all published events (for testing)
   */
  getEvents(): UserRegisteredEventV1[] {
    return [...this.events];
  }

  /**
   * Get events by type (for testing)
   */
  getEventsByType(eventType: string): UserRegisteredEventV1[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get event count (for testing)
   */
  getEventCount(): number {
    return this.events.length;
  }
}

/**
 * Redis event publisher implementation (stub)
 * TODO: Implement real Redis-based event publishing
 */
export class RedisEventPublisher implements EventPublisher {
  constructor(private redisUrl: string) {
    // TODO: Initialize Redis connection
  }

  async publish(event: UserRegisteredEventV1): Promise<void> {
    console.log({
      eventId: event.eventId,
      eventType: event.eventType,
      version: event.version,
      traceId: event.metadata.traceId,
    }, 'Publishing event to Redis (stub)');

    // TODO: Implement Redis publishing
    throw new Error('RedisEventPublisher not implemented yet');
  }
}

/**
 * Factory function to create event publisher based on environment
 */
export function createEventPublisher(): EventPublisher {
  const eventBusType = process.env.EVENT_BUS_TYPE || 'memory';
  
  switch (eventBusType) {
    case 'memory':
      return new InMemoryEventPublisher();
    case 'redis':
      return new RedisEventPublisher(process.env.REDIS_URL || 'redis://localhost:6379');
    default:
      throw new Error(`Unknown event bus type: ${eventBusType}`);
  }
}