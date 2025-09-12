/**
 * Health and Authentication Check Routes
 * Provides /healthz and /whoami endpoints for system validation
 */

const express = require('express');
const { getConfig, getConfigSummary } = require('../../../../packages/config');
const { createJWTMiddleware } = require('../../../../packages/security/middleware');

const router = express.Router();

/**
 * Health check endpoint (no authentication required)
 * GET /healthz
 */
router.get('/healthz', (req, res) => {
  try {
    const config = getConfig();
    const configSummary = getConfigSummary();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'brokerage-gateway',
      version: process.env.APP_VERSION || '1.0.0',
      environment: config.NODE_ENV,
      uptime: process.uptime(),
      configuration: {
        jwtAlgorithm: configSummary.jwtAlg,
        jwtIssuer: configSummary.jwtIssuer,
        httpPort: configSummary.httpPort,
        logLevel: configSummary.logLevel,
        hasJwtKeys: configSummary.hasJwtPrivateKey && configSummary.hasJwtPublicKey,
        hasJwtSecrets: configSummary.hasJwtSecret && configSummary.hasJwtRefreshSecret
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy health endpoint
router.get('/', (req, res) => {
  res.redirect('/healthz');
});

/**
 * Authentication check endpoint (requires JWT authentication)
 * GET /whoami
 */
function createWhoAmIRoute(logger) {
  const config = getConfig();
  const jwtMiddleware = createJWTMiddleware(config, logger);
  
  return [
    jwtMiddleware,
    (req, res) => {
      try {
        // Return safe subset of user claims
        const userInfo = {
          userId: req.user.userId,
          email: req.user.email,
          roles: req.user.roles,
          sessionId: req.user.sessionId,
          tokenInfo: {
            issuedAt: new Date(req.user.iat * 1000).toISOString(),
            expiresAt: new Date(req.user.exp * 1000).toISOString(),
            algorithm: req.tokenInfo?.algorithm,
            issuer: req.tokenInfo?.issuer,
            audience: req.tokenInfo?.audience
          },
          authenticated: true,
          timestamp: new Date().toISOString()
        };

        res.status(200).json(userInfo);
      } catch (error) {
        logger.error('Error in /whoami endpoint', {
          error: error.message,
          userId: req.user?.userId,
          sessionId: req.user?.sessionId
        });

        res.status(500).json({
          success: false,
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    }
  ];
}

module.exports = {
  healthRouter: router,
  createWhoAmIRoute
};