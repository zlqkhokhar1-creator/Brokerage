/**
 * Personal Finance Management API Service
 * Main Express.js server for the PFM microservice
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const Redis = require('redis');
const axios = require('axios');
const winston = require('winston');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

// Import services
const TransactionService = require('./services/transactionService');
const BudgetService = require('./services/budgetService');
const GoalService = require('./services/goalService');
const AnalyticsService = require('./services/analyticsService');
const NotificationService = require('./services/notificationService');
const AIService = require('./services/aiService');

// Import middleware
const authMiddleware = require('./middleware/auth');
const validationMiddleware = require('./middleware/validation');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const goalRoutes = require('./routes/goals');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');

// Load environment variables
require('dotenv').config();

// Initialize logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'personal-finance-management' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'personal_finance',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis connection
const redis = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
});

redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
    logger.info('Connected to Redis');
});

// Initialize services
const transactionService = new TransactionService(pool, redis, logger);
const budgetService = new BudgetService(pool, redis, logger);
const goalService = new GoalService(pool, redis, logger);
const analyticsService = new AnalyticsService(pool, redis, logger);
const notificationService = new NotificationService(pool, redis, logger);
const aiService = new AIService(process.env.AI_SERVICE_URL || 'http://localhost:8001', logger);

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'personal-finance-management',
        version: '1.0.0'
    });
});

// API routes
app.use('/api/v1/transactions', transactionRoutes(transactionService, aiService));
app.use('/api/v1/budgets', budgetRoutes(budgetService));
app.use('/api/v1/goals', goalRoutes(goalService));
app.use('/api/v1/analytics', analyticsRoutes(analyticsService));
app.use('/api/v1/notifications', notificationRoutes(notificationService));
app.use('/api/v1/ai', aiRoutes(aiService));

// SMS parsing endpoint
app.post('/api/v1/parse/sms', 
    authMiddleware,
    [
        body('sms_text').notEmpty().withMessage('SMS text is required'),
        body('bank_name').notEmpty().withMessage('Bank name is required'),
        body('user_id').isUUID().withMessage('Valid user ID is required')
    ],
    validationMiddleware,
    async (req, res) => {
        try {
            const { sms_text, bank_name, user_id } = req.body;
            
            const result = await aiService.parseSMS(sms_text, bank_name, user_id);
            
            if (result.success) {
                // Create transaction from parsed SMS
                const transaction = await transactionService.createTransaction({
                    user_id,
                    amount: result.amount,
                    description: `SMS: ${result.merchant_name}`,
                    merchant_name: result.merchant_name,
                    transaction_date: result.transaction_date,
                    transaction_type: result.transaction_type,
                    sms_source: 'sms',
                    sms_raw_text: sms_text,
                    sms_parsed_data: result.raw_data
                });
                
                res.json({
                    success: true,
                    transaction,
                    parsed_data: result
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error_message
                });
            }
        } catch (error) {
            logger.error('SMS parsing error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to parse SMS'
            });
        }
    }
);

// Receipt scanning endpoint
app.post('/api/v1/scan/receipt',
    authMiddleware,
    [
        body('image_url').optional().isURL().withMessage('Valid image URL required'),
        body('image_data').optional().isBase64().withMessage('Valid base64 image data required'),
        body('user_id').isUUID().withMessage('Valid user ID is required')
    ],
    validationMiddleware,
    async (req, res) => {
        try {
            const { image_url, image_data, user_id } = req.body;
            
            const result = await aiService.scanReceipt(image_url, image_data, user_id);
            
            if (result.success) {
                // Create transaction from scanned receipt
                const transaction = await transactionService.createTransaction({
                    user_id,
                    amount: result.total_amount,
                    description: `Receipt: ${result.merchant_name}`,
                    merchant_name: result.merchant_name,
                    transaction_date: result.transaction_date,
                    transaction_type: 'expense',
                    receipt_image_url: image_url,
                    receipt_ocr_data: result.raw_ocr_data
                });
                
                res.json({
                    success: true,
                    transaction,
                    scanned_data: result
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error_message
                });
            }
        } catch (error) {
            logger.error('Receipt scanning error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to scan receipt'
            });
        }
    }
);

// Financial health analysis endpoint
app.get('/api/v1/health-analysis/:userId',
    authMiddleware,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { period_months = 6, include_predictions = true } = req.query;
            
            const healthData = await aiService.analyzeFinancialHealth(
                userId,
                parseInt(period_months),
                include_predictions === 'true'
            );
            
            res.json(healthData);
        } catch (error) {
            logger.error('Financial health analysis error:', error);
            res.status(500).json({
                error: 'Failed to analyze financial health'
            });
        }
    }
);

// Investment advice endpoint
app.post('/api/v1/investment-advice',
    authMiddleware,
    [
        body('user_id').isUUID().withMessage('Valid user ID is required'),
        body('investment_amount').isFloat({ min: 0 }).withMessage('Valid investment amount required'),
        body('time_horizon').isInt({ min: 1 }).withMessage('Valid time horizon required'),
        body('risk_tolerance').isIn(['conservative', 'moderate', 'aggressive']).withMessage('Valid risk tolerance required')
    ],
    validationMiddleware,
    async (req, res) => {
        try {
            const { user_id, investment_amount, time_horizon, risk_tolerance, goals = [] } = req.body;
            
            const advice = await aiService.getInvestmentAdvice(
                user_id,
                investment_amount,
                time_horizon,
                risk_tolerance,
                goals
            );
            
            res.json(advice);
        } catch (error) {
            logger.error('Investment advice error:', error);
            res.status(500).json({
                error: 'Failed to get investment advice'
            });
        }
    }
);

// Scheduled jobs
cron.schedule('0 0 * * *', async () => {
    // Daily job: Process pending transactions, send notifications
    logger.info('Running daily scheduled job...');
    
    try {
        // Process pending transactions
        await transactionService.processPendingTransactions();
        
        // Send daily notifications
        await notificationService.sendDailyNotifications();
        
        // Update financial health scores
        await analyticsService.updateFinancialHealthScores();
        
        logger.info('Daily scheduled job completed');
    } catch (error) {
        logger.error('Daily scheduled job failed:', error);
    }
});

cron.schedule('0 0 1 * *', async () => {
    // Monthly job: Generate monthly reports, update budgets
    logger.info('Running monthly scheduled job...');
    
    try {
        // Generate monthly reports
        await analyticsService.generateMonthlyReports();
        
        // Update budget progress
        await budgetService.updateMonthlyBudgetProgress();
        
        // Send monthly summaries
        await notificationService.sendMonthlySummaries();
        
        logger.info('Monthly scheduled job completed');
    } catch (error) {
        logger.error('Monthly scheduled job failed:', error);
    }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    
    // Close database connections
    await pool.end();
    
    // Close Redis connection
    await redis.quit();
    
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    
    // Close database connections
    await pool.end();
    
    // Close Redis connection
    await redis.quit();
    
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    logger.info(`Personal Finance Management API server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
    logger.info(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
    logger.info(`AI Service: ${process.env.AI_SERVICE_URL || 'http://localhost:8001'}`);
});

module.exports = app;
