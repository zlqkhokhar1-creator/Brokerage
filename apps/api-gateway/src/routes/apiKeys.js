const express = require('express');
const { authenticateToken } = require('../middleware');
const apiKeyService = require('../services/apiKeyService');

const router = express.Router();

// Get all of the user's active API keys
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const keys = await apiKeyService.getUserApiKeys(req.user.id);
    res.json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
});

// Create a new API key
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { keyName, permissions } = req.body;
    if (!keyName || !permissions) {
      return res.status(400).json({ success: false, error: 'keyName and permissions are required.' });
    }
    
    // The secretKey is only returned on creation
    const { publicKey, secretKey } = await apiKeyService.createApiKey(req.user.id, keyName, permissions);
    
    res.status(201).json({
      success: true,
      message: 'API Key created successfully. This is the only time the secret key will be shown.',
      data: { publicKey, secretKey }
    });
  } catch (error) {
    next(error);
  }
});

// Revoke (delete) an API key
router.delete('/:publicKey', authenticateToken, async (req, res, next) => {
  try {
    const { publicKey } = req.params;
    await apiKeyService.revokeApiKey(req.user.id, publicKey);
    res.json({ success: true, message: 'API key successfully revoked.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
