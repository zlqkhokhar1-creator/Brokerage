const express = require('express');
const db = require('./db');
const { authenticateToken, requireKYC } = require('./middleware');

const router = express.Router();

// Get user's accounts and balances
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.*, 
        at.name as account_type_name,
        at.description as account_type_description,
        at.fees
      FROM accounts a
      JOIN account_types at ON a.account_type_id = at.id
      WHERE a.user_id = $1 AND a.status = 'active'
      ORDER BY a.created_at DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Error fetching accounts' });
  }
});

// Get account details with recent transactions
router.get('/accounts/:accountId', authenticateToken, async (req, res) => {
  const { accountId } = req.params;

  try {
    // Get account details
    const accountResult = await db.query(`
      SELECT 
        a.*, 
        at.name as account_type_name,
        at.description as account_type_description,
        at.fees
      FROM accounts a
      JOIN account_types at ON a.account_type_id = at.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [accountId, req.user.userId]);

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Get recent transactions
    const transactionsResult = await db.query(`
      SELECT *
      FROM transactions
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [accountId]);

    const account = accountResult.rows[0];
    account.recentTransactions = transactionsResult.rows;

    res.json(account);
  } catch (error) {
    console.error('Get account details error:', error);
    res.status(500).json({ message: 'Error fetching account details' });
  }
});

// Deposit funds
router.post('/deposit', authenticateToken, requireKYC, async (req, res) => {
  const { accountId, amount, method, reference } = req.body;

  if (!accountId || !amount || amount <= 0) {
    return res.status(400).json({ 
      message: 'Account ID and valid amount are required' 
    });
  }

  if (amount > 100000) {
    return res.status(400).json({ 
      message: 'Deposit amount exceeds maximum limit' 
    });
  }

  try {
    // Verify account ownership
    const accountResult = await db.query(`
      SELECT id, balance, currency FROM accounts 
      WHERE id = $1 AND user_id = $2 AND status = 'active'
    `, [accountId, req.user.userId]);

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountResult.rows[0];

    // Create transaction record
    const transactionResult = await db.query(`
      INSERT INTO transactions (
        user_id, account_id, type, amount, currency, description, 
        reference, status, external_reference
      ) VALUES ($1, $2, 'deposit', $3, $4, $5, $6, 'pending', $7)
      RETURNING *
    `, [
      req.user.userId, 
      accountId, 
      amount, 
      account.currency,
      `Deposit via ${method}`,
      reference,
      `DEP_${Date.now()}`
    ]);

    // In a real implementation, integrate with payment processor
    // For now, simulate successful deposit after 2 seconds
    setTimeout(async () => {
      try {
        // Update account balance
        await db.query(`
          UPDATE accounts 
          SET balance = balance + $1, available_balance = available_balance + $1
          WHERE id = $2
        `, [amount, accountId]);

        // Update transaction status
        await db.query(`
          UPDATE transactions 
          SET status = 'completed'
          WHERE id = $1
        `, [transactionResult.rows[0].id]);

        console.log(`Deposit completed: ${amount} to account ${accountId}`);
      } catch (error) {
        console.error('Deposit processing error:', error);
      }
    }, 2000);

    res.json({
      message: 'Deposit initiated successfully',
      transaction: transactionResult.rows[0],
      estimatedCompletion: '2-5 minutes'
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ message: 'Error processing deposit' });
  }
});

// Withdraw funds
router.post('/withdraw', authenticateToken, requireKYC, async (req, res) => {
  const { accountId, amount, method, bankAccount } = req.body;

  if (!accountId || !amount || amount <= 0) {
    return res.status(400).json({ 
      message: 'Account ID and valid amount are required' 
    });
  }

  if (amount > 50000) {
    return res.status(400).json({ 
      message: 'Withdrawal amount exceeds maximum limit' 
    });
  }

  try {
    // Verify account ownership and sufficient balance
    const accountResult = await db.query(`
      SELECT id, balance, available_balance, currency FROM accounts 
      WHERE id = $1 AND user_id = $2 AND status = 'active'
    `, [accountId, req.user.userId]);

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountResult.rows[0];

    if (account.available_balance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient funds for withdrawal' 
      });
    }

    // Create transaction record
    const transactionResult = await db.query(`
      INSERT INTO transactions (
        user_id, account_id, type, amount, currency, description, 
        reference, status, external_reference
      ) VALUES ($1, $2, 'withdrawal', $3, $4, $5, $6, 'pending', $7)
      RETURNING *
    `, [
      req.user.userId, 
      accountId, 
      amount, 
      account.currency,
      `Withdrawal via ${method}`,
      `WTH_${Date.now()}`,
      `WTH_${Date.now()}`
    ]);

    // Hold funds immediately
    await db.query(`
      UPDATE accounts 
      SET available_balance = available_balance - $1
      WHERE id = $2
    `, [amount, accountId]);

    // In a real implementation, integrate with payment processor
    // For now, simulate successful withdrawal after 5 seconds
    setTimeout(async () => {
      try {
        // Complete withdrawal
        await db.query(`
          UPDATE accounts 
          SET balance = balance - $1
          WHERE id = $2
        `, [amount, accountId]);

        // Update transaction status
        await db.query(`
          UPDATE transactions 
          SET status = 'completed'
          WHERE id = $1
        `, [transactionResult.rows[0].id]);

        console.log(`Withdrawal completed: ${amount} from account ${accountId}`);
      } catch (error) {
        console.error('Withdrawal processing error:', error);
      }
    }, 5000);

    res.json({
      message: 'Withdrawal initiated successfully',
      transaction: transactionResult.rows[0],
      estimatedCompletion: '1-3 business days'
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Error processing withdrawal' });
  }
});

// Transfer between accounts
router.post('/transfer', authenticateToken, async (req, res) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;

  if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
    return res.status(400).json({ 
      message: 'From account, to account, and valid amount are required' 
    });
  }

  if (fromAccountId === toAccountId) {
    return res.status(400).json({ 
      message: 'Cannot transfer to the same account' 
    });
  }

  try {
    // Verify both accounts belong to user
    const accountsResult = await db.query(`
      SELECT id, balance, available_balance, currency FROM accounts 
      WHERE id IN ($1, $2) AND user_id = $3 AND status = 'active'
    `, [fromAccountId, toAccountId, req.user.userId]);

    if (accountsResult.rows.length !== 2) {
      return res.status(404).json({ message: 'One or both accounts not found' });
    }

    const fromAccount = accountsResult.rows.find(acc => acc.id == fromAccountId);
    const toAccount = accountsResult.rows.find(acc => acc.id == toAccountId);

    if (fromAccount.available_balance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient funds for transfer' 
      });
    }

    if (fromAccount.currency !== toAccount.currency) {
      return res.status(400).json({ 
        message: 'Cannot transfer between different currencies' 
      });
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Create outgoing transaction
      const outgoingTransaction = await db.query(`
        INSERT INTO transactions (
          user_id, account_id, type, amount, currency, description, 
          reference, status
        ) VALUES ($1, $2, 'transfer_out', $3, $4, $5, $6, 'completed')
        RETURNING *
      `, [
        req.user.userId, 
        fromAccountId, 
        amount, 
        fromAccount.currency,
        description || `Transfer to account ${toAccountId}`,
        `TFR_OUT_${Date.now()}`
      ]);

      // Create incoming transaction
      const incomingTransaction = await db.query(`
        INSERT INTO transactions (
          user_id, account_id, type, amount, currency, description, 
          reference, status
        ) VALUES ($1, $2, 'transfer_in', $3, $4, $5, $6, 'completed')
        RETURNING *
      `, [
        req.user.userId, 
        toAccountId, 
        amount, 
        toAccount.currency,
        description || `Transfer from account ${fromAccountId}`,
        `TFR_IN_${Date.now()}`
      ]);

      // Update account balances
      await db.query(`
        UPDATE accounts 
        SET balance = balance - $1, available_balance = available_balance - $1
        WHERE id = $2
      `, [amount, fromAccountId]);

      await db.query(`
        UPDATE accounts 
        SET balance = balance + $1, available_balance = available_balance + $1
        WHERE id = $2
      `, [amount, toAccountId]);

      await db.query('COMMIT');

      res.json({
        message: 'Transfer completed successfully',
        outgoingTransaction: outgoingTransaction.rows[0],
        incomingTransaction: incomingTransaction.rows[0]
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Error processing transfer' });
  }
});

// Get transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  const { accountId, type, limit = 50, offset = 0 } = req.query;

  try {
    let whereClause = 'WHERE t.user_id = $1';
    const params = [req.user.userId];
    let paramCount = 1;

    if (accountId) {
      paramCount++;
      whereClause += ` AND t.account_id = $${paramCount}`;
      params.push(accountId);
    }

    if (type) {
      paramCount++;
      whereClause += ` AND t.type = $${paramCount}`;
      params.push(type);
    }

    const result = await db.query(`
      SELECT 
        t.*,
        a.account_number,
        at.name as account_type_name
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN account_types at ON a.account_type_id = at.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// Get payment methods (mock data)
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, this would fetch from a payment methods table
    const paymentMethods = [
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        type: 'bank',
        description: 'Direct bank transfer',
        processingTime: '1-3 business days',
        fees: { percentage: 0, fixed: 0 }
      },
      {
        id: 'ach',
        name: 'ACH Transfer',
        type: 'ach',
        description: 'Automated Clearing House',
        processingTime: '1-2 business days',
        fees: { percentage: 0, fixed: 0 }
      },
      {
        id: 'wire_transfer',
        name: 'Wire Transfer',
        type: 'wire',
        description: 'Same-day wire transfer',
        processingTime: 'Same day',
        fees: { percentage: 0, fixed: 25 }
      },
      {
        id: 'credit_card',
        name: 'Credit Card',
        type: 'card',
        description: 'Credit card payment',
        processingTime: 'Instant',
        fees: { percentage: 2.9, fixed: 0.30 }
      }
    ];

    res.json(paymentMethods);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Error fetching payment methods' });
  }
});

// Get account balance summary
router.get('/balance-summary', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        SUM(balance) as total_balance,
        SUM(available_balance) as total_available_balance,
        currency,
        COUNT(*) as account_count
      FROM accounts 
      WHERE user_id = $1 AND status = 'active'
      GROUP BY currency
    `, [req.user.userId]);

    const summary = {
      totalBalance: result.rows.reduce((sum, row) => sum + parseFloat(row.total_balance), 0),
      totalAvailableBalance: result.rows.reduce((sum, row) => sum + parseFloat(row.total_available_balance), 0),
      accountsByCurrency: result.rows.map(row => ({
        currency: row.currency,
        balance: parseFloat(row.total_balance),
        availableBalance: parseFloat(row.total_available_balance),
        accountCount: parseInt(row.account_count)
      }))
    };

    res.json(summary);
  } catch (error) {
    console.error('Get balance summary error:', error);
    res.status(500).json({ message: 'Error fetching balance summary' });
  }
});

module.exports = router;


