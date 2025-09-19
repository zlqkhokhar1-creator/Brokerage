const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const threatDetector = require('./threatDetector');
const accessController = require('./accessController');
const microSegmentation = require('./microSegmentation');
const identityVerifier = require('./identityVerifier');

class SecurityEngine {
  async authenticateUser(req, res) {
    try {
      const { username, password, deviceId, location } = req.body;
      
      // Multi-factor authentication
      const authResult = await this.performMultiFactorAuth(username, password, deviceId, location);
      
      if (!authResult.success) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          details: authResult.error
        });
      }
      
      // Generate security token
      const securityToken = await this.generateSecurityToken(authResult.user);
      
      // Log security event
      await this.logSecurityEvent('user_authenticated', {
        userId: authResult.user.id,
        username,
        deviceId,
        location,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        data: {
          user: authResult.user,
          securityToken,
          expiresAt: authResult.expiresAt
        }
      });
    } catch (error) {
      logger.error('Error authenticating user:', error);
      res.status(500).json({ success: false, error: 'Authentication failed' });
    }
  }

  async authorizeRequest(req, res) {
    try {
      const { resource, action, userId, context } = req.body;
      
      // Check access permissions
      const accessResult = await accessController.checkAccess(userId, resource, action, context);
      
      if (!accessResult.allowed) {
        // Log unauthorized access attempt
        await this.logSecurityEvent('unauthorized_access_attempt', {
          userId,
          resource,
          action,
          context,
          timestamp: new Date().toISOString()
        });
        
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          details: accessResult.reason
        });
      }
      
      // Apply micro-segmentation rules
      const segmentationResult = await microSegmentation.applySegmentationRules(userId, resource, context);
      
      if (!segmentationResult.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Access denied by micro-segmentation',
          details: segmentationResult.reason
        });
      }
      
      res.json({
        success: true,
        data: {
          allowed: true,
          permissions: accessResult.permissions,
          restrictions: segmentationResult.restrictions
        }
      });
    } catch (error) {
      logger.error('Error authorizing request:', error);
      res.status(500).json({ success: false, error: 'Authorization failed' });
    }
  }

  async detectThreats(req, res) {
    try {
      const { userId, activity, context } = req.body;
      
      // Perform threat detection
      const threatResult = await threatDetector.analyzeActivity(userId, activity, context);
      
      if (threatResult.threatDetected) {
        // Log threat event
        await this.logSecurityEvent('threat_detected', {
          userId,
          threatType: threatResult.threatType,
          severity: threatResult.severity,
          activity,
          context,
          timestamp: new Date().toISOString()
        });
        
        // Take immediate action if high severity
        if (threatResult.severity === 'high') {
          await this.takeImmediateAction(userId, threatResult);
        }
      }
      
      res.json({
        success: true,
        data: {
          threatDetected: threatResult.threatDetected,
          threatType: threatResult.threatType,
          severity: threatResult.severity,
          recommendations: threatResult.recommendations
        }
      });
    } catch (error) {
      logger.error('Error detecting threats:', error);
      res.status(500).json({ success: false, error: 'Threat detection failed' });
    }
  }

  async performMultiFactorAuth(username, password, deviceId, location) {
    try {
      // Step 1: Verify credentials
      const user = await this.verifyCredentials(username, password);
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Step 2: Verify device
      const deviceVerified = await this.verifyDevice(user.id, deviceId);
      if (!deviceVerified) {
        return { success: false, error: 'Device not verified' };
      }
      
      // Step 3: Verify location
      const locationVerified = await this.verifyLocation(user.id, location);
      if (!locationVerified) {
        return { success: false, error: 'Location not verified' };
      }
      
      // Step 4: Check for suspicious activity
      const suspiciousActivity = await threatDetector.checkSuspiciousActivity(user.id, deviceId, location);
      if (suspiciousActivity) {
        return { success: false, error: 'Suspicious activity detected' };
      }
      
      return {
        success: true,
        user,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      logger.error('Error performing multi-factor auth:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  async verifyCredentials(username, password) {
    try {
      const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
      const result = await database.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return null;
      }
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      };
    } catch (error) {
      logger.error('Error verifying credentials:', error);
      return null;
    }
  }

  async verifyDevice(userId, deviceId) {
    try {
      const query = 'SELECT * FROM user_devices WHERE user_id = $1 AND device_id = $2 AND is_verified = true';
      const result = await database.query(query, [userId, deviceId]);
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error verifying device:', error);
      return false;
    }
  }

  async verifyLocation(userId, location) {
    try {
      // Check if location is within allowed regions
      const query = 'SELECT * FROM user_locations WHERE user_id = $1 AND is_allowed = true';
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return true; // No location restrictions
      }
      
      // Implement location verification logic
      return true; // Simplified for now
    } catch (error) {
      logger.error('Error verifying location:', error);
      return false;
    }
  }

  async generateSecurityToken(user) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      };
      
      return jwt.sign(payload, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      logger.error('Error generating security token:', error);
      throw error;
    }
  }

  async logSecurityEvent(eventType, data) {
    try {
      const query = `
        INSERT INTO security_events (event_type, data, severity, created_at)
        VALUES ($1, $2, $3, $4)
      `;
      
      await database.query(query, [
        eventType,
        JSON.stringify(data),
        data.severity || 'medium',
        new Date()
      ]);
    } catch (error) {
      logger.error('Error logging security event:', error);
    }
  }

  async takeImmediateAction(userId, threatResult) {
    try {
      // Block user account
      await database.query(
        'UPDATE users SET is_active = false WHERE id = $1',
        [userId]
      );
      
      // Revoke all active sessions
      await redis.del(`user_session:${userId}`);
      
      // Log immediate action
      await this.logSecurityEvent('immediate_action_taken', {
        userId,
        action: 'account_blocked',
        reason: threatResult.threatType,
        timestamp: new Date().toISOString()
      });
      
      logger.warn(`Immediate action taken for user ${userId}: ${threatResult.threatType}`);
    } catch (error) {
      logger.error('Error taking immediate action:', error);
    }
  }
}

module.exports = new SecurityEngine();

