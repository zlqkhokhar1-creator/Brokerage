/**
 * AI Service Client
 * Handles communication with the Python AI/ML service
 */

const axios = require('axios');
const FormData = require('form-data');

class AIService {
    constructor(aiServiceUrl, logger) {
        this.baseURL = aiServiceUrl;
        this.logger = logger;
        this.client = axios.create({
            baseURL: aiServiceUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Categorize a transaction using AI
     */
    async categorizeTransaction(transactionData) {
        try {
            const response = await this.client.post('/api/v1/categorize/transaction', {
                description: transactionData.description,
                amount: transactionData.amount,
                merchant_name: transactionData.merchant_name,
                user_id: transactionData.user_id,
                context: transactionData.context
            });

            return response.data;
        } catch (error) {
            this.logger.error('AI categorization error:', error);
            throw new Error('Failed to categorize transaction');
        }
    }

    /**
     * Parse SMS from Pakistani banks
     */
    async parseSMS(smsText, bankName, userId) {
        try {
            const response = await this.client.post('/api/v1/parse/sms', {
                sms_text: smsText,
                bank_name: bankName,
                user_id: userId
            });

            return response.data;
        } catch (error) {
            this.logger.error('SMS parsing error:', error);
            throw new Error('Failed to parse SMS');
        }
    }

    /**
     * Scan receipt image
     */
    async scanReceipt(imageUrl, imageData, userId) {
        try {
            const response = await this.client.post('/api/v1/scan/receipt', {
                image_url: imageUrl,
                image_data: imageData,
                user_id: userId
            });

            return response.data;
        } catch (error) {
            this.logger.error('Receipt scanning error:', error);
            throw new Error('Failed to scan receipt');
        }
    }

    /**
     * Analyze financial health
     */
    async analyzeFinancialHealth(userId, periodMonths = 6, includePredictions = true) {
        try {
            const response = await this.client.post('/api/v1/analyze/financial-health', {
                user_id: userId,
                period_months: periodMonths,
                include_predictions: includePredictions
            });

            return response.data;
        } catch (error) {
            this.logger.error('Financial health analysis error:', error);
            throw new Error('Failed to analyze financial health');
        }
    }

    /**
     * Get investment advice
     */
    async getInvestmentAdvice(userId, investmentAmount, timeHorizon, riskTolerance, goals = []) {
        try {
            const response = await this.client.post('/api/v1/advice/investment', {
                user_id: userId,
                investment_amount: investmentAmount,
                time_horizon: timeHorizon,
                risk_tolerance: riskTolerance,
                goals: goals
            });

            return response.data;
        } catch (error) {
            this.logger.error('Investment advice error:', error);
            throw new Error('Failed to get investment advice');
        }
    }

    /**
     * Detect anomalies in spending
     */
    async detectAnomalies(userId, periodDays = 30, threshold = 0.8) {
        try {
            const response = await this.client.post('/api/v1/detect/anomalies', {
                user_id: userId,
                period_days: periodDays,
                threshold: threshold
            });

            return response.data;
        } catch (error) {
            this.logger.error('Anomaly detection error:', error);
            throw new Error('Failed to detect anomalies');
        }
    }

    /**
     * Predict future spending
     */
    async predictSpending(userId, predictionType = 'spending', periodDays = 30, categories = null) {
        try {
            const response = await this.client.post('/api/v1/predict/spending', {
                user_id: userId,
                prediction_type: predictionType,
                period_days: periodDays,
                categories: categories
            });

            return response.data;
        } catch (error) {
            this.logger.error('Spending prediction error:', error);
            throw new Error('Failed to predict spending');
        }
    }

    /**
     * Batch categorize transactions
     */
    async batchCategorizeTransactions(transactions) {
        try {
            const response = await this.client.post('/api/v1/categorize/batch', transactions);
            return response.data;
        } catch (error) {
            this.logger.error('Batch categorization error:', error);
            throw new Error('Failed to categorize transactions in batch');
        }
    }

    /**
     * Batch parse SMS messages
     */
    async batchParseSMS(smsMessages) {
        try {
            const response = await this.client.post('/api/v1/parse/sms/batch', smsMessages);
            return response.data;
        } catch (error) {
            this.logger.error('Batch SMS parsing error:', error);
            throw new Error('Failed to parse SMS messages in batch');
        }
    }

    /**
     * Get AI service health status
     */
    async getHealthStatus() {
        try {
            const response = await this.client.get('/health');
            return response.data;
        } catch (error) {
            this.logger.error('AI service health check error:', error);
            return { status: 'unhealthy', error: error.message };
        }
    }

    /**
     * Get model status
     */
    async getModelStatus() {
        try {
            const response = await this.client.get('/api/v1/models/status');
            return response.data;
        } catch (error) {
            this.logger.error('Model status error:', error);
            throw new Error('Failed to get model status');
        }
    }

    /**
     * Retrain AI models
     */
    async retrainModels() {
        try {
            const response = await this.client.post('/api/v1/train/models');
            return response.data;
        } catch (error) {
            this.logger.error('Model retraining error:', error);
            throw new Error('Failed to retrain models');
        }
    }

    /**
     * Upload image for processing
     */
    async uploadImage(imageBuffer, filename) {
        try {
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: filename,
                contentType: 'image/jpeg'
            });

            const response = await this.client.post('/api/v1/upload/image', formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });

            return response.data;
        } catch (error) {
            this.logger.error('Image upload error:', error);
            throw new Error('Failed to upload image');
        }
    }

    /**
     * Process image with OCR
     */
    async processImageWithOCR(imageUrl) {
        try {
            const response = await this.client.post('/api/v1/process/ocr', {
                image_url: imageUrl
            });

            return response.data;
        } catch (error) {
            this.logger.error('OCR processing error:', error);
            throw new Error('Failed to process image with OCR');
        }
    }

    /**
     * Get supported banks for SMS parsing
     */
    async getSupportedBanks() {
        try {
            const response = await this.client.get('/api/v1/banks/supported');
            return response.data;
        } catch (error) {
            this.logger.error('Get supported banks error:', error);
            return [];
        }
    }

    /**
     * Add custom SMS template
     */
    async addCustomSMSTemplate(bankName, templateRegex, groups) {
        try {
            const response = await this.client.post('/api/v1/sms/template', {
                bank_name: bankName,
                template_regex: templateRegex,
                groups: groups
            });

            return response.data;
        } catch (error) {
            this.logger.error('Add custom SMS template error:', error);
            throw new Error('Failed to add custom SMS template');
        }
    }

    /**
     * Test AI service connection
     */
    async testConnection() {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        } catch (error) {
            this.logger.error('AI service connection test failed:', error);
            return false;
        }
    }
}

module.exports = AIService;
