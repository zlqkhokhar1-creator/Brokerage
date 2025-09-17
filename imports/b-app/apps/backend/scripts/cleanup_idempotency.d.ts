/**
 * Idempotency Keys Cleanup Script
 * Removes expired idempotency keys from database and Redis
 */
interface CleanupResult {
    success: boolean;
    databaseKeysRemoved: number;
    redisKeysRemoved: number;
    errors: string[];
    duration: number;
}
declare class IdempotencyCleanupService {
    private idempotencyRepo;
    /**
     * Clean up expired idempotency keys
     */
    cleanup(dryRun?: boolean): Promise<CleanupResult>;
    /**
     * Clean up Redis idempotency keys
     */
    private cleanupRedisKeys;
    /**
     * Get cleanup statistics
     */
    getCleanupStats(): Promise<{
        totalKeys: number;
        expiredKeys: number;
        completedKeys: number;
        pendingKeys: number;
    }>;
    /**
     * Clean up keys older than specified days
     */
    cleanupOlderThan(days: number, dryRun?: boolean): Promise<CleanupResult>;
}
export { IdempotencyCleanupService };
