const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { transaction } = require('../config/database');
const { BusinessLogicError } = require('../utils/errorHandler');

/**
 * Generates a new 2FA secret and a QR code for the user to scan.
 * @param {string} userId - The user's UUID.
 * @param {string} email - The user's email.
 * @returns {Promise<{secret: string, qrCodeDataUrl: string}>}
 */
const generate2faSetup = async (userId, email) => {
  const secret = speakeasy.generateSecret({
    name: `Brokerage Platform (${email})`,
  });

  // Store the temporary secret in the user's record
  await transaction(client =>
    client.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret.base32, userId])
  );

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

  return { secret: secret.base32, qrCodeDataUrl };
};

/**
 * Verifies the user's TOTP code and enables 2FA for their account.
 * @param {string} userId - The user's UUID.
 * @param {string} token - The 6-digit code from the authenticator app.
 * @returns {Promise<boolean>}
 */
const verifyAndEnable2fa = async (userId, token) => {
  const { rows } = await transaction(client =>
    client.query('SELECT two_factor_secret FROM users WHERE id = $1', [userId])
  );

  if (rows.length === 0 || !rows[0].two_factor_secret) {
    throw new BusinessLogicError('2FA secret not found. Please start the setup process again.');
  }
  const secret = rows[0].two_factor_secret;

  const isVerified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
  });

  if (isVerified) {
    await transaction(client =>
      client.query('UPDATE users SET is_two_factor_enabled = TRUE WHERE id = $1', [userId])
    );
  }

  return isVerified;
};

/**
 * Validates a TOTP code during the login process.
 * @param {string} userId - The user's UUID.
 * @param {string} token - The 6-digit code from the authenticator app.
 * @returns {Promise<boolean>}
 */
const validate2faToken = async (userId, token) => {
    const { rows } = await transaction(client =>
        client.query('SELECT two_factor_secret FROM users WHERE id = $1', [userId])
    );

    if (rows.length === 0 || !rows[0].two_factor_secret) {
        throw new BusinessLogicError('User does not have 2FA enabled.');
    }
    const secret = rows[0].two_factor_secret;

    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
    });
};


module.exports = {
  generate2faSetup,
  verifyAndEnable2fa,
  validate2faToken
};
