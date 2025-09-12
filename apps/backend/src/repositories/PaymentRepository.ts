/**
 * Payment Repository with Status Management and Event Auditing
 */

import { kysely } from '../config/kysely';
import { PaymentTable, PaymentEventTable, PaymentStatus } from '../types/database';
import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

export interface InitializePaymentData {
  userId: string;
  amountMinor: bigint;
  currency: string;
  paymentMethodId?: string;
  externalId?: string;
  metadata?: object;
}

export interface PaymentEvent {
  type: string;
  payload: object;
}

export class PaymentRepository {
  /**
   * Initialize a new payment
   */
  async initializePayment(data: InitializePaymentData): Promise<PaymentTable> {
    return await kysely.transaction().execute(async (trx) => {
      // Create the payment
      const payment = await trx
        .insertInto('payments')
        .values({
          id: uuidv4(),
          user_id: data.userId,
          amount_minor: data.amountMinor.toString(),
          currency: data.currency.toUpperCase(),
          status: 'initialized',
          payment_method_id: data.paymentMethodId,
          external_id: data.externalId,
          metadata: data.metadata || {},
          created_at: new Date(),
          updated_at: new Date()
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Add initialization event
      await trx
        .insertInto('payment_events')
        .values({
          id: uuidv4(),
          payment_id: payment.id,
          event_type: 'initialized',
          payload_json: {
            amount_minor: data.amountMinor.toString(),
            currency: data.currency,
            payment_method_id: data.paymentMethodId,
            metadata: data.metadata
          },
          created_at: new Date()
        })
        .execute();

      return payment;
    });
  }

  /**
   * Update payment status
   */
  async updateStatus(paymentId: string, status: PaymentStatus, metadata?: object): Promise<PaymentTable | null> {
    return await kysely.transaction().execute(async (trx) => {
      // Update payment status
      const payment = await trx
        .updateTable('payments')
        .set({
          status,
          metadata: metadata || sql`metadata`,
          updated_at: new Date()
        })
        .where('id', '=', paymentId)
        .returningAll()
        .executeTakeFirst();

      if (!payment) {
        return null;
      }

      // Add status change event
      await trx
        .insertInto('payment_events')
        .values({
          id: uuidv4(),
          payment_id: paymentId,
          event_type: `status_changed_to_${status}`,
          payload_json: {
            previous_status: payment.status,
            new_status: status,
            metadata: metadata,
            timestamp: new Date()
          },
          created_at: new Date()
        })
        .execute();

      return payment;
    });
  }

  /**
   * Append event to payment
   */
  async appendEvent(paymentId: string, event: PaymentEvent): Promise<PaymentEventTable> {
    const paymentEvent = await kysely
      .insertInto('payment_events')
      .values({
        id: uuidv4(),
        payment_id: paymentId,
        event_type: event.type,
        payload_json: event.payload,
        created_at: new Date()
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return paymentEvent;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string): Promise<PaymentTable | null> {
    const result = await kysely
      .selectFrom('payments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result || null;
  }

  /**
   * Get payment with events
   */
  async getPaymentWithEvents(id: string): Promise<{ payment: PaymentTable; events: PaymentEventTable[] } | null> {
    const payment = await this.getPaymentById(id);
    if (!payment) {
      return null;
    }

    const events = await kysely
      .selectFrom('payment_events')
      .selectAll()
      .where('payment_id', '=', id)
      .orderBy('created_at', 'asc')
      .execute();

    return { payment, events };
  }

  /**
   * Get payments by user ID
   */
  async getPaymentsByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<PaymentTable[]> {
    const result = await kysely
      .selectFrom('payments')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    return result;
  }

  /**
   * Get payments by status
   */
  async getPaymentsByStatus(status: PaymentStatus, limit: number = 100): Promise<PaymentTable[]> {
    const result = await kysely
      .selectFrom('payments')
      .selectAll()
      .where('status', '=', status)
      .orderBy('created_at', 'asc')
      .limit(limit)
      .execute();

    return result;
  }

  /**
   * Get payment by external ID
   */
  async getPaymentByExternalId(externalId: string): Promise<PaymentTable | null> {
    const result = await kysely
      .selectFrom('payments')
      .selectAll()
      .where('external_id', '=', externalId)
      .executeTakeFirst();

    return result || null;
  }

  /**
   * Count payments by status for user
   */
  async countPaymentsByStatus(userId: string, status?: PaymentStatus): Promise<number> {
    let query = kysely
      .selectFrom('payments')
      .select(kysely.fn.count('id').as('count'))
      .where('user_id', '=', userId);

    if (status) {
      query = query.where('status', '=', status);
    }

    const result = await query.executeTakeFirstOrThrow();
    return Number(result.count);
  }
}