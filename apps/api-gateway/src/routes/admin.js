const express = require('express');
const { authenticateToken, requireAdminPermission } = require('../middleware');
const adminService = require('../services/adminService');
const { analyzeSupportTicket } = require('../services/aiServiceClient');

const router = express.Router();

// All routes in this file are protected and require base authentication
router.use(authenticateToken);

// GET system health overview
router.get('/health', requireAdminPermission('can_view_system_health'), async (req, res, next) => {
  try {
    const healthData = await adminService.getSystemHealth();
    res.json({ success: true, data: healthData });
  } catch (error) {
    next(error);
  }
});

// GET all users with pagination
router.get('/users', requireAdminPermission('can_view_users'), async (req, res, next) => {
  try {
    const users = await adminService.getAllUsers(req.query);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// PUT to update a user's details
router.put('/users/:userId', requireAdminPermission('can_edit_users'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updatedUser = await adminService.updateUser(userId, req.body);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// --- Support Tools ---

/**
 * @route POST /admin/support/analyze-ticket
 * @description Analyzes a support ticket with AI to determine topic and sentiment.
 * @access Admin
 */
router.post('/support/analyze-ticket', requireAdminPermission('support_tools'), async (req, res, next) => {
  try {
    const { ticketText } = req.body;
    if (!ticketText) {
      return res.status(400).json({ success: false, message: 'ticketText is required.' });
    }
    const result = await analyzeSupportTicket(ticketText);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
