const { transaction } = require('../config/database');
const { tradingEngine } = require('./tradingEngine');

/**
 * Links a new bank account for a user (simulated).
 */
const linkBankAccount = async (userId, { bank_name, account_number, account_type }) => {
  const { rows: [account] } = await transaction(client =>
    client.query(
      `INSERT INTO user_bank_accounts (user_id, bank_name, account_number_mask, account_type, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING id, bank_name, account_number_mask, account_type, status`,
      [userId, bank_name, account_number.slice(-4), account_type]
    )
  );
  return account;
};

/**
 * Approves a linked bank account for withdrawals (admin action).
 */
const approveBankAccount = async (bankAccountId) => {
    await transaction(client =>
      client.query(
        "UPDATE user_bank_accounts SET status = 'active', approved_at = NOW() WHERE id = $1",
        [bankAccountId]
      )
    );
  };

/**
 * Initiates a deposit from a linked bank account.
 */
const initiateDeposit = async (userId, { bank_account_id, amount }) => {
  const { rows: [deposit] } = await transaction(client =>
    client.query(
      `INSERT INTO fund_transactions (user_id, bank_account_id, transaction_type, amount, status)
       VALUES ($1, $2, 'deposit', $3, 'pending') RETURNING *`,
      [userId, bank_account_id, amount]
    )
  );
  // In a real system, a webhook from the payment processor would update this to 'completed'.
  // For now, we'll simulate completion and update the user's cash balance.
  await completeDeposit(deposit.id, userId, amount);
  return deposit;
};

/**
 * Initiates a withdrawal to a linked bank account.
 */
const initWithdrawal = async (userId, { bank_account_id, amount }) => {
  return await transaction(async client => {
    // 1. Check if the bank account is active and past the time-lock
    const { rows: [bankAccount] } = await client.query(
        "SELECT status, approved_at FROM user_bank_accounts WHERE id = $1 AND user_id = $2",
        [bank_account_id, userId]
    );

    if (!bankAccount || bankAccount.status !== 'active') {
        throw new Error('Withdrawals can only be made to active, approved bank accounts.');
    }

    const timeLockPeriod = 24 * 60 * 60 * 1000; // 24 hours
    if (new Date() - new Date(bankAccount.approved_at) < timeLockPeriod) {
        throw new Error('This bank account is within the 24-hour time-lock period for new withdrawals.');
    }

    // 2. Check for sufficient funds
    const accountInfo = await tradingEngine.getAccountInfo(userId, client);
    if (accountInfo.cash_balance < amount) {
      throw new Error('Insufficient funds for withdrawal.');
    }

    // 3. Create the withdrawal transaction
    const { rows: [withdrawal] } = await client.query(
      `INSERT INTO fund_transactions (user_id, bank_account_id, transaction_type, amount, status)
       VALUES ($1, $2, 'withdrawal', $3, 'pending') RETURNING *`,
      [userId, bank_account_id, amount]
    );

    // 4. Decrease user's cash balance immediately
    await client.query(
        'UPDATE user_accounts SET cash_balance = cash_balance - $1 WHERE user_id = $2',
        [amount, userId]
    );

    return withdrawal;
  });
};

/**
 * Gets a user's transaction history.
 */
const getTransactionHistory = async (userId) => {
    const { rows } = await transaction(client =>
      client.query('SELECT * FROM fund_transactions WHERE user_id = $1 ORDER BY created_at DESC', [userId])
    );
    return rows;
  };
  

/**
 * Gets a user's linked bank accounts.
 */
const getLinkedBankAccounts = async (userId) => {
    const { rows } = await transaction(client =>
        client.query('SELECT id, bank_name, account_number_mask, account_type FROM user_bank_accounts WHERE user_id = $1', [userId])
    );
    return rows;
};

// --- Helper for simulated deposit completion ---
const completeDeposit = async (transactionId, userId, amount) => {
    await transaction(async client => {
        await client.query('UPDATE fund_transactions SET status = \'completed\' WHERE id = $1', [transactionId]);
        await client.query('UPDATE user_accounts SET cash_balance = cash_balance + $1 WHERE user_id = $2', [amount, userId]);
    });
};

module.exports = {
  linkBankAccount,
  initiateDeposit,
  initWithdrawal,
  getTransactionHistory,
  getLinkedBankAccounts,
  approveBankAccount
};
