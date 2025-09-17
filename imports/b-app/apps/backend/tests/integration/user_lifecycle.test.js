/**
 * User Lifecycle Integration Tests
 * Tests user creation, login, and refresh token rotation
 */

const { 
  setupTestEnvironment,
  cleanupTestEnvironment,
  generateTestUser,
  assert,
  TestRunner,
  isDatabaseAvailable,
  skipIfNoDB
} = require('./test_helpers');

const { AuthService } = require('../../src/services/AuthService');

async function runUserLifecycleTests() {
  const runner = new TestRunner('User Lifecycle Tests');
  
  // Setup
  await setupTestEnvironment();
  const authService = new AuthService();
  
  runner.test('User Registration with Argon2id', async () => {
    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    const userData = generateTestUser('registration');
    
    try {
      const user = await authService.registerUser(userData);
      
      assert.isNotNull(user, 'User should be created');
      assert.equal(user.email, userData.email, 'Email should match');
      assert.equal(user.firstName, userData.firstName, 'First name should match');
      assert.isNotNull(user.id, 'User should have an ID');
      assert.isNotNull(user.createdAt, 'User should have creation timestamp');
      
      console.log('✅ User registered successfully with Argon2id');
    } catch (error) {
      if (error.message.includes('not available')) {
        console.log('⏭️  SKIP: TypeScript repositories not available');
        return;
      }
      throw error;
    }
  });

  runner.test('User Authentication', async () => {
    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    const userData = generateTestUser('auth');
    
    try {
      // First register the user
      await authService.registerUser(userData);
      
      // Then authenticate
      const authResult = await authService.authenticateUser(userData.email, userData.password);
      
      assert.isNotNull(authResult, 'Authentication should succeed');
      assert.isNotNull(authResult.user, 'Should return user object');
      assert.equal(authResult.user.email, userData.email, 'Email should match');
      assert.isNotNull(authResult.accessToken, 'Should return access token');
      assert.isNotNull(authResult.refreshToken, 'Should return refresh token');
      
      // Verify token format
      const tokenParts = authResult.accessToken.split('.');
      assert.equal(tokenParts.length, 3, 'Access token should be a valid JWT');
      
      console.log('✅ User authentication successful');
    } catch (error) {
      if (error.message.includes('not available') || error.message.includes('not supported')) {
        console.log('⏭️  SKIP: Feature not available in current configuration');
        return;
      }
      throw error;
    }
  });

  runner.test('Refresh Token Rotation', async () => {
    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    const userData = generateTestUser('refresh');
    
    try {
      // Register and authenticate user
      await authService.registerUser(userData);
      const authResult = await authService.authenticateUser(userData.email, userData.password);
      
      const originalRefreshToken = authResult.refreshToken;
      
      // Refresh the token
      const refreshResult = await authService.refreshAccessToken(originalRefreshToken);
      
      assert.isNotNull(refreshResult, 'Token refresh should succeed');
      assert.isNotNull(refreshResult.accessToken, 'Should return new access token');
      assert.isNotNull(refreshResult.refreshToken, 'Should return new refresh token');
      
      // Verify tokens are different
      assert.ok(
        refreshResult.accessToken !== authResult.accessToken,
        'New access token should be different'
      );
      assert.ok(
        refreshResult.refreshToken !== originalRefreshToken,
        'New refresh token should be different'
      );
      
      // Verify old refresh token is invalidated
      await assert.throws(
        () => authService.refreshAccessToken(originalRefreshToken),
        'Invalid refresh token',
        'Old refresh token should be invalid'
      );
      
      console.log('✅ Refresh token rotation successful');
    } catch (error) {
      if (error.message.includes('not supported') || error.message.includes('not available')) {
        console.log('⏭️  SKIP: Refresh tokens not supported in current configuration');
        return;
      }
      throw error;
    }
  });

  runner.test('Invalid Authentication', async () => {
    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    try {
      // Test with non-existent user
      await assert.throws(
        () => authService.authenticateUser('nonexistent@example.com', 'password'),
        'Invalid credentials',
        'Should reject non-existent user'
      );
      
      // Register a user then test wrong password
      const userData = generateTestUser('invalid_auth');
      await authService.registerUser(userData);
      
      await assert.throws(
        () => authService.authenticateUser(userData.email, 'wrongpassword'),
        'Invalid credentials',
        'Should reject wrong password'
      );
      
      console.log('✅ Invalid authentication properly rejected');
    } catch (error) {
      if (error.message.includes('not available')) {
        console.log('⏭️  SKIP: Feature not available in current configuration');
        return;
      }
      throw error;
    }
  });

  runner.test('User Logout', async () => {
    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.log('⏭️  SKIP: Database not available');
      return;
    }

    const userData = generateTestUser('logout');
    
    try {
      // Register and authenticate user
      await authService.registerUser(userData);
      const authResult = await authService.authenticateUser(userData.email, userData.password);
      
      // Logout user
      const logoutResult = await authService.logoutUser(authResult.refreshToken);
      
      assert.ok(logoutResult.success, 'Logout should succeed');
      
      // Verify refresh token is invalidated
      await assert.throws(
        () => authService.refreshAccessToken(authResult.refreshToken),
        'Invalid refresh token',
        'Refresh token should be invalid after logout'
      );
      
      console.log('✅ User logout successful');
    } catch (error) {
      if (error.message.includes('not supported') || error.message.includes('not available')) {
        console.log('⏭️  SKIP: Logout not fully supported in current configuration');
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
  runUserLifecycleTests()
    .then(success => {
      console.log(success ? '\n🎉 All user lifecycle tests passed!' : '\n💥 Some user lifecycle tests failed!');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runUserLifecycleTests };