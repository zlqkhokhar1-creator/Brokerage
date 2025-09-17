const express = require('express');
const router = express.Router();
const db = require('../db'); 
const { authenticateToken } = require('../auth'); 

// GET all available membership plans
router.get('/plans', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id, name, price, features FROM membership_plans ORDER BY price');
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// GET user's current membership plan
router.get('/my-plan', authenticateToken, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.price, p.features 
       FROM users u 
       JOIN membership_plans p ON u.membership_plan_id = p.id 
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Membership plan not found for user.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST to change/upgrade a user's membership plan
// In a real application, this would involve a payment provider like Stripe.
// Here we will just simulate the plan change.
router.post('/change-plan', authenticateToken, async (req, res, next) => {
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ success: false, error: 'planId is required.' });
  }

  try {
    // Check if the plan exists
    const planResult = await db.query('SELECT id FROM membership_plans WHERE id = $1', [planId]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Membership plan not found.' });
    }

    // Update the user's plan
    await db.query('UPDATE users SET membership_plan_id = $1 WHERE id = $2', [planId, req.user.id]);

    res.json({ success: true, message: 'Membership plan updated successfully.' });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
