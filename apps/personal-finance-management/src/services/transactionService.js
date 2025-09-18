/**
 * Transaction Service
 * Handles all transaction-related operations
 */

const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class TransactionService {
    constructor(pool, redis, logger) {
        this.pool = pool;
        this.redis = redis;
        this.logger = logger;
    }

    /**
     * Create a new transaction
     */
    async createTransaction(transactionData) {
        const client = await this.pool.connect();
        try {
            const {
                user_id,
                amount,
                currency = 'PKR',
                transaction_type,
                category_id = null,
                income_category_id = null,
                description,
                merchant_name = null,
                payment_method = null,
                payment_gateway = null,
                transaction_date = new Date(),
                sms_source = null,
                sms_raw_text = null,
                sms_parsed_data = null,
                receipt_image_url = null,
                receipt_ocr_data = null,
                latitude = null,
                longitude = null,
                location_name = null
            } = transactionData;

            // Validate required fields
            if (!user_id || !amount || !transaction_type) {
                throw new Error('Missing required fields: user_id, amount, transaction_type');
            }

            // Check for duplicates
            const isDuplicate = await this.checkDuplicateTransaction(transactionData);
            if (isDuplicate) {
                throw new Error('Duplicate transaction detected');
            }

            const query = `
                INSERT INTO transactions (
                    id, user_id, amount, currency, transaction_type, category_id,
                    income_category_id, description, merchant_name, payment_method,
                    payment_gateway, transaction_date, sms_source, sms_raw_text,
                    sms_parsed_data, receipt_image_url, receipt_ocr_data,
                    latitude, longitude, location_name, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
                ) RETURNING *
            `;

            const values = [
                uuidv4(), user_id, amount, currency, transaction_type, category_id,
                income_category_id, description, merchant_name, payment_method,
                payment_gateway, transaction_date, sms_source, sms_raw_text,
                sms_parsed_data, receipt_image_url, receipt_ocr_data,
                latitude, longitude, location_name
            ];

            const result = await client.query(query, values);
            const transaction = result.rows[0];

            // Invalidate cache
            await this.invalidateUserCache(user_id);

            // Trigger AI categorization if not already categorized
            if (!category_id && transaction_type === 'expense') {
                this.triggerAICategorization(transaction);
            }

            this.logger.info(`Transaction created: ${transaction.id}`);
            return transaction;

        } catch (error) {
            this.logger.error('Error creating transaction:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get transactions for a user
     */
    async getTransactions(userId, filters = {}) {
        const client = await this.pool.connect();
        try {
            const {
                page = 1,
                limit = 50,
                transaction_type = null,
                category_id = null,
                start_date = null,
                end_date = null,
                min_amount = null,
                max_amount = null,
                merchant_name = null,
                sort_by = 'transaction_date',
                sort_order = 'DESC'
            } = filters;

            const offset = (page - 1) * limit;
            let whereConditions = ['user_id = $1'];
            let values = [userId];
            let paramCount = 1;

            if (transaction_type) {
                paramCount++;
                whereConditions.push(`transaction_type = $${paramCount}`);
                values.push(transaction_type);
            }

            if (category_id) {
                paramCount++;
                whereConditions.push(`category_id = $${paramCount}`);
                values.push(category_id);
            }

            if (start_date) {
                paramCount++;
                whereConditions.push(`transaction_date >= $${paramCount}`);
                values.push(start_date);
            }

            if (end_date) {
                paramCount++;
                whereConditions.push(`transaction_date <= $${paramCount}`);
                values.push(end_date);
            }

            if (min_amount) {
                paramCount++;
                whereConditions.push(`amount >= $${paramCount}`);
                values.push(min_amount);
            }

            if (max_amount) {
                paramCount++;
                whereConditions.push(`amount <= $${paramCount}`);
                values.push(max_amount);
            }

            if (merchant_name) {
                paramCount++;
                whereConditions.push(`merchant_name ILIKE $${paramCount}`);
                values.push(`%${merchant_name}%`);
            }

            const whereClause = whereConditions.join(' AND ');

            // Get total count
            const countQuery = `SELECT COUNT(*) FROM transactions WHERE ${whereClause}`;
            const countResult = await client.query(countQuery, values);
            const totalCount = parseInt(countResult.rows[0].count);

            // Get transactions
            const query = `
                SELECT 
                    t.*,
                    ec.name as category_name,
                    ic.name as income_category_name
                FROM transactions t
                LEFT JOIN expense_categories ec ON t.category_id = ec.id
                LEFT JOIN income_categories ic ON t.income_category_id = ic.id
                WHERE ${whereClause}
                ORDER BY t.${sort_by} ${sort_order}
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            values.push(limit, offset);
            const result = await client.query(query, values);

            return {
                transactions: result.rows,
                pagination: {
                    page,
                    limit,
                    total_count: totalCount,
                    total_pages: Math.ceil(totalCount / limit),
                    has_next: page < Math.ceil(totalCount / limit),
                    has_prev: page > 1
                }
            };

        } catch (error) {
            this.logger.error('Error getting transactions:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get transaction by ID
     */
    async getTransactionById(transactionId) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT 
                    t.*,
                    ec.name as category_name,
                    ic.name as income_category_name
                FROM transactions t
                LEFT JOIN expense_categories ec ON t.category_id = ec.id
                LEFT JOIN income_categories ic ON t.income_category_id = ic.id
                WHERE t.id = $1
            `;

            const result = await client.query(query, [transactionId]);
            return result.rows[0];

        } catch (error) {
            this.logger.error('Error getting transaction by ID:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update transaction
     */
    async updateTransaction(transactionId, updateData) {
        const client = await this.pool.connect();
        try {
            const allowedFields = [
                'amount', 'currency', 'transaction_type', 'category_id',
                'income_category_id', 'description', 'merchant_name',
                'payment_method', 'payment_gateway', 'transaction_date',
                'latitude', 'longitude', 'location_name'
            ];

            const updateFields = [];
            const values = [];
            let paramCount = 0;

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    paramCount++;
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value);
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            paramCount++;
            updateFields.push(`updated_at = NOW()`);
            values.push(transactionId);

            const query = `
                UPDATE transactions 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await client.query(query, values);
            const transaction = result.rows[0];

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Invalidate cache
            await this.invalidateUserCache(transaction.user_id);

            this.logger.info(`Transaction updated: ${transactionId}`);
            return transaction;

        } catch (error) {
            this.logger.error('Error updating transaction:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Delete transaction
     */
    async deleteTransaction(transactionId) {
        const client = await this.pool.connect();
        try {
            // Get transaction first to get user_id
            const transaction = await this.getTransactionById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            const query = 'DELETE FROM transactions WHERE id = $1';
            await client.query(query, [transactionId]);

            // Invalidate cache
            await this.invalidateUserCache(transaction.user_id);

            this.logger.info(`Transaction deleted: ${transactionId}`);
            return { success: true };

        } catch (error) {
            this.logger.error('Error deleting transaction:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get transaction summary for a user
     */
    async getTransactionSummary(userId, period = 'month') {
        const client = await this.pool.connect();
        try {
            let dateFilter = '';
            const values = [userId];

            switch (period) {
                case 'week':
                    dateFilter = 'AND transaction_date >= NOW() - INTERVAL \'7 days\'';
                    break;
                case 'month':
                    dateFilter = 'AND transaction_date >= NOW() - INTERVAL \'30 days\'';
                    break;
                case 'year':
                    dateFilter = 'AND transaction_date >= NOW() - INTERVAL \'365 days\'';
                    break;
                default:
                    dateFilter = 'AND transaction_date >= NOW() - INTERVAL \'30 days\'';
            }

            const query = `
                SELECT 
                    transaction_type,
                    COUNT(*) as count,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount,
                    MIN(amount) as min_amount,
                    MAX(amount) as max_amount
                FROM transactions 
                WHERE user_id = $1 ${dateFilter}
                GROUP BY transaction_type
            `;

            const result = await client.query(query, values);
            
            const summary = {
                period,
                total_transactions: 0,
                total_income: 0,
                total_expenses: 0,
                net_amount: 0,
                by_type: {}
            };

            result.rows.forEach(row => {
                summary.total_transactions += parseInt(row.count);
                summary.by_type[row.transaction_type] = {
                    count: parseInt(row.count),
                    total_amount: parseFloat(row.total_amount),
                    average_amount: parseFloat(row.average_amount),
                    min_amount: parseFloat(row.min_amount),
                    max_amount: parseFloat(row.max_amount)
                };

                if (row.transaction_type === 'income') {
                    summary.total_income = parseFloat(row.total_amount);
                } else if (row.transaction_type === 'expense') {
                    summary.total_expenses = parseFloat(row.total_amount);
                }
            });

            summary.net_amount = summary.total_income - summary.total_expenses;

            return summary;

        } catch (error) {
            this.logger.error('Error getting transaction summary:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get spending by category
     */
    async getSpendingByCategory(userId, period = 'month') {
        const client = await this.pool.connect();
        try {
            let dateFilter = '';
            const values = [userId];

            switch (period) {
                case 'week':
                    dateFilter = 'AND t.transaction_date >= NOW() - INTERVAL \'7 days\'';
                    break;
                case 'month':
                    dateFilter = 'AND t.transaction_date >= NOW() - INTERVAL \'30 days\'';
                    break;
                case 'year':
                    dateFilter = 'AND t.transaction_date >= NOW() - INTERVAL \'365 days\'';
                    break;
                default:
                    dateFilter = 'AND t.transaction_date >= NOW() - INTERVAL \'30 days\'';
            }

            const query = `
                SELECT 
                    ec.name as category_name,
                    ec.icon as category_icon,
                    ec.color as category_color,
                    COUNT(*) as transaction_count,
                    SUM(t.amount) as total_amount,
                    AVG(t.amount) as average_amount
                FROM transactions t
                LEFT JOIN expense_categories ec ON t.category_id = ec.id
                WHERE t.user_id = $1 
                AND t.transaction_type = 'expense'
                ${dateFilter}
                GROUP BY ec.id, ec.name, ec.icon, ec.color
                ORDER BY total_amount DESC
            `;

            const result = await client.query(query, values);
            return result.rows;

        } catch (error) {
            this.logger.error('Error getting spending by category:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check for duplicate transactions
     */
    async checkDuplicateTransaction(transactionData) {
        const client = await this.pool.connect();
        try {
            const {
                user_id,
                amount,
                merchant_name,
                transaction_date,
                description
            } = transactionData;

            // Check for exact duplicates within 24 hours
            const query = `
                SELECT COUNT(*) 
                FROM transactions 
                WHERE user_id = $1 
                AND amount = $2 
                AND merchant_name = $3 
                AND transaction_date >= $4 - INTERVAL '24 hours'
                AND transaction_date <= $4 + INTERVAL '24 hours'
            `;

            const result = await client.query(query, [
                user_id,
                amount,
                merchant_name,
                transaction_date
            ]);

            return parseInt(result.rows[0].count) > 0;

        } catch (error) {
            this.logger.error('Error checking duplicate transaction:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Process pending transactions (for scheduled jobs)
     */
    async processPendingTransactions() {
        const client = await this.pool.connect();
        try {
            // Find transactions that need AI categorization
            const query = `
                SELECT * FROM transactions 
                WHERE category_id IS NULL 
                AND transaction_type = 'expense'
                AND created_at >= NOW() - INTERVAL '24 hours'
                LIMIT 100
            `;

            const result = await client.query(query);
            const pendingTransactions = result.rows;

            this.logger.info(`Processing ${pendingTransactions.length} pending transactions`);

            for (const transaction of pendingTransactions) {
                try {
                    await this.triggerAICategorization(transaction);
                } catch (error) {
                    this.logger.error(`Error processing transaction ${transaction.id}:`, error);
                }
            }

        } catch (error) {
            this.logger.error('Error processing pending transactions:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Trigger AI categorization for a transaction
     */
    async triggerAICategorization(transaction) {
        try {
            // This would call the AI service to categorize the transaction
            // For now, we'll just log it
            this.logger.info(`Triggering AI categorization for transaction ${transaction.id}`);
            
            // TODO: Implement actual AI service call
            // const aiResult = await this.aiService.categorizeTransaction(transaction);
            // await this.updateTransaction(transaction.id, { category_id: aiResult.category_id });
            
        } catch (error) {
            this.logger.error('Error triggering AI categorization:', error);
        }
    }

    /**
     * Invalidate user cache
     */
    async invalidateUserCache(userId) {
        try {
            const keys = [
                `user:${userId}:transactions:*`,
                `user:${userId}:summary:*`,
                `user:${userId}:categories:*`
            ];

            for (const pattern of keys) {
                const keysToDelete = await this.redis.keys(pattern);
                if (keysToDelete.length > 0) {
                    await this.redis.del(...keysToDelete);
                }
            }
        } catch (error) {
            this.logger.error('Error invalidating user cache:', error);
        }
    }

    /**
     * Get transaction trends
     */
    async getTransactionTrends(userId, period = 'month') {
        const client = await this.pool.connect();
        try {
            let groupBy = '';
            let dateFilter = '';
            const values = [userId];

            switch (period) {
                case 'week':
                    groupBy = 'DATE(transaction_date)';
                    dateFilter = 'AND transaction_date >= NOW() - INTERVAL \'7 days\'';
                    break;
                case 'month':
                    groupBy = 'DATE_TRUNC(\'day\', transaction_date)';
                    dateFilter = 'AND transaction_date >= NOW() - INTERVAL \'30 days\'';
                    break;
                case 'year':
                    groupBy = 'DATE_TRUNC(\'month\', transaction_date)';
                    dateFilter = 'AND transaction_date >= NOW() - INTERVAL \'365 days\'';
                    break;
                default:
                    groupBy = 'DATE_TRUNC(\'day\', transaction_date)';
                    dateFilter = 'AND transaction_date >= NOW() - INTERVAL \'30 days\'';
            }

            const query = `
                SELECT 
                    ${groupBy} as date,
                    transaction_type,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM transactions 
                WHERE user_id = $1 ${dateFilter}
                GROUP BY ${groupBy}, transaction_type
                ORDER BY date ASC
            `;

            const result = await client.query(query, values);
            return result.rows;

        } catch (error) {
            this.logger.error('Error getting transaction trends:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = TransactionService;
