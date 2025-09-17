import { Kysely } from 'kysely';
import { Database } from '../types';

export interface ReserveKeyParams {
  key: string;
  requestHash: string;
  expiresAt: Date;
}

export interface StoredResponse {
  key: string;
  responseData: unknown;
  status: string;
  createdAt: Date;
}

/**
 * Idempotency repository interface for handling duplicate request prevention
 */
export interface IdempotencyRepository {
  /**
   * Reserve an idempotency key, returns true if successful (key not taken)
   */
  reserveKey(params: ReserveKeyParams): Promise<boolean>;

  /**
   * Get stored response for an idempotency key
   */
  getStoredResponse(key: string): Promise<StoredResponse | null>;

  /**
   * Store response data for an idempotency key
   */
  storeResponse(key: string, responseData: unknown, status: string): Promise<void>;
}

/**
 * Database implementation of IdempotencyRepository
 * TODO: Wire into payment/API logic in PR8
 */
export class DatabaseIdempotencyRepository implements IdempotencyRepository {
  constructor(private db: Kysely<Database>) {}

  async reserveKey(params: ReserveKeyParams): Promise<boolean> {
    // TODO: Implement in PR8 - integrate with Redis for distributed locking
    throw new Error('Not implemented yet - will be wired in PR8');
  }

  async getStoredResponse(key: string): Promise<StoredResponse | null> {
    // TODO: Implement in PR8 - integrate with Redis for distributed locking
    throw new Error('Not implemented yet - will be wired in PR8');
  }

  async storeResponse(key: string, responseData: unknown, status: string): Promise<void> {
    // TODO: Implement in PR8 - integrate with Redis for distributed locking
    throw new Error('Not implemented yet - will be wired in PR8');
  }
}