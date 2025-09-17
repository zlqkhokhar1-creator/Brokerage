const express = require('express');
const { authenticateToken } = require('../middleware');
const twoFactorAuthService = require('../services/twoFactorAuthService');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /2fa/setup
 * @description Generates a new 2FA secret and QR code for setup.
 * @access Private
 */
router.get('/setup', async (req, res, next) => {
  try {
    const { qrCodeDataUrl } = await twoFactorAuthService.generate2faSetup(req.user.id, req.user.email);
    // For security, the secret itself is not sent back, only the QR code.
    res.json({ success: true, data: { qrCodeDataUrl } });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /2fa/verify
 * @description Verifies the TOTP token and enables 2FA for the user.
 * @access Private
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required.' });
    }
    
    const isVerified = await twoFactorAuthService.verifyAndEnable2fa(req.user.id, token);

    if (isVerified) {
      res.json({ success: true, message: '2FA has been successfully enabled.' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid 2FA token.' });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
