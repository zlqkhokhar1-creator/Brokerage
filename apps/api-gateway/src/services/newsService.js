const axios = require('axios');
const { logger } = require('./logger');
const { ExternalApiError } = require('./errorHandler');
const { getSentimentAnalysis } = require('../services/aiServiceClient');

// Using a free news API for demonstration purposes. 
// A production system would use a premium provider like Bloomberg, Reuters, etc.
const NEWS_API_URL = 'https://newsapi.org/v2/everything';
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'your-news-api-key'; // It's recommended to set this in your environment variables

/**
 * Fetches and analyzes news sentiment for a given stock symbol.
 * @param {string} symbol - The stock symbol (e.g., AAPL).
 * @returns {Promise<Array<object>>} A list of news articles with sentiment scores.
 */
const getNewsWithSentiment = async (symbol) => {
  try {
    const response = await axios.get(NEWS_API_URL, {
      params: {
        q: symbol,
        apiKey: NEWS_API_KEY,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 20
      }
    });

    const articles = response.data.articles || [];

    // Use Promise.all to run sentiment analysis on all articles in parallel
    const articlesWithSentiment = await Promise.all(
      articles.map(async (article) => {
        const sentimentResult = await getSentimentAnalysis(article.title);
        return {
          title: article.title,
          source: article.source.name,
          url: article.url,
          publishedAt: article.publishedAt,
          sentiment: sentimentResult.sentiment
        };
      })
    );

    return articlesWithSentiment;

  } catch (error) {
    logger.error('Failed to fetch news from NewsAPI', { error: error.message });
    throw new ExternalApiError('Could not fetch market news at this time.');
  }
};

module.exports = {
  getNewsWithSentiment
};
