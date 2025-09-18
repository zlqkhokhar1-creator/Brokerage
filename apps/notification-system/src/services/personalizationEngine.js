const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('./logger');
const { pool } = require('./database');
const Redis = require('ioredis');

class PersonalizationEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.userProfiles = new Map();
    this.personalizationRules = new Map();
    this.behaviorPatterns = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load user profiles
      await this.loadUserProfiles();
      
      // Load personalization rules
      await this.loadPersonalizationRules();
      
      // Load behavior patterns
      await this.loadBehaviorPatterns();
      
      this._initialized = true;
      logger.info('PersonalizationEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PersonalizationEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('PersonalizationEngine closed');
    } catch (error) {
      logger.error('Error closing PersonalizationEngine:', error);
    }
  }

  async loadUserProfiles() {
    try {
      const result = await pool.query(`
        SELECT * FROM user_profiles
        WHERE is_active = true
        ORDER BY updated_at DESC
        LIMIT 1000
      `);
      
      for (const profile of result.rows) {
        this.userProfiles.set(profile.user_id, {
          ...profile,
          preferences: profile.preferences ? JSON.parse(profile.preferences) : {},
          behavior_data: profile.behavior_data ? JSON.parse(profile.behavior_data) : {},
          demographics: profile.demographics ? JSON.parse(profile.demographics) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} user profiles`);
    } catch (error) {
      logger.error('Error loading user profiles:', error);
      throw error;
    }
  }

  async loadPersonalizationRules() {
    try {
      const result = await pool.query(`
        SELECT * FROM personalization_rules
        WHERE is_active = true
        ORDER BY priority ASC
      `);
      
      for (const rule of result.rows) {
        this.personalizationRules.set(rule.id, {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : []
        });
      }
      
      logger.info(`Loaded ${result.rows.length} personalization rules`);
    } catch (error) {
      logger.error('Error loading personalization rules:', error);
      throw error;
    }
  }

  async loadBehaviorPatterns() {
    try {
      const result = await pool.query(`
        SELECT * FROM behavior_patterns
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
      `);
      
      for (const pattern of result.rows) {
        this.behaviorPatterns.set(pattern.id, {
          ...pattern,
          pattern_data: pattern.pattern_data ? JSON.parse(pattern.pattern_data) : {}
        });
      }
      
      logger.info(`Loaded ${result.rows.length} behavior patterns`);
    } catch (error) {
      logger.error('Error loading behavior patterns:', error);
      throw error;
    }
  }

  async analyzeUser(userId, behaviorData, preferences, analyzerId) {
    try {
      const analysisId = nanoid();
      const now = new Date();
      
      // Get or create user profile
      let userProfile = this.userProfiles.get(userId);
      if (!userProfile) {
        userProfile = await this.createUserProfile(userId);
      }
      
      // Update behavior data
      await this.updateBehaviorData(userId, behaviorData);
      
      // Update preferences
      await this.updatePreferences(userId, preferences);
      
      // Analyze behavior patterns
      const behaviorAnalysis = await this.analyzeBehaviorPatterns(userId, behaviorData);
      
      // Generate personalization recommendations
      const recommendations = await this.generatePersonalizationRecommendations(
        userId, userProfile, behaviorAnalysis
      );
      
      // Create analysis result
      const analysis = {
        id: analysisId,
        user_id: userId,
        behavior_analysis: behaviorAnalysis,
        recommendations: recommendations,
        personalization_score: this.calculatePersonalizationScore(behaviorAnalysis),
        created_by: analyzerId,
        created_at: now
      };
      
      // Store analysis
      await this.storeAnalysis(analysis);
      
      // Emit event
      this.emit('userAnalyzed', analysis);
      
      logger.info(`User analyzed: ${userId}`, {
        analysisId,
        personalizationScore: analysis.personalization_score
      });
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing user:', error);
      throw error;
    }
  }

  async getPersonalization(userId, analyzerId) {
    try {
      // Check cache first
      if (this.userProfiles.has(userId)) {
        const profile = this.userProfiles.get(userId);
        return {
          user_id: userId,
          profile: profile,
          personalization_rules: Array.from(this.personalizationRules.values()),
          behavior_patterns: Array.from(this.behaviorPatterns.values())
        };
      }
      
      // Load from database
      const result = await pool.query(`
        SELECT * FROM user_profiles
        WHERE user_id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User profile not found');
      }
      
      const profile = {
        ...result.rows[0],
        preferences: result.rows[0].preferences ? JSON.parse(result.rows[0].preferences) : {},
        behavior_data: result.rows[0].behavior_data ? JSON.parse(result.rows[0].behavior_data) : {},
        demographics: result.rows[0].demographics ? JSON.parse(result.rows[0].demographics) : {}
      };
      
      // Cache profile
      this.userProfiles.set(userId, profile);
      
      return {
        user_id: userId,
        profile: profile,
        personalization_rules: Array.from(this.personalizationRules.values()),
        behavior_patterns: Array.from(this.behaviorPatterns.values())
      };
    } catch (error) {
      logger.error('Error getting personalization:', error);
      throw error;
    }
  }

  async createUserProfile(userId) {
    try {
      const profileId = nanoid();
      const now = new Date();
      
      const profile = {
        id: profileId,
        user_id: userId,
        preferences: {},
        behavior_data: {},
        demographics: {},
        personalization_score: 0,
        is_active: true,
        created_at: now,
        updated_at: now
      };
      
      // Store profile
      await pool.query(`
        INSERT INTO user_profiles (
          id, user_id, preferences, behavior_data, demographics,
          personalization_score, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        profileId, userId, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}),
        0, true, now, now
      ]);
      
      // Cache profile
      this.userProfiles.set(userId, profile);
      
      logger.info(`User profile created: ${userId}`);
      
      return profile;
    } catch (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  async updateBehaviorData(userId, behaviorData) {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }
      
      // Merge behavior data
      const updatedBehaviorData = {
        ...profile.behavior_data,
        ...behaviorData,
        last_updated: new Date().toISOString()
      };
      
      // Update database
      await pool.query(`
        UPDATE user_profiles
        SET behavior_data = $1, updated_at = $2
        WHERE user_id = $3
      `, [JSON.stringify(updatedBehaviorData), new Date(), userId]);
      
      // Update cache
      profile.behavior_data = updatedBehaviorData;
      profile.updated_at = new Date();
      this.userProfiles.set(userId, profile);
      
      logger.debug(`Behavior data updated for user: ${userId}`);
    } catch (error) {
      logger.error('Error updating behavior data:', error);
      throw error;
    }
  }

  async updatePreferences(userId, preferences) {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }
      
      // Merge preferences
      const updatedPreferences = {
        ...profile.preferences,
        ...preferences,
        last_updated: new Date().toISOString()
      };
      
      // Update database
      await pool.query(`
        UPDATE user_profiles
        SET preferences = $1, updated_at = $2
        WHERE user_id = $3
      `, [JSON.stringify(updatedPreferences), new Date(), userId]);
      
      // Update cache
      profile.preferences = updatedPreferences;
      profile.updated_at = new Date();
      this.userProfiles.set(userId, profile);
      
      logger.debug(`Preferences updated for user: ${userId}`);
    } catch (error) {
      logger.error('Error updating preferences:', error);
      throw error;
    }
  }

  async analyzeBehaviorPatterns(userId, behaviorData) {
    try {
      const analysis = {
        engagement_patterns: this.analyzeEngagementPatterns(behaviorData),
        communication_preferences: this.analyzeCommunicationPreferences(behaviorData),
        timing_preferences: this.analyzeTimingPreferences(behaviorData),
        content_preferences: this.analyzeContentPreferences(behaviorData),
        channel_preferences: this.analyzeChannelPreferences(behaviorData)
      };
      
      // Store behavior pattern
      await this.storeBehaviorPattern(userId, analysis);
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing behavior patterns:', error);
      return {};
    }
  }

  analyzeEngagementPatterns(behaviorData) {
    try {
      const patterns = {
        response_rate: 0,
        engagement_frequency: 'low',
        preferred_content_types: [],
        peak_engagement_times: []
      };
      
      if (behaviorData.notifications) {
        const notifications = behaviorData.notifications;
        const total = notifications.length;
        const responded = notifications.filter(n => n.responded).length;
        
        patterns.response_rate = total > 0 ? (responded / total) * 100 : 0;
        patterns.engagement_frequency = this.calculateEngagementFrequency(notifications);
        patterns.preferred_content_types = this.extractPreferredContentTypes(notifications);
        patterns.peak_engagement_times = this.extractPeakEngagementTimes(notifications);
      }
      
      return patterns;
    } catch (error) {
      logger.error('Error analyzing engagement patterns:', error);
      return {};
    }
  }

  analyzeCommunicationPreferences(behaviorData) {
    try {
      const preferences = {
        preferred_language: 'en',
        tone_preference: 'neutral',
        length_preference: 'medium',
        format_preference: 'text'
      };
      
      if (behaviorData.communication_history) {
        const history = behaviorData.communication_history;
        
        // Analyze language preferences
        const languages = history.map(c => c.language).filter(Boolean);
        if (languages.length > 0) {
          preferences.preferred_language = this.getMostFrequent(languages);
        }
        
        // Analyze tone preferences
        const tones = history.map(c => c.tone).filter(Boolean);
        if (tones.length > 0) {
          preferences.tone_preference = this.getMostFrequent(tones);
        }
        
        // Analyze length preferences
        const lengths = history.map(c => c.length).filter(Boolean);
        if (lengths.length > 0) {
          preferences.length_preference = this.getMostFrequent(lengths);
        }
        
        // Analyze format preferences
        const formats = history.map(c => c.format).filter(Boolean);
        if (formats.length > 0) {
          preferences.format_preference = this.getMostFrequent(formats);
        }
      }
      
      return preferences;
    } catch (error) {
      logger.error('Error analyzing communication preferences:', error);
      return {};
    }
  }

  analyzeTimingPreferences(behaviorData) {
    try {
      const preferences = {
        preferred_hours: [],
        preferred_days: [],
        timezone: 'UTC',
        frequency_preference: 'daily'
      };
      
      if (behaviorData.notifications) {
        const notifications = behaviorData.notifications;
        
        // Extract preferred hours
        const hours = notifications.map(n => new Date(n.timestamp).getHours());
        preferences.preferred_hours = this.getMostFrequentHours(hours);
        
        // Extract preferred days
        const days = notifications.map(n => new Date(n.timestamp).getDay());
        preferences.preferred_days = this.getMostFrequentDays(days);
        
        // Extract timezone
        const timezones = notifications.map(n => n.timezone).filter(Boolean);
        if (timezones.length > 0) {
          preferences.timezone = this.getMostFrequent(timezones);
        }
        
        // Calculate frequency preference
        preferences.frequency_preference = this.calculateFrequencyPreference(notifications);
      }
      
      return preferences;
    } catch (error) {
      logger.error('Error analyzing timing preferences:', error);
      return {};
    }
  }

  analyzeContentPreferences(behaviorData) {
    try {
      const preferences = {
        preferred_topics: [],
        preferred_categories: [],
        content_length_preference: 'medium',
        media_preference: 'text'
      };
      
      if (behaviorData.content_interactions) {
        const interactions = behaviorData.content_interactions;
        
        // Extract preferred topics
        const topics = interactions.map(i => i.topic).filter(Boolean);
        preferences.preferred_topics = this.getMostFrequent(topics, 5);
        
        // Extract preferred categories
        const categories = interactions.map(i => i.category).filter(Boolean);
        preferences.preferred_categories = this.getMostFrequent(categories, 5);
        
        // Analyze content length preferences
        const lengths = interactions.map(i => i.content_length).filter(Boolean);
        if (lengths.length > 0) {
          preferences.content_length_preference = this.getMostFrequent(lengths);
        }
        
        // Analyze media preferences
        const media = interactions.map(i => i.media_type).filter(Boolean);
        if (media.length > 0) {
          preferences.media_preference = this.getMostFrequent(media);
        }
      }
      
      return preferences;
    } catch (error) {
      logger.error('Error analyzing content preferences:', error);
      return {};
    }
  }

  analyzeChannelPreferences(behaviorData) {
    try {
      const preferences = {
        preferred_channels: [],
        channel_effectiveness: {},
        channel_usage_patterns: {}
      };
      
      if (behaviorData.channel_interactions) {
        const interactions = behaviorData.channel_interactions;
        
        // Extract preferred channels
        const channels = interactions.map(i => i.channel).filter(Boolean);
        preferences.preferred_channels = this.getMostFrequent(channels, 3);
        
        // Calculate channel effectiveness
        for (const channel of preferences.preferred_channels) {
          const channelInteractions = interactions.filter(i => i.channel === channel);
          const total = channelInteractions.length;
          const successful = channelInteractions.filter(i => i.successful).length;
          
          preferences.channel_effectiveness[channel] = {
            total_interactions: total,
            success_rate: total > 0 ? (successful / total) * 100 : 0,
            avg_response_time: this.calculateAverageResponseTime(channelInteractions)
          };
        }
        
        // Analyze usage patterns
        preferences.channel_usage_patterns = this.analyzeChannelUsagePatterns(interactions);
      }
      
      return preferences;
    } catch (error) {
      logger.error('Error analyzing channel preferences:', error);
      return {};
    }
  }

  async generatePersonalizationRecommendations(userId, userProfile, behaviorAnalysis) {
    try {
      const recommendations = [];
      
      // Generate content recommendations
      const contentRecommendations = this.generateContentRecommendations(behaviorAnalysis);
      if (contentRecommendations.length > 0) {
        recommendations.push({
          type: 'content',
          recommendations: contentRecommendations
        });
      }
      
      // Generate timing recommendations
      const timingRecommendations = this.generateTimingRecommendations(behaviorAnalysis);
      if (timingRecommendations.length > 0) {
        recommendations.push({
          type: 'timing',
          recommendations: timingRecommendations
        });
      }
      
      // Generate channel recommendations
      const channelRecommendations = this.generateChannelRecommendations(behaviorAnalysis);
      if (channelRecommendations.length > 0) {
        recommendations.push({
          type: 'channels',
          recommendations: channelRecommendations
        });
      }
      
      // Generate frequency recommendations
      const frequencyRecommendations = this.generateFrequencyRecommendations(behaviorAnalysis);
      if (frequencyRecommendations.length > 0) {
        recommendations.push({
          type: 'frequency',
          recommendations: frequencyRecommendations
        });
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating personalization recommendations:', error);
      return [];
    }
  }

  generateContentRecommendations(behaviorAnalysis) {
    try {
      const recommendations = [];
      
      if (behaviorAnalysis.content_preferences) {
        const { preferred_topics, preferred_categories } = behaviorAnalysis.content_preferences;
        
        if (preferred_topics.length > 0) {
          recommendations.push({
            type: 'topic_preference',
            value: preferred_topics,
            confidence: 0.8
          });
        }
        
        if (preferred_categories.length > 0) {
          recommendations.push({
            type: 'category_preference',
            value: preferred_categories,
            confidence: 0.7
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating content recommendations:', error);
      return [];
    }
  }

  generateTimingRecommendations(behaviorAnalysis) {
    try {
      const recommendations = [];
      
      if (behaviorAnalysis.timing_preferences) {
        const { preferred_hours, preferred_days, timezone } = behaviorAnalysis.timing_preferences;
        
        if (preferred_hours.length > 0) {
          recommendations.push({
            type: 'optimal_hours',
            value: preferred_hours,
            confidence: 0.9
          });
        }
        
        if (preferred_days.length > 0) {
          recommendations.push({
            type: 'optimal_days',
            value: preferred_days,
            confidence: 0.8
          });
        }
        
        if (timezone) {
          recommendations.push({
            type: 'timezone',
            value: timezone,
            confidence: 1.0
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating timing recommendations:', error);
      return [];
    }
  }

  generateChannelRecommendations(behaviorAnalysis) {
    try {
      const recommendations = [];
      
      if (behaviorAnalysis.channel_preferences) {
        const { preferred_channels, channel_effectiveness } = behaviorAnalysis.channel_preferences;
        
        if (preferred_channels.length > 0) {
          recommendations.push({
            type: 'preferred_channels',
            value: preferred_channels,
            confidence: 0.8
          });
        }
        
        if (Object.keys(channel_effectiveness).length > 0) {
          recommendations.push({
            type: 'channel_effectiveness',
            value: channel_effectiveness,
            confidence: 0.7
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating channel recommendations:', error);
      return [];
    }
  }

  generateFrequencyRecommendations(behaviorAnalysis) {
    try {
      const recommendations = [];
      
      if (behaviorAnalysis.timing_preferences) {
        const { frequency_preference } = behaviorAnalysis.timing_preferences;
        
        if (frequency_preference) {
          recommendations.push({
            type: 'frequency_preference',
            value: frequency_preference,
            confidence: 0.6
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating frequency recommendations:', error);
      return [];
    }
  }

  calculatePersonalizationScore(behaviorAnalysis) {
    try {
      let score = 0;
      let factors = 0;
      
      // Engagement patterns score
      if (behaviorAnalysis.engagement_patterns) {
        const { response_rate } = behaviorAnalysis.engagement_patterns;
        score += Math.min(response_rate, 100);
        factors++;
      }
      
      // Communication preferences score
      if (behaviorAnalysis.communication_preferences) {
        score += 50; // Base score for having preferences
        factors++;
      }
      
      // Timing preferences score
      if (behaviorAnalysis.timing_preferences) {
        const { preferred_hours, preferred_days } = behaviorAnalysis.timing_preferences;
        if (preferred_hours.length > 0) score += 25;
        if (preferred_days.length > 0) score += 25;
        factors++;
      }
      
      // Content preferences score
      if (behaviorAnalysis.content_preferences) {
        const { preferred_topics, preferred_categories } = behaviorAnalysis.content_preferences;
        if (preferred_topics.length > 0) score += 25;
        if (preferred_categories.length > 0) score += 25;
        factors++;
      }
      
      // Channel preferences score
      if (behaviorAnalysis.channel_preferences) {
        const { preferred_channels } = behaviorAnalysis.channel_preferences;
        if (preferred_channels.length > 0) score += 25;
        factors++;
      }
      
      return factors > 0 ? Math.round(score / factors) : 0;
    } catch (error) {
      logger.error('Error calculating personalization score:', error);
      return 0;
    }
  }

  async storeAnalysis(analysis) {
    try {
      await pool.query(`
        INSERT INTO personalization_analyses (
          id, user_id, behavior_analysis, recommendations, personalization_score,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        analysis.id,
        analysis.user_id,
        JSON.stringify(analysis.behavior_analysis),
        JSON.stringify(analysis.recommendations),
        analysis.personalization_score,
        analysis.created_by,
        analysis.created_at
      ]);
    } catch (error) {
      logger.error('Error storing analysis:', error);
      throw error;
    }
  }

  async storeBehaviorPattern(userId, analysis) {
    try {
      const patternId = nanoid();
      const now = new Date();
      
      await pool.query(`
        INSERT INTO behavior_patterns (
          id, user_id, pattern_data, created_at
        ) VALUES ($1, $2, $3, $4)
      `, [
        patternId,
        userId,
        JSON.stringify(analysis),
        now
      ]);
      
      // Cache pattern
      this.behaviorPatterns.set(patternId, {
        id: patternId,
        user_id: userId,
        pattern_data: analysis,
        created_at: now
      });
    } catch (error) {
      logger.error('Error storing behavior pattern:', error);
      throw error;
    }
  }

  // Helper methods
  calculateEngagementFrequency(notifications) {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentNotifications = notifications.filter(n => new Date(n.timestamp) > oneWeekAgo);
      
      if (recentNotifications.length === 0) return 'low';
      if (recentNotifications.length < 3) return 'low';
      if (recentNotifications.length < 7) return 'medium';
      return 'high';
    } catch (error) {
      logger.error('Error calculating engagement frequency:', error);
      return 'low';
    }
  }

  extractPreferredContentTypes(notifications) {
    try {
      const contentTypes = notifications.map(n => n.content_type).filter(Boolean);
      return this.getMostFrequent(contentTypes, 3);
    } catch (error) {
      logger.error('Error extracting preferred content types:', error);
      return [];
    }
  }

  extractPeakEngagementTimes(notifications) {
    try {
      const hours = notifications.map(n => new Date(n.timestamp).getHours());
      return this.getMostFrequentHours(hours);
    } catch (error) {
      logger.error('Error extracting peak engagement times:', error);
      return [];
    }
  }

  getMostFrequent(array, limit = 1) {
    try {
      const frequency = {};
      array.forEach(item => {
        frequency[item] = (frequency[item] || 0) + 1;
      });
      
      return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([item]) => item);
    } catch (error) {
      logger.error('Error getting most frequent items:', error);
      return [];
    }
  }

  getMostFrequentHours(hours) {
    try {
      const frequency = {};
      hours.forEach(hour => {
        frequency[hour] = (frequency[hour] || 0) + 1;
      });
      
      return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));
    } catch (error) {
      logger.error('Error getting most frequent hours:', error);
      return [];
    }
  }

  getMostFrequentDays(days) {
    try {
      const frequency = {};
      days.forEach(day => {
        frequency[day] = (frequency[day] || 0) + 1;
      });
      
      return Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([day]) => parseInt(day));
    } catch (error) {
      logger.error('Error getting most frequent days:', error);
      return [];
    }
  }

  calculateFrequencyPreference(notifications) {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentNotifications = notifications.filter(n => new Date(n.timestamp) > oneWeekAgo);
      
      if (recentNotifications.length === 0) return 'weekly';
      if (recentNotifications.length < 3) return 'weekly';
      if (recentNotifications.length < 7) return 'daily';
      return 'multiple_daily';
    } catch (error) {
      logger.error('Error calculating frequency preference:', error);
      return 'weekly';
    }
  }

  calculateAverageResponseTime(interactions) {
    try {
      const responseTimes = interactions
        .map(i => i.response_time)
        .filter(rt => rt && rt > 0);
      
      if (responseTimes.length === 0) return 0;
      
      return responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    } catch (error) {
      logger.error('Error calculating average response time:', error);
      return 0;
    }
  }

  analyzeChannelUsagePatterns(interactions) {
    try {
      const patterns = {};
      
      interactions.forEach(interaction => {
        const channel = interaction.channel;
        if (!patterns[channel]) {
          patterns[channel] = {
            total_usage: 0,
            successful_usage: 0,
            avg_response_time: 0
          };
        }
        
        patterns[channel].total_usage++;
        if (interaction.successful) {
          patterns[channel].successful_usage++;
        }
      });
      
      // Calculate success rates and average response times
      Object.keys(patterns).forEach(channel => {
        const pattern = patterns[channel];
        pattern.success_rate = pattern.total_usage > 0 ? 
          (pattern.successful_usage / pattern.total_usage) * 100 : 0;
      });
      
      return patterns;
    } catch (error) {
      logger.error('Error analyzing channel usage patterns:', error);
      return {};
    }
  }
}

module.exports = PersonalizationEngine;
