const { transaction } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Creates a new financial goal for a user and calculates a plan.
 * @param {string} userId - The user's UUID.
 * @param {object} goalData - The details of the goal.
 * @returns {Promise<object>} The new financial goal with its recommended plan.
 */
const createFinancialGoal = async (userId, goalData) => {
  const { goal_name, target_amount, target_date, initial_deposit, monthly_contribution } = goalData;

  // --- Financial Projection & Portfolio Recommendation ---
  const plan = calculateInvestmentPlan(target_amount, target_date, initial_deposit, monthly_contribution);
  
  const { rows: [modelPortfolio] } = await transaction(client =>
    client.query('SELECT id FROM model_portfolios WHERE risk_level = $1', [plan.recommended_risk_level])
  );
  // --- End Projection ---

  const { rows: [newGoal] } = await transaction(client =>
    client.query(
      `INSERT INTO user_financial_goals 
       (user_id, goal_name, target_amount, target_date, initial_deposit, monthly_contribution, recommended_portfolio_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, goal_name, target_amount, target_date, initial_deposit, monthly_contribution, modelPortfolio.id]
    )
  );

  return { ...newGoal, plan };
};

/**
 * Gets all financial goals for a user.
 */
const getUserGoals = async (userId) => {
    const { rows } = await transaction(client =>
        client.query('SELECT * FROM user_financial_goals WHERE user_id = $1', [userId])
    );
    return rows;
};


// --- Helper: Financial Calculation Logic ---
const calculateInvestmentPlan = (target_amount, target_date, initial_deposit, monthly_contribution) => {
    const months_to_goal = (new Date(target_date) - new Date()) / (1000 * 60 * 60 * 24 * 30.44);

    // This is a simplified financial calculation. A real one would use a more
    // complex formula involving compounding interest and variable rates of return.
    const required_rate_of_return = (target_amount / (initial_deposit + monthly_contribution * months_to_goal)) - 1;

    let recommended_risk_level = 'Conservative';
    if (required_rate_of_return > 0.08) {
        recommended_risk_level = 'Aggressive';
    } else if (required_rate_of_return > 0.05) {
        recommended_risk_level = 'Moderate';
    }

    return {
        required_rate_of_return,
        recommended_risk_level,
        is_achievable: required_rate_of_return < 0.15 // Assume > 15% annual return is unlikely
    };
};


module.exports = {
  createFinancialGoal,
  getUserGoals,
};
