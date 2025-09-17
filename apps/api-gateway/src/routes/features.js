const express = require('express');
const { transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/security');

const router = express.Router();

// Check feature access for current user
router.get('/check', authenticateToken, async (req, res) => {
  const { feature } = req.query;
  const userId = req.user.id;

  if (!feature) {
    return res.status(400).json({
      error: 'Missing feature parameter',
      message: 'Feature name is required'
    });
  }

  try {
    // Use the database function to check feature access
    const { rows: [accessData] } = await transaction(client =>
      client.query('SELECT * FROM check_feature_access($1, $2)', [userId, feature])
    );

    if (!accessData) {
      return res.json({
        hasAccess: false,
        userTier: 'free',
        limits: {},
        usageCount: 0,
        usageLimit: 0
      });
    }

    res.json({
      hasAccess: accessData.has_access,
      userTier: accessData.user_tier || 'free',
      limits: accessData.limits || {},
      usageCount: accessData.usage_count || 0,
      usageLimit: accessData.usage_limit || 0
    });

  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({
      error: 'Failed to check feature access',
      message: error.message
    });
  }
});

// Get all features available to current user
router.get('/available', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user's tier
    const { rows: [userTier] } = await transaction(client =>
      client.query('SELECT * FROM get_user_tier($1)', [userId])
    );

    if (!userTier) {
      return res.json({
        userTier: 'free',
        features: []
      });
    }

    // Get all features with access status
    const { rows: features } = await transaction(client =>
      client.query(`
        SELECT
          f.id,
          f.name,
          f.display_name,
          f.description,
          f.category,
          COALESCE(tf.is_enabled, false) as has_access,
          COALESCE(tf.limits, '{}') as limits,
          COALESCE(fu.usage_count, 0) as usage_count,
          COALESCE(fu.usage_limit, 1000) as usage_limit
        FROM features f
        LEFT JOIN tier_features tf ON f.id = tf.feature_id
        LEFT JOIN membership_tiers mt ON tf.tier_id = mt.id AND mt.name = $1
        LEFT JOIN feature_usage fu ON f.id = fu.feature_id AND fu.user_id = $2
        WHERE f.is_active = true
        ORDER BY f.category, f.display_name
      `, [userTier.tier_name, userId])
    );

    res.json({
      userTier: userTier.tier_name,
      features
    });

  } catch (error) {
    console.error('Error fetching available features:', error);
    res.status(500).json({
      error: 'Failed to fetch available features',
      message: error.message
    });
  }
});

// Get user's current membership details
router.get('/membership', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows: [membership] } = await transaction(client =>
      client.query(`
        SELECT
          um.id,
          um.status,
          um.start_date,
          um.end_date,
          um.trial_ends_at,
          mt.name as tier_name,
          mt.display_name as tier_display_name,
          mt.price_monthly,
          mt.price_yearly
        FROM user_memberships um
        JOIN membership_tiers mt ON um.tier_id = mt.id
        WHERE um.user_id = $1 AND um.status = 'active'
        ORDER BY um.start_date DESC
        LIMIT 1
      `, [userId])
    );

    if (!membership) {
      // Return free tier info
      const { rows: [freeTier] } = await transaction(client =>
        client.query(`
          SELECT name, display_name, price_monthly, price_yearly
          FROM membership_tiers
          WHERE name = 'free'
          LIMIT 1
        `)
      );

      return res.json({
        tier: 'free',
        displayName: freeTier?.display_name || 'Free',
        status: 'active',
        price: { monthly: 0, yearly: 0 },
        isTrial: false,
        daysRemaining: null
      });
    }

    const daysRemaining = membership.end_date
      ? Math.ceil((new Date(membership.end_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const isTrial = membership.trial_ends_at &&
      new Date(membership.trial_ends_at) > new Date() &&
      membership.status === 'active';

    res.json({
      tier: membership.tier_name,
      displayName: membership.tier_display_name,
      status: membership.status,
      price: {
        monthly: membership.price_monthly,
        yearly: membership.price_yearly
      },
      startDate: membership.start_date,
      endDate: membership.end_date,
      isTrial,
      trialEndsAt: membership.trial_ends_at,
      daysRemaining
    });

  } catch (error) {
    console.error('Error fetching membership details:', error);
    res.status(500).json({
      error: 'Failed to fetch membership details',
      message: error.message
    });
  }
});

// Track feature usage
router.post('/usage', authenticateToken, async (req, res) => {
  const { feature } = req.body;
  const userId = req.user.id;

  if (!feature) {
    return res.status(400).json({
      error: 'Missing feature parameter',
      message: 'Feature name is required'
    });
  }

  try {
    // Increment usage using database function
    await transaction(client =>
      client.query('SELECT increment_feature_usage($1, $2)', [userId, feature])
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Error tracking feature usage:', error);
    res.status(500).json({
      error: 'Failed to track feature usage',
      message: error.message
    });
  }
});

// Get feature usage statistics for current user
router.get('/usage', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows: usageStats } = await transaction(client =>
      client.query(`
        SELECT
          f.name as feature_name,
          f.display_name as feature_display_name,
          f.category,
          fu.usage_count,
          fu.usage_limit,
          fu.reset_date,
          fu.period,
          CASE
            WHEN fu.usage_limit > 0 THEN
              ROUND((fu.usage_count::decimal / fu.usage_limit::decimal) * 100, 2)
            ELSE 0
          END as usage_percentage
        FROM feature_usage fu
        JOIN features f ON fu.feature_id = f.id
        WHERE fu.user_id = $1
        ORDER BY fu.updated_at DESC
      `, [userId])
    );

    res.json({ usageStats });

  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch usage statistics',
      message: error.message
    });
  }
});

// Get upgrade recommendations based on usage
router.get('/recommendations', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user's current tier and usage
    const { rows: [currentTier] } = await transaction(client =>
      client.query('SELECT * FROM get_user_tier($1)', [userId])
    );

    if (!currentTier) {
      return res.json({
        recommendations: [],
        currentTier: 'free'
      });
    }

    // Find features user is using heavily but doesn't have access to
    const { rows: recommendations } = await transaction(client =>
      client.query(`
        SELECT
          f.name,
          f.display_name,
          f.category,
          fu.usage_count,
          fu.usage_limit,
          mt.name as required_tier,
          mt.display_name as required_tier_display,
          mt.price_monthly as upgrade_price
        FROM feature_usage fu
        JOIN features f ON fu.feature_id = f.id
        LEFT JOIN tier_features tf ON f.id = tf.feature_id
        LEFT JOIN membership_tiers mt ON tf.tier_id = mt.id
        WHERE fu.user_id = $1
          AND (tf.is_enabled = false OR tf.tier_id IS NULL)
          AND fu.usage_count > fu.usage_limit * 0.8
          AND mt.price_monthly > (
            SELECT price_monthly
            FROM membership_tiers
            WHERE name = $2
          )
        ORDER BY fu.usage_count DESC
        LIMIT 5
      `, [userId, currentTier.tier_name])
    );

    res.json({
      recommendations,
      currentTier: currentTier.tier_name
    });

  } catch (error) {
    console.error('Error fetching upgrade recommendations:', error);
    res.status(500).json({
      error: 'Failed to fetch upgrade recommendations',
      message: error.message
    });
  }
});

// Get all membership tiers with feature comparison
router.get('/tiers', async (req, res) => {
  try {
    const { rows: tiers } = await transaction(client =>
      client.query(`
        SELECT
          mt.id,
          mt.name,
          mt.display_name,
          mt.price_monthly,
          mt.price_yearly,
          json_agg(
            json_build_object(
              'feature_name', f.name,
              'feature_display', f.display_name,
              'enabled', COALESCE(tf.is_enabled, false),
              'limits', COALESCE(tf.limits, '{}')
            )
          ) FILTER (WHERE f.id IS NOT NULL) as features
        FROM membership_tiers mt
        LEFT JOIN tier_features tf ON mt.id = tf.tier_id
        LEFT JOIN features f ON tf.feature_id = f.id
        WHERE mt.is_active = true
        GROUP BY mt.id, mt.name, mt.display_name, mt.price_monthly, mt.price_yearly
        ORDER BY mt.price_monthly
      `)
    );

    res.json({ tiers });

  } catch (error) {
    console.error('Error fetching tier comparison:', error);
    res.status(500).json({
      error: 'Failed to fetch tier comparison',
      message: error.message
    });
  }
});

module.exports = router;