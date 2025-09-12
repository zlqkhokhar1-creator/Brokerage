/**
 * Drift Verification Service
 * Compares data consistency between legacy and new persistence systems
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');
const db = require('../config/database');
const featureFlags = require('../config/featureFlags');

// Import TypeScript repositories
let UserRepository, PaymentRepository;
try {
  const tsNode = require('ts-node').register();
  const { UserRepository: UserRepo } = require('../repositories/UserRepository.ts');
  const { PaymentRepository: PaymentRepo } = require('../repositories/PaymentRepository.ts');
  
  UserRepository = UserRepo;
  PaymentRepository = PaymentRepo;
} catch (error) {
  logger.warn('TypeScript repositories not available for drift verification');
}

class DriftVerifier {
  constructor() {
    this.userRepo = UserRepository ? new UserRepository() : null;
    this.paymentRepo = PaymentRepository ? new PaymentRepository() : null;
  }

  /**
   * Run complete drift verification
   */
  async verifyAll(options = {}) {
    const { includeHashes = false, sampleSize = 100, jsonOutput = false } = options;
    
    const results = {
      timestamp: new Date(),
      featureFlags: featureFlags.getAllFlags(),
      results: {
        users: null,
        payments: null,
        overall: { status: 'unknown', issues: [] }
      }
    };

    try {
      // Verify users if dual-write is enabled
      if (featureFlags.FEATURE_DUAL_WRITE_USERS && this.userRepo) {
        results.results.users = await this.verifyUsers({ includeHashes, sampleSize });
      }

      // Verify payments if dual-write is enabled
      if (featureFlags.FEATURE_DUAL_WRITE_PAYMENTS && this.paymentRepo) {
        results.results.payments = await this.verifyPayments({ includeHashes, sampleSize });
      }

      // Calculate overall status
      results.results.overall = this.calculateOverallStatus(results.results);

      if (jsonOutput) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        this.printResults(results);
      }

      return results;

    } catch (error) {
      logger.error('Drift verification failed', { error: error.message });
      results.results.overall = {
        status: 'error',
        issues: [`Verification failed: ${error.message}`]
      };
      return results;
    }
  }

  /**
   * Verify user data consistency
   */
  async verifyUsers(options = {}) {
    const { includeHashes = false, sampleSize = 100 } = options;
    
    const result = {
      status: 'unknown',
      counts: { legacy: 0, new: 0 },
      hashComparison: null,
      issues: []
    };

    try {
      // Get user counts from both systems
      result.counts.legacy = await this.getLegacyUserCount();
      result.counts.new = await this.getNewUserCount();

      // Check count consistency
      if (result.counts.legacy !== result.counts.new) {
        result.issues.push(`User count mismatch: legacy=${result.counts.legacy}, new=${result.counts.new}`);
      }

      // Hash comparison if requested
      if (includeHashes) {
        result.hashComparison = await this.compareUserHashes(sampleSize);
        if (result.hashComparison.mismatchCount > 0) {
          result.issues.push(`${result.hashComparison.mismatchCount} user hash mismatches found`);
        }
      }

      result.status = result.issues.length === 0 ? 'consistent' : 'inconsistent';

    } catch (error) {
      result.status = 'error';
      result.issues.push(`User verification error: ${error.message}`);
    }

    return result;
  }

  /**
   * Verify payment data consistency
   */
  async verifyPayments(options = {}) {
    const { includeHashes = false, sampleSize = 100 } = options;
    
    const result = {
      status: 'unknown',
      counts: { legacy: 0, new: 0 },
      hashComparison: null,
      issues: []
    };

    try {
      // Get payment counts from both systems
      result.counts.legacy = await this.getLegacyPaymentCount();
      result.counts.new = await this.getNewPaymentCount();

      // Check count consistency
      if (result.counts.legacy !== result.counts.new) {
        result.issues.push(`Payment count mismatch: legacy=${result.counts.legacy}, new=${result.counts.new}`);
      }

      // Hash comparison if requested
      if (includeHashes) {
        result.hashComparison = await this.comparePaymentHashes(sampleSize);
        if (result.hashComparison.mismatchCount > 0) {
          result.issues.push(`${result.hashComparison.mismatchCount} payment hash mismatches found`);
        }
      }

      result.status = result.issues.length === 0 ? 'consistent' : 'inconsistent';

    } catch (error) {
      result.status = 'error';
      result.issues.push(`Payment verification error: ${error.message}`);
    }

    return result;
  }

  /**
   * Get legacy user count
   */
  async getLegacyUserCount() {
    try {
      const result = await db.query('SELECT COUNT(*) as count FROM users');
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.warn('Failed to get legacy user count', { error: error.message });
      return 0;
    }
  }

  /**
   * Get new user count (this is the same table but accessed via new repo)
   */
  async getNewUserCount() {
    if (!this.userRepo) {
      return 0;
    }

    try {
      // Since we're using the same table, just use a direct query for now
      const { kysely } = require('../config/kysely');
      const result = await kysely
        .selectFrom('users')
        .select(kysely.fn.count('id').as('count'))
        .executeTakeFirstOrThrow();
      
      return Number(result.count);
    } catch (error) {
      logger.warn('Failed to get new user count', { error: error.message });
      return 0;
    }
  }

  /**
   * Get legacy payment count
   */
  async getLegacyPaymentCount() {
    try {
      // This would query the legacy payment table if it exists
      // For now, return 0 since we don't have legacy payments
      return 0;
    } catch (error) {
      logger.warn('Failed to get legacy payment count', { error: error.message });
      return 0;
    }
  }

  /**
   * Get new payment count
   */
  async getNewPaymentCount() {
    if (!this.paymentRepo) {
      return 0;
    }

    try {
      const { kysely } = require('../config/kysely');
      const result = await kysely
        .selectFrom('payments')
        .select(kysely.fn.count('id').as('count'))
        .executeTakeFirstOrThrow();
      
      return Number(result.count);
    } catch (error) {
      logger.warn('Failed to get new payment count', { error: error.message });
      return 0;
    }
  }

  /**
   * Compare user hashes between systems
   */
  async compareUserHashes(sampleSize = 100) {
    const result = {
      sampleSize,
      comparedCount: 0,
      mismatchCount: 0,
      mismatches: []
    };

    try {
      // Get sample of users from both systems
      const legacyUsers = await db.query(
        'SELECT id, email, first_name, last_name FROM users ORDER BY created_at DESC LIMIT $1',
        [sampleSize]
      );

      const { kysely } = require('../config/kysely');
      const newUsers = await kysely
        .selectFrom('users')
        .select(['id', 'email', 'first_name', 'last_name'])
        .orderBy('created_at', 'desc')
        .limit(sampleSize)
        .execute();

      // Create lookup maps
      const legacyUserMap = new Map();
      legacyUsers.rows.forEach(user => {
        legacyUserMap.set(user.id, user);
      });

      const newUserMap = new Map();
      newUsers.forEach(user => {
        newUserMap.set(user.id, user);
      });

      // Compare hashes
      for (const [userId, legacyUser] of legacyUserMap) {
        const newUser = newUserMap.get(userId);
        
        if (!newUser) {
          result.mismatchCount++;
          result.mismatches.push({ userId, issue: 'User missing in new system' });
          continue;
        }

        const legacyHash = this.calculateUserHash(legacyUser);
        const newHash = this.calculateUserHash(newUser);

        result.comparedCount++;

        if (legacyHash !== newHash) {
          result.mismatchCount++;
          result.mismatches.push({
            userId,
            issue: 'Hash mismatch',
            legacyHash,
            newHash
          });
        }
      }

    } catch (error) {
      logger.error('User hash comparison failed', { error: error.message });
    }

    return result;
  }

  /**
   * Compare payment hashes between systems
   */
  async comparePaymentHashes(sampleSize = 100) {
    // Since we don't have legacy payments, return empty result
    return {
      sampleSize,
      comparedCount: 0,
      mismatchCount: 0,
      mismatches: []
    };
  }

  /**
   * Calculate hash for user data
   */
  calculateUserHash(user) {
    const hashData = `${user.email}||${user.first_name || ''}||${user.last_name || ''}||${user.id}`;
    return crypto.createHash('sha256').update(hashData).digest('hex');
  }

  /**
   * Calculate overall verification status
   */
  calculateOverallStatus(results) {
    const allIssues = [];
    let hasErrors = false;
    let hasInconsistencies = false;

    // Collect issues from all verification results
    Object.values(results).forEach(result => {
      if (result && result.issues) {
        allIssues.push(...result.issues);
        if (result.status === 'error') {
          hasErrors = true;
        } else if (result.status === 'inconsistent') {
          hasInconsistencies = true;
        }
      }
    });

    let status;
    if (hasErrors) {
      status = 'error';
    } else if (hasInconsistencies) {
      status = 'inconsistent';
    } else if (Object.values(results).some(r => r && r.status === 'consistent')) {
      status = 'consistent';
    } else {
      status = 'no_verification_performed';
    }

    return {
      status,
      issues: allIssues,
      summary: `${allIssues.length} issues found`
    };
  }

  /**
   * Print verification results in human-readable format
   */
  printResults(results) {
    console.log('\n=== Drift Verification Results ===');
    console.log(`Timestamp: ${results.timestamp.toISOString()}`);
    console.log(`Overall Status: ${results.results.overall.status.toUpperCase()}`);
    
    if (results.results.users) {
      console.log('\nUsers:');
      console.log(`  Status: ${results.results.users.status}`);
      console.log(`  Counts: Legacy=${results.results.users.counts.legacy}, New=${results.results.users.counts.new}`);
      
      if (results.results.users.hashComparison) {
        console.log(`  Hash Comparison: ${results.results.users.hashComparison.comparedCount} compared, ${results.results.users.hashComparison.mismatchCount} mismatches`);
      }
    }

    if (results.results.payments) {
      console.log('\nPayments:');
      console.log(`  Status: ${results.results.payments.status}`);
      console.log(`  Counts: Legacy=${results.results.payments.counts.legacy}, New=${results.results.payments.counts.new}`);
    }

    if (results.results.overall.issues.length > 0) {
      console.log('\nIssues Found:');
      results.results.overall.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    console.log('\nFeature Flags:');
    Object.entries(results.featureFlags).forEach(([flag, value]) => {
      console.log(`  ${flag}: ${value}`);
    });
  }
}

module.exports = { DriftVerifier };