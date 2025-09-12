import { Kysely } from 'kysely';
import { Database } from '../types';

export interface Payment {
  id: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentEvent {
  id: string;
  paymentId: string;
  eventType: string;
  eventData: unknown;
  createdAt: Date;
}

/**
 * Payment repository interface for managing payments and payment events
 * TODO: Implement in PR8 with idempotency integration
 */
export interface PaymentRepository {
  /**
   * Create a new payment
   */
  createPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment>;

  /**
   * Update payment status
   */
  updatePaymentStatus(paymentId: string, status: string, providerPaymentId?: string): Promise<Payment>;

  /**
   * Get payment by ID
   */
  getPaymentById(paymentId: string): Promise<Payment | null>;

  /**
   * Record payment event
   */
  recordPaymentEvent(event: Omit<PaymentEvent, 'id' | 'createdAt'>): Promise<PaymentEvent>;

  /**
   * Get payment events for a payment
   */
  getPaymentEvents(paymentId: string): Promise<PaymentEvent[]>;
}

/**
 * Database implementation of PaymentRepository
 * TODO: Implement in PR8 with Redis integration and idempotency
 */
export class DatabasePaymentRepository implements PaymentRepository {
  constructor(private db: Kysely<Database>) {}

  async createPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    // TODO: Implement in PR8 - payment + idempotency DB integration + Redis
    throw new Error('Not implemented yet - will be implemented in PR8');
  }

  async updatePaymentStatus(paymentId: string, status: string, providerPaymentId?: string): Promise<Payment> {
    // TODO: Implement in PR8 - payment + idempotency DB integration + Redis
    throw new Error('Not implemented yet - will be implemented in PR8');
  }

  async getPaymentById(paymentId: string): Promise<Payment | null> {
    // TODO: Implement in PR8 - payment + idempotency DB integration + Redis
    throw new Error('Not implemented yet - will be implemented in PR8');
  }

  async recordPaymentEvent(event: Omit<PaymentEvent, 'id' | 'createdAt'>): Promise<PaymentEvent> {
    // TODO: Implement in PR8 - payment + idempotency DB integration + Redis
    throw new Error('Not implemented yet - will be implemented in PR8');
  }

  async getPaymentEvents(paymentId: string): Promise<PaymentEvent[]> {
    // TODO: Implement in PR8 - payment + idempotency DB integration + Redis
    throw new Error('Not implemented yet - will be implemented in PR8');
  }
}