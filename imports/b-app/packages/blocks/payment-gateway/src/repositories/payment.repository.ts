import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentRepository } from '../types/index.js';

/**
 * In-memory payment repository implementation
 * TODO: Replace with PostgreSQL implementation in future phase
 */
export class InMemoryPaymentRepository implements PaymentRepository {
  private payments: Map<string, Payment> = new Map();

  async create(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    const now = new Date();
    const payment: Payment = {
      id: uuidv4(),
      ...paymentData,
      createdAt: now,
      updatedAt: now
    };

    this.payments.set(payment.id, payment);

    console.info('Payment created', {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      version: payment.version
    });

    return payment;
  }

  async findById(id: string): Promise<Payment | null> {
    return this.payments.get(id) || null;
  }

  async update(id: string, patch: Partial<Payment>): Promise<Payment> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    const updatedPayment: Payment = {
      ...existingPayment,
      ...patch,
      id, // Ensure ID cannot be changed
      updatedAt: new Date()
    };

    this.payments.set(id, updatedPayment);

    console.info('Payment updated', {
      paymentId: id,
      updatedFields: Object.keys(patch),
      newStatus: updatedPayment.status,
      version: updatedPayment.version
    });

    return updatedPayment;
  }

  async delete(id: string): Promise<void> {
    const deleted = this.payments.delete(id);
    if (deleted) {
      console.info('Payment deleted', { paymentId: id });
    }
  }

  /**
   * Find payments by status (for monitoring and reporting)
   */
  async findByStatus(status: Payment['status']): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.status === status);
  }

  /**
   * Get repository statistics
   */
  getStats(): { 
    paymentCount: number; 
    statusBreakdown: Record<Payment['status'], number>;
    memoryUsage: number;
  } {
    const statusBreakdown = {} as Record<Payment['status'], number>;
    
    this.payments.forEach(payment => {
      statusBreakdown[payment.status] = (statusBreakdown[payment.status] || 0) + 1;
    });

    return {
      paymentCount: this.payments.size,
      statusBreakdown,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Clear all payments (for testing purposes)
   */
  clear(): void {
    this.payments.clear();
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    this.payments.forEach(payment => {
      size += JSON.stringify(payment).length * 2; // rough estimate
    });
    return size;
  }
}

/**
 * TODO: PostgreSQL implementation for production use
 */
export class PostgreSQLPaymentRepository implements PaymentRepository {
  constructor(private connectionPool: any) {
    // TODO: Implement PostgreSQL connection
  }

  async create(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }

  async findById(id: string): Promise<Payment | null> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }

  async update(id: string, patch: Partial<Payment>): Promise<Payment> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }

  async delete(id: string): Promise<void> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }
}