import { EventEmitter } from 'events';
import { UserRegisteredEvent, UserProfileUpdatedEvent, UserAuthenticatedEvent } from '../types/index.js';

export type MembershipEvent = UserRegisteredEvent | UserProfileUpdatedEvent | UserAuthenticatedEvent;

export interface EventHandler<T = MembershipEvent> {
  (event: T): Promise<void> | void;
}

/**
 * Event emitter for membership block events
 * TODO: Replace with proper message queue (Redis Streams, RabbitMQ) in production
 */
export class MembershipEventEmitter {
  private emitter = new EventEmitter();
  private eventLog: MembershipEvent[] = []; // In-memory event log for development

  constructor() {
    // Increase max listeners for development
    this.emitter.setMaxListeners(50);
    
    // Log all events for debugging
    this.on('user.registered.v1', (event) => this.logEvent(event));
    this.on('user.profile.updated.v1', (event) => this.logEvent(event));
    this.on('user.authenticated.v1', (event) => this.logEvent(event));
  }

  /**
   * Emit a membership event
   */
  emit(event: MembershipEvent): void {
    this.eventLog.push(event);
    this.emitter.emit(event.type, event);
    
    // Also emit on general channel for cross-cutting concerns
    this.emitter.emit('membership.event', event);
  }

  /**
   * Subscribe to specific event type
   */
  on<T extends MembershipEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler);
  }

  /**
   * Subscribe to all membership events
   */
  onAny(handler: EventHandler<MembershipEvent>): void {
    this.emitter.on('membership.event', handler);
  }

  /**
   * Remove event listener
   */
  off<T extends MembershipEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    this.emitter.off(eventType, handler);
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    this.emitter.removeAllListeners(eventType);
  }

  /**
   * Emit user registered event
   */
  emitUserRegistered(userId: string, email: string, traceId?: string): void {
    const event: UserRegisteredEvent = {
      type: 'user.registered.v1',
      userId,
      email,
      createdAt: new Date().toISOString(),
      traceId
    };
    this.emit(event);
  }

  /**
   * Emit user profile updated event
   */
  emitUserProfileUpdated(userId: string, updatedFields: string[], traceId?: string): void {
    const event: UserProfileUpdatedEvent = {
      type: 'user.profile.updated.v1',
      userId,
      updatedFields,
      updatedAt: new Date().toISOString(),
      traceId
    };
    this.emit(event);
  }

  /**
   * Emit user authenticated event
   */
  emitUserAuthenticated(userId: string, method: 'password' = 'password', traceId?: string): void {
    const event: UserAuthenticatedEvent = {
      type: 'user.authenticated.v1',
      userId,
      method,
      at: new Date().toISOString(),
      traceId
    };
    this.emit(event);
  }

  /**
   * Get event log for debugging/testing
   */
  getEventLog(): MembershipEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get event statistics
   */
  getStats(): { totalEvents: number; listenerCount: number; eventTypes: Record<string, number> } {
    const eventTypes: Record<string, number> = {};
    
    this.eventLog.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });

    return {
      totalEvents: this.eventLog.length,
      listenerCount: this.emitter.listenerCount('membership.event'),
      eventTypes
    };
  }

  private logEvent(event: MembershipEvent): void {
    console.info('Membership event emitted', {
      type: event.type,
      timestamp: new Date().toISOString(),
      traceId: event.traceId,
      // Include relevant identifiers but sanitize sensitive data
      ...(event.type === 'user.registered.v1' && { userId: event.userId, email: event.email }),
      ...(event.type === 'user.profile.updated.v1' && { userId: event.userId, updatedFields: event.updatedFields }),
      ...(event.type === 'user.authenticated.v1' && { userId: event.userId, method: event.method })
    });
  }
}

// Global event emitter instance
export const membershipEvents = new MembershipEventEmitter();