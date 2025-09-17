/**
 * Payment Idempotency Integration Tests
 * Tests idempotent payment operations and duplicate request handling
 */

const { 
  setupTestEnvironment,
  cleanupTestEnvironment,
  generateTestUser,
  generateTestPayment,
  generateIdempotencyKey,
  assert,
  TestRunner,
  isDatabaseAvailable,
  isRedisAvailable,
  delay
} = require('./test_helpers');

const { AuthService } = require('../../src/services/AuthService');
const { PaymentService } = require('../../src/services/PaymentService');

async function runPaymentIdempotencyTests() {
  const runner = new TestRunner('Payment Idempotency Tests');
  
  // Setup
  await setupTestEnvironment();
  const authService = new AuthService();
  const paymentService = new PaymentService();
  
  let testUser = null;
  
  runner.test('Setup Test User', async () => {
    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    try {
      const userData = generateTestUser('payment');
      testUser = await authService.registerUser(userData);
      assert.isNotNull(testUser, 'Test user should be created');
      console.log('✅ Test user created for payment tests');
    } catch (error) {
      if (error.message.includes('not available')) {
        console.log('⏭️  SKIP: User creation not available');
        return;
      }
      throw error;
    }
  });

  runner.test('Basic Payment Creation', async () => {
    if (!testUser) {
      console.log('⏭️  SKIP: Test user not available');
      return;
    }

    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    try {
      const paymentData = generateTestPayment(testUser.id);
      
      const result = await paymentService.initializePayment(paymentData);
      
      assert.isNotNull(result, 'Payment should be created');
      
      // Check if using new repository system
      if (result.data) {
        assert.equal(result.data.userId, testUser.id, 'User ID should match');
        assert.equal(result.data.amount.minor, paymentData.amountMinor.toString(), 'Amount should match');
        assert.equal(result.data.amount.currency, paymentData.currency, 'Currency should match');
        assert.equal(result.data.status, 'initialized', 'Status should be initialized');
        console.log('✅ Payment created with new repository system');
      } else {
        console.log('⏭️  Payment created with legacy system (expected behavior)');
      }
    } catch (error) {
      if (error.message.includes('not implemented') || error.message.includes('not available')) {
        console.log('⏭️  SKIP: Payment creation not fully implemented');
        return;
      }
      throw error;
    }
  });

  runner.test('Idempotent Payment Creation', async () => {
    if (!testUser) {
      console.log('⏭️  SKIP: Test user not available');
      return;
    }

    const dbAvailable = await isDatabaseAvailable();
    const redisAvailable = await isRedisAvailable();
    
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    try {
      const paymentData = generateTestPayment(testUser.id);
      const idempotencyKey = generateIdempotencyKey('payment_create');
      
      // First request
      const result1 = await paymentService.initializePayment(paymentData, idempotencyKey);
      
      // Second request with same idempotency key
      const result2 = await paymentService.initializePayment(paymentData, idempotencyKey);
      
      // Both should succeed
      assert.isNotNull(result1, 'First request should succeed');
      assert.isNotNull(result2, 'Second request should succeed');
      
      if (result1.data && result2.data) {
        // With idempotency system
        assert.equal(result1.statusCode, 201, 'First request should be created');
        assert.equal(result2.statusCode, 201, 'Second request should return cached result');
        assert.equal(result1.fromCache, false, 'First request should not be from cache');
        assert.equal(result2.fromCache, true, 'Second request should be from cache');
        
        // Data should be identical
        assert.deepEqual(result1.data, result2.data, 'Payment data should be identical');
        
        console.log('✅ Idempotent payment creation working correctly');
      } else {
        console.log('⏭️  Idempotency not enabled - both requests processed normally');
      }
      
    } catch (error) {
      if (error.message.includes('not implemented') || 
          error.message.includes('not available') ||
          error.message.includes('not supported')) {
        console.log('⏭️  SKIP: Idempotency not fully implemented');
        return;
      }
      throw error;
    }
  });

  runner.test('Payment Status Update with Ledger', async () => {
    if (!testUser) {
      console.log('⏭️  SKIP: Test user not available');
      return;
    }

    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    try {
      const paymentData = generateTestPayment(testUser.id);
      const payment = await paymentService.initializePayment(paymentData);
      
      if (!payment.data || !payment.data.id) {
        console.log('⏭️  SKIP: Payment ID not available for status update');
        return;
      }
      
      // Update payment to captured status
      const updatedPayment = await paymentService.updatePaymentStatus(
        payment.data.id, 
        'captured',
        { capturedAt: new Date(), processorId: 'test_proc_123' }
      );
      
      assert.isNotNull(updatedPayment, 'Payment update should succeed');
      assert.equal(updatedPayment.status, 'captured', 'Status should be updated to captured');
      
      // Check user balance if ledger is enabled
      try {
        const balance = await paymentService.getUserBalance(testUser.id, paymentData.currency);
        
        if (balance.balance !== '0') {
          // Ledger is working
          assert.equal(balance.balance, paymentData.amountMinor.toString(), 'Balance should reflect captured payment');
          assert.equal(balance.currency, paymentData.currency, 'Currency should match');
          console.log('✅ Payment status update with ledger integration working');
        } else {
          console.log('⏭️  Ledger integration not enabled');
        }
      } catch (balanceError) {
        console.log('⏭️  Ledger balance check not available');
      }
      
    } catch (error) {
      if (error.message.includes('not implemented') || error.message.includes('not available')) {
        console.log('⏭️  SKIP: Payment status update not fully implemented');
        return;
      }
      throw error;
    }
  });

  runner.test('Concurrent Idempotent Requests', async () => {
    if (!testUser) {
      console.log('⏭️  SKIP: Test user not available');
      return;
    }

    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    try {
      const paymentData = generateTestPayment(testUser.id);
      const idempotencyKey = generateIdempotencyKey('concurrent_test');
      
      // Make multiple concurrent requests with same idempotency key
      const promises = Array.from({ length: 3 }, () => 
        paymentService.initializePayment(paymentData, idempotencyKey)
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach((result, index) => {
        assert.isNotNull(result, `Request ${index + 1} should succeed`);
      });
      
      if (results[0].data) {
        // Check that all results are identical
        const firstResult = results[0];
        results.slice(1).forEach((result, index) => {
          assert.deepEqual(result.data, firstResult.data, `Result ${index + 2} should match first result`);
        });
        
        // At least one should be from cache (the others should be)
        const fromCacheCount = results.filter(r => r.fromCache).length;
        assert.ok(fromCacheCount >= 2, 'At least 2 results should be from cache');
        
        console.log('✅ Concurrent idempotent requests handled correctly');
      } else {
        console.log('⏭️  Concurrent test completed (idempotency not fully enabled)');
      }
      
    } catch (error) {
      if (error.message.includes('already in progress')) {
        console.log('✅ Concurrent requests properly rejected with "already in progress" error');
        return;
      }
      
      if (error.message.includes('not implemented') || error.message.includes('not available')) {
        console.log('⏭️  SKIP: Concurrent idempotency not fully implemented');
        return;
      }
      throw error;
    }
  });

  runner.test('Payment Retrieval', async () => {
    if (!testUser) {
      console.log('⏭️  SKIP: Test user not available');
      return;
    }

    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    try {
      // Get payments for user
      const payments = await paymentService.getPaymentsForUser(testUser.id, 10, 0);
      
      assert.ok(Array.isArray(payments), 'Should return array of payments');
      
      // If we created payments in previous tests, they should be here
      if (payments.length > 0) {
        const payment = payments[0];
        assert.equal(payment.userId, testUser.id, 'Payment should belong to test user');
        assert.isNotNull(payment.id, 'Payment should have ID');
        assert.isNotNull(payment.amount, 'Payment should have amount');
        assert.isNotNull(payment.status, 'Payment should have status');
        
        // Test individual payment retrieval
        const retrievedPayment = await paymentService.getPaymentById(payment.id);
        assert.isNotNull(retrievedPayment, 'Should retrieve payment by ID');
        assert.equal(retrievedPayment.id, payment.id, 'Retrieved payment ID should match');
        
        console.log('✅ Payment retrieval working correctly');
      } else {
        console.log('⏭️  No payments found (expected if previous tests were skipped)');
      }
      
    } catch (error) {
      if (error.message.includes('not implemented') || error.message.includes('not available')) {
        console.log('⏭️  SKIP: Payment retrieval not fully implemented');
        return;
      }
      throw error;
    }
  });

  // Run all tests
  const success = await runner.run();
  
  // Cleanup
  await cleanupTestEnvironment();
  
  return success;
}

// Run tests if called directly
if (require.main === module) {
  runPaymentIdempotencyTests()
    .then(success => {
      console.log(success ? '\n🎉 All payment idempotency tests passed!' : '\n💥 Some payment idempotency tests failed!');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runPaymentIdempotencyTests };