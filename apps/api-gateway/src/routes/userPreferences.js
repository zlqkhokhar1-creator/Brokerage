const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware');
const userPreferencesService = require('../services/userPreferencesService');
const { logger } = require('../utils/logger');

/**
 * @route GET /api/user/ui-preferences
 * @desc Get user's UI preferences
 * @access Private
 */
router.get('/ui-preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await userPreferencesService.getUIPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Failed to get UI preferences', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user preferences'
    });
  }
});

/**
 * @route POST /api/user/ui-preferences
 * @desc Save user's UI preferences
 * @access Private
 */
router.post('/ui-preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({
        success: false,
        message: 'Preferences data is required'
      });
    }

    const result = await userPreferencesService.saveUIPreferences(userId, preferences);

    res.json({
      success: true,
      data: result,
      message: 'Preferences saved successfully'
    });
  } catch (error) {
    logger.error('Failed to save UI preferences', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to save user preferences'
    });
  }
});

/**
 * @route PUT /api/user/ui-preferences
 * @desc Update user's UI preferences (partial update)
 * @access Private
 */
router.put('/ui-preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates data is required'
      });
    }

    const result = await userPreferencesService.updateUIPreferences(userId, updates);

    res.json({
      success: true,
      data: result,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update UI preferences', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update user preferences'
    });
  }
});

/**
 * @route DELETE /api/user/ui-preferences
 * @desc Reset user's UI preferences to defaults
 * @access Private
 */
router.delete('/ui-preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await userPreferencesService.resetUIPreferences(userId);

    res.json({
      success: true,
      data: result,
      message: 'Preferences reset to defaults successfully'
    });
  } catch (error) {
    logger.error('Failed to reset UI preferences', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to reset user preferences'
    });
  }
});

/**
 * @route GET /api/user/ui-preferences/defaults
 * @desc Get default UI preferences
 * @access Public
 */
router.get('/ui-preferences/defaults', (req, res) => {
  try {
    const defaults = userPreferencesService.getDefaultUIPreferences();

    res.json({
      success: true,
      data: {
        preferences: defaults,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Failed to get default preferences', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve default preferences'
    });
  }
});

module.exports = router;