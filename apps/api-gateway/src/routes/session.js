const express = require('express');
const { authenticateToken } = require('../middleware');
const sessionService = require('../services/sessionService');

const router = express.Router();
router.use(authenticateToken);

/**
 * @route GET /sessions
 * @description Gets all active sessions for the current user.
 * @access Private
 */
router.get('/', async (req, res, next) => {
  try {
    const sessions = await sessionService.getUserSessions(req.user.id);
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /sessions/:sessionId
 * @description Invalidates a specific session, effectively logging it out.
 * @access Private
 */
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const success = await sessionService.invalidateSession(req.params.sessionId, req.user.id);
    if (success) {
      res.json({ success: true, message: 'Session successfully invalidated.' });
    } else {
      res.status(404).json({ success: false, message: 'Session not found or not owned by user.' });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
