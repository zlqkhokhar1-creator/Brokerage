const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { transaction } = require('../config/database');
const { logAuditEvent } = require('../utils/audit');
const { getFraudRiskScore } = require('../services/aiServiceClient');
const twoFactorAuthService = require('../services/twoFactorAuthService');
const { loginLimiter } = require('../middleware/security');
const { notifyNewLogin } = require('../services/securityNotificationService');
const sessionService = require('../services/sessionService');
const { authenticateToken } = require('../middleware/security');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const TEMP_JWT_SECRET = process.env.TEMP_JWT_SECRET || 'your-temp-secret-for-2fa';

// User Registration
router.post('/register', async (req, res, next) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ success: false, message: req.t('all_fields_required') });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await transaction(client =>
      client.query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id',
        [email, hashedPassword, first_name, last_name]
      )
    );
    res.status(201).json({ success: true, message: req.t('user_registered'), userId: rows[0].id });
  } catch (error) {
    next(error);
  }
});

// User Login
router.post('/login', loginLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  try {
    const { rows } = await transaction(client =>
      client.query('SELECT * FROM users WHERE email = $1', [email])
    );
    const user = rows[0];

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      await logAuditEvent(user ? user.id : null, 'LOGIN_FAILURE', { email, reason: 'Invalid credentials' });
      return res.status(401).json({ success: false, message: req.t('invalid_credentials') });
    }

    // Real-time Fraud Detection
    const fraudScore = await getFraudRiskScore({ userId: user.id, ipAddress });
    if (fraudScore > 0.8) {
        await logAuditEvent(user.id, 'LOGIN_FAILURE', { email, reason: 'High fraud risk score', score: fraudScore });
        return res.status(403).json({ success: false, message: req.t('login_blocked_security') });
    }
    
    await logAuditEvent(user.id, 'LOGIN_SUCCESS', { email });

    // --- Security Notification ---
    // This is a "fire-and-forget" call; we don't need to wait for it.
    notifyNewLogin(user.id, { ipAddress, userAgent });
    // -------------------------

    // Check if 2FA is enabled
    if (user.is_two_factor_enabled) {
      const tempToken = jwt.sign({ userId: user.id, action: '2fa_verify' }, TEMP_JWT_SECRET, { expiresIn: '5m' });
      return res.status(200).json({ 
        success: true, 
        message: req.t('2fa_required'),
        twoFactorRequired: true,
        tempToken: tempToken
      });
    }

    // --- Session Management ---
    const jti = await sessionService.createSession(user.id, { ipAddress, userAgent });
    // -------------------------

    // Generate a standard JWT for non-2FA users
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h', jwtid: jti });
    res.json({ 
      success: true, 
      message: req.t('welcome'), // Use i18next for translated message
      accessToken: accessToken 
    });

  } catch (error) {
    next(error);
  }
});

// Verify 2FA Token and Complete Login
router.post('/login/verify', async (req, res, next) => {
  const { tempToken, twoFactorToken } = req.body;

  try {
    const decodedTemp = jwt.verify(tempToken, TEMP_JWT_SECRET);
    if (decodedTemp.action !== '2fa_verify') {
      return res.status(401).json({ success: false, message: 'Invalid temporary token action.' });
    }

    const { rows } = await transaction(client =>
      client.query('SELECT * FROM users WHERE id = $1', [decodedTemp.userId])
    );
    const user = rows[0];

    if (!user || !twoFactorAuthService.validate2faToken(user.two_factor_secret, twoFactorToken)) {
      return res.status(401).json({ success: false, message: req.t('2fa_invalid_token') });
    }

    // 2FA token is valid, complete the login
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      success: true, 
      message: req.t('login_success'),
      accessToken: accessToken 
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired temporary token.' });
    }
    next(error);
  }
});

// User Logout
router.post('/logout', authenticateToken, async (req, res, next) => {
    try {
        const { jti } = req.user; // jti is now on the decoded token
        await sessionService.invalidateSession(jti); // Assuming invalidate session works by jti
        res.json({ success: true, message: 'Successfully logged out.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
