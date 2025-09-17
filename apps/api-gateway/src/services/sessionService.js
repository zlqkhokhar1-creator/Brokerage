const { transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates a new session record in the database.
 * @returns {string} The unique JWT ID (jti) for this session.
 */
const createSession = async (userId, { ipAddress, userAgent }) => {
  const jwtId = uuidv4();
  await transaction(client =>
    client.query(
      'INSERT INTO user_sessions (user_id, jwt_id, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
      [userId, jwtId, ipAddress, userAgent]
    )
  );
  return jwtId;
};

/**
 * Gets all active sessions for a user.
 */
const getUserSessions = async (userId) => {
  const { rows } = await transaction(client =>
    client.query('SELECT id, ip_address, user_agent, last_active_at FROM user_sessions WHERE user_id = $1', [userId])
  );
  return rows;
};

/**
 * Invalidates a specific session by adding its JWT ID to the deny list.
 */
const invalidateSession = async (sessionId, userId) => {
    return await transaction(async client => {
        const { rows: [session] } = await client.query(
            'SELECT jwt_id FROM user_sessions WHERE id = $1 AND user_id = $2',
            [sessionId, userId]
        );

        if (session) {
            // Add to deny list with the token's expiry time
            await client.query(
                'INSERT INTO jwt_deny_list (jwt_id, expires_at) VALUES ($1, NOW() + INTERVAL \'1 hour\')',
                [session.jwt_id]
            );
            // Remove from active sessions
            await client.query('DELETE FROM user_sessions WHERE id = $1', [sessionId]);
            return true;
        }
        return false;
    });
};

/**
 * Checks if a JWT ID has been revoked (is on the deny list).
 */
const isTokenRevoked = async (jwtId) => {
    const { rows } = await transaction(client =>
      client.query('SELECT 1 FROM jwt_deny_list WHERE jwt_id = $1', [jwtId])
    );
    return rows.length > 0;
};


module.exports = {
  createSession,
  getUserSessions,
  invalidateSession,
  isTokenRevoked,
};
