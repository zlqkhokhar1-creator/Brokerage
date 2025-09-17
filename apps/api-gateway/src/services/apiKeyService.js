const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { transaction } = require('../config/database');
const { BusinessLogicError } = require('../utils/errorHandler');

const PUBLIC_KEY_PREFIX = 'bp_pub_';
const SECRET_KEY_PREFIX = 'bp_sec_';

/**
 * Generates a new, secure API key pair.
 * The secret key is returned only once upon creation.
 * @returns {{publicKey: string, secretKey: string}}
 */
const generateApiKey = () => {
  const publicKey = PUBLIC_KEY_PREFIX + crypto.randomBytes(16).toString('hex');
  const secretKey = SECRET_KEY_PREFIX + crypto.randomBytes(32).toString('hex');
  return { publicKey, secretKey };
};

/**
 * Creates and stores a new API key for a user.
 * @param {string} userId - The user's UUID.
 * @param {string} keyName - A user-friendly name for the key.
 * @param {object} permissions - The permissions for this key.
 * @returns {Promise<{publicKey: string, secretKey: string}>} The newly generated key pair.
 */
const createApiKey = async (userId, keyName, permissions) => {
  const { publicKey, secretKey } = generateApiKey();
  const secretKeyHash = await bcrypt.hash(secretKey, 10);

  await transaction(async (client) => {
    await client.query(
      `INSERT INTO user_api_keys (user_id, key_name, public_key, secret_key_hash, permissions)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, keyName, publicKey, secretKeyHash, permissions]
    );
  });

  return { publicKey, secretKey };
};

/**
 * Retrieves all non-revoked API keys for a user (omitting the secret hash).
 * @param {string} userId - The user's UUID.
 * @returns {Promise<Array<object>>} A list of the user's active API keys.
 */
const getUserApiKeys = async (userId) => {
    const { rows } = await transaction(async (client) => {
        return await client.query(
            `SELECT id, key_name, public_key, permissions, last_used_at, created_at
             FROM user_api_keys WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );
    });
    return rows;
};

/**
 * Revokes an API key.
 * @param {string} userId - The user's UUID.
 * @param {string} publicKey - The public key to revoke.
 */
const revokeApiKey = async (userId, publicKey) => {
  await transaction(async (client) => {
    const result = await client.query(
      "UPDATE user_api_keys SET is_active = FALSE WHERE user_id = $1 AND public_key = $2 AND is_active = TRUE",
      [userId, publicKey]
    );
    if (result.rowCount === 0) {
      throw new BusinessLogicError('API key not found or already revoked.');
    }
  });
};

module.exports = {
  createApiKey,
  getUserApiKeys,
  revokeApiKey
};
