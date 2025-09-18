const Joi = require('joi');
const { logger } = require('./logger');

// Common validation schemas
const commonSchemas = {
  id: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  date: Joi.date().iso().required(),
  positiveNumber: Joi.number().positive().required(),
  nonNegativeNumber: Joi.number().min(0).required(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').required(),
  riskLevel: Joi.string().valid('very_low', 'low', 'medium', 'high').required(),
  tier: Joi.string().valid('basic', 'standard', 'premium', 'enterprise').required()
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation error:', {
          path: req.path,
          method: req.method,
          errors: errorDetails
        });

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errorDetails
        });
      }

      // Replace the request property with the validated and sanitized value
      req[property] = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};

// Onboarding validation schemas
const onboardingSchemas = {
  startOnboarding: Joi.object({
    user_id: commonSchemas.userId,
    workflow_id: Joi.string().uuid().required(),
    user_data: Joi.object({
      first_name: Joi.string().min(1).max(100).required(),
      last_name: Joi.string().min(1).max(100).required(),
      email: commonSchemas.email,
      phone: commonSchemas.phone,
      date_of_birth: commonSchemas.date,
      country: Joi.string().length(2).required(),
      state: Joi.string().min(1).max(100),
      city: Joi.string().min(1).max(100),
      address: Joi.string().min(1).max(500),
      postal_code: Joi.string().min(1).max(20),
      nationality: Joi.string().length(2),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
      marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'separated'),
      employment_status: Joi.string().valid('employed', 'self_employed', 'unemployed', 'retired', 'student'),
      income: commonSchemas.nonNegativeNumber,
      net_worth: commonSchemas.nonNegativeNumber,
      trading_experience: commonSchemas.nonNegativeNumber,
      risk_tolerance: Joi.string().valid('conservative', 'moderate', 'aggressive'),
      investment_goals: Joi.array().items(Joi.string().valid('growth', 'income', 'preservation', 'speculation')),
      previous_violations: Joi.array().items(Joi.object({
        type: Joi.string().required(),
        description: Joi.string().required(),
        date: commonSchemas.date,
        resolved: Joi.boolean().default(false)
      }))
    }).required()
  }),

  updateOnboarding: Joi.object({
    user_data: Joi.object({
      first_name: Joi.string().min(1).max(100),
      last_name: Joi.string().min(1).max(100),
      email: commonSchemas.email,
      phone: commonSchemas.phone,
      date_of_birth: commonSchemas.date,
      country: Joi.string().length(2),
      state: Joi.string().min(1).max(100),
      city: Joi.string().min(1).max(100),
      address: Joi.string().min(1).max(500),
      postal_code: Joi.string().min(1).max(20),
      nationality: Joi.string().length(2),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
      marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'separated'),
      employment_status: Joi.string().valid('employed', 'self_employed', 'unemployed', 'retired', 'student'),
      income: commonSchemas.nonNegativeNumber,
      net_worth: commonSchemas.nonNegativeNumber,
      trading_experience: commonSchemas.nonNegativeNumber,
      risk_tolerance: Joi.string().valid('conservative', 'moderate', 'aggressive'),
      investment_goals: Joi.array().items(Joi.string().valid('growth', 'income', 'preservation', 'speculation')),
      previous_violations: Joi.array().items(Joi.object({
        type: Joi.string().required(),
        description: Joi.string().required(),
        date: commonSchemas.date,
        resolved: Joi.boolean().default(false)
      }))
    }).required()
  })
};

// Document verification validation schemas
const documentVerificationSchemas = {
  verifyDocuments: Joi.object({
    documents: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      type: Joi.string().required(),
      name: Joi.string().required(),
      size: commonSchemas.positiveNumber,
      content: Joi.string().base64(),
      metadata: Joi.object()
    })).min(1).required(),
    document_type: Joi.string().required(),
    user_id: commonSchemas.userId
  }),

  getVerification: Joi.object({
    verification_id: commonSchemas.id,
    user_id: commonSchemas.userId
  })
};

// Identity verification validation schemas
const identityVerificationSchemas = {
  verifyIdentity: Joi.object({
    identity_data: Joi.object({
      verification_method: Joi.string().valid(
        'biometric_verification',
        'knowledge_based_verification',
        'document_verification',
        'address_verification',
        'phone_verification',
        'email_verification',
        'social_verification',
        'government_verification'
      ).required(),
      biometric_data: Joi.object({
        type: Joi.string().valid('fingerprint', 'face', 'voice', 'iris').required(),
        data: Joi.string().required()
      }).when('verification_method', {
        is: 'biometric_verification',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      kba_answers: Joi.array().items(Joi.object({
        question: Joi.string().required(),
        answer: Joi.string().required(),
        is_correct: Joi.boolean().required()
      })).when('verification_method', {
        is: 'knowledge_based_verification',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      document_data: Joi.object({
        type: Joi.string().required(),
        number: Joi.string().required(),
        data: Joi.object().required()
      }).when('verification_method', {
        is: 'document_verification',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      address_data: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postal_code: Joi.string().required(),
        country: Joi.string().length(2).required()
      }).when('verification_method', {
        is: 'address_verification',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      phone_data: Joi.object({
        number: commonSchemas.phone,
        country_code: Joi.string().required()
      }).when('verification_method', {
        is: 'phone_verification',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      email_data: Joi.object({
        address: commonSchemas.email,
        verified: Joi.boolean().default(false)
      }).when('verification_method', {
        is: 'email_verification',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      social_data: Joi.object({
        platform: Joi.string().required(),
        profile_id: Joi.string().required(),
        data: Joi.object().required()
      }).when('verification_method', {
        is: 'social_verification',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      government_data: Joi.object({
        id: Joi.string().required(),
        type: Joi.string().required(),
        data: Joi.object().required()
      }).when('verification_method', {
        is: 'government_verification',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }).required(),
    verification_method: Joi.string().valid(
      'biometric_verification',
      'knowledge_based_verification',
      'document_verification',
      'address_verification',
      'phone_verification',
      'email_verification',
      'social_verification',
      'government_verification'
    ).required(),
    user_id: commonSchemas.userId
  }),

  getVerification: Joi.object({
    verification_id: commonSchemas.id,
    user_id: commonSchemas.userId
  })
};

// Risk assessment validation schemas
const riskAssessmentSchemas = {
  assessRisk: Joi.object({
    user_data: Joi.object({
      age: commonSchemas.positiveNumber,
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
      marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'separated'),
      education: Joi.string().valid('high_school', 'bachelor', 'master', 'doctorate', 'other'),
      income: commonSchemas.nonNegativeNumber,
      employment_status: Joi.string().valid('employed', 'self_employed', 'unemployed', 'retired', 'student'),
      credit_score: Joi.number().min(300).max(850),
      debt_to_income_ratio: Joi.number().min(0).max(1),
      trading_experience: commonSchemas.nonNegativeNumber,
      risk_tolerance: Joi.string().valid('conservative', 'moderate', 'aggressive'),
      investment_goals: Joi.array().items(Joi.string().valid('growth', 'income', 'preservation', 'speculation')),
      previous_violations: Joi.array().items(Joi.object({
        type: Joi.string().required(),
        description: Joi.string().required(),
        date: commonSchemas.date,
        resolved: Joi.boolean().default(false)
      })),
      country: Joi.string().length(2),
      state: Joi.string().min(1).max(100),
      city: Joi.string().min(1).max(100),
      document_quality: Joi.string().valid('excellent', 'good', 'fair', 'poor'),
      document_authenticity: Joi.string().valid('verified', 'suspicious', 'fraudulent'),
      document_completeness: Joi.string().valid('complete', 'incomplete', 'missing'),
      identity_verification: Joi.string().valid('verified', 'pending', 'failed'),
      identity_consistency: Joi.string().valid('consistent', 'inconsistent', 'unknown'),
      identity_history: Joi.string().valid('clean', 'suspicious', 'fraudulent'),
      transaction_frequency: commonSchemas.nonNegativeNumber,
      transaction_amount: commonSchemas.nonNegativeNumber,
      transaction_pattern: Joi.string().valid('normal', 'suspicious', 'fraudulent'),
      regulatory_compliance: Joi.string().valid('compliant', 'non_compliant', 'unknown'),
      sanctions_check: Joi.string().valid('clear', 'flagged', 'unknown'),
      aml_check: Joi.string().valid('clear', 'flagged', 'unknown'),
      compliance_checks: Joi.object().pattern(Joi.string(), Joi.boolean())
    }).required(),
    assessment_type: Joi.string().valid('kyc', 'aml', 'fraud', 'compliance').required(),
    user_id: commonSchemas.userId
  }),

  getAssessment: Joi.object({
    assessment_id: commonSchemas.id,
    user_id: commonSchemas.userId
  })
};

// Tier assignment validation schemas
const tierAssignmentSchemas = {
  assignTier: Joi.object({
    user_data: Joi.object().required(),
    risk_assessment: Joi.object().required(),
    document_verification: Joi.object().required(),
    identity_verification: Joi.object().required(),
    user_id: commonSchemas.userId
  }),

  getAssignment: Joi.object({
    assignment_id: commonSchemas.id,
    user_id: commonSchemas.userId
  })
};

// Compliance check validation schemas
const complianceCheckSchemas = {
  checkCompliance: Joi.object({
    user_data: Joi.object().required(),
    risk_assessment: Joi.object().required(),
    document_verification: Joi.object().required(),
    identity_verification: Joi.object().required(),
    user_id: commonSchemas.userId
  }),

  getCheck: Joi.object({
    check_id: commonSchemas.id,
    user_id: commonSchemas.userId
  })
};

// Progress tracking validation schemas
const progressTrackingSchemas = {
  startTracking: Joi.object({
    user_id: commonSchemas.userId,
    workflow_id: commonSchemas.id,
    user_data: Joi.object().required()
  }),

  getTracker: Joi.object({
    tracker_id: commonSchemas.id,
    user_id: commonSchemas.userId
  })
};

// Query parameter validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort_by: Joi.string().default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  dateRange: Joi.object({
    start_date: commonSchemas.date,
    end_date: commonSchemas.date
  }),

  statusFilter: Joi.object({
    status: commonSchemas.status
  }),

  riskLevelFilter: Joi.object({
    risk_level: commonSchemas.riskLevel
  }),

  tierFilter: Joi.object({
    tier: commonSchemas.tier
  })
};

// Export validation functions
module.exports = {
  validate,
  commonSchemas,
  onboardingSchemas,
  documentVerificationSchemas,
  identityVerificationSchemas,
  riskAssessmentSchemas,
  tierAssignmentSchemas,
  complianceCheckSchemas,
  progressTrackingSchemas,
  querySchemas
};
