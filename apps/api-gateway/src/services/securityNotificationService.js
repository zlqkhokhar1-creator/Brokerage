const { sendEmail } = require('../utils/email'); // This utility will be created next
const { transaction } = require('../config/database');

/**
 * Sends a notification to a user about a new device login.
 * @param {string} userId - The user's UUID.
 * @param {object} deviceInfo - Details about the login (e.g., IP address, user agent).
 */
const notifyNewLogin = async (userId, { ipAddress, userAgent }) => {
  const { rows: [user] } = await transaction(client =>
    client.query('SELECT email, first_name FROM users WHERE id = $1', [userId])
  );

  if (user) {
    await sendEmail({
      to: user.email,
      subject: 'New Login to Your Account',
      text: `Hello ${user.first_name},\n\nYour account was just accessed from a new device.\n\nIP Address: ${ipAddress}\nDevice: ${userAgent}\n\nIf this was not you, please secure your account immediately.\n\nThanks,\nThe Security Team`,
      html: `<p>Hello ${user.first_name},</p><p>Your account was just accessed from a new device.</p><p><b>IP Address:</b> ${ipAddress}<br><b>Device:</b> ${userAgent}</p><p>If this was not you, please secure your account immediately.</p><p>Thanks,<br>The Security Team</p>`
    });
  }
};

/**
 * Notifies a user that their password has been changed.
 */
const notifyPasswordChange = async (userId) => {
    // Similar implementation to notifyNewLogin
};

/**
 * Notifies a user that 2FA has been enabled or disabled.
 */
const notify2faChange = async (userId, status) => {
    // Similar implementation to notifyNewLogin
};


module.exports = {
  notifyNewLogin,
  notifyPasswordChange,
  notify2faChange,
};
