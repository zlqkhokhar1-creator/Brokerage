const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');
const { authenticateToken, validateRegistration, validateLogin } = require('./middleware');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// User Registration
router.post('/register', validateRegistration, async (req, res) => {
  const { 
    email, 
    password, 
    firstName, 
    lastName, 
    phone, 
    dateOfBirth,
    nationality,
    address,
    riskProfile = 'moderate',
    investmentGoals = []
  } = req.body;

  try {
    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const result = await db.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone, date_of_birth, 
        nationality, address_line1, city, state, postal_code, country, 
        risk_profile, investment_goals
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, email, first_name, last_name, kyc_status, created_at
    `, [
      email, hashedPassword, firstName, lastName, phone, dateOfBirth,
      nationality, address.line1, address.city, address.state, 
      address.postalCode, address.country, riskProfile, investmentGoals
    ]);

    const user = result.rows[0];

    // Create default brokerage account
    const accountNumber = generateAccountNumber();
    await db.query(`
      INSERT INTO accounts (user_id, account_type_id, account_number, currency)
      VALUES ($1, 1, $2, 'USD')
    `, [user.id, accountNumber]);

    // Create default portfolio
    await db.query(`
      INSERT INTO portfolios (user_id, name, strategy, risk_level)
      VALUES ($1, 'Main Portfolio', 'manual', $2)
    `, [user.id, riskProfile]);

    // Create default watchlist
    await db.query(`
      INSERT INTO watchlists (user_id, name, is_default)
      VALUES ($1, 'My Watchlist', true)
    `, [user.id]);

    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        kycStatus: user.kyc_status,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// User Login
router.post('/login', validateLogin, async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  try {
    const result = await db.query(`
      SELECT id, email, password_hash, first_name, last_name, kyc_status, 
             is_active, two_factor_enabled, last_login
      FROM users WHERE email = $1
    `, [email]);

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      kycStatus: user.kyc_status
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: rememberMe ? '30d' : JWT_EXPIRES_IN
    });

    // Store session in database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (rememberMe ? 24 * 30 : 24));

    await db.query(`
      INSERT INTO user_sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, tokenHash, expiresAt]);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        kycStatus: user.kyc_status,
        twoFactorEnabled: user.two_factor_enabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(req.token).digest('hex');
    
    await db.query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE user_id = $1 AND token_hash = $2
    `, [req.user.userId, tokenHash]);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, email, first_name, last_name, phone, date_of_birth, 
             nationality, address_line1, address_line2, city, state, 
             postal_code, country, kyc_status, risk_profile, 
             investment_goals, annual_income, net_worth, 
             email_verified, phone_verified, two_factor_enabled, 
             last_login, created_at
      FROM users WHERE id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      dateOfBirth: user.date_of_birth,
      nationality: user.nationality,
      address: {
        line1: user.address_line1,
        line2: user.address_line2,
        city: user.city,
        state: user.state,
        postalCode: user.postal_code,
        country: user.country
      },
      kycStatus: user.kyc_status,
      riskProfile: user.risk_profile,
      investmentGoals: user.investment_goals,
      annualIncome: user.annual_income,
      netWorth: user.net_worth,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified,
      twoFactorEnabled: user.two_factor_enabled,
      lastLogin: user.last_login,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  const {
    firstName, lastName, phone, dateOfBirth, nationality, address,
    riskProfile, investmentGoals, annualIncome, netWorth
  } = req.body;

  try {
    await db.query(`
      UPDATE users SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        date_of_birth = COALESCE($4, date_of_birth),
        nationality = COALESCE($5, nationality),
        address_line1 = COALESCE($6, address_line1),
        address_line2 = COALESCE($7, address_line2),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        postal_code = COALESCE($10, postal_code),
        country = COALESCE($11, country),
        risk_profile = COALESCE($12, risk_profile),
        investment_goals = COALESCE($13, investment_goals),
        annual_income = COALESCE($14, annual_income),
        net_worth = COALESCE($15, net_worth),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
    `, [
      firstName, lastName, phone, dateOfBirth, nationality,
      address?.line1, address?.line2, address?.city, address?.state,
      address?.postalCode, address?.country, riskProfile, investmentGoals,
      annualIncome, netWorth, req.user.userId
    ]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long' });
  }

  try {
    // Get current password hash
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
    const user = result.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', 
      [hashedNewPassword, req.user.userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Helper function to generate account number
function generateAccountNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ACC${timestamp.slice(-8)}${random}`;
}

module.exports = router;
