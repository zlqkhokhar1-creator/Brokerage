const { transaction } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Default UI preferences for new users
 */
const getDefaultUIPreferences = () => ({
  animations: {
    enabled: true,
    speed: 'normal', // 'slow', 'normal', 'fast'
    intensity: 'medium', // 'low', 'medium', 'high'
    reducedMotion: false
  },
  interactions: {
    rippleEffects: true,
    hoverGlow: true,
    buttonFeedback: true,
    floatingActionButton: true
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    screenReader: false,
    keyboardNavigation: true
  },
  notifications: {
    soundEnabled: true,
    vibrationEnabled: true,
    showPreviews: true
  },
  theme: {
    mode: 'system', // 'light', 'dark', 'system'
    colorScheme: 'blue'
  }
});

/**
 * Saves a user's UI preferences to the database
 * @param {string} userId - The user's UUID
 * @param {object} preferences - The UI preferences object
 * @returns {Promise<object>} The saved preferences
 */
const saveUIPreferences = async (userId, preferences) => {
  try {
    logger.info('Saving UI preferences for user', { userId });

    const { rows: [result] } = await transaction(client =>
      client.query(
        `INSERT INTO user_ui_preferences (user_id, preferences_json, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           preferences_json = EXCLUDED.preferences_json,
           updated_at = NOW()
         RETURNING preferences_json, updated_at`,
        [userId, JSON.stringify(preferences)]
      )
    );

    logger.info('UI preferences saved successfully', { userId });
    return {
      preferences: JSON.parse(result.preferences_json),
      updatedAt: result.updated_at
    };
  } catch (error) {
    logger.error('Failed to save UI preferences', { userId, error: error.message });
    throw new Error('Failed to save user preferences');
  }
};

/**
 * Retrieves a user's UI preferences from the database
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} The user's preferences or defaults
 */
const getUIPreferences = async (userId) => {
  try {
    logger.info('Retrieving UI preferences for user', { userId });

    const { rows } = await transaction(client =>
      client.query(
        'SELECT preferences_json, updated_at FROM user_ui_preferences WHERE user_id = $1',
        [userId]
      )
    );

    if (rows.length > 0) {
      logger.info('UI preferences found for user', { userId });
      return {
        preferences: JSON.parse(rows[0].preferences_json),
        updatedAt: rows[0].updated_at
      };
    } else {
      logger.info('No UI preferences found, returning defaults for user', { userId });
      const defaults = getDefaultUIPreferences();
      // Optionally save defaults for future use
      await saveUIPreferences(userId, defaults);
      return {
        preferences: defaults,
        updatedAt: new Date()
      };
    }
  } catch (error) {
    logger.error('Failed to retrieve UI preferences', { userId, error: error.message });
    // Return defaults on error
    return {
      preferences: getDefaultUIPreferences(),
      updatedAt: new Date()
    };
  }
};

/**
 * Updates specific UI preference fields
 * @param {string} userId - The user's UUID
 * @param {object} updates - Partial preferences to update
 * @returns {Promise<object>} The updated preferences
 */
const updateUIPreferences = async (userId, updates) => {
  try {
    logger.info('Updating UI preferences for user', { userId, updates });

    // First get current preferences
    const current = await getUIPreferences(userId);

    // Merge updates with current preferences
    const updatedPreferences = {
      ...current.preferences,
      ...updates,
      // Deep merge nested objects
      animations: { ...current.preferences.animations, ...updates.animations },
      interactions: { ...current.preferences.interactions, ...updates.interactions },
      accessibility: { ...current.preferences.accessibility, ...updates.accessibility },
      notifications: { ...current.preferences.notifications, ...updates.notifications },
      theme: { ...current.preferences.theme, ...updates.theme }
    };

    // Save updated preferences
    return await saveUIPreferences(userId, updatedPreferences);
  } catch (error) {
    logger.error('Failed to update UI preferences', { userId, updates, error: error.message });
    throw new Error('Failed to update user preferences');
  }
};

/**
 * Resets a user's UI preferences to defaults
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} The default preferences
 */
const resetUIPreferences = async (userId) => {
  try {
    logger.info('Resetting UI preferences to defaults for user', { userId });

    const defaults = getDefaultUIPreferences();
    return await saveUIPreferences(userId, defaults);
  } catch (error) {
    logger.error('Failed to reset UI preferences', { userId, error: error.message });
    throw new Error('Failed to reset user preferences');
  }
};

/**
 * Gets UI preferences for multiple users (admin function)
 * @param {string[]} userIds - Array of user UUIDs
 * @returns {Promise<object>} Preferences for each user
 */
const getBulkUIPreferences = async (userIds) => {
  try {
    logger.info('Retrieving bulk UI preferences', { count: userIds.length });

    const { rows } = await transaction(client =>
      client.query(
        'SELECT user_id, preferences_json, updated_at FROM user_ui_preferences WHERE user_id = ANY($1)',
        [userIds]
      )
    );

    const result = {};
    rows.forEach(row => {
      result[row.user_id] = {
        preferences: JSON.parse(row.preferences_json),
        updatedAt: row.updated_at
      };
    });

    // Fill in defaults for users without preferences
    userIds.forEach(userId => {
      if (!result[userId]) {
        result[userId] = {
          preferences: getDefaultUIPreferences(),
          updatedAt: new Date()
        };
      }
    });

    return result;
  } catch (error) {
    logger.error('Failed to retrieve bulk UI preferences', { error: error.message });
    throw new Error('Failed to retrieve bulk preferences');
  }
};

module.exports = {
  saveUIPreferences,
  getUIPreferences,
  updateUIPreferences,
  resetUIPreferences,
  getBulkUIPreferences,
  getDefaultUIPreferences
};