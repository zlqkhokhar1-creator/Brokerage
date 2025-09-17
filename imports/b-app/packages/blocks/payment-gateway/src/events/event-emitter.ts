import { EventEmitter } from 'events';
import { PaymentEvent, Currency } from '../types/index.js';

export interface PaymentEventHandler<T = PaymentEvent> {
  (event: T): Promise<void> | void;
}

/**
 * Event emitter for payment gateway events
 * TODO: Replace with proper message queue (Redis Streams, RabbitMQ) in production
 */
export class PaymentEventEmitter {
  private emitter = new EventEmitter();
  private eventLog: PaymentEvent[] = []; // In-memory event log for development

  constructor() {
    // Increase max listeners for development
    this.emitter.setMaxListeners(50);
    
    // Log all events for debugging
    this.on('payment.initialized.v1', (event) => this.logEvent(event));
    this.on('payment.authorized.v1', (event) => this.logEvent(event));
    this.on('payment.captured.v1', (event) => this.logEvent(event));
    this.on('payment.refunded.v1', (event) => this.logEvent(event));
  }

  /**
   * Emit a payment event
   */
  emit(event: PaymentEvent): void {
    this.eventLog.push(event);
    this.emitter.emit(event.type, event);
    
    // Also emit on general channel for cross-cutting concerns
    this.emitter.emit('payment.event', event);
  }

  /**
   * Subscribe to specific event type
   */
  on<T extends PaymentEvent>(eventType: T['type'], handler: PaymentEventHandler<T>): void {
    this.emitter.on(eventType, handler);
  }

  /**
   * Subscribe to all payment events
   */
  onAny(handler: PaymentEventHandler<PaymentEvent>): void {
    this.emitter.on('payment.event', handler);
  }

  /**
   * Remove event listener
   */
  off<T extends PaymentEvent>(eventType: T['type'], handler: PaymentEventHandler<T>): void {
    this.emitter.off(eventType, handler);
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    this.emitter.removeAllListeners(eventType);
  }

  /**
   * Emit payment initialized event
   */
  emitPaymentInitialized(
    paymentId: string,
    amount: number,
    currency: Currency,
    method: string,
    provider: string,
    traceId?: string
  ): void {
    const event: PaymentEvent = {
      type: 'payment.initialized.v1',
      paymentId,
      amount,
      currency,
      method: method as any, // Type assertion for method flexibility
      provider,
      at: new Date().toISOString(),
      traceId
    };
    this.emit(event);
  }

  /**
   * Emit payment authorized event
   */
  emitPaymentAuthorized(
    paymentId: string,
    authorizedAmount: number,
    currency: Currency,
    provider: string,
    traceId?: string
  ): void {
    const event: PaymentEvent = {
      type: 'payment.authorized.v1',
      paymentId,
      authorizedAmount,
      currency,
      provider,
      at: new Date().toISOString(),
      traceId
    };
    this.emit(event);
  }

  /**
   * Emit payment captured event
   */
  emitPaymentCaptured(
    paymentId: string,
    capturedAmount: number,
    currency: Currency,
    provider: string,
    traceId?: string
  ): void {
    const event: PaymentEvent = {
      type: 'payment.captured.v1',
      paymentId,
      capturedAmount,
      currency,
      provider,
      at: new Date().toISOString(),
      traceId
    };
    this.emit(event);
  }

  /**
   * Emit payment refunded event
   */
  emitPaymentRefunded(
    paymentId: string,
    refundedAmount: number,
    currency: Currency,
    provider: string,
    traceId?: string
  ): void {
    const event: PaymentEvent = {
      type: 'payment.refunded.v1',
      paymentId,
      refundedAmount,
      currency,
      provider,
      at: new Date().toISOString(),
      traceId
    };
    this.emit(event);
  }

  /**
   * Get event log for debugging/testing
   */
  getEventLog(): PaymentEvent[] {
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
  getStats(): { 
    totalEvents: number; 
    listenerCount: number; 
    eventTypes: Record<string, number>;
    providers: Record<string, number>;
  } {
    const eventTypes: Record<string, number> = {};
    const providers: Record<string, number> = {};
    
    this.eventLog.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      providers[event.provider] = (providers[event.provider] || 0) + 1;
    });

    return {
      totalEvents: this.eventLog.length,
      listenerCount: this.emitter.listenerCount('payment.event'),
      eventTypes,
      providers
    };
  }

  private logEvent(event: PaymentEvent): void {
    console.info('Payment event emitted', {
      type: event.type,
      paymentId: event.paymentId,
      provider: event.provider,
      timestamp: event.at,
      traceId: event.traceId,
      // Include event-specific data
      ...(event.type === 'payment.initialized.v1' && { 
        amount: event.amount, 
        currency: event.currency, 
        method: event.method 
      }),
      ...(event.type === 'payment.authorized.v1' && { 
        authorizedAmount: event.authorizedAmount, 
        currency: event.currency 
      }),
      ...(event.type === 'payment.captured.v1' && { 
        capturedAmount: event.capturedAmount, 
        currency: event.currency 
      }),
      ...(event.type === 'payment.refunded.v1' && { 
        refundedAmount: event.refundedAmount, 
        currency: event.currency 
      })
    });
  }
}

// Global event emitter instance
export const paymentEvents = new PaymentEventEmitter();