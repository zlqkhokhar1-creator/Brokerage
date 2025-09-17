const express = require('express');
const { transaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/security');
const { logAuditEvent } = require('../utils/audit');

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get all features with tier availability
router.get('/', async (req, res) => {
  try {
    const { rows: features } = await transaction(client =>
      client.query(`
        SELECT
          f.id,
          f.name,
          f.display_name,
          f.description,
          f.category,
          f.is_active,
          f.created_at,
          f.updated_at,
          json_agg(
            json_build_object(
              'tier', mt.name,
              'tier_display_name', mt.display_name,
              'enabled', COALESCE(tf.is_enabled, false),
              'limits', COALESCE(tf.limits, '{}')
            )
          ) FILTER (WHERE mt.id IS NOT NULL) as tier_availability
        FROM features f
        LEFT JOIN tier_features tf ON f.id = tf.feature_id
        LEFT JOIN membership_tiers mt ON tf.tier_id = mt.id
        WHERE f.is_active = true
        GROUP BY f.id, f.name, f.display_name, f.description, f.category, f.is_active, f.created_at, f.updated_at
        ORDER BY f.category, f.display_name
      `)
    );

    // Get membership tiers for reference
    const { rows: tiers } = await transaction(client =>
      client.query(`
        SELECT id, name, display_name, price_monthly, price_yearly
        FROM membership_tiers
        WHERE is_active = true
        ORDER BY price_monthly
      `)
    );

    res.json({
      features,
      tiers,
      totalFeatures: features.length,
      totalTiers: tiers.length
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({
      error: 'Failed to fetch features',
      message: error.message
    });
  }
});

// Get all membership tiers
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
          mt.is_active,
          mt.created_at,
          COUNT(um.id) as user_count
        FROM membership_tiers mt
        LEFT JOIN user_memberships um ON mt.id = um.tier_id AND um.status = 'active'
        GROUP BY mt.id, mt.name, mt.display_name, mt.price_monthly, mt.price_yearly, mt.is_active, mt.created_at
        ORDER BY mt.price_monthly
      `)
    );

    res.json({ tiers });
  } catch (error) {
    console.error('Error fetching tiers:', error);
    res.status(500).json({
      error: 'Failed to fetch tiers',
      message: error.message
    });
  }
});

// Toggle feature for a specific tier
router.post('/toggle', async (req, res) => {
  const { featureId, tierName, enabled, limits = {} } = req.body;
  const adminId = req.user.id;
  const clientIp = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!featureId || !tierName) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'featureId and tierName are required'
    });
  }

  try {
    // Get tier ID
    const { rows: [tierData] } = await transaction(client =>
      client.query('SELECT id FROM membership_tiers WHERE name = $1', [tierName])
    );

    if (!tierData) {
      return res.status(404).json({
        error: 'Tier not found',
        message: `Membership tier '${tierName}' does not exist`
      });
    }

    // Get feature details for logging
    const { rows: [featureData] } = await transaction(client =>
      client.query('SELECT name, display_name FROM features WHERE id = $1', [featureId])
    );

    if (!featureData) {
      return res.status(404).json({
        error: 'Feature not found',
        message: 'The specified feature does not exist'
      });
    }

    // Get current state for audit logging
    const { rows: [currentState] } = await transaction(client =>
      client.query(`
        SELECT is_enabled, limits
        FROM tier_features
        WHERE tier_id = $1 AND feature_id = $2
      `, [tierData.id, featureId])
    );

    // Update or insert feature availability
    const result = await transaction(client =>
      client.query(`
        INSERT INTO tier_features (tier_id, feature_id, is_enabled, limits, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (tier_id, feature_id)
        DO UPDATE SET
          is_enabled = EXCLUDED.is_enabled,
          limits = EXCLUDED.limits,
          updated_at = NOW()
        RETURNING *
      `, [tierData.id, featureId, enabled, JSON.stringify(limits)])
    );

    // Log the change
    await transaction(client =>
      client.query(`
        INSERT INTO feature_toggle_logs (
          feature_id, tier_id, admin_id, action,
          old_value, new_value, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        featureId,
        tierData.id,
        adminId,
        enabled ? 'enabled' : 'disabled',
        JSON.stringify({
          enabled: currentState?.is_enabled || false,
          limits: currentState?.limits || {}
        }),
        JSON.stringify({ enabled, limits }),
        clientIp,
        userAgent
      ])
    );

    // Invalidate cache (if using Redis)
    // await redis.del(`features:${tierName}`);
    // await redis.del('features:all');

    // Log audit event
    await logAuditEvent(adminId, 'FEATURE_TOGGLE', {
      featureId,
      featureName: featureData.name,
      tierName,
      enabled,
      limits,
      ipAddress: clientIp
    });

    res.json({
      success: true,
      message: `Feature '${featureData.display_name}' ${enabled ? 'enabled' : 'disabled'} for ${tierName} tier`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error toggling feature:', error);
    res.status(500).json({
      error: 'Failed to toggle feature',
      message: error.message
    });
  }
});

// Update feature limits for a specific tier
router.post('/limits', async (req, res) => {
  const { featureId, tierName, limits } = req.body;
  const adminId = req.user.id;

  if (!featureId || !tierName || !limits) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'featureId, tierName, and limits are required'
    });
  }

  try {
    // Get tier ID
    const { rows: [tierData] } = await transaction(client =>
      client.query('SELECT id FROM membership_tiers WHERE name = $1', [tierName])
    );

    if (!tierData) {
      return res.status(404).json({
        error: 'Tier not found',
        message: `Membership tier '${tierName}' does not exist`
      });
    }

    // Get current state for logging
    const { rows: [currentState] } = await transaction(client =>
      client.query(`
        SELECT limits
        FROM tier_features
        WHERE tier_id = $1 AND feature_id = $2
      `, [tierData.id, featureId])
    );

    // Update feature limits
    const result = await transaction(client =>
      client.query(`
        INSERT INTO tier_features (tier_id, feature_id, limits, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (tier_id, feature_id)
        DO UPDATE SET
          limits = EXCLUDED.limits,
          updated_at = NOW()
        RETURNING *
      `, [tierData.id, featureId, JSON.stringify(limits)])
    );

    // Log the change
    await transaction(client =>
      client.query(`
        INSERT INTO feature_toggle_logs (
          feature_id, tier_id, admin_id, action,
          old_value, new_value, ip_address, user_agent
        ) VALUES ($1, $2, $3, 'limit_changed', $4, $5, $6, $7)
      `, [
        featureId,
        tierData.id,
        adminId,
        JSON.stringify({ limits: currentState?.limits || {} }),
        JSON.stringify({ limits }),
        req.ip,
        req.headers['user-agent']
      ])
    );

    res.json({
      success: true,
      message: 'Feature limits updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating feature limits:', error);
    res.status(500).json({
      error: 'Failed to update feature limits',
      message: error.message
    });
  }
});

// Get feature usage analytics
router.get('/analytics', async (req, res) => {
  try {
    // Feature usage by tier
    const { rows: usageByTier } = await transaction(client =>
      client.query(`
        SELECT
          mt.name as tier_name,
          mt.display_name as tier_display_name,
          f.name as feature_name,
          f.display_name as feature_display_name,
          f.category,
          COUNT(DISTINCT fu.user_id) as users_using,
          AVG(fu.usage_count) as avg_usage,
          SUM(fu.usage_count) as total_usage
        FROM membership_tiers mt
        CROSS JOIN features f
        LEFT JOIN user_memberships um ON mt.id = um.tier_id AND um.status = 'active'
        LEFT JOIN feature_usage fu ON f.id = fu.feature_id AND fu.user_id = um.user_id
        WHERE mt.is_active = true AND f.is_active = true
        GROUP BY mt.name, mt.display_name, f.name, f.display_name, f.category
        ORDER BY mt.price_monthly, f.category, f.name
      `)
    );

    // Revenue impact analysis
    const { rows: revenueImpact } = await transaction(client =>
      client.query(`
        SELECT
          mt.name as tier_name,
          mt.display_name as tier_display_name,
          mt.price_monthly,
          COUNT(DISTINCT um.user_id) as user_count,
          COUNT(DISTINCT CASE WHEN tf.is_enabled THEN um.user_id END) as paying_users,
          SUM(mt.price_monthly) as potential_revenue
        FROM membership_tiers mt
        LEFT JOIN user_memberships um ON mt.id = um.tier_id AND um.status = 'active'
        LEFT JOIN tier_features tf ON mt.id = tf.tier_id
        LEFT JOIN features f ON tf.feature_id = f.id AND f.category = 'premium'
        WHERE mt.is_active = true
        GROUP BY mt.id, mt.name, mt.display_name, mt.price_monthly
        ORDER BY mt.price_monthly
      `)
    );

    res.json({
      usageByTier,
      revenueImpact,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

// Get audit logs for feature changes
router.get('/logs', async (req, res) => {
  const { page = 1, limit = 50, featureId, tierId, adminId } = req.query;

  try {
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (featureId) {
      whereClause += ` AND ftl.feature_id = $${paramIndex}`;
      params.push(featureId);
      paramIndex++;
    }

    if (tierId) {
      whereClause += ` AND ftl.tier_id = $${paramIndex}`;
      params.push(tierId);
      paramIndex++;
    }

    if (adminId) {
      whereClause += ` AND ftl.admin_id = $${paramIndex}`;
      params.push(adminId);
      paramIndex++;
    }

    const offset = (page - 1) * limit;

    // Get logs with pagination
    const { rows: logs } = await transaction(client =>
      client.query(`
        SELECT
          ftl.id,
          ftl.action,
          ftl.old_value,
          ftl.new_value,
          ftl.ip_address,
          ftl.user_agent,
          ftl.created_at,
          f.name as feature_name,
          f.display_name as feature_display_name,
          mt.name as tier_name,
          mt.display_name as tier_display_name,
          u.email as admin_email,
          u.first_name as admin_first_name,
          u.last_name as admin_last_name
        FROM feature_toggle_logs ftl
        JOIN features f ON ftl.feature_id = f.id
        JOIN membership_tiers mt ON ftl.tier_id = mt.id
        JOIN users u ON ftl.admin_id = u.id
        WHERE 1=1 ${whereClause}
        ORDER BY ftl.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset])
    );

    // Get total count
    const { rows: [{ count }] } = await transaction(client =>
      client.query(`
        SELECT COUNT(*) as count
        FROM feature_toggle_logs ftl
        WHERE 1=1 ${whereClause}
      `, params)
    );

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      error: 'Failed to fetch logs',
      message: error.message
    });
  }
});

// Bulk update features for a tier
router.post('/bulk-update', async (req, res) => {
  const { tierName, features } = req.body; // features: [{ featureId, enabled, limits }]
  const adminId = req.user.id;

  if (!tierName || !Array.isArray(features)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'tierName and features array are required'
    });
  }

  try {
    // Get tier ID
    const { rows: [tierData] } = await transaction(client =>
      client.query('SELECT id FROM membership_tiers WHERE name = $1', [tierName])
    );

    if (!tierData) {
      return res.status(404).json({
        error: 'Tier not found',
        message: `Membership tier '${tierName}' does not exist`
      });
    }

    const results = [];

    // Process each feature update
    for (const feature of features) {
      const { featureId, enabled, limits = {} } = feature;

      // Get current state for logging
      const { rows: [currentState] } = await transaction(client =>
        client.query(`
          SELECT is_enabled, limits
          FROM tier_features
          WHERE tier_id = $1 AND feature_id = $2
        `, [tierData.id, featureId])
      );

      // Update feature
      const result = await transaction(client =>
        client.query(`
          INSERT INTO tier_features (tier_id, feature_id, is_enabled, limits, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (tier_id, feature_id)
          DO UPDATE SET
            is_enabled = EXCLUDED.is_enabled,
            limits = EXCLUDED.limits,
            updated_at = NOW()
          RETURNING *
        `, [tierData.id, featureId, enabled, JSON.stringify(limits)])
      );

      // Log the change
      await transaction(client =>
        client.query(`
          INSERT INTO feature_toggle_logs (
            feature_id, tier_id, admin_id, action,
            old_value, new_value, ip_address, user_agent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          featureId,
          tierData.id,
          adminId,
          enabled ? 'enabled' : 'disabled',
          JSON.stringify({
            enabled: currentState?.is_enabled || false,
            limits: currentState?.limits || {}
          }),
          JSON.stringify({ enabled, limits }),
          req.ip,
          req.headers['user-agent']
        ])
      );

      results.push(result.rows[0]);
    }

    res.json({
      success: true,
      message: `Updated ${features.length} features for ${tierName} tier`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      error: 'Failed to update features',
      message: error.message
    });
  }
});

module.exports = router;