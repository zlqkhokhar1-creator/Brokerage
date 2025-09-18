const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

class ProductTourService extends EventEmitter {
  constructor() {
    super();
    this.tours = new Map();
    this.features = new Map();
    this.userProgress = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      await this.loadFeatures();
      await this.loadTours();
      this._initialized = true;
      logger.info('ProductTourService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ProductTourService:', error);
      throw error;
    }
  }

  // Load features from database
  async loadFeatures() {
    try {
      const result = await pool.query(`
        SELECT f.*, tf.is_enabled, tf.limits, mt.name as tier_name
        FROM features f
        LEFT JOIN tier_features tf ON f.id = tf.feature_id
        LEFT JOIN membership_tiers mt ON tf.tier_id = mt.id
        WHERE f.is_active = true
        ORDER BY f.category, f.name
      `);

      for (const feature of result.rows) {
        this.features.set(feature.id, {
          id: feature.id,
          name: feature.name,
          display_name: feature.display_name,
          description: feature.description,
          category: feature.category,
          is_enabled: feature.is_enabled || false,
          limits: feature.limits || {},
          tier_name: feature.tier_name,
          created_at: feature.created_at,
          updated_at: feature.updated_at
        });
      }

      logger.info(`Loaded ${this.features.size} features`);
    } catch (error) {
      logger.error('Error loading features:', error);
      throw error;
    }
  }

  // Load tours from database
  async loadTours() {
    try {
      const result = await pool.query(`
        SELECT * FROM product_tours 
        WHERE is_active = true 
        ORDER BY priority, created_at
      `);

      for (const tour of result.rows) {
        this.tours.set(tour.id, {
          id: tour.id,
          name: tour.name,
          description: tour.description,
          target_audience: tour.target_audience,
          steps: tour.steps,
          features: tour.features,
          priority: tour.priority,
          is_active: tour.is_active,
          created_at: tour.created_at,
          updated_at: tour.updated_at
        });
      }

      logger.info(`Loaded ${this.tours.size} product tours`);
    } catch (error) {
      logger.error('Error loading tours:', error);
      throw error;
    }
  }

  // Get personalized tour for user
  async getPersonalizedTour(userId, userTier = 'free') {
    try {
      const userFeatures = await this.getUserFeatures(userId, userTier);
      const availableTours = this.getAvailableTours(userFeatures, userTier);
      
      // Select the most appropriate tour
      const selectedTour = this.selectBestTour(availableTours, userTier);
      
      if (!selectedTour) {
        return null;
      }

      // Generate personalized steps based on user's features
      const personalizedSteps = this.generatePersonalizedSteps(selectedTour, userFeatures);
      
      return {
        tour_id: selectedTour.id,
        name: selectedTour.name,
        description: selectedTour.description,
        steps: personalizedSteps,
        estimated_duration: this.calculateDuration(personalizedSteps),
        features_covered: this.getFeaturesCovered(personalizedSteps)
      };
    } catch (error) {
      logger.error('Error getting personalized tour:', error);
      throw error;
    }
  }

  // Get user's available features based on tier
  async getUserFeatures(userId, userTier) {
    try {
      const result = await pool.query(`
        SELECT f.*, tf.is_enabled, tf.limits
        FROM features f
        JOIN tier_features tf ON f.id = tf.feature_id
        JOIN membership_tiers mt ON tf.tier_id = mt.id
        WHERE mt.name = $1 AND tf.is_enabled = true AND f.is_active = true
        ORDER BY f.category, f.name
      `, [userTier]);

      return result.rows.map(feature => ({
        id: feature.id,
        name: feature.name,
        display_name: feature.display_name,
        description: feature.description,
        category: feature.category,
        limits: feature.limits || {}
      }));
    } catch (error) {
      logger.error('Error getting user features:', error);
      throw error;
    }
  }

  // Get available tours for user's features
  getAvailableTours(userFeatures, userTier) {
    const availableTours = [];
    
    for (const [tourId, tour] of this.tours) {
      if (tour.target_audience.includes(userTier) || tour.target_audience.includes('all')) {
        // Check if user has access to tour's required features
        const hasRequiredFeatures = this.checkRequiredFeatures(tour.features, userFeatures);
        
        if (hasRequiredFeatures) {
          availableTours.push(tour);
        }
      }
    }
    
    return availableTours.sort((a, b) => b.priority - a.priority);
  }

  // Check if user has required features for tour
  checkRequiredFeatures(tourFeatures, userFeatures) {
    const userFeatureNames = userFeatures.map(f => f.name);
    
    for (const requiredFeature of tourFeatures) {
      if (!userFeatureNames.includes(requiredFeature)) {
        return false;
      }
    }
    
    return true;
  }

  // Select the best tour for user
  selectBestTour(availableTours, userTier) {
    if (availableTours.length === 0) {
      return null;
    }
    
    // Prioritize tours based on user tier and features
    const tierPriority = {
      'free': 1,
      'basic': 2,
      'premium': 3,
      'vip': 4
    };
    
    return availableTours.sort((a, b) => {
      const aTierMatch = a.target_audience.includes(userTier) ? tierPriority[userTier] : 0;
      const bTierMatch = b.target_audience.includes(userTier) ? tierPriority[userTier] : 0;
      
      if (aTierMatch !== bTierMatch) {
        return bTierMatch - aTierMatch;
      }
      
      return b.priority - a.priority;
    })[0];
  }

  // Generate personalized steps based on user's features
  generatePersonalizedSteps(tour, userFeatures) {
    const personalizedSteps = [];
    
    for (const step of tour.steps) {
      // Check if step's feature is available to user
      if (this.isFeatureAvailable(step.feature, userFeatures)) {
        personalizedSteps.push({
          id: step.id,
          title: step.title,
          description: step.description,
          feature: step.feature,
          action: step.action,
          target_element: step.target_element,
          position: step.position,
          duration: step.duration,
          interactive: step.interactive,
          skip_available: step.skip_available
        });
      }
    }
    
    return personalizedSteps;
  }

  // Check if feature is available to user
  isFeatureAvailable(featureName, userFeatures) {
    return userFeatures.some(f => f.name === featureName);
  }

  // Calculate tour duration
  calculateDuration(steps) {
    return steps.reduce((total, step) => total + (step.duration || 30), 0);
  }

  // Get features covered in tour
  getFeaturesCovered(steps) {
    const features = new Set();
    steps.forEach(step => {
      if (step.feature) {
        features.add(step.feature);
      }
    });
    return Array.from(features);
  }

  // Start tour for user
  async startTour(userId, tourId) {
    try {
      const tour = this.tours.get(tourId);
      if (!tour) {
        throw new Error('Tour not found');
      }

      const userProgress = {
        user_id: userId,
        tour_id: tourId,
        status: 'in_progress',
        current_step: 0,
        completed_steps: [],
        started_at: new Date(),
        updated_at: new Date()
      };

      this.userProgress.set(`${userId}_${tourId}`, userProgress);
      
      // Save to database
      await this.saveTourProgress(userProgress);
      
      // Emit event
      this.emit('tourStarted', { userId, tourId, tour });
      
      logger.info(`Tour started for user ${userId}`, { tourId });
      
      return userProgress;
    } catch (error) {
      logger.error('Error starting tour:', error);
      throw error;
    }
  }

  // Complete tour step
  async completeStep(userId, tourId, stepId) {
    try {
      const progressKey = `${userId}_${tourId}`;
      const userProgress = this.userProgress.get(progressKey);
      
      if (!userProgress) {
        throw new Error('Tour not found for user');
      }

      // Add step to completed steps
      userProgress.completed_steps.push({
        step_id: stepId,
        completed_at: new Date()
      });

      // Update current step
      userProgress.current_step = userProgress.completed_steps.length;
      userProgress.updated_at = new Date();

      // Update in memory
      this.userProgress.set(progressKey, userProgress);
      
      // Save to database
      await this.updateTourProgress(userProgress);
      
      // Check if tour is complete
      const tour = this.tours.get(tourId);
      if (userProgress.completed_steps.length >= tour.steps.length) {
        await this.completeTour(userId, tourId);
      }

      // Emit event
      this.emit('stepCompleted', { userId, tourId, stepId, userProgress });
      
      return userProgress;
    } catch (error) {
      logger.error('Error completing step:', error);
      throw error;
    }
  }

  // Complete tour
  async completeTour(userId, tourId) {
    try {
      const progressKey = `${userId}_${tourId}`;
      const userProgress = this.userProgress.get(progressKey);
      
      if (!userProgress) {
        throw new Error('Tour not found for user');
      }

      userProgress.status = 'completed';
      userProgress.completed_at = new Date();
      userProgress.updated_at = new Date();

      // Update in memory
      this.userProgress.set(progressKey, userProgress);
      
      // Save to database
      await this.updateTourProgress(userProgress);
      
      // Emit event
      this.emit('tourCompleted', { userId, tourId, userProgress });
      
      logger.info(`Tour completed for user ${userId}`, { tourId });
      
      return userProgress;
    } catch (error) {
      logger.error('Error completing tour:', error);
      throw error;
    }
  }

  // Add new feature to system
  async addFeature(featureData) {
    try {
      const featureId = uuidv4();
      
      const feature = {
        id: featureId,
        name: featureData.name,
        display_name: featureData.display_name,
        description: featureData.description,
        category: featureData.category,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Save to database
      await pool.query(`
        INSERT INTO features (id, name, display_name, description, category, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        feature.id,
        feature.name,
        feature.display_name,
        feature.description,
        feature.category,
        feature.is_active
      ]);

      // Add to memory
      this.features.set(featureId, feature);
      
      // Auto-generate tour step for new feature
      await this.autoGenerateTourStep(feature);
      
      // Emit event
      this.emit('featureAdded', feature);
      
      logger.info(`Feature added: ${feature.name}`, { featureId });
      
      return feature;
    } catch (error) {
      logger.error('Error adding feature:', error);
      throw error;
    }
  }

  // Auto-generate tour step for new feature
  async autoGenerateTourStep(feature) {
    try {
      // Create a default tour step for the new feature
      const tourStep = {
        id: uuidv4(),
        feature: feature.name,
        title: `Learn about ${feature.display_name}`,
        description: feature.description,
        action: 'click',
        target_element: `[data-feature="${feature.name}"]`,
        position: 'center',
        duration: 30,
        interactive: true,
        skip_available: true
      };

      // Add to default tour
      const defaultTour = this.getDefaultTour();
      if (defaultTour) {
        defaultTour.steps.push(tourStep);
        await this.updateTour(defaultTour);
      }

      logger.info(`Auto-generated tour step for feature: ${feature.name}`);
    } catch (error) {
      logger.error('Error auto-generating tour step:', error);
    }
  }

  // Get default tour
  getDefaultTour() {
    for (const [tourId, tour] of this.tours) {
      if (tour.name === 'Default Tour') {
        return tour;
      }
    }
    return null;
  }

  // Update tour
  async updateTour(tour) {
    try {
      await pool.query(`
        UPDATE product_tours SET
          steps = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(tour.steps), tour.id]);

      // Update in memory
      this.tours.set(tour.id, tour);
      
      logger.info(`Tour updated: ${tour.name}`);
    } catch (error) {
      logger.error('Error updating tour:', error);
      throw error;
    }
  }

  // Database methods
  async saveTourProgress(userProgress) {
    try {
      await pool.query(`
        INSERT INTO user_tour_progress (
          user_id, tour_id, status, current_step, completed_steps,
          started_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, tour_id) DO UPDATE SET
          status = EXCLUDED.status,
          current_step = EXCLUDED.current_step,
          completed_steps = EXCLUDED.completed_steps,
          updated_at = EXCLUDED.updated_at
      `, [
        userProgress.user_id,
        userProgress.tour_id,
        userProgress.status,
        userProgress.current_step,
        JSON.stringify(userProgress.completed_steps),
        userProgress.started_at,
        userProgress.updated_at
      ]);
    } catch (error) {
      logger.error('Error saving tour progress:', error);
      throw error;
    }
  }

  async updateTourProgress(userProgress) {
    try {
      await pool.query(`
        UPDATE user_tour_progress SET
          status = $1,
          current_step = $2,
          completed_steps = $3,
          updated_at = $4,
          completed_at = $5
        WHERE user_id = $6 AND tour_id = $7
      `, [
        userProgress.status,
        userProgress.current_step,
        JSON.stringify(userProgress.completed_steps),
        userProgress.updated_at,
        userProgress.completed_at,
        userProgress.user_id,
        userProgress.tour_id
      ]);
    } catch (error) {
      logger.error('Error updating tour progress:', error);
      throw error;
    }
  }

  // Get user's tour progress
  async getUserTourProgress(userId) {
    try {
      const result = await pool.query(`
        SELECT * FROM user_tour_progress 
        WHERE user_id = $1 
        ORDER BY updated_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user tour progress:', error);
      throw error;
    }
  }

  // Get all features
  getAllFeatures() {
    return Array.from(this.features.values());
  }

  // Get all tours
  getAllTours() {
    return Array.from(this.tours.values());
  }
}

module.exports = ProductTourService;
