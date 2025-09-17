const axios = require('axios');
const { logger } = require('./logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:5001';

/**
 * Gets the sentiment of a given text by calling the AI service.
 * @param {string} text - The text to analyze.
 * @returns {Promise<object>} The sentiment analysis result.
 */
const getSentimentAnalysis = async (text) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/sentiment`, { text });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI sentiment analysis service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    // Return a neutral sentiment as a fallback
    return {
      success: false,
      sentiment: {
        polarity: 0,
        subjectivity: 0.5
      }
    };
  }
};

/**
 * Gets AI-powered trade recommendations for a user.
 * @param {object} portfolio - The user's current portfolio.
 * @param {string} riskProfile - The user's risk profile.
 * @returns {Promise<object>} The trade recommendations.
 */
const getTradeRecommendations = async (portfolio, riskProfile) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/trade-recommendations`, {
      portfolio,
      riskProfile,
    });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI trade recommendation service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      recommendations: []
    };
  }
};

/**
 * Gets an optimized portfolio allocation for a user.
 * @param {object} portfolio - The user's current portfolio.
 * @param {string} riskProfile - The user's risk profile.
 * @returns {Promise<object>} The optimized portfolio allocation.
 */
const getPortfolioOptimization = async (portfolio, riskProfile) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/portfolio-optimization`, {
      portfolio,
      riskProfile,
    });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI portfolio optimization service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      optimized_allocation: {}
    };
  }
};

/**
 * Gets a fraud risk score for a given user activity.
 * @param {object} activityData - Data about the user's activity.
 * @returns {Promise<object>} The fraud risk assessment.
 */
const getFraudRiskScore = async (activityData) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/fraud-detection`, { activityData });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI fraud detection service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      risk_score: 0,
      is_suspicious: false
    };
  }
};

/**
 * Gets a dynamically updated risk profile based on a user's trading history.
 * @param {Array<object>} tradeHistory - The user's recent trades.
 * @param {string} currentProfile - The user's current risk profile.
 * @returns {Promise<object>} The dynamic risk profile assessment.
 */
const getDynamicRiskProfile = async (tradeHistory, currentProfile) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/dynamic-risk-profile`, {
      tradeHistory,
      currentProfile,
    });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI dynamic risk profiling service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      updated_risk_profile: currentProfile // Return original profile on error
    };
  }
};

/**
 * Gets tax-loss harvesting opportunities for a given portfolio.
 * @param {object} portfolio - The user's current portfolio.
 * @returns {Promise<object>} A list of tax-loss harvesting opportunities.
 */
const getTaxLossHarvestingOpportunities = async (portfolio) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/tax-loss-harvesting`, { portfolio });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI tax-loss harvesting service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      opportunities: []
    };
  }
};

/**
 * Gets a personalized news feed for a user based on their interests.
 * @param {Array<string>} symbols - A list of symbols the user is interested in.
 * @returns {Promise<object>} A personalized news feed.
 */
const getPersonalizedNews = async (symbols) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/personalized-news`, { symbols });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI personalized news service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      news_feed: []
    };
  }
};

/**
 * Sends a document to the AI service for KYC verification.
 * @param {object} file - The file object from the request.
 * @param {object} user - The user object from the database.
 * @returns {Promise<object>} The verification result from the AI service.
 */
const verifyKycDocument = async (file, user) => {
  try {
    const formData = new FormData();
    formData.append('document', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    formData.append('first_name', user.first_name);
    formData.append('last_name', user.last_name);
    
    const response = await axios.post(`${AI_SERVICE_URL}/ai/verify-document`, formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  } catch (error) {
    logger.error('Error calling AI KYC document verification service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      is_verified: false,
      error: 'Failed to communicate with verification service.'
    };
  }
};

/**
 * Gets a volatility prediction for a given set of historical prices.
 * @param {Array<number>} prices - A list of historical closing prices.
 * @returns {Promise<object>} The volatility prediction from the AI service.
 */
const getVolatilityPrediction = async (prices) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/predict-volatility`, { prices });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI volatility prediction service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      error: 'Failed to communicate with prediction service.'
    };
  }
};

/**
 * Gets a dynamic ESG score for a given stock symbol.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object>} The ESG score from the AI service.
 */
const getEsgScore = async (symbol) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/esg-score`, { symbol });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI ESG scoring service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      error: 'Failed to communicate with ESG scoring service.'
    };
  }
};

/**
 * Sends a support ticket to the AI service for analysis.
 * @param {string} ticketText - The text content of the support ticket.
 * @returns {Promise<object>} The analysis from the AI service.
 */
const analyzeSupportTicket = async (ticketText) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/ai/analyze-support-ticket`, { ticket_text: ticketText });
    return response.data;
  } catch (error) {
    logger.error('Error calling AI support ticket analysis service', {
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
    return {
      success: false,
      error: 'Failed to communicate with analysis service.'
    };
  }
};

module.exports = {
  getSentimentAnalysis,
  getTradeRecommendations,
  getPortfolioOptimization,
  getFraudRiskScore,
  getDynamicRiskProfile,
  getTaxLossHarvestingOpportunities,
  getPersonalizedNews,
  verifyKycDocument,
  getVolatilityPrediction,
  getEsgScore,
  analyzeSupportTicket
};
