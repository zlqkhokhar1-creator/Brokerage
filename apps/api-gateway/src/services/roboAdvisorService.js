const { transaction } = require('../config/database');

/**
 * Fetches the risk assessment questionnaire.
 * @returns {Promise<Array<object>>} The list of questions.
 */
const getQuestionnaire = async () => {
  const { rows } = await transaction(client =>
    client.query('SELECT id, question_text, options FROM risk_assessment_questions ORDER BY question_order ASC')
  );
  return rows;
};

/**
 * Submits a user's answers to the questionnaire and activates their robo-advisory account.
 * @param {string} userId - The user's UUID.
 * @param {Array<object>} answers - The user's answers, e.g., [{ question_id: 1, score: 3 }]
 * @returns {Promise<object>} The newly created user robo-advisory account.
 */
const submitQuestionnaireAndActivate = async (userId, answers) => {
  // Calculate total risk score
  const totalScore = answers.reduce((acc, answer) => acc + answer.score, 0);

  // Determine the appropriate model portfolio based on the score
  const riskLevel = determineRiskLevel(totalScore);
  const { rows: [modelPortfolio] } = await transaction(client =>
    client.query('SELECT id FROM model_portfolios WHERE risk_level = $1', [riskLevel])
  );

  if (!modelPortfolio) {
    throw new Error('Could not determine a suitable model portfolio.');
  }

  // Save the answers and create the user's robo-advisory account in a single transaction
  return await transaction(async client => {
    for (const answer of answers) {
      await client.query(
        'INSERT INTO user_risk_assessment_answers (user_id, question_id, selected_option_score) VALUES ($1, $2, $3)',
        [userId, answer.question_id, answer.score]
      );
    }

    const { rows: [newUserAccount] } = await client.query(
      `INSERT INTO user_robo_accounts (user_id, model_portfolio_id, risk_score)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, modelPortfolio.id, totalScore]
    );

    return newUserAccount;
  });
};

/**
 * Gets a user's robo-advisory account details.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<object>}
 */
const getRoboAccount = async (userId) => {
    const { rows: [account] } = await transaction(client =>
      client.query(
        `SELECT
          ura.id, ura.is_active, ura.risk_score, mp.risk_level, mp.description, mp.target_allocation
         FROM user_robo_accounts ura
         JOIN model_portfolios mp ON ura.model_portfolio_id = mp.id
         WHERE ura.user_id = $1`,
        [userId]
      )
    );
    return account;
  };
  

// --- Helper Function ---
const determineRiskLevel = (score) => {
  if (score <= 3) return 'Conservative';
  if (score <= 6) return 'Moderate';
  return 'Aggressive';
};

module.exports = {
  getQuestionnaire,
  submitQuestionnaireAndActivate,
  getRoboAccount,
};
