/**
 * Idempotency Repository with Redis SETNX and DB persistence
 */

import { kysely } from '../config/kysely';
import { IdempotencyKeyTable } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

// Import Redis client - using require for compatibility with existing JS code
const { client: redisClient } = require('../config/redis');

export interface IdempotencyResponse {
  statusCode: number;
  response: object;
}

export class IdempotencyRepository {
  private static readonly DEFAULT_TTL = 86400; // 24 hours in seconds
  private static readonly REDIS_PREFIX = 'idempotency';

  /**
   * Reserve idempotency key using Redis SETNX
   * Returns true if key was successfully reserved, false if already exists
   */
  async reserveKey(scope: string, key: string, ttl: number = IdempotencyRepository.DEFAULT_TTL): Promise<boolean> {
    const redisKey = `${IdempotencyRepository.REDIS_PREFIX}:${scope}:${key}`;
    
    try {
      // Use SETNX with TTL - returns 1 if key was set, 0 if key already exists
      const result = await redisClient.setNX(redisKey, 'reserved', { EX: ttl });
      return result === true;
    } catch (error) {
      // If Redis is down, fall back to database-only reservation
      console.warn('Redis reservation failed, falling back to DB:', error);
      
      try {
        await kysely
          .insertInto('idempotency_keys')
          .values({
            id: uuidv4(),
            scope,
            key_value: key,
            created_at: new Date(),
            expires_at: new Date(Date.now() + (ttl * 1000))
          })
          .execute();
        return true;
      } catch (dbError) {
        // If unique constraint violation, key already exists
        return false;
      }
    }
  }

  /**
   * Store response in database for permanent persistence
   */
  async storeResponse(scope: string, key: string, response: IdempotencyResponse): Promise<void> {
    await kysely
      .updateTable('idempotency_keys')
      .set({
        status_code: response.statusCode,
        response_json: response.response,
        completed_at: new Date()
      })
      .where('scope', '=', scope)
      .where('key_value', '=', key)
      .execute();

    // Also store in Redis for fast access (optional optimization)
    const redisKey = `${IdempotencyRepository.REDIS_PREFIX}:response:${scope}:${key}`;
    try {
      await redisClient.setEx(
        redisKey, 
        IdempotencyRepository.DEFAULT_TTL, 
        JSON.stringify(response)
      );
    } catch (error) {
      // Redis storage is optional - DB is source of truth
      console.warn('Redis response storage failed:', error);
    }
  }

  /**
   * Get stored response - checks DB first for permanence
   */
  async getStoredResponse(scope: string, key: string): Promise<IdempotencyResponse | null> {
    // First check database (source of truth)
    const dbResult = await kysely
      .selectFrom('idempotency_keys')
      .select(['status_code', 'response_json', 'completed_at'])
      .where('scope', '=', scope)
      .where('key_value', '=', key)
      .where('completed_at', 'is not', null)
      .executeTakeFirst();

    if (dbResult && dbResult.status_code !== null && dbResult.response_json !== null) {
      return {
        statusCode: dbResult.status_code || 0,
        response: dbResult.response_json as object
      };
    }

    // Optional: Check Redis as fallback/optimization
    const redisKey = `${IdempotencyRepository.REDIS_PREFIX}:response:${scope}:${key}`;
    try {
      const redisResult = await redisClient.get(redisKey);
      if (redisResult) {
        return JSON.parse(redisResult);
      }
    } catch (error) {
      console.warn('Redis response retrieval failed:', error);
    }

    return null;
  }

  /**
   * Check if key exists (reserved but not completed)
   */
  async keyExists(scope: string, key: string): Promise<boolean> {
    // Check Redis first for speed
    const redisKey = `${IdempotencyRepository.REDIS_PREFIX}:${scope}:${key}`;
    try {
      const exists = await redisClient.exists(redisKey);
      if (exists) return true;
    } catch (error) {
      console.warn('Redis key check failed:', error);
    }

    // Check database
    const dbResult = await kysely
      .selectFrom('idempotency_keys')
      .select('id')
      .where('scope', '=', scope)
      .where('key_value', '=', key)
      .where('expires_at', '>', new Date())
      .executeTakeFirst();

    return !!dbResult;
  }

  /**
   * Clean up expired idempotency keys from database
   */
  async cleanupExpired(): Promise<number> {
    const result = await kysely
      .deleteFrom('idempotency_keys')
      .where('expires_at', '<', new Date())
      .executeTakeFirst();

    return Number(result.numDeletedRows || 0);
  }

  /**
   * Get key info for debugging
   */
  async getKeyInfo(scope: string, key: string): Promise<IdempotencyKeyTable | null> {
    const result = await kysely
      .selectFrom('idempotency_keys')
      .selectAll()
      .where('scope', '=', scope)
      .where('key_value', '=', key)
      .executeTakeFirst();

    return result || null;
  }

  /**
   * Delete idempotency key (for testing/cleanup)
   */
  async deleteKey(scope: string, key: string): Promise<void> {
    // Remove from Redis
    const redisKey = `${IdempotencyRepository.REDIS_PREFIX}:${scope}:${key}`;
    const responseRedisKey = `${IdempotencyRepository.REDIS_PREFIX}:response:${scope}:${key}`;
    
    try {
      await Promise.all([
        redisClient.del(redisKey),
        redisClient.del(responseRedisKey)
      ]);
    } catch (error) {
      console.warn('Redis key deletion failed:', error);
    }

    // Remove from database
    await kysely
      .deleteFrom('idempotency_keys')
      .where('scope', '=', scope)
      .where('key_value', '=', key)
      .execute();
  }
}