#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import { DatabaseClientFactory } from '@b-app/platform-persistence';
import { DriftVerifier } from '@b-app/platform-persistence/src/verification/DriftVerifier';

// Load environment variables
dotenv.config();

async function runDriftCheck(): Promise<void> {
  console.log('Running Database Drift Verification:');
  console.log('===================================');

  let db;
  try {
    // Initialize database client
    db = DatabaseClientFactory.create();
    
    // Create drift verifier
    const verifier = new DriftVerifier(db);

    // Run all verification checks
    const results = await verifier.verifyAll();

    let allPassed = true;
    let passedCount = 0;

    console.log('\nVerification Results:');
    console.log('--------------------');

    for (const result of results) {
      const status = result.passed ? '✓' : '✗';
      console.log(`${status} ${result.message}`);
      
      if (result.details) {
        console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`);
      }

      if (result.passed) {
        passedCount++;
      } else {
        allPassed = false;
      }
    }

    console.log('\nSummary:');
    console.log(`  Passed: ${passedCount}/${results.length}`);
    console.log(`  Status: ${allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);

    if (!allPassed) {
      console.error('\n❌ Drift verification failed. Some checks did not pass.');
      process.exit(1);
    }

    console.log('\n✅ All drift verification checks passed.');

  } catch (error) {
    console.error('\n❌ Drift verification failed with error:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.error('\nFull error details:', error);
    process.exit(1);
  } finally {
    // Clean up database connection
    if (db) {
      await DatabaseClientFactory.destroy();
    }
  }
}

if (require.main === module) {
  runDriftCheck().catch(error => {
    console.error('Unhandled error in drift check:', error);
    process.exit(1);
  });
}