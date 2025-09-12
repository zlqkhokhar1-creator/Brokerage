/**
 * Slide-to-Execute Service
 * Secure order execution with gesture-based confirmation
 */

const crypto = require('crypto');
const { logger, logSecurityEvent, logBusinessEvent } = require('../utils/logger');
const { cacheService } = require('../config/redis');
const { orderManagementSystem } = require('./orderManagementSystem');
const { riskManagementSystem } = require('./riskManagementSystem');
const { notificationSystem } = require('./notificationSystem');
const { ValidationError, SecurityError } = require('../utils/errorHandler');

class SlideToExecuteService {
  constructor() {
    // Pending slide orders (awaiting confirmation)
    this.pendingOrders = new Map(); // slideToken -> order data
    
    // Security configuration
    this.security = {
      tokenExpiry: 120000, // 2 minutes
      maxAttempts: 3,
      slideMinDuration: 1000, // 1 second minimum slide
      slideMaxDuration: 10000, // 10 seconds maximum
      requiredSlideDistance: 0.8, // 80% of slide track
      biometricVerification: true,
      deviceFingerprinting: true
    };
    
    // Slide analytics
    this.analytics = {
      slideAttempts: 0,
      successfulSlides: 0,
      failedSlides: 0,
      averageSlideDuration: 0,
      securityViolations: 0
    };
    
    this.initializeSlideService();
  }

  // Initialize slide-to-execute service
  async initializeSlideService() {
    logger.info('Initializing slide-to-execute service...');
    
    // Don't auto-start background processes during construction
    // They will be started explicitly by the server after initialization
    
    logger.info('Slide-to-execute service initialized successfully');
  }

  // Start background processes (call this after server initialization)
  startBackgroundProcesses() {
    // Start cleanup process for expired tokens
    this.startTokenCleanup();
    
    // Initialize security monitoring
    this.startSecurityMonitoring();
    
    logger.info('Slide-to-execute background processes started');
  }

  // Prepare order for slide execution
  async prepareSlideOrder(userId, orderData, options = {}) {
    try {
      const slideToken = this.generateSlideToken();
      const timestamp = Date.now();
      
      // Enhanced order validation
      await this.validateOrderForSlide(userId, orderData);
      
      // Calculate order value and risk
      const orderValue = orderData.quantity * (orderData.price || await this.getMarketPrice(orderData.symbol));
      const riskAssessment = await this.assessOrderRisk(userId, orderData, orderValue);
      
      // Determine slide requirements based on risk
      const slideRequirements = this.determineSlideRequirements(orderValue, riskAssessment, options);
      
      const slideOrder = {
        slideToken,
        userId,
        orderData,
        orderValue,
        riskAssessment,
        slideRequirements,
        timestamp,
        expiresAt: timestamp + this.security.tokenExpiry,
        attempts: 0,
        status: 'PENDING_SLIDE',
        securityChecks: {
          deviceVerified: false,
          biometricRequired: slideRequirements.biometric,
          locationVerified: false,
          behaviorAnalyzed: false
        },
        analytics: {
          preparedAt: timestamp,
          userAgent: options.userAgent,
          ipAddress: options.ipAddress,
          deviceFingerprint: options.deviceFingerprint
        }
      };

      // Store pending order
      this.pendingOrders.set(slideToken, slideOrder);
      
      // Cache for quick access
      await cacheService.set(`slide_order:${slideToken}`, slideOrder, this.security.tokenExpiry / 1000);
      
      // Log security event
      logSecurityEvent('SLIDE_ORDER_PREPARED', {
        userId,
        slideToken,
        symbol: orderData.symbol,
        orderValue,
        riskLevel: riskAssessment.riskLevel
      });

      return {
        slideToken,
        slideRequirements,
        orderSummary: {
          symbol: orderData.symbol,
          side: orderData.side,
          quantity: orderData.quantity,
          orderType: orderData.orderType,
          price: orderData.price,
          estimatedValue: orderValue,
          estimatedFees: this.calculateEstimatedFees(orderValue)
        },
        riskWarnings: riskAssessment.warnings,
        expiresAt: slideOrder.expiresAt,
        securityLevel: slideRequirements.securityLevel
      };

    } catch (error) {
      logger.error('Failed to prepare slide order', { userId, orderData, error: error.message });
      throw error;
    }
  }

  // Validate slide gesture and execute order
  async executeSlideOrder(userId, slideToken, slideData) {
    try {
      const slideOrder = await this.getSlideOrder(slideToken);
      
      if (!slideOrder) {
        throw new ValidationError('Invalid or expired slide token');
      }

      if (slideOrder.userId !== userId) {
        logSecurityEvent('SLIDE_TOKEN_MISMATCH', { userId, slideToken, expectedUserId: slideOrder.userId });
        throw new SecurityError('Unauthorized slide attempt');
      }

      if (slideOrder.status !== 'PENDING_SLIDE') {
        throw new ValidationError(`Invalid slide order status: ${slideOrder.status}`);
      }

      // Increment attempt counter
      slideOrder.attempts++;
      
      if (slideOrder.attempts > this.security.maxAttempts) {
        await this.blockSlideOrder(slideToken, 'MAX_ATTEMPTS_EXCEEDED');
        throw new SecurityError('Maximum slide attempts exceeded');
      }

      // Validate slide gesture
      const slideValidation = await this.validateSlideGesture(slideOrder, slideData);
      
      if (!slideValidation.valid) {
        await this.handleFailedSlide(slideOrder, slideValidation);
        throw new ValidationError(`Invalid slide gesture: ${slideValidation.reason}`);
      }

      // Perform security checks
      const securityValidation = await this.performSecurityChecks(slideOrder, slideData);
      
      if (!securityValidation.passed) {
        await this.handleSecurityViolation(slideOrder, securityValidation);
        throw new SecurityError(`Security check failed: ${securityValidation.reason}`);
      }

      // Update slide order status
      slideOrder.status = 'SLIDE_VALIDATED';
      slideOrder.slideCompletedAt = Date.now();
      slideOrder.slideData = slideData;

      // Final risk check (prices may have moved)
      const finalRiskCheck = await riskManagementSystem.preOrderRiskCheck(userId, slideOrder.orderData);
      
      if (!finalRiskCheck.approved) {
        slideOrder.status = 'RISK_REJECTED';
        throw new ValidationError('Order rejected by final risk check');
      }

      // Execute the order
      slideOrder.status = 'EXECUTING';
      const executionResult = await orderManagementSystem.submitOrder(userId, slideOrder.orderData);

      // Update slide order with execution result
      slideOrder.status = 'EXECUTED';
      slideOrder.executionResult = executionResult;
      slideOrder.executedAt = Date.now();

      // Update analytics
      this.updateSlideAnalytics(slideOrder, true);

      // Send success notification
      await notificationSystem.sendNotification(userId, 'ORDER_EXECUTED_SLIDE', {
        slideToken,
        orderId: executionResult.orderId,
        symbol: slideOrder.orderData.symbol,
        executionMethod: 'SLIDE_TO_EXECUTE'
      });

      // Log business event
      logBusinessEvent('SLIDE_ORDER_EXECUTED', {
        userId,
        slideToken,
        orderId: executionResult.orderId,
        symbol: slideOrder.orderData.symbol,
        orderValue: slideOrder.orderValue,
        slideDuration: slideOrder.slideCompletedAt - slideOrder.timestamp,
        securityLevel: slideOrder.slideRequirements.securityLevel
      });

      // Clean up
      await this.cleanupSlideOrder(slideToken);

      return {
        success: true,
        slideToken,
        orderId: executionResult.orderId,
        executionResult,
        slideAnalytics: {
          slideDuration: slideData.duration,
          slideDistance: slideData.distance,
          slideVelocity: slideData.velocity,
          securityScore: securityValidation.score
        }
      };

    } catch (error) {
      // Update analytics for failed execution
      const slideOrder = this.pendingOrders.get(slideToken);
      if (slideOrder) {
        this.updateSlideAnalytics(slideOrder, false);
      }

      logger.error('Slide order execution failed', { userId, slideToken, error: error.message });
      throw error;
    }
  }

  // Validate slide gesture mechanics
  async validateSlideGesture(slideOrder, slideData) {
    try {
      const validation = {
        valid: true,
        reason: null,
        score: 100
      };

      // Check slide duration
      if (slideData.duration < this.security.slideMinDuration) {
        validation.valid = false;
        validation.reason = 'Slide too fast - please slide more carefully';
        validation.score -= 30;
      }

      if (slideData.duration > this.security.slideMaxDuration) {
        validation.valid = false;
        validation.reason = 'Slide too slow - please try again';
        validation.score -= 20;
      }

      // Check slide distance
      if (slideData.distance < this.security.requiredSlideDistance) {
        validation.valid = false;
        validation.reason = 'Incomplete slide - please slide all the way';
        validation.score -= 40;
      }

      // Check slide smoothness (detect bots)
      const smoothnessScore = this.calculateSlideSmoothness(slideData.path);
      if (smoothnessScore < 0.3) {
        validation.valid = false;
        validation.reason = 'Invalid slide pattern detected';
        validation.score -= 50;
      }

      // Check for proper acceleration/deceleration
      const velocityProfile = this.analyzeVelocityProfile(slideData.velocityPoints);
      if (!velocityProfile.natural) {
        validation.valid = false;
        validation.reason = 'Unnatural slide velocity detected';
        validation.score -= 35;
      }

      // Behavioral analysis (compare to user's historical patterns)
      const behaviorScore = await this.analyzeSlideBehavior(slideOrder.userId, slideData);
      if (behaviorScore < 0.5) {
        validation.valid = false;
        validation.reason = 'Slide pattern doesn\'t match user behavior';
        validation.score -= 25;
      }

      validation.score = Math.max(0, validation.score);

      return validation;

    } catch (error) {
      logger.error('Slide gesture validation failed', { slideToken: slideOrder.slideToken, error: error.message });
      return {
        valid: false,
        reason: 'Validation error occurred',
        score: 0
      };
    }
  }

  // Perform comprehensive security checks
  async performSecurityChecks(slideOrder, slideData) {
    try {
      const checks = {
        passed: true,
        reason: null,
        score: 100,
        details: {}
      };

      // Device fingerprint verification
      if (slideOrder.slideRequirements.deviceVerification) {
        const deviceCheck = await this.verifyDeviceFingerprint(
          slideOrder.userId, 
          slideData.deviceFingerprint
        );
        
        checks.details.device = deviceCheck;
        if (!deviceCheck.verified) {
          checks.passed = false;
          checks.reason = 'Device verification failed';
          checks.score -= 40;
        }
      }

      // Biometric verification (if required)
      if (slideOrder.slideRequirements.biometric && slideData.biometricToken) {
        const biometricCheck = await this.verifyBiometric(
          slideOrder.userId, 
          slideData.biometricToken
        );
        
        checks.details.biometric = biometricCheck;
        if (!biometricCheck.verified) {
          checks.passed = false;
          checks.reason = 'Biometric verification failed';
          checks.score -= 50;
        }
      }

      // Location verification (for high-value orders)
      if (slideOrder.slideRequirements.locationVerification) {
        const locationCheck = await this.verifyLocation(
          slideOrder.userId, 
          slideData.location
        );
        
        checks.details.location = locationCheck;
        if (!locationCheck.verified) {
          checks.passed = false;
          checks.reason = 'Location verification failed';
          checks.score -= 30;
        }
      }

      // Session integrity check
      const sessionCheck = await this.verifySessionIntegrity(
        slideOrder.userId, 
        slideData.sessionToken
      );
      
      checks.details.session = sessionCheck;
      if (!sessionCheck.valid) {
        checks.passed = false;
        checks.reason = 'Session integrity compromised';
        checks.score -= 60;
      }

      // Time-based verification (prevent replay attacks)
      const timeCheck = this.verifySlideTimestamp(slideOrder, slideData);
      checks.details.timestamp = timeCheck;
      if (!timeCheck.valid) {
        checks.passed = false;
        checks.reason = 'Invalid slide timestamp';
        checks.score -= 45;
      }

      checks.score = Math.max(0, checks.score);

      return checks;

    } catch (error) {
      logger.error('Security checks failed', { slideToken: slideOrder.slideToken, error: error.message });
      return {
        passed: false,
        reason: 'Security validation error',
        score: 0,
        details: { error: error.message }
      };
    }
  }

  // Determine slide requirements based on order risk
  determineSlideRequirements(orderValue, riskAssessment, options = {}) {
    const requirements = {
      securityLevel: 'STANDARD',
      biometric: false,
      deviceVerification: true,
      locationVerification: false,
      additionalConfirmation: false,
      slideComplexity: 'SIMPLE'
    };

    // High-value orders
    if (orderValue > 100000) {
      requirements.securityLevel = 'HIGH';
      requirements.biometric = true;
      requirements.locationVerification = true;
      requirements.slideComplexity = 'COMPLEX';
    } else if (orderValue > 25000) {
      requirements.securityLevel = 'MEDIUM';
      requirements.biometric = true;
      requirements.slideComplexity = 'MEDIUM';
    }

    // High-risk orders
    if (riskAssessment.riskLevel === 'HIGH') {
      requirements.securityLevel = 'HIGH';
      requirements.biometric = true;
      requirements.additionalConfirmation = true;
    }

    // Options orders
    if (riskAssessment.isOptions) {
      requirements.biometric = true;
      requirements.additionalConfirmation = true;
    }

    // Margin orders
    if (riskAssessment.isMargin) {
      requirements.securityLevel = Math.max(requirements.securityLevel, 'MEDIUM');
      requirements.deviceVerification = true;
    }

    // User preferences override
    if (options.forceHighSecurity) {
      requirements.securityLevel = 'HIGH';
      requirements.biometric = true;
      requirements.locationVerification = true;
    }

    return requirements;
  }

  // Calculate slide smoothness (detect bot behavior)
  calculateSlideSmoothness(slidePath) {
    if (!slidePath || slidePath.length < 10) return 0;

    let smoothnessScore = 1.0;
    const velocityChanges = [];
    const directionChanges = [];

    for (let i = 1; i < slidePath.length - 1; i++) {
      const prev = slidePath[i - 1];
      const curr = slidePath[i];
      const next = slidePath[i + 1];

      // Calculate velocity change
      const vel1 = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)) / (curr.timestamp - prev.timestamp);
      const vel2 = Math.sqrt(Math.pow(next.x - curr.x, 2) + Math.pow(next.y - curr.y, 2)) / (next.timestamp - curr.timestamp);
      
      velocityChanges.push(Math.abs(vel2 - vel1));

      // Calculate direction change
      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      const angleDiff = Math.abs(angle2 - angle1);
      
      directionChanges.push(angleDiff);
    }

    // Penalize excessive velocity changes (robotic behavior)
    const avgVelocityChange = velocityChanges.reduce((a, b) => a + b, 0) / velocityChanges.length;
    if (avgVelocityChange > 100) {
      smoothnessScore -= 0.3;
    }

    // Penalize too many direction changes
    const significantDirectionChanges = directionChanges.filter(change => change > 0.5).length;
    if (significantDirectionChanges > slidePath.length * 0.3) {
      smoothnessScore -= 0.4;
    }

    // Penalize perfectly straight lines (also robotic)
    const totalDirectionChange = directionChanges.reduce((a, b) => a + b, 0);
    if (totalDirectionChange < 0.1) {
      smoothnessScore -= 0.5;
    }

    return Math.max(0, smoothnessScore);
  }

  // Analyze velocity profile for natural human behavior
  analyzeVelocityProfile(velocityPoints) {
    if (!velocityPoints || velocityPoints.length < 5) {
      return { natural: false, reason: 'Insufficient velocity data' };
    }

    const analysis = {
      natural: true,
      reason: null,
      hasAcceleration: false,
      hasDeceleration: false,
      peakVelocity: Math.max(...velocityPoints),
      avgVelocity: velocityPoints.reduce((a, b) => a + b, 0) / velocityPoints.length
    };

    // Check for natural acceleration at start
    const startVelocities = velocityPoints.slice(0, Math.min(5, velocityPoints.length));
    const hasInitialAcceleration = startVelocities.every((vel, i) => i === 0 || vel >= startVelocities[i - 1]);
    analysis.hasAcceleration = hasInitialAcceleration;

    // Check for natural deceleration at end
    const endVelocities = velocityPoints.slice(-Math.min(5, velocityPoints.length));
    const hasFinalDeceleration = endVelocities.every((vel, i) => i === 0 || vel <= endVelocities[i - 1]);
    analysis.hasDeceleration = hasFinalDeceleration;

    // Natural slides should have acceleration and deceleration
    if (!analysis.hasAcceleration || !analysis.hasDeceleration) {
      analysis.natural = false;
      analysis.reason = 'Unnatural velocity profile - missing acceleration/deceleration';
    }

    // Check for impossible velocity spikes
    for (let i = 1; i < velocityPoints.length; i++) {
      const velocityChange = Math.abs(velocityPoints[i] - velocityPoints[i - 1]);
      if (velocityChange > analysis.peakVelocity * 0.8) {
        analysis.natural = false;
        analysis.reason = 'Impossible velocity spike detected';
        break;
      }
    }

    return analysis;
  }

  // Cancel slide order
  async cancelSlideOrder(userId, slideToken, reason = 'USER_CANCELLED') {
    try {
      const slideOrder = await this.getSlideOrder(slideToken);
      
      if (!slideOrder) {
        throw new ValidationError('Slide order not found');
      }

      if (slideOrder.userId !== userId) {
        throw new SecurityError('Unauthorized cancellation attempt');
      }

      slideOrder.status = 'CANCELLED';
      slideOrder.cancelledAt = Date.now();
      slideOrder.cancellationReason = reason;

      // Update analytics
      this.analytics.failedSlides++;

      // Send notification
      await notificationSystem.sendNotification(userId, 'SLIDE_ORDER_CANCELLED', {
        slideToken,
        symbol: slideOrder.orderData.symbol,
        reason
      });

      // Clean up
      await this.cleanupSlideOrder(slideToken);

      logBusinessEvent('SLIDE_ORDER_CANCELLED', {
        userId,
        slideToken,
        reason,
        symbol: slideOrder.orderData.symbol
      });

      return { success: true, slideToken, reason };

    } catch (error) {
      logger.error('Failed to cancel slide order', { userId, slideToken, error: error.message });
      throw error;
    }
  }

  // Get slide order analytics
  getSlideAnalytics(userId = null) {
    const analytics = {
      global: {
        totalSlideAttempts: this.analytics.slideAttempts,
        successfulSlides: this.analytics.successfulSlides,
        failedSlides: this.analytics.failedSlides,
        successRate: this.analytics.slideAttempts > 0 ? 
          (this.analytics.successfulSlides / this.analytics.slideAttempts * 100) : 0,
        averageSlideDuration: this.analytics.averageSlideDuration,
        securityViolations: this.analytics.securityViolations
      }
    };

    if (userId) {
      // Add user-specific analytics if needed
      analytics.user = {
        // User-specific slide patterns and preferences
      };
    }

    return analytics;
  }

  // Helper methods
  generateSlideToken() {
    return `slide_${crypto.randomUUID()}`;
  }

  async getSlideOrder(slideToken) {
    let slideOrder = this.pendingOrders.get(slideToken);
    
    if (!slideOrder) {
      slideOrder = await cacheService.get(`slide_order:${slideToken}`);
    }

    return slideOrder;
  }

  async cleanupSlideOrder(slideToken) {
    this.pendingOrders.delete(slideToken);
    await cacheService.del(`slide_order:${slideToken}`);
  }

  updateSlideAnalytics(slideOrder, success) {
    this.analytics.slideAttempts++;
    
    if (success) {
      this.analytics.successfulSlides++;
    } else {
      this.analytics.failedSlides++;
    }

    if (slideOrder.slideCompletedAt) {
      const duration = slideOrder.slideCompletedAt - slideOrder.timestamp;
      this.analytics.averageSlideDuration = 
        (this.analytics.averageSlideDuration + duration) / 2;
    }
  }

  // Start background processes
  startTokenCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [token, order] of this.pendingOrders) {
        if (order.expiresAt < now) {
          this.cleanupSlideOrder(token);
        }
      }
    }, 30000); // Every 30 seconds
  }

  startSecurityMonitoring() {
    // Monitor for suspicious slide patterns
    setInterval(() => {
      this.detectAnomalousSlidePatterns();
    }, 60000); // Every minute
  }

  async detectAnomalousSlidePatterns() {
    // Implementation for detecting bot behavior, fraud patterns, etc.
    // This would analyze slide patterns across all users to detect anomalies
  }
}

// Export singleton instance
const slideToExecuteService = new SlideToExecuteService();

module.exports = { slideToExecuteService, SlideToExecuteService };
