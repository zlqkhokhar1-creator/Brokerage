#!/usr/bin/env node

/**
 * Key rotation script for JWT signing keys
 * Usage: npm run rotate-keys --workspace=packages/blocks/membership
 */

import { MembershipBlock } from '../membership-block.js';

async function rotateKeys() {
  console.log('Starting JWT key rotation...');
  
  try {
    // Initialize membership block
    const membershipBlock = new MembershipBlock();
    
    // Get current key info
    const currentKey = membershipBlock.jwtService.getActiveKeyInfo();
    if (currentKey) {
      console.log('Current active key:', {
        id: currentKey.id,
        algorithm: currentKey.algorithm,
        age: Math.floor((Date.now() - currentKey.createdAt.getTime()) / 1000) + ' seconds'
      });
    }
    
    // Rotate keys
    const newKeyId = membershipBlock.rotateKeys();
    
    console.log('Key rotation completed successfully!');
    console.log('New active key ID:', newKeyId);
    
    // Get updated stats
    const stats = membershipBlock.getStats();
    console.log('JWT configuration:', stats.jwt);
    
  } catch (error) {
    console.error('Key rotation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  rotateKeys();
}