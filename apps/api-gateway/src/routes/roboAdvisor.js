const express = require('express');
const { authenticateToken, requireFeatureAccess } = require('../middleware');
const roboAdvisorService = require('../services/roboAdvisorService');
const rebalancingService = require('../services/rebalancingService');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /robo-advisor/questionnaire
 * @description Gets the risk assessment questionnaire.
 * @access Private
 */
router.get('/questionnaire', requireFeatureAccess('robo_advisor'), async (req, res, next) => {
  try {
    const questions = await roboAdvisorService.getQuestionnaire();
    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /robo-advisor/activate
 * @description Submits the questionnaire and activates the robo-advisor.
 * @access Private
 */
router.post('/activate', requireFeatureAccess('robo_advisor'), async (req, res, next) => {
  try {
    const { answers } = req.body;
    const account = await roboAdvisorService.submitQuestionnaireAndActivate(req.user.id, answers);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /robo-advisor/account
 * @description Gets the user's robo-advisory account details.
 * @access Private
 */
router.get('/account', requireFeatureAccess('robo_advisor'), async (req, res, next) => {
  try {
    const accountDetails = await roboAdvisorService.getRoboAccount(req.user.id);
    if (!accountDetails) {
      return res.status(404).json({ success: false, message: req.t('robo_account_not_found') });
    }
    res.json({ success: true, data: accountDetails });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /robo-advisor/rebalance
 * @description Manually triggers a portfolio rebalance.
 * @access Private
 */
router.post('/rebalance', requireFeatureAccess('robo_advisor'), async (req, res, next) => {
  try {
    const result = await rebalancingService.rebalancePortfolio(req.user.id);
    res.json({ success: true, message: req.t('rebalance_initiated'), data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
