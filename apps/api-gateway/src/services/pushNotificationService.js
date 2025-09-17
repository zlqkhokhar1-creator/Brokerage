const admin = require('firebase-admin');
const { transaction } = require('../config/database');
const { logger } = require('../utils/logger');

// Initialize Firebase Admin SDK
try {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set.');
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  logger.info('Firebase Admin SDK initialized successfully.');
} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK:', { error: error.message });
}


/**
 * Registers a new device for push notifications.
 * @param {string} userId - The user's UUID.
 * @param {string} deviceToken - The FCM device token.
 * @param {string} deviceType - 'android' or 'ios'.
 * @returns {Promise<void>}
 */
const registerDevice = async (userId, deviceToken, deviceType) => {
  await transaction(client =>
    client.query(
      `INSERT INTO user_devices (user_id, device_token, device_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (device_token) DO UPDATE SET user_id = $1, is_active = TRUE`,
      [userId, deviceToken, deviceType]
    )
  );
};

/**
 * Sends a push notification to all of a user's registered devices.
 * @param {string} userId - The UUID of the user to notify.
 * @param {object} notification - The notification payload ({ title, body }).
 * @returns {Promise<void>}
 */
const sendPushNotification = async (userId, { title, body }) => {
  const { rows: devices } = await transaction(client =>
    client.query('SELECT device_token FROM user_devices WHERE user_id = $1 AND is_active = TRUE', [userId])
  );

  if (devices.length === 0) {
    return;
  }

  const tokens = devices.map(d => d.device_token);
  const message = {
    notification: {
      title,
      body,
    },
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    logger.info('Successfully sent push notification', { userId, successes: response.successCount });
    if (response.failureCount > 0) {
        logger.warn('Failed to send push notification to some devices', { userId, failures: response.failureCount });
    }
  } catch (error) {
    logger.error('Error sending push notification', { userId, error: error.message });
  }
};

module.exports = {
  registerDevice,
  sendPushNotification,
};
