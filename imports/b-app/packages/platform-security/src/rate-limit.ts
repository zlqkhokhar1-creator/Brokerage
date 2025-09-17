export interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (context: any) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  totalHits: number;
}

export interface RateLimiter {
  checkLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

// In-memory rate limiter (TODO: move to Redis for production)
export class InMemoryRateLimiter implements RateLimiter {
  private store: Map<string, { hits: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async checkLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    
    let record = this.store.get(key);
    
    // Reset if window has expired
    if (!record || record.resetTime <= now) {
      record = {
        hits: 0,
        resetTime: now + rule.windowMs
      };
    }

    // Increment hit count
    record.hits++;
    this.store.set(key, record);

    const allowed = record.hits <= rule.maxRequests;
    const remaining = Math.max(0, rule.maxRequests - record.hits);

    return {
      allowed,
      remaining,
      resetTime: new Date(record.resetTime),
      totalHits: record.hits
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  // Get current stats for monitoring
  getStats(): { totalKeys: number; activeKeys: number } {
    const now = Date.now();
    let activeKeys = 0;

    for (const record of this.store.values()) {
      if (record.resetTime > now) {
        activeKeys++;
      }
    }

    return {
      totalKeys: this.store.size,
      activeKeys
    };
  }
}

// Rate limit middleware factory
export function createRateLimitMiddleware(
  rateLimiter: RateLimiter,
  defaultRule: RateLimitRule
) {
  return async (req: any, res: any, next: any) => {
    try {
      // Generate key (default: IP address, can be overridden)
      const key = defaultRule.keyGenerator 
        ? defaultRule.keyGenerator(req)
        : req.ip || req.connection.remoteAddress || 'unknown';

      const result = await rateLimiter.checkLimit(key, defaultRule);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', defaultRule.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000));

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          resetTime: result.resetTime.toISOString()
        });
      }

      next();
    } catch (error) {
      // In case of rate limiter error, allow the request to proceed
      console.error('Rate limiter error:', error);
      next();
    }
  };
}