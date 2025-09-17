const { transaction } = require('../config/database');
const { tradingEngine } = require('./tradingEngine');
const { getMarketPrice } = require('./marketDataService');

/**
 * Updates a user's public trading profile.
 */
const updateUserProfile = async (userId, { is_public_profile, nickname, trading_strategy_bio }) => {
  const { rows: [profile] } = await transaction(client =>
    client.query(
      `UPDATE users SET is_public_profile = $1, nickname = $2, trading_strategy_bio = $3
       WHERE id = $4 RETURNING id, is_public_profile, nickname, trading_strategy_bio`,
      [is_public_profile, nickname, trading_strategy_bio, userId]
    )
  );
  return profile;
};

/**
 * Allows a user to follow another public trader.
 */
const followUser = async (followerId, followedId) => {
  await transaction(client =>
    client.query('INSERT INTO user_follows (follower_id, followed_id) VALUES ($1, $2)', [followerId, followedId])
  );
};

/**
 * Allows a user to unfollow another trader.
 */
const unfollowUser = async (followerId, followedId) => {
  await transaction(client =>
    client.query('DELETE FROM user_follows WHERE follower_id = $1 AND followed_id = $2', [followerId, followedId])
  );
};

/**
 * Subscribes a user to copy another trader's trades.
 */
const subscribeToCopyTrading = async (subscriberId, traderId, { copy_amount_fixed }) => {
  const { rows: [subscription] } = await transaction(client =>
    client.query(
      `INSERT INTO copy_trading_subscriptions (subscriber_id, trader_id, copy_amount_fixed)
       VALUES ($1, $2, $3) RETURNING *`,
      [subscriberId, traderId, copy_amount_fixed]
    )
  );
  return subscription;
};

/**
 * Triggers copy trades for all of a trader's subscribers after their order is filled.
 * @param {string} traderId - The UUID of the lead trader.
 * @param {object} originalOrder - The original order that was just filled.
 */
const executeCopyTrades = async (traderId, originalOrder) => {
    const { rows: subscribers } = await transaction(client =>
        client.query('SELECT * FROM copy_trading_subscriptions WHERE trader_id = $1 AND is_active = TRUE', [traderId])
    );

    for (const sub of subscribers) {
        try {
            const marketPrice = await getMarketPrice(originalOrder.symbol);
            const quantityToCopy = sub.copy_amount_fixed / marketPrice;

            await tradingEngine.placeOrder({
                symbol: originalOrder.symbol,
                side: originalOrder.side,
                quantity: quantityToCopy,
                orderType: 'market' // Copy trades are always market orders for simplicity
            }, sub.subscriber_id);

        } catch (error) {
            logger.error('Failed to execute copy trade', {
                subscriberId: sub.subscriber_id,
                traderId,
                error: error.message
            });
        }
    }
};


module.exports = {
  updateUserProfile,
  followUser,
  unfollowUser,
  subscribeToCopyTrading,
  executeCopyTrades
};
