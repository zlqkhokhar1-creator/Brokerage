/**
 * Validation Middleware
 * Handles request validation using express-validator
 */

const { validationResult } = require('express-validator');

/**
 * Validation result handler middleware
 */
const validationMiddleware = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value,
            location: error.location
        }));

        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: formattedErrors
        });
    }

    next();
};

/**
 * Custom validation functions
 */
const customValidators = {
    /**
     * Validate Pakistani CNIC format
     */
    isPakistaniCNIC: (value) => {
        const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
        return cnicRegex.test(value);
    },

    /**
     * Validate Pakistani phone number
     */
    isPakistaniPhone: (value) => {
        const phoneRegex = /^(\+92|0)?[0-9]{10}$/;
        return phoneRegex.test(value);
    },

    /**
     * Validate PKR amount
     */
    isPKRAmount: (value) => {
        const amount = parseFloat(value);
        return !isNaN(amount) && amount > 0 && amount <= 999999999;
    },

    /**
     * Validate date range
     */
    isDateRange: (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return start <= end;
    },

    /**
     * Validate transaction type
     */
    isTransactionType: (value) => {
        const validTypes = ['income', 'expense', 'transfer'];
        return validTypes.includes(value);
    },

    /**
     * Validate budget type
     */
    isBudgetType: (value) => {
        const validTypes = ['monthly', 'yearly', 'weekly', 'custom'];
        return validTypes.includes(value);
    },

    /**
     * Validate risk tolerance
     */
    isRiskTolerance: (value) => {
        const validTypes = ['conservative', 'moderate', 'aggressive'];
        return validTypes.includes(value);
    },

    /**
     * Validate priority level
     */
    isPriority: (value) => {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        return validPriorities.includes(value);
    },

    /**
     * Validate goal status
     */
    isGoalStatus: (value) => {
        const validStatuses = ['active', 'paused', 'completed', 'cancelled'];
        return validStatuses.includes(value);
    },

    /**
     * Validate notification priority
     */
    isNotificationPriority: (value) => {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        return validPriorities.includes(value);
    },

    /**
     * Validate bank name
     */
    isSupportedBank: (value) => {
        const supportedBanks = [
            'HBL', 'UBL', 'MCB', 'Bank Alfalah', 'Allied Bank',
            'JazzCash', 'EasyPaisa', 'Raast'
        ];
        return supportedBanks.includes(value);
    },

    /**
     * Validate currency code
     */
    isCurrencyCode: (value) => {
        const validCurrencies = ['PKR', 'USD', 'EUR', 'GBP', 'AED'];
        return validCurrencies.includes(value);
    },

    /**
     * Validate payment method
     */
    isPaymentMethod: (value) => {
        const validMethods = [
            'cash', 'card', 'bank_transfer', 'mobile_wallet',
            'jazzcash', 'easypaisa', 'raast', 'stripe', 'paypal'
        ];
        return validMethods.includes(value);
    },

    /**
     * Validate file type for uploads
     */
    isImageFile: (value) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return allowedTypes.includes(value.mimetype);
    },

    /**
     * Validate file size
     */
    isFileSizeValid: (value, maxSize = 10 * 1024 * 1024) => { // 10MB default
        return value.size <= maxSize;
    },

    /**
     * Validate UUID format
     */
    isUUID: (value) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
    },

    /**
     * Validate email format
     */
    isEmail: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },

    /**
     * Validate password strength
     */
    isStrongPassword: (value) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(value);
    },

    /**
     * Validate positive number
     */
    isPositiveNumber: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    },

    /**
     * Validate non-negative number
     */
    isNonNegativeNumber: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
    },

    /**
     * Validate integer
     */
    isInteger: (value) => {
        return Number.isInteger(parseFloat(value));
    },

    /**
     * Validate percentage (0-100)
     */
    isPercentage: (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
    },

    /**
     * Validate date format (YYYY-MM-DD)
     */
    isDateFormat: (value) => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return dateRegex.test(value);
    },

    /**
     * Validate datetime format (ISO 8601)
     */
    isDateTimeFormat: (value) => {
        const date = new Date(value);
        return !isNaN(date.getTime());
    },

    /**
     * Validate array of strings
     */
    isStringArray: (value) => {
        return Array.isArray(value) && value.every(item => typeof item === 'string');
    },

    /**
     * Validate object with required keys
     */
    hasRequiredKeys: (value, requiredKeys) => {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        return requiredKeys.every(key => key in value);
    },

    /**
     * Validate JSON string
     */
    isJSONString: (value) => {
        try {
            JSON.parse(value);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Validate URL format
     */
    isURL: (value) => {
        try {
            new URL(value);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Validate base64 string
     */
    isBase64: (value) => {
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        return base64Regex.test(value);
    }
};

/**
 * Sanitization functions
 */
const sanitizers = {
    /**
     * Sanitize string input
     */
    sanitizeString: (value) => {
        if (typeof value !== 'string') return value;
        return value.trim().replace(/[<>]/g, '');
    },

    /**
     * Sanitize email input
     */
    sanitizeEmail: (value) => {
        if (typeof value !== 'string') return value;
        return value.trim().toLowerCase();
    },

    /**
     * Sanitize phone number
     */
    sanitizePhone: (value) => {
        if (typeof value !== 'string') return value;
        return value.replace(/[^\d+]/g, '');
    },

    /**
     * Sanitize amount input
     */
    sanitizeAmount: (value) => {
        if (typeof value === 'number') return value;
        const num = parseFloat(value);
        return isNaN(num) ? 0 : Math.round(num * 100) / 100; // Round to 2 decimal places
    },

    /**
     * Sanitize date input
     */
    sanitizeDate: (value) => {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }
};

module.exports = {
    validationMiddleware,
    customValidators,
    sanitizers
};
