const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware');
const { requireFeature, clearUserFeatureCache } = require('../middleware/featureToggle');
const { logger } = require('../utils/logger');
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const router = express.Router();

/**
 * Get all available membership tiers
 */
router.get('/tiers', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        display_name,
        price_monthly,
        price_yearly,
        description,
        features,
        limits,
        sort_order
      FROM membership_tiers 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching membership tiers:', {
      error: error.message,
      requestId: req.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch membership tiers'
    });
  }
});

/**
 * Get current user's membership details
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        um.id,
        um.status,
        um.billing_cycle,
        um.started_at,
        um.expires_at,
        um.auto_renew,
        mt.name as tier_name,
        mt.display_name as tier_display_name,
        mt.price_monthly,
        mt.price_yearly,
        mt.features,
        mt.limits
      FROM user_memberships um
      JOIN membership_tiers mt ON um.membership_tier_id = mt.id
      WHERE um.user_id = $1
      ORDER BY um.created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No membership found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching user membership:', {
      userId: req.user?.id,
      error: error.message,
      requestId: req.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch membership details'
    });
  }
});

/**
 * Subscribe to a membership tier
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const { tier_id, billing_cycle = 'monthly', payment_method_id } = req.body;
    
    // Validate input
    if (!tier_id || !['monthly', 'yearly'].includes(billing_cycle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier_id or billing_cycle'
      });
    }
    
    // Get tier details
    const tierQuery = `
      SELECT * FROM membership_tiers 
      WHERE id = $1 AND is_active = true
    `;
    const tierResult = await client.query(tierQuery, [tier_id]);
    
    if (tierResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Membership tier not found'
      });
    }
    
    const tier = tierResult.rows[0];
    const price = billing_cycle === 'monthly' ? tier.price_monthly : tier.price_yearly;
    
    // Get user details for Stripe
    const userQuery = `SELECT email, first_name, last_name FROM users WHERE id = $1`;
    const userResult = await client.query(userQuery, [userId]);
    const user = userResult.rows[0];
    
    let stripeSubscriptionId = null;
    
    // Create Stripe subscription if price > 0
    if (price > 0 && stripe) {
      try {
        // Create or get Stripe customer
        let customer;
        const existingCustomers = await stripe.customers.list({
          email: user.email,
          limit: 1
        });
        
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
        } else {
          customer = await stripe.customers.create({
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            metadata: { user_id: userId.toString() }
          });
        }
        
        // Attach payment method to customer
        if (payment_method_id) {
          await stripe.paymentMethods.attach(payment_method_id, {
            customer: customer.id
          });
          
          await stripe.customers.update(customer.id, {
            invoice_settings: {
              default_payment_method: payment_method_id
            }
          });
        }
        
        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: tier.display_name,
                description: tier.description
              },
              unit_amount: Math.round(price * 100), // Convert to cents
              recurring: {
                interval: billing_cycle === 'monthly' ? 'month' : 'year'
              }
            }
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent']
        });
        
        stripeSubscriptionId = subscription.id;
      } catch (stripeError) {
        logger.error('Stripe subscription creation failed:', {
          userId,
          tier_id,
          error: stripeError.message
        });
        
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Payment processing failed',
          error: stripeError.message
        });
      }
    }
    
    // Cancel existing membership
    const cancelQuery = `
      UPDATE user_memberships 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND status = 'active'
    `;
    await client.query(cancelQuery, [userId]);
    
    // Create new membership
    const expiresAt = new Date();
    if (billing_cycle === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }
    
    const insertQuery = `
      INSERT INTO user_memberships (
        user_id, membership_tier_id, status, billing_cycle, 
        expires_at, payment_method_id, stripe_subscription_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const insertResult = await client.query(insertQuery, [
      userId, tier_id, 'active', billing_cycle, 
      expiresAt, payment_method_id, stripeSubscriptionId
    ]);
    
    // Update user's membership tier
    const updateUserQuery = `
      UPDATE users SET membership_tier_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await client.query(updateUserQuery, [tier_id, userId]);
    
    // Log subscription history
    const historyQuery = `
      INSERT INTO subscription_history (
        user_id, membership_tier_id, action, amount, currency, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await client.query(historyQuery, [
      userId, tier_id, 'subscribed', price, 'USD',
      JSON.stringify({ billing_cycle, stripe_subscription_id: stripeSubscriptionId })
    ]);
    
    await client.query('COMMIT');
    
    // Clear user's feature cache
    await clearUserFeatureCache(userId);
    
    logger.info('User subscribed to membership tier:', {
      userId,
      tier_id,
      tier_name: tier.name,
      billing_cycle,
      price,
      requestId: req.id
    });
    
    res.json({
      success: true,
      message: 'Successfully subscribed to membership tier',
      data: {
        membership_id: insertResult.rows[0].id,
        tier_name: tier.name,
        billing_cycle,
        expires_at: expiresAt,
        stripe_subscription_id: stripeSubscriptionId
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('Error creating membership subscription:', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
      requestId: req.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription'
    });
  } finally {
    client.release();
  }
});

/**
 * Cancel membership subscription
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    
    // Get current membership
    const membershipQuery = `
      SELECT * FROM user_memberships 
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `;
    const membershipResult = await client.query(membershipQuery, [userId]);
    
    if (membershipResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active membership found'
      });
    }
    
    const membership = membershipResult.rows[0];
    
    // Cancel Stripe subscription if exists
    if (membership.stripe_subscription_id && stripe) {
      try {
        await stripe.subscriptions.update(membership.stripe_subscription_id, {
          cancel_at_period_end: true
        });
      } catch (stripeError) {
        logger.error('Stripe subscription cancellation failed:', {
          userId,
          subscription_id: membership.stripe_subscription_id,
          error: stripeError.message
        });
      }
    }
    
    // Update membership status
    const updateQuery = `
      UPDATE user_memberships 
      SET status = 'cancelled', auto_renew = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await client.query(updateQuery, [membership.id]);
    
    // Downgrade to basic tier
    const basicTierQuery = `SELECT id FROM membership_tiers WHERE name = 'basic'`;
    const basicTierResult = await client.query(basicTierQuery);
    const basicTierId = basicTierResult.rows[0].id;
    
    const updateUserQuery = `
      UPDATE users SET membership_tier_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await client.query(updateUserQuery, [basicTierId, userId]);
    
    // Log cancellation
    const historyQuery = `
      INSERT INTO subscription_history (
        user_id, membership_tier_id, action, previous_tier_id, metadata
      ) VALUES ($1, $2, $3, $4, $5)
    `;
    await client.query(historyQuery, [
      userId, basicTierId, 'cancelled', membership.membership_tier_id,
      JSON.stringify({ cancelled_at: new Date().toISOString() })
    ]);
    
    await client.query('COMMIT');
    
    // Clear user's feature cache
    await clearUserFeatureCache(userId);
    
    logger.info('User cancelled membership:', {
      userId,
      membership_id: membership.id,
      requestId: req.id
    });
    
    res.json({
      success: true,
      message: 'Membership cancelled successfully. You will retain access until the end of your billing period.'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('Error cancelling membership:', {
      userId: req.user?.id,
      error: error.message,
      requestId: req.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to cancel membership'
    });
  } finally {
    client.release();
  }
});

/**
 * Get user's subscription history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        sh.*,
        mt.display_name as tier_display_name,
        pmt.display_name as previous_tier_display_name
      FROM subscription_history sh
      LEFT JOIN membership_tiers mt ON sh.membership_tier_id = mt.id
      LEFT JOIN membership_tiers pmt ON sh.previous_tier_id = pmt.id
      WHERE sh.user_id = $1
      ORDER BY sh.created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching subscription history:', {
      userId: req.user?.id,
      error: error.message,
      requestId: req.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription history'
    });
  }
});

/**
 * Get user's current usage statistics
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current month's usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const query = `
      SELECT feature, count
      FROM usage_tracking
      WHERE user_id = $1 AND period_start = $2
    `;
    
    const result = await pool.query(query, [
      userId, 
      currentMonth.toISOString().split('T')[0]
    ]);
    
    // Get user limits
    const limitsQuery = `
      SELECT limits FROM membership_tiers mt
      JOIN users u ON u.membership_tier_id = mt.id
      WHERE u.id = $1
    `;
    const limitsResult = await pool.query(limitsQuery, [userId]);
    const limits = limitsResult.rows[0]?.limits || {};
    
    // Format usage data
    const usage = {};
    result.rows.forEach(row => {
      usage[row.feature] = {
        current: row.count,
        limit: limits[row.feature] || 0,
        percentage: limits[row.feature] > 0 ? (row.count / limits[row.feature]) * 100 : 0
      };
    });
    
    res.json({
      success: true,
      data: {
        period: currentMonth.toISOString().split('T')[0],
        usage,
        limits
      }
    });
  } catch (error) {
    logger.error('Error fetching usage statistics:', {
      userId: req.user?.id,
      error: error.message,
      requestId: req.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics'
    });
  }
});

module.exports = router;
