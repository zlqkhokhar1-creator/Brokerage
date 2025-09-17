/**
 * Advanced Features API Routes
 * Exposes all new AI, analytics, education, and advanced trading features
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Import new services
const AIAnalyticsService = require('../services/aiAnalyticsService');
const EducationService = require('../services/educationService');
const PortfolioAnalyticsService = require('../services/portfolioAnalyticsService');
const SecurityComplianceService = require('../services/securityComplianceService');
const SocialCollaborationService = require('../services/socialCollaborationService');
const AdvancedTradingService = require('../services/advancedTradingService');

// Initialize services
const aiAnalytics = new AIAnalyticsService();
const education = new EducationService();
const portfolioAnalytics = new PortfolioAnalyticsService();
const securityCompliance = new SecurityComplianceService();
const socialCollaboration = new SocialCollaborationService();
const advancedTrading = new AdvancedTradingService();

// Validation schemas
const schemas = {
  cashFlowPrediction: Joi.object({
    portfolioId: Joi.string().required(),
    timeHorizon: Joi.string().valid('6M', '1Y', '2Y', '5Y').default('1Y')
  }),
  
  behaviorAnalysis: Joi.object({
    behaviorData: Joi.object().required()
  }),

  tutorialStart: Joi.object({
    tutorialId: Joi.string().required()
  }),

  quizAnswer: Joi.object({
    sessionId: Joi.string().required(),
    questionId: Joi.string().required(),
    answer: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.array()).required()
  }),

  documentUpload: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
    category: Joi.string().required(),
    content: Joi.string().required(),
    size: Joi.number().required(),
    metadata: Joi.object().default({}),
    tags: Joi.array().items(Joi.string()).default([])
  }),

  privacyControls: Joi.object({
    profileVisibility: Joi.string().valid('public', 'friends', 'private'),
    portfolioSharing: Joi.string().valid('all', 'performance_only', 'none'),
    tradeSharing: Joi.string().valid('all', 'summary_only', 'none'),
    performanceSharing: Joi.string().valid('all', 'relatives_only', 'none'),
    socialInteractions: Joi.string().valid('all', 'limited', 'none'),
    dataSharing: Joi.string().valid('all', 'anonymized', 'none'),
    notifications: Joi.string().valid('all', 'essential_only', 'none'),
    activityTracking: Joi.string().valid('full', 'minimal', 'none')
  }),

  paperTradeOrder: Joi.object({
    symbol: Joi.string().required(),
    side: Joi.string().valid('BUY', 'SELL').required(),
    quantity: Joi.number().positive().required(),
    orderType: Joi.string().valid('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT').required(),
    price: Joi.number().positive().when('orderType', { 
      is: Joi.string().valid('LIMIT', 'STOP_LIMIT'), 
      then: Joi.required() 
    }),
    stopPrice: Joi.number().positive().when('orderType', { 
      is: Joi.string().valid('STOP', 'STOP_LIMIT'), 
      then: Joi.required() 
    }),
    timeInForce: Joi.string().valid('GTC', 'IOC', 'FOK', 'DAY').default('GTC')
  })
};

// ===================
// AI ANALYTICS ROUTES
// ===================

// Predictive cash flow management
router.post('/ai-analytics/cash-flow-prediction', async (req, res) => {
  try {
    const { error, value } = schemas.cashFlowPrediction.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const result = await aiAnalytics.predictCashFlow(req.user.id, value.portfolioId, value.timeHorizon);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate weekly insights report
router.get('/ai-analytics/weekly-insights', async (req, res) => {
  try {
    const result = await aiAnalytics.generateWeeklyInsights(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Personalized morning briefing
router.get('/ai-analytics/morning-briefing', async (req, res) => {
  try {
    const result = await aiAnalytics.generateMorningBriefing(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze user behavior for adaptive UI
router.post('/ai-analytics/behavior-analysis', async (req, res) => {
  try {
    const { error, value } = schemas.behaviorAnalysis.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const result = await aiAnalytics.analyzeUserBehavior(req.user.id, value.behaviorData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Personalized news filtering
router.get('/ai-analytics/personalized-news', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const result = await aiAnalytics.getPersonalizedNews(req.user.id, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UI optimization analysis
router.post('/ai-analytics/ui-optimization', async (req, res) => {
  try {
    const result = await aiAnalytics.analyzeUIOptimizations(req.user.id, req.body.uiInteractionData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================
// EDUCATION ROUTES
// ================

// Get interactive tutorials
router.get('/education/tutorials', async (req, res) => {
  try {
    const feature = req.query.feature;
    const result = await education.getInteractiveTutorials(req.user.id, feature);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start tutorial
router.post('/education/tutorials/:tutorialId/start', async (req, res) => {
  try {
    const result = await education.startTutorial(req.user.id, req.params.tutorialId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get market explainers
router.get('/education/explainers', async (req, res) => {
  try {
    const topic = req.query.topic;
    const result = await education.getMarketExplainers(topic);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get personalized learning path
router.get('/education/learning-path', async (req, res) => {
  try {
    const result = await education.getPersonalizedLearningPath(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get gamified modules
router.get('/education/gamified-modules', async (req, res) => {
  try {
    const result = await education.getGamifiedModules(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trading coach feedback
router.get('/education/coach-feedback', async (req, res) => {
  try {
    const tradeId = req.query.tradeId;
    const result = await education.getCoachFeedback(req.user.id, tradeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get case studies
router.get('/education/case-studies', async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    const result = await education.getCaseStudies(category, difficulty);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get webinars
router.get('/education/webinars', async (req, res) => {
  try {
    const upcoming = req.query.upcoming !== 'false';
    const result = await education.getWebinars(upcoming);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register for webinar
router.post('/education/webinars/:webinarId/register', async (req, res) => {
  try {
    const result = await education.registerForWebinar(req.user.id, req.params.webinarId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get quizzes
router.get('/education/quizzes', async (req, res) => {
  try {
    const { topic, difficulty } = req.query;
    const result = await education.getQuizzes(topic, difficulty);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start quiz
router.post('/education/quizzes/:quizId/start', async (req, res) => {
  try {
    const result = await education.startQuiz(req.user.id, req.params.quizId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit quiz answer
router.post('/education/quiz-answer', async (req, res) => {
  try {
    const { error, value } = schemas.quizAnswer.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const result = await education.submitQuizAnswer(value.sessionId, value.questionId, value.answer);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get glossary terms
router.get('/education/glossary', async (req, res) => {
  try {
    const { context, search } = req.query;
    const result = await education.getGlossaryTerms(context, search);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific glossary term
router.get('/education/glossary/:term', async (req, res) => {
  try {
    const context = req.query.context;
    const result = await education.getGlossaryTerm(req.params.term, context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================
// PORTFOLIO ANALYTICS ROUTES
// ==========================

// Performance attribution analysis
router.get('/portfolio-analytics/performance-attribution/:portfolioId', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '1Y';
    const result = await portfolioAnalytics.analyzePerformanceAttribution(req.params.portfolioId, timeframe);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Factor exposure analysis
router.get('/portfolio-analytics/factor-exposure/:portfolioId', async (req, res) => {
  try {
    const result = await portfolioAnalytics.analyzeFactorExposure(req.params.portfolioId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Currency hedging recommendations
router.get('/portfolio-analytics/currency-hedging/:portfolioId', async (req, res) => {
  try {
    const result = await portfolioAnalytics.analyzeCurrencyHedging(req.params.portfolioId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tax impact preview
router.post('/portfolio-analytics/tax-impact-preview/:portfolioId', async (req, res) => {
  try {
    const result = await portfolioAnalytics.previewTaxImpact(req.params.portfolioId, req.body.proposedTrades);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create custom benchmark
router.post('/portfolio-analytics/custom-benchmark', async (req, res) => {
  try {
    const result = await portfolioAnalytics.createCustomBenchmark(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user benchmarks
router.get('/portfolio-analytics/benchmarks', async (req, res) => {
  try {
    const result = await portfolioAnalytics.getUserBenchmarks(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dividend reinvestment planning
router.get('/portfolio-analytics/dividend-reinvestment/:portfolioId', async (req, res) => {
  try {
    const planningHorizon = req.query.planningHorizon || '5Y';
    const result = await portfolioAnalytics.analyzeDividendReinvestment(req.params.portfolioId, planningHorizon);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retirement planning
router.post('/portfolio-analytics/retirement-planning', async (req, res) => {
  try {
    const result = await portfolioAnalytics.calculateRetirementProjections(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================
// SECURITY COMPLIANCE ROUTES
// =========================

// Upload document
router.post('/security-compliance/documents', async (req, res) => {
  try {
    const { error, value } = schemas.documentUpload.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const result = await securityCompliance.uploadDocument(req.user.id, value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user documents
router.get('/security-compliance/documents', async (req, res) => {
  try {
    const category = req.query.category;
    const result = await securityCompliance.getUserDocuments(req.user.id, category);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download document
router.get('/security-compliance/documents/:documentId/download', async (req, res) => {
  try {
    const result = await securityCompliance.downloadDocument(req.user.id, req.params.documentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete document
router.delete('/security-compliance/documents/:documentId', async (req, res) => {
  try {
    const result = await securityCompliance.deleteDocument(req.user.id, req.params.documentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get privacy controls
router.get('/security-compliance/privacy-controls', async (req, res) => {
  try {
    const result = await securityCompliance.getPrivacyControls(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update privacy controls
router.put('/security-compliance/privacy-controls', async (req, res) => {
  try {
    const { error, value } = schemas.privacyControls.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const result = await securityCompliance.updatePrivacyControls(req.user.id, value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get audit logs
router.get('/security-compliance/audit-logs', async (req, res) => {
  try {
    const filters = req.query;
    const result = await securityCompliance.getAuditLogs(req.user.id, filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export audit logs
router.post('/security-compliance/audit-logs/export', async (req, res) => {
  try {
    const result = await securityCompliance.exportAuditLogs(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Security dashboard
router.get('/security-compliance/dashboard', async (req, res) => {
  try {
    const result = await securityCompliance.getSecurityDashboard(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================
// SOCIAL COLLABORATION ROUTES
// ==========================

// Create research workspace
router.post('/social-collaboration/research-workspaces', async (req, res) => {
  try {
    const result = await socialCollaboration.createResearchWorkspace(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user workspaces
router.get('/social-collaboration/research-workspaces', async (req, res) => {
  try {
    const result = await socialCollaboration.getUserWorkspaces(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add research document
router.post('/social-collaboration/research-workspaces/:workspaceId/documents', async (req, res) => {
  try {
    const result = await socialCollaboration.addResearchDocument(req.user.id, req.params.workspaceId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create group analysis session
router.post('/social-collaboration/group-analysis', async (req, res) => {
  try {
    const result = await socialCollaboration.createGroupAnalysisSession(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Join group analysis session
router.post('/social-collaboration/group-analysis/:sessionId/join', async (req, res) => {
  try {
    const result = await socialCollaboration.joinGroupAnalysisSession(req.user.id, req.params.sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get group analysis sessions
router.get('/social-collaboration/group-analysis', async (req, res) => {
  try {
    const filters = req.query;
    const result = await socialCollaboration.getGroupAnalysisSessions(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get expert Q&A sessions
router.get('/social-collaboration/expert-qa', async (req, res) => {
  try {
    const result = await socialCollaboration.getExpertQASessions();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit expert question
router.post('/social-collaboration/expert-qa/questions', async (req, res) => {
  try {
    const result = await socialCollaboration.submitExpertQuestion(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get expert Q&A content
router.get('/social-collaboration/expert-qa/content', async (req, res) => {
  try {
    const { category, expertId } = req.query;
    const result = await socialCollaboration.getExpertQAContent(category, expertId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trading competitions
router.get('/social-collaboration/trading-competitions', async (req, res) => {
  try {
    const status = req.query.status || 'active';
    const result = await socialCollaboration.getTradingCompetitions(status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Join trading competition
router.post('/social-collaboration/trading-competitions/:competitionId/join', async (req, res) => {
  try {
    const result = await socialCollaboration.joinTradingCompetition(req.user.id, req.params.competitionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get competition leaderboard
router.get('/social-collaboration/trading-competitions/:competitionId/leaderboard', async (req, res) => {
  try {
    const result = await socialCollaboration.getCompetitionLeaderboard(req.params.competitionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create trading competition
router.post('/social-collaboration/trading-competitions', async (req, res) => {
  try {
    const result = await socialCollaboration.createTradingCompetition(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get community discussions
router.get('/social-collaboration/community/discussions', async (req, res) => {
  try {
    const category = req.query.category;
    const result = await socialCollaboration.getCommunityDiscussions(category);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create community post
router.post('/social-collaboration/community/posts', async (req, res) => {
  try {
    const result = await socialCollaboration.createCommunityPost(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================
// ADVANCED TRADING ROUTES
// ========================

// Volume profile analysis
router.get('/advanced-trading/volume-profile/:symbol', async (req, res) => {
  try {
    const { timeframe = '1D', analysisType = 'standard' } = req.query;
    const result = await advancedTrading.analyzeVolumeProfile(req.params.symbol, timeframe, analysisType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Multi-timeframe volume profile
router.get('/advanced-trading/volume-profile/:symbol/multi-timeframe', async (req, res) => {
  try {
    const timeframes = req.query.timeframes ? req.query.timeframes.split(',') : ['1H', '4H', '1D'];
    const result = await advancedTrading.getMultiTimeframeVolumeProfile(req.params.symbol, timeframes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configure haptic feedback
router.post('/advanced-trading/haptic-feedback/configure', async (req, res) => {
  try {
    const result = await advancedTrading.configureHapticFeedback(req.user.id, req.body.deviceInfo, req.body.preferences);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger haptic feedback
router.post('/advanced-trading/haptic-feedback/trigger', async (req, res) => {
  try {
    const result = await advancedTrading.triggerHapticFeedback(req.user.id, req.body.eventType, req.body.eventData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create paper trading account
router.post('/advanced-trading/paper-trading/accounts', async (req, res) => {
  try {
    const result = await advancedTrading.createPaperTradingAccount(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute paper trade
router.post('/advanced-trading/paper-trading/accounts/:accountId/trades', async (req, res) => {
  try {
    const { error, value } = schemas.paperTradeOrder.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const result = await advancedTrading.executePaperTrade(req.user.id, req.params.accountId, value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get paper trading performance
router.get('/advanced-trading/paper-trading/accounts/:accountId/performance', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '1M';
    const result = await advancedTrading.getPaperTradingPerformance(req.user.id, req.params.accountId, timeframe);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get paper trading leaderboard
router.get('/advanced-trading/paper-trading/leaderboard', async (req, res) => {
  try {
    const { timeframe = 'monthly', category = 'all' } = req.query;
    const result = await advancedTrading.getPaperTradingLeaderboard(timeframe, category);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Advanced technical analysis
router.get('/advanced-trading/technical-analysis/:symbol', async (req, res) => {
  try {
    const { analysisType = 'comprehensive', ...parameters } = req.query;
    const result = await advancedTrading.performAdvancedAnalysis(req.params.symbol, analysisType, parameters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Setup paper trading alerts
router.post('/advanced-trading/paper-trading/accounts/:accountId/alerts', async (req, res) => {
  try {
    const result = await advancedTrading.setupPaperTradingAlerts(req.user.id, req.params.accountId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;