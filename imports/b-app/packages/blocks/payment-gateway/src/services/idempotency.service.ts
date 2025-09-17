import { IdempotencyService } from '../types/index.js';

interface IdempotencyRecord {
  key: string;
  commandType: string;
  result: any;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * In-memory idempotency service implementation
 * TODO: Replace with Redis implementation in production
 */
export class InMemoryIdempotencyService implements IdempotencyService {
  private records: Map<string, IdempotencyRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private defaultTTLSeconds: number = 3600) { // 1 hour default
    // Start periodic cleanup of expired records
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRecords();
    }, 60000); // Cleanup every minute
  }

  async checkKey(key: string, commandType: string): Promise<{ exists: boolean; result?: any }> {
    const recordKey = this.buildRecordKey(key, commandType);
    const record = this.records.get(recordKey);

    if (!record) {
      return { exists: false };
    }

    // Check if record has expired
    if (record.expiresAt <= new Date()) {
      this.records.delete(recordKey);
      console.info('Expired idempotency record removed', { key, commandType });
      return { exists: false };
    }

    console.info('Idempotency key found, returning cached result', { 
      key, 
      commandType,
      age: Math.floor((Date.now() - record.createdAt.getTime()) / 1000)
    });

    return { 
      exists: true, 
      result: record.result 
    };
  }

  async storeResult(key: string, commandType: string, result: any, ttlSeconds?: number): Promise<void> {
    const recordKey = this.buildRecordKey(key, commandType);
    const ttl = ttlSeconds || this.defaultTTLSeconds;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const record: IdempotencyRecord = {
      key,
      commandType,
      result,
      createdAt: now,
      expiresAt
    };

    this.records.set(recordKey, record);

    console.info('Idempotency result stored', {
      key,
      commandType,
      ttlSeconds: ttl,
      expiresAt: expiresAt.toISOString()
    });
  }

  /**
   * Remove a specific idempotency key
   */
  async removeKey(key: string, commandType: string): Promise<boolean> {
    const recordKey = this.buildRecordKey(key, commandType);
    const deleted = this.records.delete(recordKey);
    
    if (deleted) {
      console.info('Idempotency key removed', { key, commandType });
    }
    
    return deleted;
  }

  /**
   * Get idempotency service statistics
   */
  getStats(): {
    recordCount: number;
    memoryUsage: number;
    oldestRecord?: Date;
    newestRecord?: Date;
  } {
    let oldest: Date | undefined;
    let newest: Date | undefined;
    let memoryUsage = 0;

    this.records.forEach(record => {
      if (!oldest || record.createdAt < oldest) {
        oldest = record.createdAt;
      }
      if (!newest || record.createdAt > newest) {
        newest = record.createdAt;
      }
      
      // Estimate memory usage
      memoryUsage += JSON.stringify(record).length * 2;
    });

    return {
      recordCount: this.records.size,
      memoryUsage,
      oldestRecord: oldest,
      newestRecord: newest
    };
  }

  /**
   * Clear all records (for testing purposes)
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private buildRecordKey(key: string, commandType: string): string {
    return `${commandType}:${key}`;
  }

  private cleanupExpiredRecords(): void {
    const now = new Date();
    let expiredCount = 0;

    for (const [recordKey, record] of this.records) {
      if (record.expiresAt <= now) {
        this.records.delete(recordKey);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.info('Cleaned up expired idempotency records', { 
        expiredCount, 
        remainingCount: this.records.size 
      });
    }
  }
}

/**
 * TODO: Redis-based idempotency service for production
 */
export class RedisIdempotencyService implements IdempotencyService {
  constructor(private redisClient: any) {
    // TODO: Implement Redis connection
  }

  async checkKey(key: string, commandType: string): Promise<{ exists: boolean; result?: any }> {
    throw new Error('Redis idempotency service not yet implemented - TODO for Phase 4');
  }

  async storeResult(key: string, commandType: string, result: any, ttlSeconds?: number): Promise<void> {
    throw new Error('Redis idempotency service not yet implemented - TODO for Phase 4');
  }
}