const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

class OnboardingFlowService extends EventEmitter {
  constructor() {
    super();
    this.steps = {
      // Core steps (required)
      'welcome': { required: true, order: 1, name: 'Welcome & Introduction' },
      'personal_info': { required: true, order: 2, name: 'Personal Information' },
      'identity_verification': { required: true, order: 3, name: 'Identity Verification' },
      'risk_assessment': { required: true, order: 4, name: 'Risk Assessment' },
      'terms_acceptance': { required: true, order: 5, name: 'Terms & Conditions' },
      
      // Optional steps
      'cash_account_setup': { required: false, order: 6, name: 'Cash Account Setup' },
      'bank_account_linking': { required: false, order: 7, name: 'Bank Account Linking' },
      'payment_method_setup': { required: false, order: 8, name: 'Payment Method Setup' },
      
      // Trading setup (can be done later)
      'trading_preferences': { required: false, order: 9, name: 'Trading Preferences' },
      'watchlist_setup': { required: false, order: 10, name: 'Watchlist Setup' },
      'notification_preferences': { required: false, order: 11, name: 'Notification Preferences' },
      
      // Completion
      'onboarding_complete': { required: true, order: 12, name: 'Onboarding Complete' }
    };
    
    this.activeOnboardings = new Map();
  }

  // Start onboarding process
  async startOnboarding(userId, preferences = {}) {
    try {
      const onboardingId = uuidv4();
      
      const onboarding = {
        id: onboardingId,
        user_id: userId,
        status: 'in_progress',
        current_step: 'welcome',
        completed_steps: [],
        skipped_steps: [],
        preferences: {
          skip_cash_account: preferences.skip_cash_account || false,
          skip_bank_linking: preferences.skip_bank_linking || false,
          skip_trading_setup: preferences.skip_trading_setup || false,
          country: preferences.country || 'PK',
          user_type: preferences.user_type || 'individual'
        },
        progress: 0,
        started_at: new Date(),
        updated_at: new Date()
      };

      // Store onboarding session
      this.activeOnboardings.set(onboardingId, onboarding);
      
      // Save to database
      await this.saveOnboardingToDatabase(onboarding);
      
      // Emit event
      this.emit('onboardingStarted', onboarding);
      
      logger.info(`Onboarding started for user ${userId}`, { onboardingId });
      
      return onboarding;
    } catch (error) {
      logger.error('Error starting onboarding:', error);
      throw error;
    }
  }

  // Complete a step
  async completeStep(onboardingId, stepId, stepData, userId) {
    try {
      const onboarding = this.activeOnboardings.get(onboardingId);
      if (!onboarding) {
        throw new Error('Onboarding session not found');
      }

      if (onboarding.user_id !== userId) {
        throw new Error('Unauthorized access to onboarding session');
      }

      // Validate step
      if (!this.steps[stepId]) {
        throw new Error(`Invalid step: ${stepId}`);
      }

      // Check if step is required or optional
      const step = this.steps[stepId];
      const isRequired = step.required;
      const isSkippable = !isRequired;

      // Handle step completion
      if (stepData.action === 'skip' && isSkippable) {
        onboarding.skipped_steps.push(stepId);
        logger.info(`Step ${stepId} skipped for onboarding ${onboardingId}`);
      } else {
        onboarding.completed_steps.push({
          step_id: stepId,
          completed_at: new Date(),
          data: stepData
        });
        logger.info(`Step ${stepId} completed for onboarding ${onboardingId}`);
      }

      // Update current step
      onboarding.current_step = this.getNextStep(onboarding);
      onboarding.progress = this.calculateProgress(onboarding);
      onboarding.updated_at = new Date();

      // Update in memory
      this.activeOnboardings.set(onboardingId, onboarding);
      
      // Save to database
      await this.updateOnboardingInDatabase(onboarding);

      // Check if onboarding is complete
      if (onboarding.current_step === 'onboarding_complete') {
        await this.completeOnboarding(onboarding);
      }

      // Emit event
      this.emit('stepCompleted', { onboardingId, stepId, onboarding });
      
      return onboarding;
    } catch (error) {
      logger.error('Error completing step:', error);
      throw error;
    }
  }

  // Get next step based on preferences and completed steps
  getNextStep(onboarding) {
    const { preferences, completed_steps, skipped_steps } = onboarding;
    const allSteps = Object.keys(this.steps).sort((a, b) => this.steps[a].order - this.steps[b].order);
    
    for (const stepId of allSteps) {
      const step = this.steps[stepId];
      
      // Skip if already completed or skipped
      if (completed_steps.some(s => s.step_id === stepId) || 
          skipped_steps.includes(stepId)) {
        continue;
      }
      
      // Skip optional steps based on preferences
      if (!step.required) {
        if (stepId === 'cash_account_setup' && preferences.skip_cash_account) {
          continue;
        }
        if (stepId === 'bank_account_linking' && preferences.skip_bank_linking) {
          continue;
        }
        if (stepId === 'trading_preferences' && preferences.skip_trading_setup) {
          continue;
        }
        if (stepId === 'watchlist_setup' && preferences.skip_trading_setup) {
          continue;
        }
        if (stepId === 'notification_preferences' && preferences.skip_trading_setup) {
          continue;
        }
      }
      
      return stepId;
    }
    
    return 'onboarding_complete';
  }

  // Calculate progress percentage
  calculateProgress(onboarding) {
    const { preferences } = onboarding;
    const allSteps = Object.keys(this.steps);
    
    // Calculate total steps based on preferences
    let totalSteps = 0;
    for (const stepId of allSteps) {
      const step = this.steps[stepId];
      
      if (step.required) {
        totalSteps++;
      } else {
        // Check if optional step should be included
        if (stepId === 'cash_account_setup' && !preferences.skip_cash_account) {
          totalSteps++;
        } else if (stepId === 'bank_account_linking' && !preferences.skip_bank_linking) {
          totalSteps++;
        } else if (stepId === 'trading_preferences' && !preferences.skip_trading_setup) {
          totalSteps++;
        } else if (stepId === 'watchlist_setup' && !preferences.skip_trading_setup) {
          totalSteps++;
        } else if (stepId === 'notification_preferences' && !preferences.skip_trading_setup) {
          totalSteps++;
        }
      }
    }
    
    const completedSteps = onboarding.completed_steps.length + onboarding.skipped_steps.length;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  // Complete onboarding
  async completeOnboarding(onboarding) {
    try {
      onboarding.status = 'completed';
      onboarding.completed_at = new Date();
      onboarding.updated_at = new Date();
      
      // Update in memory
      this.activeOnboardings.set(onboarding.id, onboarding);
      
      // Save to database
      await this.updateOnboardingInDatabase(onboarding);
      
      // Create user profile based on completed steps
      await this.createUserProfile(onboarding);
      
      // Emit completion event
      this.emit('onboardingCompleted', onboarding);
      
      logger.info(`Onboarding completed for user ${onboarding.user_id}`, { 
        onboardingId: onboarding.id,
        completedSteps: onboarding.completed_steps.length,
        skippedSteps: onboarding.skipped_steps.length
      });
      
      return onboarding;
    } catch (error) {
      logger.error('Error completing onboarding:', error);
      throw error;
    }
  }

  // Create user profile based on onboarding data
  async createUserProfile(onboarding) {
    try {
      const { user_id, completed_steps, preferences } = onboarding;
      
      // Extract data from completed steps
      const personalInfo = this.extractStepData(completed_steps, 'personal_info');
      const identityVerification = this.extractStepData(completed_steps, 'identity_verification');
      const riskAssessment = this.extractStepData(completed_steps, 'risk_assessment');
      const cashAccountSetup = this.extractStepData(completed_steps, 'cash_account_setup');
      const tradingPreferences = this.extractStepData(completed_steps, 'trading_preferences');
      
      // Create user profile
      const userProfile = {
        user_id: user_id,
        country: preferences.country,
        user_type: preferences.user_type,
        personal_info: personalInfo,
        identity_verification: identityVerification,
        risk_assessment: riskAssessment,
        cash_account_setup: cashAccountSetup,
        trading_preferences: tradingPreferences,
        onboarding_completed_at: new Date(),
        profile_status: 'active'
      };
      
      // Save to database
      await this.saveUserProfile(userProfile);
      
      // If cash account was set up, create it
      if (cashAccountSetup && !preferences.skip_cash_account) {
        await this.createCashAccount(user_id, cashAccountSetup);
      }
      
      logger.info(`User profile created for user ${user_id}`);
      
      return userProfile;
    } catch (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Extract data from completed steps
  extractStepData(completedSteps, stepId) {
    const step = completedSteps.find(s => s.step_id === stepId);
    return step ? step.data : null;
  }

  // Save user profile to database
  async saveUserProfile(userProfile) {
    try {
      await pool.query(`
        INSERT INTO user_profiles (
          user_id, country, user_type, personal_info, identity_verification,
          risk_assessment, cash_account_setup, trading_preferences,
          onboarding_completed_at, profile_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id) DO UPDATE SET
          country = EXCLUDED.country,
          user_type = EXCLUDED.user_type,
          personal_info = EXCLUDED.personal_info,
          identity_verification = EXCLUDED.identity_verification,
          risk_assessment = EXCLUDED.risk_assessment,
          cash_account_setup = EXCLUDED.cash_account_setup,
          trading_preferences = EXCLUDED.trading_preferences,
          onboarding_completed_at = EXCLUDED.onboarding_completed_at,
          profile_status = EXCLUDED.profile_status,
          updated_at = CURRENT_TIMESTAMP
      `, [
        userProfile.user_id,
        userProfile.country,
        userProfile.user_type,
        JSON.stringify(userProfile.personal_info),
        JSON.stringify(userProfile.identity_verification),
        JSON.stringify(userProfile.risk_assessment),
        JSON.stringify(userProfile.cash_account_setup),
        JSON.stringify(userProfile.trading_preferences),
        userProfile.onboarding_completed_at,
        userProfile.profile_status
      ]);
    } catch (error) {
      logger.error('Error saving user profile:', error);
      throw error;
    }
  }

  // Create cash account
  async createCashAccount(userId, cashAccountData) {
    try {
      // This would integrate with the cash account management service
      const response = await fetch('http://localhost:3007/api/v1/accounts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getUserToken(userId)}`
        },
        body: JSON.stringify({
          base_currency: cashAccountData.base_currency || 'PKR',
          account_type: cashAccountData.account_type || 'individual',
          cnic: cashAccountData.cnic,
          iban: cashAccountData.iban
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create cash account');
      }
      
      const result = await response.json();
      logger.info(`Cash account created for user ${userId}`, { accountId: result.data.id });
      
      return result.data;
    } catch (error) {
      logger.error('Error creating cash account:', error);
      throw error;
    }
  }

  // Get user token (this would integrate with your auth system)
  getUserToken(userId) {
    // This is a placeholder - you would get the actual token from your auth system
    return 'user-token-placeholder';
  }

  // Database methods
  async saveOnboardingToDatabase(onboarding) {
    try {
      await pool.query(`
        INSERT INTO onboarding_sessions (
          id, user_id, status, current_step, completed_steps, skipped_steps,
          preferences, progress, started_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        onboarding.id,
        onboarding.user_id,
        onboarding.status,
        onboarding.current_step,
        JSON.stringify(onboarding.completed_steps),
        JSON.stringify(onboarding.skipped_steps),
        JSON.stringify(onboarding.preferences),
        onboarding.progress,
        onboarding.started_at,
        onboarding.updated_at
      ]);
    } catch (error) {
      logger.error('Error saving onboarding to database:', error);
      throw error;
    }
  }

  async updateOnboardingInDatabase(onboarding) {
    try {
      await pool.query(`
        UPDATE onboarding_sessions SET
          status = $1,
          current_step = $2,
          completed_steps = $3,
          skipped_steps = $4,
          progress = $5,
          updated_at = $6,
          completed_at = $7
        WHERE id = $8
      `, [
        onboarding.status,
        onboarding.current_step,
        JSON.stringify(onboarding.completed_steps),
        JSON.stringify(onboarding.skipped_steps),
        onboarding.progress,
        onboarding.updated_at,
        onboarding.completed_at,
        onboarding.id
      ]);
    } catch (error) {
      logger.error('Error updating onboarding in database:', error);
      throw error;
    }
  }

  // Get onboarding by ID
  async getOnboarding(onboardingId, userId) {
    try {
      const onboarding = this.activeOnboardings.get(onboardingId);
      if (!onboarding) {
        throw new Error('Onboarding session not found');
      }
      
      if (onboarding.user_id !== userId) {
        throw new Error('Unauthorized access to onboarding session');
      }
      
      return onboarding;
    } catch (error) {
      logger.error('Error getting onboarding:', error);
      throw error;
    }
  }

  // Get onboarding steps
  getOnboardingSteps() {
    return this.steps;
  }

  // Get step details
  getStepDetails(stepId) {
    return this.steps[stepId];
  }
}

module.exports = OnboardingFlowService;
