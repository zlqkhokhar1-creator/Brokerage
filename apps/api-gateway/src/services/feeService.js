const { transaction } = require('../config/database');

let feeTiersCache = [];
let lastCacheUpdateTime = 0;

/**
 * Fetches and caches the fee tiers from the database.
 */
const getFeeTiers = async (client) => {
  const now = Date.now();
  // Cache for 5 minutes to avoid frequent DB queries
  if (now - lastCacheUpdateTime > 5 * 60 * 1000 || feeTiersCache.length === 0) {
    const { rows } = await client.query('SELECT * FROM fee_tiers ORDER BY min_volume_30d DESC');
    feeTiersCache = rows;
    lastCacheUpdateTime = now;
  }
  return feeTiersCache;
};

/**
 * Updates a user's 30-day trading volume.
 * @param {string} userId - The user's UUID.
 * @param {number} tradeValue - The value of the trade to add to the volume.
 * @param {object} client - The database client for the transaction.
 */
const updateUserVolume = async (userId, tradeValue, client) => {
  await client.query(
    `INSERT INTO user_trading_volume (user_id, volume_30d)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET volume_30d = user_trading_volume.volume_30d + $2, updated_at = CURRENT_TIMESTAMP`,
    [userId, tradeValue]
  );
};

/**
 * Gets the applicable trading fee for a user based on their volume.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<{maker_fee_percent: number, taker_fee_percent: number}>}
 */
const getUserFeeTier = async (userId) => {
  return await transaction(async (client) => {
    const { rows } = await client.query('SELECT volume_30d FROM user_trading_volume WHERE user_id = $1', [userId]);
    const volume = rows.length > 0 ? rows[0].volume_30d : 0;

    const tiers = await getFeeTiers(client);
    for (const tier of tiers) {
      if (volume >= tier.min_volume_30d) {
        return { 
          maker_fee_percent: tier.maker_fee_percent, 
          taker_fee_percent: tier.taker_fee_percent 
        };
      }
    }
    // Return the lowest tier if no other tier matches
    return tiers[tiers.length - 1];
  });
};

module.exports = {
  updateUserVolume,
  getUserFeeTier
};
