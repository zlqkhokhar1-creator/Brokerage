const { transaction } = require('../config/database');
const { BusinessLogicError } = require('../utils/errorHandler');

/**
 * Adds a new beneficiary for a user.
 * @param {string} userId - The user's UUID.
 * @param {object} beneficiaryData - The data for the new beneficiary.
 * @returns {Promise<object>} The newly created beneficiary.
 */
const addBeneficiary = async (userId, beneficiaryData) => {
  const { firstName, lastName, relationship, dateOfBirth, ...rest } = beneficiaryData;

  const { rows } = await transaction(async (client) => {
    return await client.query(
      `INSERT INTO beneficiaries (user_id, first_name, last_name, relationship, date_of_birth, email, phone, address_line1, city, state, postal_code, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [userId, firstName, lastName, relationship, dateOfBirth, rest.email, rest.phone, rest.address_line1, rest.city, rest.state, rest.postal_code, rest.country]
    );
  });
  return rows[0];
};

/**
 * Gets all beneficiaries for a user.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<Array<object>>} A list of the user's beneficiaries.
 */
const getBeneficiaries = async (userId) => {
  const { rows } = await transaction(async (client) => {
    return await client.query('SELECT * FROM beneficiaries WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  });
  return rows;
};

/**
 * Updates an existing beneficiary.
 * @param {string} userId - The user's UUID.
 * @param {string} beneficiaryId - The UUID of the beneficiary to update.
 * @param {object} beneficiaryData - The data to update.
 * @returns {Promise<object>} The updated beneficiary.
 */
const updateBeneficiary = async (userId, beneficiaryId, beneficiaryData) => {
    const { rows } = await transaction(async (client) => {
        const {_ , ...rest} = beneficiaryData
        const { rows } = await client.query(
        `UPDATE beneficiaries SET 
            first_name = $1, last_name = $2, relationship = $3, date_of_birth = $4, email = $5, phone = $6, 
            address_line1 = $7, city = $8, state = $9, postal_code = $10, country = $11, updated_at = CURRENT_TIMESTAMP
         WHERE id = $12 AND user_id = $13
         RETURNING *`,
        [beneficiaryData.firstName, beneficiaryData.lastName, beneficiaryData.relationship, beneficiaryData.dateOfBirth, 
         beneficiaryData.email, beneficiaryData.phone, beneficiaryData.address_line1, beneficiaryData.city, 
         beneficiaryData.state, beneficiaryData.postal_code, beneficiaryData.country, beneficiaryId, userId]
        );
        return { rows };
    });
    if (rows.length === 0) {
        throw new BusinessLogicError('Beneficiary not found or you do not have permission to update it.');
    }
    return rows[0];
};

/**
 * Deletes a beneficiary.
 * @param {string} userId - The user's UUID.
 * @param {string} beneficiaryId - The UUID of the beneficiary to delete.
 */
const deleteBeneficiary = async (userId, beneficiaryId) => {
  await transaction(async (client) => {
    const result = await client.query(
      'DELETE FROM beneficiaries WHERE id = $1 AND user_id = $2',
      [beneficiaryId, userId]
    );
    if (result.rowCount === 0) {
      throw new BusinessLogicError('Beneficiary not found or you do not have permission to delete it.');
    }
  });
};

module.exports = {
  addBeneficiary,
  getBeneficiaries,
  updateBeneficiary,
  deleteBeneficiary
};
