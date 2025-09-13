/**
 * Enhanced Input Validation System
 * Comprehensive validation schemas for all API endpoints
 */

const Joi = require('joi');

// Custom validation patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  stockSymbol: /^[A-Z]{1,5}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

// Custom Joi extensions
const customJoi = Joi.extend({
  type: 'stockSymbol',
  base: Joi.string(),
  messages: {
    'stockSymbol.invalid': 'Stock symbol must be 1-5 uppercase letters'
  },
  validate(value, helpers) {
    if (!patterns.stockSymbol.test(value)) {
      return { value, errors: helpers.error('stockSymbol.invalid') };
    }
  }
});

// Authentication schemas
const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    
    password: Joi.string().pattern(patterns.strongPassword).required().messages({
      'string.pattern.base': 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      'any.required': 'Password is required'
    }),
    
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords must match',
      'any.required': 'Password confirmation is required'
    }),
    
    firstName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
    
    lastName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
    
    phone: Joi.string().pattern(patterns.phone).optional(),
    
    acceptTerms: Joi.boolean().valid(true).required().messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    }),
    
    acceptPrivacy: Joi.boolean().valid(true).required().messages({
      'any.only': 'You must accept the privacy policy',
      'any.required': 'Privacy policy acceptance is required'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    twoFactorToken: Joi.string().length(6).pattern(/^\d+$/).optional(),
    rememberMe: Joi.boolean().optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().pattern(patterns.strongPassword).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().pattern(patterns.strongPassword).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  }),

  enable2FA: Joi.object({
    secret: Joi.string().required(),
    token: Joi.string().length(6).pattern(/^\d+$/).required()
  })
};

// Trading schemas
const tradingSchemas = {
  createOrder: Joi.object({
    symbol: customJoi.stockSymbol().required(),
    
    quantity: Joi.number().positive().max(10000).required().messages({
      'number.positive': 'Quantity must be positive',
      'number.max': 'Maximum quantity is 10,000 shares',
      'any.required': 'Quantity is required'
    }),
    
    side: Joi.string().valid('buy', 'sell').required(),
    
    type: Joi.string().valid('market', 'limit', 'stop', 'stop_limit').required(),
    
    price: Joi.when('type', {
      is: Joi.valid('limit', 'stop_limit'),
      then: Joi.number().positive().required(),
      otherwise: Joi.optional()
    }),
    
    stopPrice: Joi.when('type', {
      is: Joi.valid('stop', 'stop_limit'),
      then: Joi.number().positive().required(),
      otherwise: Joi.optional()
    }),
    
    timeInForce: Joi.string().valid('day', 'gtc', 'ioc', 'fok').default('day'),
    
    extendedHours: Joi.boolean().default(false)
  }),

  cancelOrder: Joi.object({
    orderId: Joi.string().uuid().required()
  }),

  modifyOrder: Joi.object({
    orderId: Joi.string().uuid().required(),
    quantity: Joi.number().positive().max(10000).optional(),
    price: Joi.number().positive().optional(),
    stopPrice: Joi.number().positive().optional()
  }),

  // Slide-to-execute schemas
  prepareSlideOrder: Joi.object({
    orderData: Joi.object({
      symbol: customJoi.stockSymbol().required(),
      side: Joi.string().valid('BUY', 'SELL').required(),
      quantity: Joi.number().positive().max(10000).required(),
      orderType: Joi.string().valid('MARKET', 'LIMIT').required(),
      price: Joi.number().positive().optional(),
      timeInForce: Joi.string().valid('DAY', 'GTC', 'IOC', 'FOK').default('DAY')
    }).required(),
    options: Joi.object({
      securityLevel: Joi.string().valid('STANDARD', 'MEDIUM', 'HIGH').default('MEDIUM'),
      biometric: Joi.boolean().default(true),
      deviceVerification: Joi.boolean().default(true),
      locationVerification: Joi.boolean().default(false)
    }).optional()
  }),

  executeSlideOrder: Joi.object({
    orderId: Joi.string().required(),
    slideData: Joi.object({
      path: Joi.array().items(Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        timestamp: Joi.number().required()
      })).required(),
      velocityPoints: Joi.array().items(Joi.number()).required(),
      startTime: Joi.number().required(),
      endTime: Joi.number().required(),
      distance: Joi.number().required(),
      duration: Joi.number().required(),
      velocity: Joi.number().required()
    }).required(),
    orderData: Joi.object({
      symbol: customJoi.stockSymbol().required(),
      side: Joi.string().valid('BUY', 'SELL').required(),
      quantity: Joi.number().positive().required(),
      orderType: Joi.string().valid('MARKET', 'LIMIT').required()
    }).required()
  })
};

// Portfolio schemas
const portfolioSchemas = {
  addWatchlist: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    symbols: Joi.array().items(customJoi.stockSymbol()).min(1).max(50).required()
  }),

  updateWatchlist: Joi.object({
    watchlistId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(50).optional(),
    symbols: Joi.array().items(customJoi.stockSymbol()).max(50).optional()
  }),

  addAlert: Joi.object({
    symbol: customJoi.stockSymbol().required(),
    type: Joi.string().valid('price_above', 'price_below', 'volume_above', 'percent_change').required(),
    value: Joi.number().required(),
    enabled: Joi.boolean().default(true)
  })
};

// KYC schemas
const kycSchemas = {
  personalInfo: Joi.object({
    dateOfBirth: Joi.date().max('now').required(),
    ssn: Joi.string().pattern(/^\d{3}-\d{2}-\d{4}$/).required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().length(2).required(),
      zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
      country: Joi.string().default('US')
    }).required(),
    employmentStatus: Joi.string().valid('employed', 'unemployed', 'retired', 'student').required(),
    annualIncome: Joi.number().min(0).required(),
    netWorth: Joi.number().min(0).required(),
    investmentExperience: Joi.string().valid('none', 'limited', 'good', 'extensive').required()
  }),

  uploadDocument: Joi.object({
    type: Joi.string().valid('drivers_license', 'passport', 'utility_bill', 'bank_statement').required(),
    base64Data: Joi.string().required()
  })
};

// Payment schemas
const paymentSchemas = {
  addPaymentMethod: Joi.object({
    type: Joi.string().valid('bank_account', 'debit_card').required(),
    bankAccount: Joi.when('type', {
      is: 'bank_account',
      then: Joi.object({
        accountNumber: Joi.string().required(),
        routingNumber: Joi.string().length(9).pattern(/^\d+$/).required(),
        accountType: Joi.string().valid('checking', 'savings').required(),
        accountHolderName: Joi.string().required()
      }).required(),
      otherwise: Joi.optional()
    }),
    debitCard: Joi.when('type', {
      is: 'debit_card',
      then: Joi.object({
        cardNumber: Joi.string().creditCard().required(),
        expiryMonth: Joi.number().min(1).max(12).required(),
        expiryYear: Joi.number().min(new Date().getFullYear()).required(),
        cvv: Joi.string().length(3).pattern(/^\d+$/).required(),
        cardHolderName: Joi.string().required()
      }).required(),
      otherwise: Joi.optional()
    })
  }),

  createDeposit: Joi.object({
    amount: Joi.number().positive().min(1).max(250000).required(),
    paymentMethodId: Joi.string().uuid().required()
  }),

  createWithdrawal: Joi.object({
    amount: Joi.number().positive().min(1).required(),
    paymentMethodId: Joi.string().uuid().required()
  })
};

// Market data schemas
const marketDataSchemas = {
  getQuote: Joi.object({
    symbol: customJoi.stockSymbol().required()
  }),

  getCandles: Joi.object({
    symbol: customJoi.stockSymbol().required(),
    interval: Joi.string().valid('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M').required(),
    from: Joi.date().required(),
    to: Joi.date().min(Joi.ref('from')).required()
  }),

  searchSymbols: Joi.object({
    query: Joi.string().min(1).max(50).required()
  })
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// File upload validation
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      });
    }

    next();
  };
};

module.exports = {
  authSchemas,
  tradingSchemas,
  portfolioSchemas,
  kycSchemas,
  paymentSchemas,
  marketDataSchemas,
  validate,
  validateFileUpload,
  patterns
};
