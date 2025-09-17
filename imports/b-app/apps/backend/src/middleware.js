const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session is still active in database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const sessionResult = await db.query(`
      SELECT us.*, u.is_active 
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.user_id = $1 AND us.token_hash = $2 AND us.is_active = true AND us.expires_at > NOW()
    `, [decoded.userId, tokenHash]);

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (!sessionResult.rows[0].is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Registration validation middleware
const validateRegistration = (req, res, next) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    dateOfBirth,
    nationality,
    address
  } = req.body;

  const errors = [];

  // Email validation
  if (!email || !isValidEmail(email)) {
    errors.push('Valid email is required');
  }

  // Password validation
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password && !isValidPassword(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  // Name validation
  if (!firstName || firstName.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters');
  }

  if (!lastName || lastName.trim().length < 2) {
    errors.push('Last name is required and must be at least 2 characters');
  }

  // Phone validation
  if (phone && !isValidPhone(phone)) {
    errors.push('Invalid phone number format');
  }

  // Date of birth validation
  if (dateOfBirth && !isValidDate(dateOfBirth)) {
    errors.push('Invalid date of birth format');
  }

  // Address validation
  if (address) {
    if (!address.line1 || address.line1.trim().length < 5) {
      errors.push('Address line 1 is required and must be at least 5 characters');
    }
    if (!address.city || address.city.trim().length < 2) {
      errors.push('City is required and must be at least 2 characters');
    }
    if (!address.country || address.country.length !== 3) {
      errors.push('Valid country code is required (3 characters)');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

// Login validation middleware
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email is required');
  }

  if (!password || password.length < 1) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

// KYC status check middleware
const requireKYC = (req, res, next) => {
  if (req.user.kycStatus !== 'approved') {
    return res.status(403).json({ 
      message: 'KYC verification required',
      kycStatus: req.user.kycStatus
    });
  }
  next();
};

// Admin role check middleware
const requireAdmin = async (req, res, next) => {
  try {
    const result = await db.query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
    const user = result.rows[0];
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: 'Authorization error' });
  }
};

// Rate limiting middleware (simple in-memory implementation)
const rateLimitMap = new Map();

const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const userLimit = rateLimitMap.get(key);
    
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      return next();
    }
    
    if (userLimit.count >= maxRequests) {
      return res.status(429).json({ 
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }
    
    userLimit.count++;
    next();
  };
};

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
  return passwordRegex.test(password);
}

function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && date < new Date();
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

module.exports = {
  authenticateToken,
  validateRegistration,
  validateLogin,
  requireKYC,
  requireAdmin,
  rateLimit
};


