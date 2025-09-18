/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const winston = require('winston');

// Create logger for error handling
const errorLogger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log the error
    errorLogger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString()
    });

    // Default error response
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_ERROR';
    let details = err.details || null;

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        code = 'VALIDATION_ERROR';
        details = err.details || err.message;
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
        code = 'INVALID_ID';
    } else if (err.name === 'MongoError' && err.code === 11000) {
        statusCode = 409;
        message = 'Duplicate entry';
        code = 'DUPLICATE_ENTRY';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    } else if (err.name === 'MulterError') {
        statusCode = 400;
        message = 'File upload error';
        code = 'FILE_UPLOAD_ERROR';
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File too large';
            code = 'FILE_TOO_LARGE';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            message = 'Too many files';
            code = 'TOO_MANY_FILES';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
            code = 'UNEXPECTED_FILE_FIELD';
        }
    } else if (err.name === 'SequelizeValidationError') {
        statusCode = 400;
        message = 'Database validation error';
        code = 'DB_VALIDATION_ERROR';
        details = err.errors?.map(e => ({
            field: e.path,
            message: e.message,
            value: e.value
        }));
    } else if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 409;
        message = 'Duplicate entry';
        code = 'DUPLICATE_ENTRY';
        details = err.errors?.map(e => ({
            field: e.path,
            message: e.message,
            value: e.value
        }));
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        statusCode = 400;
        message = 'Foreign key constraint error';
        code = 'FOREIGN_KEY_ERROR';
    } else if (err.name === 'SequelizeDatabaseError') {
        statusCode = 500;
        message = 'Database error';
        code = 'DATABASE_ERROR';
    } else if (err.name === 'AxiosError') {
        statusCode = 502;
        message = 'External service error';
        code = 'EXTERNAL_SERVICE_ERROR';
        if (err.response) {
            statusCode = err.response.status;
            message = err.response.data?.message || message;
        }
    } else if (err.name === 'RateLimitError') {
        statusCode = 429;
        message = 'Too many requests';
        code = 'RATE_LIMIT_EXCEEDED';
    } else if (err.name === 'TimeoutError') {
        statusCode = 408;
        message = 'Request timeout';
        code = 'TIMEOUT_ERROR';
    } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
        statusCode = 400;
        message = 'Invalid JSON';
        code = 'INVALID_JSON';
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Internal Server Error';
        details = null;
    }

    // Send error response
    const errorResponse = {
        error: message,
        code: code,
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method
    };

    if (details) {
        errorResponse.details = details;
    }

    // Include request ID if available
    if (req.requestId) {
        errorResponse.requestId = req.requestId;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
        path: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Custom error classes
 */
class AppError extends Error {
    constructor(message, statusCode, code = 'APP_ERROR', details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.name = 'RateLimitError';
    }
}

class ExternalServiceError extends AppError {
    constructor(message = 'External service error', service = null) {
        super(message, 502, 'EXTERNAL_SERVICE_ERROR');
        this.name = 'ExternalServiceError';
        this.service = service;
    }
}

class DatabaseError extends AppError {
    constructor(message = 'Database error') {
        super(message, 500, 'DATABASE_ERROR');
        this.name = 'DatabaseError';
    }
}

class FileUploadError extends AppError {
    constructor(message = 'File upload error') {
        super(message, 400, 'FILE_UPLOAD_ERROR');
        this.name = 'FileUploadError';
    }
}

class AIProcessingError extends AppError {
    constructor(message = 'AI processing error') {
        super(message, 500, 'AI_PROCESSING_ERROR');
        this.name = 'AIProcessingError';
    }
}

/**
 * Error response formatter
 */
const formatErrorResponse = (error, req) => {
    const response = {
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method
    };

    if (error.details) {
        response.details = error.details;
    }

    if (req.requestId) {
        response.requestId = req.requestId;
    }

    if (process.env.NODE_ENV === 'development' && error.stack) {
        response.stack = error.stack;
    }

    return response;
};

/**
 * Error monitoring integration
 */
const reportError = (error, req) => {
    // Integration with error monitoring services like Sentry, Bugsnag, etc.
    if (process.env.SENTRY_DSN) {
        // Sentry integration would go here
        console.log('Sentry error reporting:', error.message);
    }

    if (process.env.BUGSNAG_API_KEY) {
        // Bugsnag integration would go here
        console.log('Bugsnag error reporting:', error.message);
    }
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ExternalServiceError,
    DatabaseError,
    FileUploadError,
    AIProcessingError,
    formatErrorResponse,
    reportError
};
