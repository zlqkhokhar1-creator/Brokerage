const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const { createProxyMiddleware } = require('http-proxy-middleware');

class ApiGateway {
  constructor() {
    this.routes = new Map();
    this.loadBalancers = new Map();
    this.circuitBreakers = new Map();
  }

  async initialize() {
    try {
      await this.loadRoutes();
      await this.initializeLoadBalancers();
      await this.initializeCircuitBreakers();
      logger.info('API Gateway initialized successfully');
    } catch (error) {
      logger.error('Error initializing API Gateway:', error);
    }
  }

  async loadRoutes() {
    try {
      const query = 'SELECT * FROM api_routes WHERE is_active = true';
      const result = await database.query(query);
      
      for (const route of result.rows) {
        this.routes.set(route.path, {
          id: route.id,
          path: route.path,
          method: route.method,
          target: route.target,
          service: route.service,
          loadBalancer: route.load_balancer,
          circuitBreaker: route.circuit_breaker,
          rateLimit: route.rate_limit,
          authentication: route.authentication,
          authorization: route.authorization,
          middleware: route.middleware
        });
      }
      
      logger.info(`Loaded ${this.routes.size} API routes`);
    } catch (error) {
      logger.error('Error loading routes:', error);
    }
  }

  async initializeLoadBalancers() {
    try {
      const query = 'SELECT * FROM load_balancers WHERE is_active = true';
      const result = await database.query(query);
      
      for (const lb of result.rows) {
        this.loadBalancers.set(lb.name, {
          id: lb.id,
          name: lb.name,
          algorithm: lb.algorithm,
          targets: lb.targets,
          healthCheck: lb.health_check,
          weights: lb.weights
        });
      }
      
      logger.info(`Initialized ${this.loadBalancers.size} load balancers`);
    } catch (error) {
      logger.error('Error initializing load balancers:', error);
    }
  }

  async initializeCircuitBreakers() {
    try {
      const query = 'SELECT * FROM circuit_breakers WHERE is_active = true';
      const result = await database.query(query);
      
      for (const cb of result.rows) {
        this.circuitBreakers.set(cb.name, {
          id: cb.id,
          name: cb.name,
          failureThreshold: cb.failure_threshold,
          timeout: cb.timeout,
          resetTimeout: cb.reset_timeout,
          state: 'closed',
          failureCount: 0,
          lastFailureTime: null
        });
      }
      
      logger.info(`Initialized ${this.circuitBreakers.size} circuit breakers`);
    } catch (error) {
      logger.error('Error initializing circuit breakers:', error);
    }
  }

  async routeRequest(req, res) {
    try {
      const path = req.path;
      const method = req.method;
      
      // Find matching route
      const route = this.findRoute(path, method);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }
      
      // Check authentication
      if (route.authentication && !await this.authenticateRequest(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check authorization
      if (route.authorization && !await this.authorizeRequest(req, route)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check rate limit
      if (route.rateLimit && !await this.checkRateLimit(req, route)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      
      // Check circuit breaker
      if (route.circuitBreaker && !await this.checkCircuitBreaker(route.circuitBreaker)) {
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }
      
      // Get target URL
      const targetUrl = await this.getTargetUrl(route);
      if (!targetUrl) {
        return res.status(503).json({ error: 'No healthy targets available' });
      }
      
      // Create proxy middleware
      const proxy = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: {
          [`^${route.path}`]: ''
        },
        onError: (err, req, res) => {
          logger.error('Proxy error:', err);
          res.status(500).json({ error: 'Internal server error' });
        },
        onProxyReq: (proxyReq, req, res) => {
          // Add custom headers
          proxyReq.setHeader('X-Forwarded-For', req.ip);
          proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
          proxyReq.setHeader('X-Original-URL', req.originalUrl);
        }
      });
      
      // Execute proxy
      proxy(req, res);
    } catch (error) {
      logger.error('Error routing request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  findRoute(path, method) {
    for (const [routePath, route] of this.routes) {
      if (this.matchPath(routePath, path) && route.method === method) {
        return route;
      }
    }
    return null;
  }

  matchPath(routePath, requestPath) {
    if (routePath === requestPath) {
      return true;
    }
    
    // Simple wildcard matching
    if (routePath.endsWith('*')) {
      const prefix = routePath.slice(0, -1);
      return requestPath.startsWith(prefix);
    }
    
    // Parameter matching
    const routeParts = routePath.split('/');
    const pathParts = requestPath.split('/');
    
    if (routeParts.length !== pathParts.length) {
      return false;
    }
    
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        continue; // Parameter match
      }
      if (routeParts[i] !== pathParts[i]) {
        return false;
      }
    }
    
    return true;
  }

  async authenticateRequest(req) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return false;
      }
      
      const token = authHeader.split(' ')[1];
      if (!token) {
        return false;
      }
      
      // Verify JWT token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      req.user = decoded;
      return true;
    } catch (error) {
      logger.error('Authentication error:', error);
      return false;
    }
  }

  async authorizeRequest(req, route) {
    try {
      if (!req.user) {
        return false;
      }
      
      // Check user permissions
      const query = `
        SELECT p.permission_name 
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1 AND up.is_active = true
      `;
      
      const result = await database.query(query, [req.user.userId]);
      const permissions = result.rows.map(row => row.permission_name);
      
      // Check if user has required permission
      const requiredPermission = route.authorization;
      return permissions.includes(requiredPermission);
    } catch (error) {
      logger.error('Authorization error:', error);
      return false;
    }
  }

  async checkRateLimit(req, route) {
    try {
      const key = `rate_limit:${req.ip}:${route.path}`;
      const limit = route.rateLimit;
      
      const current = await redis.get(key) || 0;
      if (parseInt(current) >= limit) {
        return false;
      }
      
      await redis.set(key, parseInt(current) + 1, 60); // 1 minute window
      return true;
    } catch (error) {
      logger.error('Rate limit check error:', error);
      return true; // Allow on error
    }
  }

  async checkCircuitBreaker(circuitBreakerName) {
    try {
      const cb = this.circuitBreakers.get(circuitBreakerName);
      if (!cb) {
        return true;
      }
      
      const now = Date.now();
      
      // Check if circuit breaker is open
      if (cb.state === 'open') {
        if (now - cb.lastFailureTime > cb.resetTimeout) {
          cb.state = 'half-open';
          cb.failureCount = 0;
        } else {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Circuit breaker check error:', error);
      return true;
    }
  }

  async getTargetUrl(route) {
    try {
      if (route.loadBalancer) {
        return await this.getLoadBalancedTarget(route.loadBalancer);
      }
      
      return route.target;
    } catch (error) {
      logger.error('Error getting target URL:', error);
      return null;
    }
  }

  async getLoadBalancedTarget(loadBalancerName) {
    try {
      const lb = this.loadBalancers.get(loadBalancerName);
      if (!lb) {
        return null;
      }
      
      const targets = lb.targets;
      if (!targets || targets.length === 0) {
        return null;
      }
      
      // Simple round-robin for now
      const index = Math.floor(Math.random() * targets.length);
      return targets[index];
    } catch (error) {
      logger.error('Error getting load balanced target:', error);
      return null;
    }
  }

  async recordFailure(circuitBreakerName) {
    try {
      const cb = this.circuitBreakers.get(circuitBreakerName);
      if (!cb) {
        return;
      }
      
      cb.failureCount++;
      cb.lastFailureTime = Date.now();
      
      if (cb.failureCount >= cb.failureThreshold) {
        cb.state = 'open';
        logger.warn(`Circuit breaker ${circuitBreakerName} opened due to failures`);
      }
    } catch (error) {
      logger.error('Error recording failure:', error);
    }
  }

  async recordSuccess(circuitBreakerName) {
    try {
      const cb = this.circuitBreakers.get(circuitBreakerName);
      if (!cb) {
        return;
      }
      
      cb.failureCount = 0;
      if (cb.state === 'half-open') {
        cb.state = 'closed';
        logger.info(`Circuit breaker ${circuitBreakerName} closed after successful request`);
      }
    } catch (error) {
      logger.error('Error recording success:', error);
    }
  }
}

module.exports = new ApiGateway();

