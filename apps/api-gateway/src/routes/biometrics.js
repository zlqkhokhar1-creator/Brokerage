const express = require('express');
const { authenticateToken } = require('../middleware');
const biometricService = require('../services/biometricService');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /biometrics/register/start
 * @description Generates options to start the biometric registration process.
 * @access Private
 */
router.get('/register/start', async (req, res, next) => {
  try {
    const options = await biometricService.getRegistrationOptions(req.user);
    res.json(options);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /biometrics/register/verify
 * @description Verifies the client's response and saves the new biometric credential.
 * @access Private
 */
router.post('/register/verify', async (req, res, next) => {
  try {
    const isVerified = await biometricService.verifyRegistration(req.user, req.body);
    res.json({ success: isVerified });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /biometrics/login/start
 * @description Generates options to start the biometric login/verification process.
 * @access Private
 */
router.get('/login/start', async (req, res, next) => {
  try {
    const options = await biometricService.getAuthenticationOptions(req.user);
    res.json(options);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /biometrics/login/verify
 * @description Verifies the client's response for a biometric login.
 * @access Private
 */
router.post('/login/verify', async (req, res, next) => {
  try {
    const isVerified = await biometricService.verifyAuthentication(req.user, req.body);
    // On successful verification, you might issue a new JWT or confirm a session.
    res.json({ success: isVerified, message: 'Biometric verification successful.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
