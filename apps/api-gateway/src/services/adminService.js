const { transaction } = require('../config/database');
const { BusinessLogicError } = require('../utils/errorHandler');

/**
 * Gets a list of all users for the admin dashboard.
 * @param {object} filters - Filtering and pagination options.
 * @returns {Promise<Array<object>>} A list of users.
 */
const getAllUsers = async (filters = {}) => {
  const { limit = 50, offset = 0 } = filters;
  const { rows } = await transaction(async (client) => {
    return await client.query(
      'SELECT id, email, first_name, last_name, is_active, kyc_status, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  });
  return rows;
};

/**
 * Updates a user's details from the admin dashboard.
 * @param {string} userId - The UUID of the user to update.
 * @param {object} userData - The data to update.
 * @returns {Promise<object>} The updated user object.
 */
const updateUser = async (userId, userData) => {
  const { is_active, kyc_status } = userData;
  const { rows } = await transaction(async (client) => {
    return await client.query(
      `UPDATE users SET is_active = $1, kyc_status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING id, email, is_active, kyc_status`,
      [is_active, kyc_status, userId]
    );
  });
  if (rows.length === 0) {
    throw new BusinessLogicError('User not found.');
  }
  return rows[0];
};

/**
 * Gets an overview of system health and activity.
 * @returns {Promise<object>} System statistics.
 */
const getSystemHealth = async () => {
  // This would fetch real-time data from various services
  return {
    activeUsers: 1250,
    tradesToday: 5432,
    totalVolume24h: 12345678.90,
    apiGatewayStatus: 'OK',
    tradingEngineStatus: 'OK',
    aiServiceStatus: 'OK',
    databaseConnection: 'OK'
  };
};

module.exports = {
  getAllUsers,
  updateUser,
  getSystemHealth
};
