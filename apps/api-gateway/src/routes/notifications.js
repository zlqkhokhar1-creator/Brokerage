const express = require('express');
const { authenticateToken } = require('../middleware');
const pushNotificationService = require('../services/pushNotificationService');

const router = express.Router();

router.use(authenticateToken);

/**
 * @route POST /notifications/register-device
 * @description Registers a device token for push notifications.
 * @access Private
 */
router.post('/register-device', async (req, res, next) => {
  try {
    const { deviceToken, deviceType } = req.body;
    if (!deviceToken || !deviceType) {
      return res.status(400).json({ success: false, error: 'deviceToken and deviceType are required.' });
    }

    await pushNotificationService.registerDevice(req.user.id, deviceToken, deviceType);

    res.json({ success: true, message: 'Device registered successfully for push notifications.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
