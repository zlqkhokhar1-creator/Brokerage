const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware');
const profileService = require('../services/profileService');
const { transaction } = require('../config/database');

const router = express.Router();
router.use(authenticateToken);

// Configure multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * @route POST /profile/picture
 * @description Uploads a new profile picture for the user.
 * @access Private
 */
router.post('/picture', upload.single('profilePicture'), async (req, res, next) => {
  try {
    const result = await profileService.uploadProfilePicture(req.user.id, req.file);
    res.json({ success: true, data: { imageUrl: result.imageUrl } });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /profile/security-phrase
 * @description Sets or updates the user's anti-phishing security phrase.
 * @access Private
 */
router.put('/security-phrase', async (req, res, next) => {
    try {
        const { phrase } = req.body;
        if (!phrase || phrase.length < 5) {
            return res.status(400).json({ success: false, message: 'Phrase must be at least 5 characters long.' });
        }
        await transaction(client =>
            client.query('UPDATE users SET security_phrase = $1 WHERE id = $2', [phrase, req.user.id])
        );
        res.json({ success: true, message: 'Security phrase updated successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
