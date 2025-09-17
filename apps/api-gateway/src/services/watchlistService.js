const { transaction } = require('../config/database');
const { BusinessLogicError } = require('../utils/errorHandler');

/**
 * Creates a new watchlist for a user.
 * @param {string} userId - The user's UUID.
 * @param {string} name - The name of the new watchlist.
 * @returns {Promise<object>} The newly created watchlist.
 */
const createWatchlist = async (userId, name) => {
  const { rows } = await transaction(client =>
    client.query('INSERT INTO watchlists (user_id, name) VALUES ($1, $2) RETURNING *', [userId, name])
  );
  return rows[0];
};

/**
 * Gets all watchlists for a user, including their items.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<Array<object>>}
 */
const getWatchlists = async (userId) => {
  const { rows } = await transaction(client =>
    client.query(`
      SELECT w.id, w.name, COALESCE(json_agg(wi.symbol) FILTER (WHERE wi.symbol IS NOT NULL), '[]') as items
      FROM watchlists w
      LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
      WHERE w.user_id = $1
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `, [userId])
  );
  return rows;
};

/**
 * Deletes a watchlist.
 * @param {string} userId - The user's UUID.
 * @param {string} watchlistId - The UUID of the watchlist to delete.
 */
const deleteWatchlist = async (userId, watchlistId) => {
  await transaction(async (client) => {
    const result = await client.query('DELETE FROM watchlists WHERE id = $1 AND user_id = $2', [watchlistId, userId]);
    if (result.rowCount === 0) {
      throw new BusinessLogicError('Watchlist not found or you do not have permission to delete it.');
    }
  });
};

/**
 * Adds a symbol to a watchlist.
 * @param {string} userId - The user's UUID.
 * @param {string} watchlistId - The UUID of the watchlist.
 * @param {string} symbol - The stock symbol to add.
 * @returns {Promise<object>} The newly added watchlist item.
 */
const addWatchlistItem = async (userId, watchlistId, symbol) => {
  const { rows } = await transaction(async (client) => {
    // First, verify the user owns the watchlist
    const watchlist = await client.query('SELECT id FROM watchlists WHERE id = $1 AND user_id = $2', [watchlistId, userId]);
    if (watchlist.rows.length === 0) {
      throw new BusinessLogicError('Watchlist not found or you do not have permission to modify it.');
    }
    return await client.query(
      'INSERT INTO watchlist_items (watchlist_id, symbol) VALUES ($1, $2) ON CONFLICT (watchlist_id, symbol) DO NOTHING RETURNING *',
      [watchlistId, symbol.toUpperCase()]
    );
  });
  return rows[0];
};

/**
 * Removes a symbol from a watchlist.
 * @param {string} userId - The user's UUID.
 * @param {string} watchlistId - The UUID of the watchlist.
 * @param {string} symbol - The stock symbol to remove.
 */
const removeWatchlistItem = async (userId, watchlistId, symbol) => {
  await transaction(async (client) => {
    // Verify user ownership of the watchlist before deleting the item
    const result = await client.query(
      `DELETE FROM watchlist_items 
       WHERE watchlist_id = $1 AND symbol = $2 
       AND EXISTS (SELECT 1 FROM watchlists WHERE id = $1 AND user_id = $3)`,
      [watchlistId, symbol.toUpperCase(), userId]
    );
    if (result.rowCount === 0) {
      throw new BusinessLogicError('Watchlist item not found or you do not have permission to remove it.');
    }
  });
};

module.exports = {
  createWatchlist,
  getWatchlists,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem
};
