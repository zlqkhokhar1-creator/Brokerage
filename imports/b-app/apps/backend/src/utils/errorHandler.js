/**
 * Enhanced Error Handling System
 * Centralized error management for the brokerage platform
 */

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.type = 'VALIDATION_ERROR';
    this.field = field;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.type = 'AUTHENTICATION_ERROR';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.type = 'AUTHORIZATION_ERROR';
  }
}

class BusinessLogicError extends AppError {
  constructor(message, code = null) {
    super(message, 422);
    this.type = 'BUSINESS_LOGIC_ERROR';
    this.code = code;
  }
}

class ExternalApiError extends AppError {
  constructor(service, message, originalError = null) {
    super(`${service}: ${message}`, 502);
    this.type = 'EXTERNAL_API_ERROR';
    this.service = service;
    this.originalError = originalError;
  }
}

class DatabaseError extends AppError {
  constructor(message, query = null) {
    super(message, 500);
    this.type = 'DATABASE_ERROR';
    this.query = query;
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  const { logger } = require('../utils/logger');
  
  // Log error details
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    type: err.type || 'UNKNOWN_ERROR',
    statusCode: err.statusCode || 500,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let response = {
    success: false,
    message: err.message || 'Internal server error',
    type: err.type || 'UNKNOWN_ERROR',
    timestamp: err.timestamp || new Date().toISOString()
  };

  // Add additional error details in development
  if (isDevelopment) {
    response.stack = err.stack;
    response.statusCode = err.statusCode;
  }

  // Handle specific error types
  if (err.type === 'VALIDATION_ERROR') {
    response.field = err.field;
  } else if (err.type === 'EXTERNAL_API_ERROR') {
    response.service = err.service;
  } else if (err.type === 'BUSINESS_LOGIC_ERROR') {
    response.code = err.code;
  }

  // Database constraint errors
  if (err.code === '23505') { // Unique constraint violation
    response.message = 'Resource already exists';
    response.type = 'DUPLICATE_RESOURCE';
    err.statusCode = 409;
  } else if (err.code === '23503') { // Foreign key violation
    response.message = 'Referenced resource not found';
    response.type = 'INVALID_REFERENCE';
    err.statusCode = 400;
  }

  res.status(err.statusCode || 500).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global uncaught exception handlers
process.on('uncaughtException', (err) => {
  const { logger } = require('../utils/logger');
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  
  // Graceful shutdown
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const { logger } = require('../utils/logger');
  logger.error('Unhandled Rejection', { 
    reason: reason.message || reason,
    promise: promise.toString(),
    stack: reason.stack
  });
  
  // Graceful shutdown
  process.exit(1);
});

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  BusinessLogicError,
  ExternalApiError,
  DatabaseError,
  errorHandler,
  asyncHandler
};
