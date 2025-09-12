"use strict";
/**
 * Idempotency Keys Cleanup Script
 * Removes expired idempotency keys from database and Redis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyCleanupService = void 0;
const kysely_1 = require("../src/config/kysely");
const IdempotencyRepository_1 = require("../src/repositories/IdempotencyRepository");
// Import Redis client - using require for compatibility
const { getRedisClient } = require('../src/config/redisClient');
class IdempotencyCleanupService {
    idempotencyRepo = new IdempotencyRepository_1.IdempotencyRepository();
    /**
     * Clean up expired idempotency keys
     */
    async cleanup(dryRun = false) {
        const startTime = Date.now();
        const result = {
            success: true,
            databaseKeysRemoved: 0,
            redisKeysRemoved: 0,
            errors: [],
            duration: 0
        };
        try {
            console.log(`${dryRun ? 'DRY RUN: ' : ''}Starting idempotency keys cleanup...`);
            // Clean up database keys
            if (!dryRun) {
                result.databaseKeysRemoved = await this.idempotencyRepo.cleanupExpired();
            }
            else {
                // Count what would be deleted
                const countResult = await kysely_1.kysely
                    .selectFrom('idempotency_keys')
                    .select(kysely_1.kysely.fn.count('id').as('count'))
                    .where('expires_at', '<', new Date())
                    .executeTakeFirstOrThrow();
                result.databaseKeysRemoved = Number(countResult.count);
            }
            console.log(`${dryRun ? 'Would remove' : 'Removed'} ${result.databaseKeysRemoved} expired keys from database`);
            // Clean up Redis keys
            try {
                const redisClient = await getRedisClient();
                result.redisKeysRemoved = await this.cleanupRedisKeys(redisClient, dryRun);
                console.log(`${dryRun ? 'Would remove' : 'Removed'} ${result.redisKeysRemoved} expired keys from Redis`);
            }
            catch (redisError) {
                result.errors.push(`Redis cleanup failed: ${redisError.message}`);
                console.warn('Redis cleanup failed, continuing with database cleanup only');
            }
        }
        catch (error) {
            result.success = false;
            result.errors.push(`Cleanup failed: ${error.message}`);
            console.error('Cleanup error:', error);
        }
        result.duration = Date.now() - startTime;
        return result;
    }
    /**
     * Clean up Redis idempotency keys
     */
    async cleanupRedisKeys(redisClient, dryRun) {
        const REDIS_PREFIX = 'idempotency';
        const batchSize = 100;
        let totalRemoved = 0;
        try {
            // Get all idempotency keys from Redis
            const pattern = `${REDIS_PREFIX}:*`;
            const keys = await redisClient.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }
            console.log(`Found ${keys.length} idempotency keys in Redis`);
            // Process in batches
            for (let i = 0; i < keys.length; i += batchSize) {
                const batch = keys.slice(i, i + batchSize);
                const keysToRemove = [];
                // Check TTL for each key in batch
                for (const key of batch) {
                    try {
                        const ttl = await redisClient.ttl(key);
                        // TTL of -1 means no expiry, -2 means key doesn't exist, 0 or negative means expired
                        if (ttl === -2 || ttl === 0) {
                            keysToRemove.push(key);
                        }
                    }
                    catch (error) {
                        console.warn(`Error checking TTL for key ${key}:`, error.message);
                    }
                }
                // Remove expired keys
                if (keysToRemove.length > 0 && !dryRun) {
                    try {
                        await redisClient.del(keysToRemove);
                        totalRemoved += keysToRemove.length;
                    }
                    catch (error) {
                        console.warn(`Error deleting Redis keys:`, error.message);
                    }
                }
                else if (dryRun) {
                    totalRemoved += keysToRemove.length;
                }
                if (keysToRemove.length > 0) {
                    console.log(`Processed batch ${Math.floor(i / batchSize) + 1}: ${keysToRemoved.length} expired keys`);
                }
            }
        }
        catch (error) {
            console.error('Redis cleanup error:', error);
            throw error;
        }
        return totalRemoved;
    }
    /**
     * Get cleanup statistics
     */
    async getCleanupStats() {
        try {
            const totalResult = await kysely_1.kysely
                .selectFrom('idempotency_keys')
                .select(kysely_1.kysely.fn.count('id').as('count'))
                .executeTakeFirstOrThrow();
            const expiredResult = await kysely_1.kysely
                .selectFrom('idempotency_keys')
                .select(kysely_1.kysely.fn.count('id').as('count'))
                .where('expires_at', '<', new Date())
                .executeTakeFirstOrThrow();
            const completedResult = await kysely_1.kysely
                .selectFrom('idempotency_keys')
                .select(kysely_1.kysely.fn.count('id').as('count'))
                .where('completed_at', 'is not', null)
                .executeTakeFirstOrThrow();
            const pendingResult = await kysely_1.kysely
                .selectFrom('idempotency_keys')
                .select(kysely_1.kysely.fn.count('id').as('count'))
                .where('completed_at', 'is', null)
                .where('expires_at', '>', new Date())
                .executeTakeFirstOrThrow();
            return {
                totalKeys: Number(totalResult.count),
                expiredKeys: Number(expiredResult.count),
                completedKeys: Number(completedResult.count),
                pendingKeys: Number(pendingResult.count)
            };
        }
        catch (error) {
            console.error('Error getting cleanup stats:', error);
            return {
                totalKeys: 0,
                expiredKeys: 0,
                completedKeys: 0,
                pendingKeys: 0
            };
        }
    }
    /**
     * Clean up keys older than specified days
     */
    async cleanupOlderThan(days, dryRun = false) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const startTime = Date.now();
        const result = {
            success: true,
            databaseKeysRemoved: 0,
            redisKeysRemoved: 0,
            errors: [],
            duration: 0
        };
        try {
            console.log(`${dryRun ? 'DRY RUN: ' : ''}Cleaning up keys older than ${days} days (before ${cutoffDate.toISOString()})...`);
            if (!dryRun) {
                const deleteResult = await kysely_1.kysely
                    .deleteFrom('idempotency_keys')
                    .where('created_at', '<', cutoffDate)
                    .executeTakeFirst();
                result.databaseKeysRemoved = Number(deleteResult.numDeletedRows || 0);
            }
            else {
                const countResult = await kysely_1.kysely
                    .selectFrom('idempotency_keys')
                    .select(kysely_1.kysely.fn.count('id').as('count'))
                    .where('created_at', '<', cutoffDate)
                    .executeTakeFirstOrThrow();
                result.databaseKeysRemoved = Number(countResult.count);
            }
            console.log(`${dryRun ? 'Would remove' : 'Removed'} ${result.databaseKeysRemoved} old keys`);
        }
        catch (error) {
            result.success = false;
            result.errors.push(`Cleanup failed: ${error.message}`);
        }
        result.duration = Date.now() - startTime;
        return result;
    }
}
exports.IdempotencyCleanupService = IdempotencyCleanupService;
// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'cleanup';
    const dryRun = args.includes('--dry-run');
    const jsonOutput = args.includes('--json');
    const cleanupService = new IdempotencyCleanupService();
    try {
        switch (command) {
            case 'cleanup':
                const result = await cleanupService.cleanup(dryRun);
                if (jsonOutput) {
                    console.log(JSON.stringify(result, null, 2));
                }
                else {
                    console.log(`Cleanup ${result.success ? 'completed' : 'failed'}`);
                    console.log(`Database keys removed: ${result.databaseKeysRemoved}`);
                    console.log(`Redis keys removed: ${result.redisKeysRemoved}`);
                    console.log(`Duration: ${result.duration}ms`);
                    if (result.errors.length > 0) {
                        console.log('Errors:', result.errors);
                    }
                }
                process.exit(result.success ? 0 : 1);
                break;
            case 'stats':
                const stats = await cleanupService.getCleanupStats();
                if (jsonOutput) {
                    console.log(JSON.stringify(stats, null, 2));
                }
                else {
                    console.log('Idempotency Keys Statistics:');
                    console.log(`  Total keys: ${stats.totalKeys}`);
                    console.log(`  Expired keys: ${stats.expiredKeys}`);
                    console.log(`  Completed keys: ${stats.completedKeys}`);
                    console.log(`  Pending keys: ${stats.pendingKeys}`);
                }
                break;
            case 'cleanup-old':
                const days = parseInt(args[1]) || 30;
                const oldResult = await cleanupService.cleanupOlderThan(days, dryRun);
                if (jsonOutput) {
                    console.log(JSON.stringify(oldResult, null, 2));
                }
                else {
                    console.log(`Old keys cleanup ${oldResult.success ? 'completed' : 'failed'}`);
                    console.log(`Keys removed: ${oldResult.databaseKeysRemoved}`);
                    console.log(`Duration: ${oldResult.duration}ms`);
                }
                process.exit(oldResult.success ? 0 : 1);
                break;
            default:
                console.log('Usage: ts-node cleanup_idempotency.ts [command] [options]');
                console.log('Commands:');
                console.log('  cleanup          - Clean up expired keys (default)');
                console.log('  stats            - Show cleanup statistics');
                console.log('  cleanup-old [N]  - Clean up keys older than N days (default: 30)');
                console.log('Options:');
                console.log('  --dry-run        - Show what would be cleaned without making changes');
                console.log('  --json           - Output in JSON format');
                process.exit(1);
        }
    }
    catch (error) {
        console.error('Script error:', error);
        process.exit(1);
    }
    finally {
        await kysely_1.kysely.destroy();
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=cleanup_idempotency.js.map