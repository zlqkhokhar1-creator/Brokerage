/**
 * Key Management Routes
 * Administrative endpoints for key rotation and management
 * Phase 1b of Epic #34 - Security & Identity Foundation
 */

const express = require('express');
const router = express.Router();

const { getKeyProvider } = require('../services/keyProvider');
const { authenticateToken, authorize } = require('../services/authService');
const { logger, logSecurityEvent } = require('../utils/logger');
const { 
  AuthenticationError, 
  AuthorizationError,
  BusinessLogicError,
  asyncHandler 
} = require('../utils/errorHandler');

/**
 * GET /api/v1/key-management/status
 * Get current key management status
 * Requires admin role
 */
router.get('/status', 
  authenticateToken, 
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const keyProvider = getKeyProvider();
      const activeKey = await keyProvider.getActiveSigningKey();
      const allKeys = await keyProvider.getAllValidKeys();

      const status = {
        activeKeyId: activeKey.keyId,
        algorithm: activeKey.algorithm,
        totalKeys: allKeys.length,
        keysByStatus: allKeys.reduce((acc, key) => {
          acc[key.status] = (acc[key.status] || 0) + 1;
          return acc;
        }, {}),
        managedKeysEnabled: process.env.USE_MANAGED_KEYS === 'true',
        environment: process.env.NODE_ENV || 'development'
      };

      logSecurityEvent('KEY_STATUS_ACCESSED', {
        userId: req.user.id,
        activeKeyId: activeKey.keyId
      });

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Failed to get key management status', { 
        error: error.message,
        userId: req.user.id 
      });
      throw new BusinessLogicError('Failed to retrieve key management status');
    }
  })
);

/**
 * POST /api/v1/key-management/rotate
 * Trigger key rotation
 * Requires admin role
 */
router.post('/rotate',
  authenticateToken,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const keyProvider = getKeyProvider();
      const result = await keyProvider.rotateKeys();

      logSecurityEvent('KEY_ROTATION_TRIGGERED', {
        userId: req.user.id,
        newKeyId: result.newKeyId,
        previousKeyId: result.previousKeyId
      });

      res.json({
        success: true,
        message: 'Key rotation completed successfully',
        data: {
          newKeyId: result.newKeyId,
          previousKeyId: result.previousKeyId,
          rotatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to rotate keys', { 
        error: error.message,
        userId: req.user.id 
      });
      throw new BusinessLogicError('Key rotation failed');
    }
  })
);

/**
 * GET /api/v1/key-management/keys
 * List all valid keys (without exposing the actual key material)
 * Requires admin role
 */
router.get('/keys',
  authenticateToken,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const keyProvider = getKeyProvider();
      const allKeys = await keyProvider.getAllValidKeys();

      // Return key metadata without exposing actual key material
      const keyMetadata = allKeys.map(key => ({
        keyId: key.keyId,
        algorithm: key.algorithm,
        status: key.status,
        // Don't include the actual key for security
        keyPreview: key.key ? `${key.key.substring(0, 8)}...` : 'static'
      }));

      logSecurityEvent('KEY_LIST_ACCESSED', {
        userId: req.user.id,
        keyCount: keyMetadata.length
      });

      res.json({
        success: true,
        data: {
          keys: keyMetadata,
          totalCount: keyMetadata.length
        }
      });
    } catch (error) {
      logger.error('Failed to list keys', { 
        error: error.message,
        userId: req.user.id 
      });
      throw new BusinessLogicError('Failed to retrieve key list');
    }
  })
);

/**
 * POST /api/v1/key-management/generate-dev-keys
 * Generate local development keys
 * Only available in development environment
 */
router.post('/generate-dev-keys',
  asyncHandler(async (req, res) => {
    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
      throw new AuthorizationError('Development key generation is only available in development environment');
    }

    try {
      // Create a local development key provider and generate keys
      const { LocalDevelopmentKeyProvider } = require('../services/keyProvider');
      const devKeyProvider = new LocalDevelopmentKeyProvider();
      
      await devKeyProvider.initialize();
      const activeKey = await devKeyProvider.getActiveSigningKey();

      logger.info('Development keys generated', {
        keyId: activeKey.keyId,
        environment: process.env.NODE_ENV
      });

      res.json({
        success: true,
        message: 'Development keys generated successfully',
        data: {
          keyId: activeKey.keyId,
          algorithm: activeKey.algorithm,
          note: 'These are ephemeral keys for development use only',
          environment: 'development'
        }
      });
    } catch (error) {
      logger.error('Failed to generate development keys', { error: error.message });
      throw new BusinessLogicError('Failed to generate development keys');
    }
  })
);

/**
 * GET /api/v1/key-management/config
 * Get key management configuration
 * Requires admin role
 */
router.get('/config',
  authenticateToken,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const config = {
      managedKeysEnabled: process.env.USE_MANAGED_KEYS === 'true',
      localDevKeysEnabled: process.env.USE_LOCAL_DEV_KEYS === 'true',
      rotationIntervalHours: parseInt(process.env.KEY_ROTATION_INTERVAL_HOURS) || 24,
      environment: process.env.NODE_ENV || 'development',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    };

    logSecurityEvent('KEY_CONFIG_ACCESSED', {
      userId: req.user.id
    });

    res.json({
      success: true,
      data: config
    });
  })
);

module.exports = router;