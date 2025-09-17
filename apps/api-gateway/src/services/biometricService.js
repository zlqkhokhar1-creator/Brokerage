const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { transaction } = require('../config/database');
const { BusinessLogicError } = require('../utils/errorHandler');

const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN || `http://${rpID}:3000`;

/**
 * Generates options for WebAuthn registration.
 * @param {object} user - The user object.
 * @returns {Promise<object>} The registration options.
 */
const getRegistrationOptions = async (user) => {
  const userAuthenticators = await getUserAuthenticators(user.id);

  const options = await generateRegistrationOptions({
    rpName: 'Brokerage Platform',
    rpID,
    userID: user.id,
    userName: user.email,
    excludeCredentials: userAuthenticators.map(auth => ({
      id: auth.credential_id,
      type: 'public-key',
      transports: auth.transports,
    })),
  });

  // Store the challenge to verify it later
  await storeUserChallenge(user.id, options.challenge);

  return options;
};

/**
 * Verifies a WebAuthn registration response and saves the new authenticator.
 * @param {object} user - The user object.
 * @param {object} responseBody - The response from the client.
 * @returns {Promise<boolean>} True if verification is successful.
 */
const verifyRegistration = async (user, responseBody) => {
  const expectedChallenge = await getUserChallenge(user.id);
  const verification = await verifyRegistrationResponse({
    response: responseBody,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new BusinessLogicError('Biometric registration failed verification.');
  }

  const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
  
  await saveAuthenticator(user.id, {
    credentialID,
    publicKey: Buffer.from(credentialPublicKey).toString('base64'),
    counter,
  });

  return true;
};

/**
 * Generates options for WebAuthn authentication (login).
 * @param {object} user - The user object.
 * @returns {Promise<object>} The authentication options.
 */
const getAuthenticationOptions = async (user) => {
  const userAuthenticators = await getUserAuthenticators(user.id);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: userAuthenticators.map(auth => ({
      id: auth.credential_id,
      type: 'public-key',
      transports: auth.transports,
    })),
  });

  await storeUserChallenge(user.id, options.challenge);

  return options;
};

/**
 * Verifies a WebAuthn authentication (login) response.
 * @param {object} user - The user object.
 * @param {object} responseBody - The response from the client.
 * @returns {Promise<boolean>} True if verification is successful.
 */
const verifyAuthentication = async (user, responseBody) => {
  const expectedChallenge = await getUserChallenge(user.id);
  const authenticator = await getAuthenticatorById(responseBody.id);

  if (!authenticator) {
    throw new BusinessLogicError('Authenticator not found.');
  }

  const verification = await verifyAuthenticationResponse({
    response: responseBody,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: authenticator.credential_id,
      credentialPublicKey: Buffer.from(authenticator.public_key, 'base64'),
      counter: authenticator.counter,
    },
  });

  if (!verification.verified) {
    throw new BusinessLogicError('Biometric authentication failed.');
  }

  // Update the authenticator counter to prevent replay attacks
  await updateAuthenticatorCounter(authenticator.id, verification.authenticationInfo.newCounter);

  return true;
};

// --- Helper Functions ---
const getUserAuthenticators = async (userId) => {
  const { rows } = await transaction(client => 
    client.query('SELECT * FROM user_authenticators WHERE user_id = $1', [userId])
  );
  return rows;
};

const storeUserChallenge = async (userId, challenge) => {
  // In a real app, this should be stored in Redis or a temporary table with a TTL
  await transaction(client => 
    client.query('UPDATE users SET current_challenge = $1 WHERE id = $2', [challenge, userId])
  );
};

const getUserChallenge = async (userId) => {
    const { rows } = await transaction(client => 
        client.query('SELECT current_challenge FROM users WHERE id = $1', [userId])
    );
    return rows[0]?.current_challenge;
};

const saveAuthenticator = async (userId, authData) => {
  await transaction(client =>
    client.query(
      'INSERT INTO user_authenticators (user_id, credential_id, public_key, counter) VALUES ($1, $2, $3, $4)',
      [userId, authData.credentialID, authData.publicKey, authData.counter]
    )
  );
};

const getAuthenticatorById = async (credentialId) => {
  const { rows } = await transaction(client =>
    client.query('SELECT * FROM user_authenticators WHERE credential_id = $1', [credentialId])
  );
  return rows[0];
};

const updateAuthenticatorCounter = async (authenticatorId, newCounter) => {
  await transaction(client =>
    client.query('UPDATE user_authenticators SET counter = $1 WHERE id = $2', [newCounter, authenticatorId])
  );
};

module.exports = {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication
};
