const { EventEmitter } = require('events');
const { logger } = require('../utils/logger');
const { pool } = require('../utils/database');
const { redisClient } = require('../utils/redis');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const _ = require('lodash');

class CashAccountService extends EventEmitter {
  constructor() {
    super();
    this.supportedCurrencies = ['PKR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    this.pakistaniProviders = ['RAAST', 'JAZZCASH', 'EASYPAISA'];
    this.internationalProviders = ['STRIPE', 'PAYPAL', 'WISE', 'SQUARE', 'BRAINTREE'];
    this._initialized = false;
  }

  async initialize() {
    try {
      await redisClient.ping();
      this._initialized = true;
      logger.info('CashAccountService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CashAccountService:', error);
      throw error;
    }
  }

  async close() {
    try {
      this._initialized = false;
      logger.info('CashAccountService closed');
    } catch (error) {
      logger.error('Error closing CashAccountService:', error);
    }
  }

  // Create cash account for new user
  async createCashAccount(userId, userData) {
    try {
      const accountNumber = this.generateAccountNumber();
      const accountId = uuidv4();

      const account = {
        id: accountId,
        user_id: userId,
        account_number: accountNumber,
        base_currency: userData.base_currency || 'PKR',
        account_type: userData.account_type || 'individual',
        cnic: userData.cnic,
        cnic_verified: false,
        iban: userData.iban,
        raast_enabled: userData.country === 'PAK' || userData.base_currency === 'PKR',
        tax_id: userData.tax_id,
        kyc_status: 'pending',
        aml_status: 'pending',
        daily_deposit_limit: this.getDefaultLimits(userData.country).daily_deposit,
        daily_withdrawal_limit: this.getDefaultLimits(userData.country).daily_withdrawal,
        monthly_deposit_limit: this.getDefaultLimits(userData.country).monthly_deposit,
        monthly_withdrawal_limit: this.getDefaultLimits(userData.country).monthly_withdrawal,
        max_balance_limit: this.getDefaultLimits(userData.country).max_balance
      };

      await pool.query(`
        INSERT INTO cash_accounts (
          id, user_id, account_number, base_currency, account_type,
          cnic, iban, raast_enabled, tax_id, kyc_status, aml_status,
          daily_deposit_limit, daily_withdrawal_limit, monthly_deposit_limit,
          monthly_withdrawal_limit, max_balance_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        account.id, account.user_id, account.account_number, account.base_currency,
        account.account_type, account.cnic, account.iban, account.raast_enabled,
        account.tax_id, account.kyc_status, account.aml_status, account.daily_deposit_limit,
        account.daily_withdrawal_limit, account.monthly_deposit_limit,
        account.monthly_withdrawal_limit, account.max_balance_limit
      ]);

      // Initialize all currency balances to zero
      await this.initializeCurrencyBalances(accountId);

      logger.info(`Cash account created for user ${userId}: ${accountNumber}`);
      return account;
    } catch (error) {
      logger.error('Error creating cash account:', error);
      throw error;
    }
  }

  // Process buy order - deduct from cash balance
  async processBuyOrder(userId, orderData) {
    try {
      const account = await this.getCashAccount(userId);
      if (!account) {
        throw new Error('Cash account not found');
      }

      const { asset_type, asset_symbol, asset_name, quantity, price_per_unit, currency = account.base_currency } = orderData;
      
      // Calculate total cost including fees
      const totalAmount = quantity * price_per_unit;
      const fees = await this.calculateTradingFees(totalAmount, asset_type, currency);
      const netAmount = totalAmount + fees.total;

      // Check available balance
      const availableBalance = this.getBalanceInCurrency(account, currency);
      if (availableBalance < netAmount) {
        throw new Error(`Insufficient funds. Available: ${availableBalance} ${currency}, Required: ${netAmount} ${currency}`);
      }

      // Reserve funds for pending order
      await this.reserveFunds(account.id, netAmount, currency);

      // Create transaction record
      const transaction = await this.createTradingTransaction({
        user_id: userId,
        account_id: account.id,
        transaction_type: 'BUY',
        asset_type: asset_type,
        asset_symbol: asset_symbol,
        asset_name: asset_name,
        quantity: quantity,
        price_per_unit: price_per_unit,
        total_amount: totalAmount,
        currency: currency,
        commission: fees.commission,
        taxes: fees.taxes,
        exchange_fees: fees.exchange_fees,
        regulatory_fees: fees.regulatory_fees,
        other_fees: fees.other_fees,
        total_fees: fees.total,
        net_amount: netAmount,
        status: 'pending',
        market: orderData.market || this.getDefaultMarket(asset_type),
        exchange: orderData.exchange
      });

      // Emit event for real-time updates
      this.emit('buyOrderPlaced', {
        user_id: userId,
        transaction_id: transaction.id,
        amount: netAmount,
        currency: currency,
        asset_symbol: asset_symbol
      });

      return transaction;
    } catch (error) {
      logger.error('Error processing buy order:', error);
      throw error;
    }
  }

  // Process sell order - add to cash balance
  async processSellOrder(userId, orderData) {
    try {
      const account = await this.getCashAccount(userId);
      if (!account) {
        throw new Error('Cash account not found');
      }

      const { asset_type, asset_symbol, asset_name, quantity, price_per_unit, currency = account.base_currency } = orderData;
      
      // Calculate proceeds after fees
      const grossAmount = quantity * price_per_unit;
      const fees = await this.calculateTradingFees(grossAmount, asset_type, currency);
      const netAmount = grossAmount - fees.total;

      // Create transaction record
      const transaction = await this.createTradingTransaction({
        user_id: userId,
        account_id: account.id,
        transaction_type: 'SELL',
        asset_type: asset_type,
        asset_symbol: asset_symbol,
        asset_name: asset_name,
        quantity: quantity,
        price_per_unit: price_per_unit,
        total_amount: grossAmount,
        currency: currency,
        commission: fees.commission,
        taxes: fees.taxes,
        exchange_fees: fees.exchange_fees,
        regulatory_fees: fees.regulatory_fees,
        other_fees: fees.other_fees,
        total_fees: fees.total,
        net_amount: netAmount,
        status: 'pending',
        market: orderData.market || this.getDefaultMarket(asset_type),
        exchange: orderData.exchange
      });

      // Emit event for real-time updates
      this.emit('sellOrderPlaced', {
        user_id: userId,
        transaction_id: transaction.id,
        amount: netAmount,
        currency: currency,
        asset_symbol: asset_symbol
      });

      return transaction;
    } catch (error) {
      logger.error('Error processing sell order:', error);
      throw error;
    }
  }

  // Execute trade - update actual balances
  async executeTrade(transactionId, executionData) {
    try {
      const transaction = await this.getTradingTransaction(transactionId);
      if (!transaction) {
        throw new Error('Trading transaction not found');
      }

      const account = await this.getCashAccount(transaction.user_id);
      const { execution_price, execution_time, execution_venue } = executionData;

      // Calculate final amounts with execution price
      const totalAmount = transaction.quantity * execution_price;
      const fees = await this.calculateTradingFees(totalAmount, transaction.asset_type, transaction.currency);
      const netAmount = transaction.transaction_type === 'BUY' ? 
        totalAmount + fees.total : 
        totalAmount - fees.total;

      if (transaction.transaction_type === 'BUY') {
        // Deduct from available balance and unreserve funds
        await this.deductFunds(account.id, netAmount, transaction.currency);
        await this.unreserveFunds(account.id, transaction.net_amount, transaction.currency);
      } else {
        // Add to available balance
        await this.addFunds(account.id, netAmount, transaction.currency);
      }

      // Update transaction with execution details
      await this.updateTradingTransaction(transactionId, {
        status: 'executed',
        execution_price: execution_price,
        execution_time: execution_time,
        execution_venue: execution_venue,
        total_amount: totalAmount,
        net_amount: netAmount,
        executed_at: new Date()
      });

      // Emit event for real-time updates
      this.emit('tradeExecuted', {
        user_id: transaction.user_id,
        transaction_id: transactionId,
        asset_symbol: transaction.asset_symbol,
        transaction_type: transaction.transaction_type,
        amount: netAmount,
        currency: transaction.currency
      });

      return transaction;
    } catch (error) {
      logger.error('Error executing trade:', error);
      throw error;
    }
  }

  // Process deposit via various payment methods
  async processDeposit(userId, depositData) {
    try {
      const account = await this.getCashAccount(userId);
      if (!account) {
        throw new Error('Cash account not found');
      }

      const { amount, currency, payment_method, payment_provider, bank_account_id, digital_wallet_id, external_reference } = depositData;

      // Validate payment method and provider
      await this.validatePaymentMethod(payment_method, payment_provider, currency);

      // Check daily and monthly limits
      await this.checkDepositLimits(account, amount, currency);

      // Create cash transaction
      const transaction = await this.createCashTransaction({
        user_id: userId,
        account_id: account.id,
        transaction_type: 'DEPOSIT',
        amount: amount,
        currency: currency,
        payment_method: payment_method,
        payment_provider: payment_provider,
        bank_account_id: bank_account_id,
        digital_wallet_id: digital_wallet_id,
        external_transaction_id: external_reference,
        status: 'pending'
      });

      // Process based on payment method
      let result;
      switch (payment_method) {
        case 'RAAST':
          result = await this.processRaastDeposit(transaction, depositData);
          break;
        case 'BANK_TRANSFER':
          result = await this.processBankTransferDeposit(transaction, depositData);
          break;
        case 'WIRE':
          result = await this.processWireDeposit(transaction, depositData);
          break;
        case 'ACH':
          result = await this.processACHDeposit(transaction, depositData);
          break;
        case 'CARD':
          result = await this.processCardDeposit(transaction, depositData);
          break;
        case 'DIGITAL_WALLET':
          result = await this.processDigitalWalletDeposit(transaction, depositData);
          break;
        default:
          throw new Error(`Unsupported payment method: ${payment_method}`);
      }

      // Update transaction with provider response
      await this.updateCashTransaction(transaction.id, {
        provider_transaction_id: result.provider_transaction_id,
        provider_reference: result.provider_reference,
        status: result.status,
        processing_fee: result.processing_fee || 0,
        net_amount: amount - (result.processing_fee || 0)
      });

      // If successful, add funds to account
      if (result.status === 'completed') {
        await this.addFunds(account.id, result.net_amount, currency);
        await this.updateCashTransaction(transaction.id, {
          status: 'completed',
          processed_at: new Date(),
          completed_at: new Date()
        });
      }

      // Emit event for real-time updates
      this.emit('depositProcessed', {
        user_id: userId,
        transaction_id: transaction.id,
        amount: amount,
        currency: currency,
        status: result.status
      });

      return transaction;
    } catch (error) {
      logger.error('Error processing deposit:', error);
      throw error;
    }
  }

  // Process withdrawal via various payment methods
  async processWithdrawal(userId, withdrawalData) {
    try {
      const account = await this.getCashAccount(userId);
      if (!account) {
        throw new Error('Cash account not found');
      }

      const { amount, currency, payment_method, payment_provider, bank_account_id, digital_wallet_id } = withdrawalData;

      // Validate payment method and provider
      await this.validatePaymentMethod(payment_method, payment_provider, currency);

      // Check available balance
      const availableBalance = this.getBalanceInCurrency(account, currency);
      if (availableBalance < amount) {
        throw new Error(`Insufficient funds. Available: ${availableBalance} ${currency}, Requested: ${amount} ${currency}`);
      }

      // Check daily and monthly limits
      await this.checkWithdrawalLimits(account, amount, currency);

      // Create cash transaction
      const transaction = await this.createCashTransaction({
        user_id: userId,
        account_id: account.id,
        transaction_type: 'WITHDRAWAL',
        amount: amount,
        currency: currency,
        payment_method: payment_method,
        payment_provider: payment_provider,
        bank_account_id: bank_account_id,
        digital_wallet_id: digital_wallet_id,
        status: 'pending'
      });

      // Reserve funds
      await this.reserveFunds(account.id, amount, currency);

      // Process based on payment method
      let result;
      switch (payment_method) {
        case 'RAAST':
          result = await this.processRaastWithdrawal(transaction, withdrawalData);
          break;
        case 'BANK_TRANSFER':
          result = await this.processBankTransferWithdrawal(transaction, withdrawalData);
          break;
        case 'WIRE':
          result = await this.processWireWithdrawal(transaction, withdrawalData);
          break;
        case 'ACH':
          result = await this.processACHWithdrawal(transaction, withdrawalData);
          break;
        case 'CARD':
          result = await this.processCardWithdrawal(transaction, withdrawalData);
          break;
        case 'DIGITAL_WALLET':
          result = await this.processDigitalWalletWithdrawal(transaction, withdrawalData);
          break;
        default:
          throw new Error(`Unsupported payment method: ${payment_method}`);
      }

      // Update transaction with provider response
      await this.updateCashTransaction(transaction.id, {
        provider_transaction_id: result.provider_transaction_id,
        provider_reference: result.provider_reference,
        status: result.status,
        processing_fee: result.processing_fee || 0,
        net_amount: amount - (result.processing_fee || 0)
      });

      // If successful, deduct funds from account
      if (result.status === 'completed') {
        await this.deductFunds(account.id, result.net_amount, currency);
        await this.unreserveFunds(account.id, amount, currency);
        await this.updateCashTransaction(transaction.id, {
          status: 'completed',
          processed_at: new Date(),
          completed_at: new Date()
        });
      }

      // Emit event for real-time updates
      this.emit('withdrawalProcessed', {
        user_id: userId,
        transaction_id: transaction.id,
        amount: amount,
        currency: currency,
        status: result.status
      });

      return transaction;
    } catch (error) {
      logger.error('Error processing withdrawal:', error);
      throw error;
    }
  }

  // Get account balance
  async getAccountBalance(userId, currency = null) {
    try {
      const account = await this.getCashAccount(userId);
      if (!account) {
        throw new Error('Cash account not found');
      }

      if (currency) {
        return {
          available_balance: this.getBalanceInCurrency(account, currency),
          pending_balance: this.getPendingInCurrency(account, currency),
          reserved_balance: this.getReservedInCurrency(account, currency),
          total_balance: this.getTotalInCurrency(account, currency),
          currency: currency
        };
      }

      // Return all currency balances
      const balances = {};
      for (const curr of this.supportedCurrencies) {
        balances[curr.toLowerCase()] = {
          available: this.getBalanceInCurrency(account, curr),
          pending: this.getPendingInCurrency(account, curr),
          reserved: this.getReservedInCurrency(account, curr),
          total: this.getTotalInCurrency(account, curr)
        };
      }

      return {
        base_currency: account.base_currency,
        balances: balances,
        account_number: account.account_number,
        status: account.status
      };
    } catch (error) {
      logger.error('Error getting account balance:', error);
      throw error;
    }
  }

  // Get transaction history
  async getTransactionHistory(userId, filters = {}) {
    try {
      const {
        type = 'all', // 'all', 'trading', 'cash', 'deposit', 'withdrawal'
        currency = null,
        start_date = null,
        end_date = null,
        limit = 100,
        offset = 0
      } = filters;

      let query = '';
      let params = [userId];
      let paramIndex = 2;

      if (type === 'trading') {
        query = `
          SELECT 
            id, transaction_type, asset_type, asset_symbol, asset_name,
            quantity, price_per_unit, total_amount, currency, net_amount,
            status, created_at, executed_at, settled_at
          FROM trading_transactions 
          WHERE user_id = $1
        `;
      } else if (type === 'cash') {
        query = `
          SELECT 
            id, transaction_type, amount, currency, payment_method,
            payment_provider, status, net_amount, created_at, processed_at, completed_at
          FROM cash_transactions 
          WHERE user_id = $1
        `;
      } else if (type === 'deposit') {
        query = `
          SELECT 
            id, transaction_type, amount, currency, payment_method,
            payment_provider, status, net_amount, created_at, processed_at, completed_at
          FROM cash_transactions 
          WHERE user_id = $1 AND transaction_type = 'DEPOSIT'
        `;
      } else if (type === 'withdrawal') {
        query = `
          SELECT 
            id, transaction_type, amount, currency, payment_method,
            payment_provider, status, net_amount, created_at, processed_at, completed_at
          FROM cash_transactions 
          WHERE user_id = $1 AND transaction_type = 'WITHDRAWAL'
        `;
      } else {
        // Combined query for all transactions
        query = `
          SELECT 
            'trading' as transaction_category, id, transaction_type, asset_type, asset_symbol, asset_name,
            quantity, price_per_unit, total_amount, currency, net_amount,
            status, created_at, executed_at, settled_at, null as payment_method, null as payment_provider
          FROM trading_transactions 
          WHERE user_id = $1
          UNION ALL
          SELECT 
            'cash' as transaction_category, id, transaction_type, null as asset_type, null as asset_symbol, null as asset_name,
            null as quantity, null as price_per_unit, amount as total_amount, currency, net_amount,
            status, created_at, null as executed_at, completed_at as settled_at, payment_method, payment_provider
          FROM cash_transactions 
          WHERE user_id = $1
          ORDER BY created_at DESC
        `;
      }

      // Add currency filter
      if (currency) {
        query += ` AND currency = $${paramIndex++}`;
        params.push(currency);
      }

      // Add date filters
      if (start_date) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(start_date);
      }
      if (end_date) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(end_date);
      }

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  // Helper methods
  generateAccountNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CA${timestamp}${random}`;
  }

  getDefaultLimits(country) {
    const limits = {
      PAK: {
        daily_deposit: 1000000, // 1M PKR
        daily_withdrawal: 1000000,
        monthly_deposit: 10000000, // 10M PKR
        monthly_withdrawal: 10000000,
        max_balance: 100000000 // 100M PKR
      },
      US: {
        daily_deposit: 10000, // $10K USD
        daily_withdrawal: 10000,
        monthly_deposit: 100000, // $100K USD
        monthly_withdrawal: 100000,
        max_balance: 1000000 // $1M USD
      },
      default: {
        daily_deposit: 50000,
        daily_withdrawal: 50000,
        monthly_deposit: 500000,
        monthly_withdrawal: 500000,
        max_balance: 5000000
      }
    };

    return limits[country] || limits.default;
  }

  getDefaultMarket(assetType) {
    const markets = {
      'STOCK': 'PSX',
      'ETF': 'PSX',
      'MUTUAL_FUND': 'PSX',
      'BOND': 'PSX',
      'CRYPTO': 'BINANCE',
      'COMMODITY': 'COMEX',
      'FOREX': 'OANDA'
    };
    return markets[assetType] || 'PSX';
  }

  getBalanceInCurrency(account, currency) {
    const balanceField = `${currency.toLowerCase()}_balance`;
    return account[balanceField] || 0;
  }

  getPendingInCurrency(account, currency) {
    const pendingField = `${currency.toLowerCase()}_pending`;
    return account[pendingField] || 0;
  }

  getReservedInCurrency(account, currency) {
    const reservedField = `${currency.toLowerCase()}_reserved`;
    return account[reservedField] || 0;
  }

  getTotalInCurrency(account, currency) {
    return this.getBalanceInCurrency(account, currency) + 
           this.getPendingInCurrency(account, currency) + 
           this.getReservedInCurrency(account, currency);
  }

  async getCashAccount(userId) {
    const result = await pool.query('SELECT * FROM cash_accounts WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  async getTradingTransaction(transactionId) {
    const result = await pool.query('SELECT * FROM trading_transactions WHERE id = $1', [transactionId]);
    return result.rows[0] || null;
  }

  async createTradingTransaction(transactionData) {
    const result = await pool.query(`
      INSERT INTO trading_transactions (
        user_id, account_id, transaction_type, asset_type, asset_symbol, asset_name,
        quantity, price_per_unit, total_amount, currency, commission, taxes,
        exchange_fees, regulatory_fees, other_fees, total_fees, net_amount,
        status, market, exchange
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      transactionData.user_id, transactionData.account_id, transactionData.transaction_type,
      transactionData.asset_type, transactionData.asset_symbol, transactionData.asset_name,
      transactionData.quantity, transactionData.price_per_unit, transactionData.total_amount,
      transactionData.currency, transactionData.commission, transactionData.taxes,
      transactionData.exchange_fees, transactionData.regulatory_fees, transactionData.other_fees,
      transactionData.total_fees, transactionData.net_amount, transactionData.status,
      transactionData.market, transactionData.exchange
    ]);
    return result.rows[0];
  }

  async createCashTransaction(transactionData) {
    const result = await pool.query(`
      INSERT INTO cash_transactions (
        user_id, account_id, transaction_type, amount, currency, payment_method,
        payment_provider, bank_account_id, digital_wallet_id, external_transaction_id,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      transactionData.user_id, transactionData.account_id, transactionData.transaction_type,
      transactionData.amount, transactionData.currency, transactionData.payment_method,
      transactionData.payment_provider, transactionData.bank_account_id, transactionData.digital_wallet_id,
      transactionData.external_transaction_id, transactionData.status
    ]);
    return result.rows[0];
  }

  async updateTradingTransaction(transactionId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await pool.query(`
      UPDATE trading_transactions 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `, [transactionId, ...values]);
    
    return result.rows[0];
  }

  async updateCashTransaction(transactionId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await pool.query(`
      UPDATE cash_transactions 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `, [transactionId, ...values]);
    
    return result.rows[0];
  }

  async addFunds(accountId, amount, currency) {
    const balanceField = `${currency.toLowerCase()}_balance`;
    await pool.query(`
      UPDATE cash_accounts 
      SET ${balanceField} = ${balanceField} + $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [amount, accountId]);
  }

  async deductFunds(accountId, amount, currency) {
    const balanceField = `${currency.toLowerCase()}_balance`;
    await pool.query(`
      UPDATE cash_accounts 
      SET ${balanceField} = ${balanceField} - $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [amount, accountId]);
  }

  async reserveFunds(accountId, amount, currency) {
    const reservedField = `${currency.toLowerCase()}_reserved`;
    await pool.query(`
      UPDATE cash_accounts 
      SET ${reservedField} = ${reservedField} + $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [amount, accountId]);
  }

  async unreserveFunds(accountId, amount, currency) {
    const reservedField = `${currency.toLowerCase()}_reserved`;
    await pool.query(`
      UPDATE cash_accounts 
      SET ${reservedField} = ${reservedField} - $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [amount, accountId]);
  }

  async initializeCurrencyBalances(accountId) {
    // Initialize all currency balances to zero
    const currencies = this.supportedCurrencies.map(curr => `${curr.toLowerCase()}_balance`).join(', ');
    await pool.query(`
      UPDATE cash_accounts 
      SET ${currencies} = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [accountId]);
  }

  async calculateTradingFees(amount, assetType, currency) {
    // This would integrate with your fee calculation service
    const baseCommission = amount * 0.001; // 0.1% base commission
    const taxes = amount * 0.001; // 0.1% taxes
    const exchangeFees = amount * 0.0005; // 0.05% exchange fees
    const regulatoryFees = amount * 0.0001; // 0.01% regulatory fees
    
    return {
      commission: baseCommission,
      taxes: taxes,
      exchange_fees: exchangeFees,
      regulatory_fees: regulatoryFees,
      other_fees: 0,
      total: baseCommission + taxes + exchangeFees + regulatoryFees
    };
  }

  async validatePaymentMethod(paymentMethod, paymentProvider, currency) {
    // Validate payment method and provider combination
    const validCombinations = {
      'RAAST': ['RAAST'],
      'BANK_TRANSFER': ['RAAST', 'WISE', 'BANK_ALFALAH', 'HBL', 'UBL', 'MCB'],
      'WIRE': ['WISE', 'BANK_ALFALAH', 'HBL', 'UBL', 'MCB'],
      'ACH': ['STRIPE', 'SQUARE', 'BRAINTREE'],
      'CARD': ['STRIPE', 'SQUARE', 'BRAINTREE', 'PAYPAL'],
      'DIGITAL_WALLET': ['JAZZCASH', 'EASYPAISA', 'PAYPAL', 'STRIPE']
    };

    if (!validCombinations[paymentMethod] || !validCombinations[paymentMethod].includes(paymentProvider)) {
      throw new Error(`Invalid payment method and provider combination: ${paymentMethod} + ${paymentProvider}`);
    }
  }

  async checkDepositLimits(account, amount, currency) {
    // Check daily and monthly deposit limits
    const today = moment().format('YYYY-MM-DD');
    const monthStart = moment().startOf('month').format('YYYY-MM-DD');
    
    // This would check against actual transaction history
    // For now, we'll use the account limits
    const dailyLimit = account.daily_deposit_limit;
    const monthlyLimit = account.monthly_deposit_limit;
    
    if (amount > dailyLimit) {
      throw new Error(`Deposit amount exceeds daily limit of ${dailyLimit} ${currency}`);
    }
    
    if (amount > monthlyLimit) {
      throw new Error(`Deposit amount exceeds monthly limit of ${monthlyLimit} ${currency}`);
    }
  }

  async checkWithdrawalLimits(account, amount, currency) {
    // Similar to deposit limits check
    const dailyLimit = account.daily_withdrawal_limit;
    const monthlyLimit = account.monthly_withdrawal_limit;
    
    if (amount > dailyLimit) {
      throw new Error(`Withdrawal amount exceeds daily limit of ${dailyLimit} ${currency}`);
    }
    
    if (amount > monthlyLimit) {
      throw new Error(`Withdrawal amount exceeds monthly limit of ${monthlyLimit} ${currency}`);
    }
  }

  // Payment method specific processors (stubs for now)
  async processRaastDeposit(transaction, depositData) {
    // Implement Raast deposit processing
    return {
      provider_transaction_id: `RAAST_${Date.now()}`,
      provider_reference: depositData.raast_reference,
      status: 'completed',
      processing_fee: 0
    };
  }

  async processRaastWithdrawal(transaction, withdrawalData) {
    // Implement Raast withdrawal processing
    return {
      provider_transaction_id: `RAAST_${Date.now()}`,
      provider_reference: `WTH_${Date.now()}`,
      status: 'completed',
      processing_fee: 0
    };
  }

  async processBankTransferDeposit(transaction, depositData) {
    // Implement bank transfer deposit processing
    return {
      provider_transaction_id: `BANK_${Date.now()}`,
      provider_reference: depositData.bank_reference,
      status: 'completed',
      processing_fee: 0
    };
  }

  async processBankTransferWithdrawal(transaction, withdrawalData) {
    // Implement bank transfer withdrawal processing
    return {
      provider_transaction_id: `BANK_${Date.now()}`,
      provider_reference: `WTH_${Date.now()}`,
      status: 'completed',
      processing_fee: 0
    };
  }

  async processWireDeposit(transaction, depositData) {
    // Implement wire deposit processing
    return {
      provider_transaction_id: `WIRE_${Date.now()}`,
      provider_reference: depositData.wire_reference,
      status: 'completed',
      processing_fee: 25
    };
  }

  async processWireWithdrawal(transaction, withdrawalData) {
    // Implement wire withdrawal processing
    return {
      provider_transaction_id: `WIRE_${Date.now()}`,
      provider_reference: `WTH_${Date.now()}`,
      status: 'completed',
      processing_fee: 25
    };
  }

  async processACHDeposit(transaction, depositData) {
    // Implement ACH deposit processing
    return {
      provider_transaction_id: `ACH_${Date.now()}`,
      provider_reference: depositData.ach_reference,
      status: 'completed',
      processing_fee: 0
    };
  }

  async processACHWithdrawal(transaction, withdrawalData) {
    // Implement ACH withdrawal processing
    return {
      provider_transaction_id: `ACH_${Date.now()}`,
      provider_reference: `WTH_${Date.now()}`,
      status: 'completed',
      processing_fee: 0
    };
  }

  async processCardDeposit(transaction, depositData) {
    // Implement card deposit processing
    return {
      provider_transaction_id: `CARD_${Date.now()}`,
      provider_reference: depositData.card_reference,
      status: 'completed',
      processing_fee: transaction.amount * 0.029
    };
  }

  async processCardWithdrawal(transaction, withdrawalData) {
    // Implement card withdrawal processing
    return {
      provider_transaction_id: `CARD_${Date.now()}`,
      provider_reference: `WTH_${Date.now()}`,
      status: 'completed',
      processing_fee: transaction.amount * 0.029
    };
  }

  async processDigitalWalletDeposit(transaction, depositData) {
    // Implement digital wallet deposit processing
    return {
      provider_transaction_id: `WALLET_${Date.now()}`,
      provider_reference: depositData.wallet_reference,
      status: 'completed',
      processing_fee: transaction.amount * 0.01
    };
  }

  async processDigitalWalletWithdrawal(transaction, withdrawalData) {
    // Implement digital wallet withdrawal processing
    return {
      provider_transaction_id: `WALLET_${Date.now()}`,
      provider_reference: `WTH_${Date.now()}`,
      status: 'completed',
      processing_fee: transaction.amount * 0.01
    };
  }
}

module.exports = CashAccountService;
