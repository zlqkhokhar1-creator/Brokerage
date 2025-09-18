const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const axios = require('axios');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class APIGateway extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.routes = new Map();
    this.partners = new Map();
    this.rateLimits = new Map();
    this.circuitBreakers = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load routes
      await this.loadRoutes();
      
      // Load partners
      await this.loadPartners();
      
      // Load rate limits
      await this.loadRateLimits();
      
      this._initialized = true;
      logger.info('APIGateway initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize APIGateway:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('APIGateway closed');
    } catch (error) {
      logger.error('Error closing APIGateway:', error);
    }
  }

  async loadRoutes() {
    try {
      const result = await pool.query(`
        SELECT * FROM api_routes
        WHERE is_active = true
        ORDER BY priority DESC, created_at ASC
      `);
      
      for (const route of result.rows) {
        this.routes.set(route.id, {
          ...route,
          config: route.config ? JSON.parse(route.config) : {},
          middleware: route.middleware ? JSON.parse(route.middleware) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} API routes`);
    } catch (error) {
      logger.error('Error loading routes:', error);
      throw error;
    }
  }

  async loadPartners() {
    try {
      const result = await pool.query(`
        SELECT * FROM integration_partners
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const partner of result.rows) {
        this.partners.set(partner.id, {
          ...partner,
          config: partner.config ? JSON.parse(partner.config) : {},
          credentials: partner.credentials ? JSON.parse(partner.credentials) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} partners`);
    } catch (error) {
      logger.error('Error loading partners:', error);
      throw error;
    }
  }

  async loadRateLimits() {
    try {
      const result = await pool.query(`
        SELECT * FROM rate_limits
        WHERE is_active = true
        ORDER BY created_at ASC
      `);
      
      for (const limit of result.rows) {
        this.rateLimits.set(limit.id, {
          ...limit,
          config: limit.config ? JSON.parse(limit.config) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} rate limits`);
    } catch (error) {
      logger.error('Error loading rate limits:', error);
      throw error;
    }
  }

  async routeRequest(req, res) {
    try {
      const startTime = Date.now();
      const requestId = nanoid();
      
      // Extract route information
      const path = req.path.replace('/api/v1/gateway', '');
      const method = req.method;
      
      // Find matching route
      const route = this.findMatchingRoute(path, method);
      if (!route) {
        return {
          success: false,
          error: 'Route not found',
          statusCode: 404
        };
      }
      
      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(route, req);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          statusCode: 429,
          retryAfter: rateLimitCheck.retryAfter
        };
      }
      
      // Check circuit breaker
      const circuitBreakerCheck = await this.checkCircuitBreaker(route);
      if (!circuitBreakerCheck.allowed) {
        return {
          success: false,
          error: 'Service temporarily unavailable',
          statusCode: 503,
          retryAfter: circuitBreakerCheck.retryAfter
        };
      }
      
      // Execute middleware
      const middlewareResult = await this.executeMiddleware(route, req, res);
      if (!middlewareResult.success) {
        return middlewareResult;
      }
      
      // Route to partner API
      const result = await this.routeToPartner(route, req, res);
      
      // Update metrics
      const duration = Date.now() - startTime;
      await this.updateMetrics(route, result, duration);
      
      // Emit event
      this.emit('requestRouted', {
        requestId,
        route: route.id,
        partner: route.partner_id,
        duration,
        success: result.success
      });
      
      return result;
    } catch (error) {
      logger.error('Error routing request:', error);
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      };
    }
  }

  findMatchingRoute(path, method) {
    try {
      for (const [routeId, route] of this.routes.entries()) {
        if (route.method === method && this.matchesPath(route.path, path)) {
          return route;
        }
      }
      return null;
    } catch (error) {
      logger.error('Error finding matching route:', error);
      return null;
    }
  }

  matchesPath(routePath, requestPath) {
    try {
      // Simple path matching - can be enhanced with regex
      if (routePath === requestPath) {
        return true;
      }
      
      // Check for wildcard patterns
      if (routePath.includes('*')) {
        const pattern = routePath.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(requestPath);
      }
      
      // Check for parameter patterns
      if (routePath.includes(':')) {
        const pattern = routePath.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(requestPath);
      }
      
      return false;
    } catch (error) {
      logger.error('Error matching path:', error);
      return false;
    }
  }

  async checkRateLimit(route, req) {
    try {
      const rateLimit = this.rateLimits.get(route.rate_limit_id);
      if (!rateLimit) {
        return { allowed: true };
      }
      
      const key = `rate_limit:${route.partner_id}:${req.ip}`;
      const current = await this.redis.get(key);
      const count = current ? parseInt(current) : 0;
      
      if (count >= rateLimit.limit) {
        const ttl = await this.redis.ttl(key);
        return {
          allowed: false,
          retryAfter: ttl
        };
      }
      
      // Increment counter
      await this.redis.incr(key);
      if (count === 0) {
        await this.redis.expire(key, rateLimit.window);
      }
      
      return { allowed: true };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      return { allowed: true }; // Allow on error
    }
  }

  async checkCircuitBreaker(route) {
    try {
      const circuitBreaker = this.circuitBreakers.get(route.partner_id);
      if (!circuitBreaker) {
        return { allowed: true };
      }
      
      if (circuitBreaker.state === 'open') {
        const now = Date.now();
        if (now - circuitBreaker.lastFailure < circuitBreaker.timeout) {
          return {
            allowed: false,
            retryAfter: Math.ceil((circuitBreaker.timeout - (now - circuitBreaker.lastFailure)) / 1000)
          };
        } else {
          // Try to close circuit breaker
          circuitBreaker.state = 'half-open';
        }
      }
      
      return { allowed: true };
    } catch (error) {
      logger.error('Error checking circuit breaker:', error);
      return { allowed: true };
    }
  }

  async executeMiddleware(route, req, res) {
    try {
      const { middleware } = route;
      
      for (const middlewareConfig of middleware) {
        const result = await this.executeMiddlewareFunction(middlewareConfig, req, res);
        if (!result.success) {
          return result;
        }
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error executing middleware:', error);
      return {
        success: false,
        error: 'Middleware execution failed',
        statusCode: 500
      };
    }
  }

  async executeMiddlewareFunction(middlewareConfig, req, res) {
    try {
      const { type, config } = middlewareConfig;
      
      switch (type) {
        case 'authentication':
          return await this.authenticateRequest(req, config);
        case 'authorization':
          return await this.authorizeRequest(req, config);
        case 'validation':
          return await this.validateRequest(req, config);
        case 'transformation':
          return await this.transformRequest(req, config);
        case 'logging':
          return await this.logRequest(req, config);
        default:
          return { success: true };
      }
    } catch (error) {
      logger.error('Error executing middleware function:', error);
      return {
        success: false,
        error: 'Middleware function failed',
        statusCode: 500
      };
    }
  }

  async authenticateRequest(req, config) {
    try {
      const { method, token } = config;
      
      switch (method) {
        case 'bearer':
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
              success: false,
              error: 'Bearer token required',
              statusCode: 401
            };
          }
          const tokenValue = authHeader.substring(7);
          if (tokenValue !== token) {
            return {
              success: false,
              error: 'Invalid token',
              statusCode: 401
            };
          }
          break;
        case 'api_key':
          const apiKey = req.headers['x-api-key'];
          if (!apiKey || apiKey !== config.apiKey) {
            return {
              success: false,
              error: 'API key required',
              statusCode: 401
            };
          }
          break;
        case 'basic':
          const basicAuth = req.headers.authorization;
          if (!basicAuth || !basicAuth.startsWith('Basic ')) {
            return {
              success: false,
              error: 'Basic authentication required',
              statusCode: 401
            };
          }
          const credentials = Buffer.from(basicAuth.substring(6), 'base64').toString();
          const [username, password] = credentials.split(':');
          if (username !== config.username || password !== config.password) {
            return {
              success: false,
              error: 'Invalid credentials',
              statusCode: 401
            };
          }
          break;
        default:
          return {
            success: false,
            error: 'Unknown authentication method',
            statusCode: 401
          };
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error authenticating request:', error);
      return {
        success: false,
        error: 'Authentication failed',
        statusCode: 401
      };
    }
  }

  async authorizeRequest(req, config) {
    try {
      const { permissions, roles } = config;
      
      // Check permissions
      if (permissions && permissions.length > 0) {
        const userPermissions = req.user?.permissions || [];
        const hasPermission = permissions.some(p => userPermissions.includes(p));
        if (!hasPermission) {
          return {
            success: false,
            error: 'Insufficient permissions',
            statusCode: 403
          };
        }
      }
      
      // Check roles
      if (roles && roles.length > 0) {
        const userRole = req.user?.role;
        if (!roles.includes(userRole)) {
          return {
            success: false,
            error: 'Insufficient role',
            statusCode: 403
          };
        }
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error authorizing request:', error);
      return {
        success: false,
        error: 'Authorization failed',
        statusCode: 403
      };
    }
  }

  async validateRequest(req, config) {
    try {
      const { schema, requiredFields } = config;
      
      // Check required fields
      if (requiredFields && requiredFields.length > 0) {
        for (const field of requiredFields) {
          if (!req.body[field] && !req.query[field] && !req.params[field]) {
            return {
              success: false,
              error: `Required field missing: ${field}`,
              statusCode: 400
            };
          }
        }
      }
      
      // Validate schema if provided
      if (schema) {
        const validation = this.validateAgainstSchema(req.body, schema);
        if (!validation.valid) {
          return {
            success: false,
            error: 'Validation failed',
            statusCode: 400,
            details: validation.errors
          };
        }
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error validating request:', error);
      return {
        success: false,
        error: 'Validation failed',
        statusCode: 400
      };
    }
  }

  async transformRequest(req, config) {
    try {
      const { transformations } = config;
      
      for (const transformation of transformations) {
        const { type, field, value, operation } = transformation;
        
        switch (type) {
          case 'add':
            req.body[field] = value;
            break;
          case 'remove':
            delete req.body[field];
            break;
          case 'replace':
            if (req.body[field]) {
              req.body[field] = value;
            }
            break;
          case 'transform':
            if (req.body[field]) {
              req.body[field] = this.applyTransformation(req.body[field], operation);
            }
            break;
        }
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error transforming request:', error);
      return {
        success: false,
        error: 'Transformation failed',
        statusCode: 500
      };
    }
  }

  async logRequest(req, config) {
    try {
      const { level, fields } = config;
      
      const logData = {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };
      
      if (fields && fields.length > 0) {
        for (const field of fields) {
          logData[field] = req.body[field] || req.query[field] || req.params[field];
        }
      }
      
      logger[level]('API Gateway Request', logData);
      
      return { success: true };
    } catch (error) {
      logger.error('Error logging request:', error);
      return { success: true }; // Don't fail on logging errors
    }
  }

  async routeToPartner(route, req, res) {
    try {
      const partner = this.partners.get(route.partner_id);
      if (!partner) {
        return {
          success: false,
          error: 'Partner not found',
          statusCode: 404
        };
      }
      
      // Prepare request
      const requestConfig = this.prepareRequest(route, partner, req);
      
      // Make request to partner API
      const response = await this.makeRequest(requestConfig);
      
      // Update circuit breaker
      await this.updateCircuitBreaker(route.partner_id, response.success);
      
      return response;
    } catch (error) {
      logger.error('Error routing to partner:', error);
      
      // Update circuit breaker
      await this.updateCircuitBreaker(route.partner_id, false);
      
      return {
        success: false,
        error: 'Partner API error',
        statusCode: 500
      };
    }
  }

  prepareRequest(route, partner, req) {
    try {
      const { config } = route;
      const { credentials, config: partnerConfig } = partner;
      
      const requestConfig = {
        method: req.method,
        url: `${partnerConfig.baseUrl}${route.target_path}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Integration-Hub/1.0.0'
        },
        timeout: config.timeout || 30000
      };
      
      // Add authentication
      if (credentials.type === 'bearer') {
        requestConfig.headers.Authorization = `Bearer ${credentials.token}`;
      } else if (credentials.type === 'api_key') {
        requestConfig.headers['X-API-Key'] = credentials.apiKey;
      } else if (credentials.type === 'basic') {
        const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        requestConfig.headers.Authorization = `Basic ${auth}`;
      }
      
      // Add custom headers
      if (config.headers) {
        Object.assign(requestConfig.headers, config.headers);
      }
      
      // Add query parameters
      if (Object.keys(req.query).length > 0) {
        requestConfig.params = req.query;
      }
      
      // Add request body
      if (req.method !== 'GET' && req.body) {
        requestConfig.data = req.body;
      }
      
      return requestConfig;
    } catch (error) {
      logger.error('Error preparing request:', error);
      throw error;
    }
  }

  async makeRequest(requestConfig) {
    try {
      const response = await axios(requestConfig);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || 'Partner API error',
          statusCode: error.response.status,
          data: error.response.data
        };
      } else {
        return {
          success: false,
          error: 'Network error',
          statusCode: 500
        };
      }
    }
  }

  async updateCircuitBreaker(partnerId, success) {
    try {
      let circuitBreaker = this.circuitBreakers.get(partnerId);
      if (!circuitBreaker) {
        circuitBreaker = {
          state: 'closed',
          failureCount: 0,
          successCount: 0,
          lastFailure: 0,
          timeout: 60000 // 1 minute
        };
        this.circuitBreakers.set(partnerId, circuitBreaker);
      }
      
      if (success) {
        circuitBreaker.successCount++;
        circuitBreaker.failureCount = 0;
        
        if (circuitBreaker.state === 'half-open') {
          circuitBreaker.state = 'closed';
        }
      } else {
        circuitBreaker.failureCount++;
        circuitBreaker.lastFailure = Date.now();
        
        if (circuitBreaker.failureCount >= 5) {
          circuitBreaker.state = 'open';
        }
      }
    } catch (error) {
      logger.error('Error updating circuit breaker:', error);
    }
  }

  async updateMetrics(route, result, duration) {
    try {
      const metrics = {
        route_id: route.id,
        partner_id: route.partner_id,
        success: result.success,
        status_code: result.statusCode,
        duration: duration,
        timestamp: new Date()
      };
      
      // Store in database
      await pool.query(`
        INSERT INTO api_metrics (route_id, partner_id, success, status_code, duration, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        route.id, route.partner_id, result.success, result.statusCode, duration, metrics.timestamp
      ]);
      
      // Store in Redis for real-time metrics
      await this.redis.setex(
        `metrics:${route.id}:${Date.now()}`,
        3600, // 1 hour
        JSON.stringify(metrics)
      );
    } catch (error) {
      logger.error('Error updating metrics:', error);
    }
  }

  validateAgainstSchema(data, schema) {
    try {
      // Simple validation - can be enhanced with Joi or similar
      const errors = [];
      
      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        
        if (rules.required && (value === undefined || value === null)) {
          errors.push(`${field} is required`);
        }
        
        if (value !== undefined && value !== null) {
          if (rules.type && typeof value !== rules.type) {
            errors.push(`${field} must be of type ${rules.type}`);
          }
          
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
          }
          
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${field} must be no more than ${rules.maxLength} characters`);
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors: errors
      };
    } catch (error) {
      logger.error('Error validating against schema:', error);
      return {
        valid: false,
        errors: ['Validation error']
      };
    }
  }

  applyTransformation(value, operation) {
    try {
      switch (operation) {
        case 'uppercase':
          return value.toString().toUpperCase();
        case 'lowercase':
          return value.toString().toLowerCase();
        case 'trim':
          return value.toString().trim();
        case 'reverse':
          return value.toString().split('').reverse().join('');
        default:
          return value;
      }
    } catch (error) {
      logger.error('Error applying transformation:', error);
      return value;
    }
  }

  async getRouteStats() {
    try {
      const stats = {
        totalRoutes: this.routes.size,
        activeRoutes: Array.from(this.routes.values()).filter(r => r.is_active).length,
        totalPartners: this.partners.size,
        activePartners: Array.from(this.partners.values()).filter(p => p.is_active).length,
        circuitBreakers: {
          open: 0,
          halfOpen: 0,
          closed: 0
        }
      };
      
      // Count circuit breaker states
      for (const [partnerId, circuitBreaker] of this.circuitBreakers.entries()) {
        switch (circuitBreaker.state) {
          case 'open':
            stats.circuitBreakers.open++;
            break;
          case 'half-open':
            stats.circuitBreakers.halfOpen++;
            break;
          case 'closed':
            stats.circuitBreakers.closed++;
            break;
        }
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting route stats:', error);
      throw error;
    }
  }
}

module.exports = APIGateway;
