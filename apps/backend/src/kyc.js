const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/kyc';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.userId}-${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
    }
  }
});

// Get KYC status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT kyc_status, kyc_documents, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      status: user.kyc_status,
      documents: user.kyc_documents || {},
      submittedAt: user.created_at,
      lastUpdated: user.updated_at
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ message: 'Error fetching KYC status' });
  }
});

// Submit KYC documents
router.post('/documents', authenticateToken, upload.fields([
  { name: 'identity_front', maxCount: 1 },
  { name: 'identity_back', maxCount: 1 },
  { name: 'proof_of_address', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
  { name: 'additional_documents', maxCount: 5 }
]), async (req, res) => {
  try {
    const files = req.files;
    const { documentType, notes } = req.body;

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Process uploaded files
    const documentData = {};
    for (const [fieldName, fileArray] of Object.entries(files)) {
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];
        documentData[fieldName] = {
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
      }
    }

    // Get existing documents
    const existingUser = await db.query(`
      SELECT kyc_documents FROM users WHERE id = $1
    `, [req.user.userId]);

    const existingDocuments = existingUser.rows[0]?.kyc_documents || {};
    const updatedDocuments = { ...existingDocuments, ...documentData };

    // Update user with new documents
    await db.query(`
      UPDATE users 
      SET kyc_documents = $1, kyc_status = 'in_review', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(updatedDocuments), req.user.userId]);

    res.json({
      message: 'Documents uploaded successfully',
      status: 'in_review',
      documents: updatedDocuments
    });
  } catch (error) {
    console.error('Upload KYC documents error:', error);
    res.status(500).json({ message: 'Error uploading documents' });
  }
});

// Submit KYC information
router.post('/information', authenticateToken, async (req, res) => {
  const {
    personalInfo,
    addressInfo,
    employmentInfo,
    financialInfo,
    riskAssessment
  } = req.body;

  try {
    // Validate required fields
    if (!personalInfo || !addressInfo || !employmentInfo || !financialInfo) {
      return res.status(400).json({ 
        message: 'Missing required KYC information' 
      });
    }

    // Update user with KYC information
    await db.query(`
      UPDATE users SET 
        first_name = $1,
        last_name = $2,
        date_of_birth = $3,
        nationality = $4,
        phone = $5,
        address_line1 = $6,
        address_line2 = $7,
        city = $8,
        state = $9,
        postal_code = $10,
        country = $11,
        annual_income = $12,
        net_worth = $13,
        risk_profile = $14,
        investment_goals = $15,
        kyc_status = 'in_review',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
    `, [
      personalInfo.firstName,
      personalInfo.lastName,
      personalInfo.dateOfBirth,
      personalInfo.nationality,
      personalInfo.phone,
      addressInfo.line1,
      addressInfo.line2,
      addressInfo.city,
      addressInfo.state,
      addressInfo.postalCode,
      addressInfo.country,
      financialInfo.annualIncome,
      financialInfo.netWorth,
      riskAssessment.riskProfile,
      riskAssessment.investmentGoals,
      req.user.userId
    ]);

    res.json({
      message: 'KYC information submitted successfully',
      status: 'in_review'
    });
  } catch (error) {
    console.error('Submit KYC information error:', error);
    res.status(500).json({ message: 'Error submitting KYC information' });
  }
});

// Complete KYC verification (admin only)
router.post('/verify/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { status, notes } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ 
      message: 'Status must be either approved or rejected' 
    });
  }

  try {
    // Check if user has admin role (simplified check)
    const adminCheck = await db.query(`
      SELECT role FROM users WHERE id = $1
    `, [req.user.userId]);

    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Update user KYC status
    await db.query(`
      UPDATE users 
      SET kyc_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [status, userId]);

    // If approved, activate trading capabilities
    if (status === 'approved') {
      await db.query(`
        UPDATE accounts 
        SET status = 'active' 
        WHERE user_id = $1
      `, [userId]);
    }

    res.json({
      message: `KYC verification ${status} successfully`,
      status: status
    });
  } catch (error) {
    console.error('Verify KYC error:', error);
    res.status(500).json({ message: 'Error verifying KYC' });
  }
});

// Get KYC requirements
router.get('/requirements', authenticateToken, async (req, res) => {
  try {
    const requirements = {
      documents: {
        identity: {
          required: true,
          types: ['passport', 'drivers_license', 'national_id'],
          formats: ['jpeg', 'png', 'pdf'],
          maxSize: '5MB'
        },
        proofOfAddress: {
          required: true,
          types: ['utility_bill', 'bank_statement', 'government_letter'],
          formats: ['jpeg', 'png', 'pdf'],
          maxSize: '5MB',
          maxAge: 90 // days
        },
        selfie: {
          required: true,
          formats: ['jpeg', 'png'],
          maxSize: '5MB'
        }
      },
      information: {
        personal: ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'phone'],
        address: ['line1', 'city', 'state', 'postalCode', 'country'],
        employment: ['employer', 'jobTitle', 'employmentStatus'],
        financial: ['annualIncome', 'netWorth', 'sourceOfFunds']
      },
      riskAssessment: {
        profile: ['conservative', 'moderate', 'aggressive'],
        goals: ['retirement', 'wealth_building', 'education', 'home_purchase']
      }
    };

    res.json(requirements);
  } catch (error) {
    console.error('Get KYC requirements error:', error);
    res.status(500).json({ message: 'Error fetching KYC requirements' });
  }
});

// Download KYC document
router.get('/documents/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Verify file belongs to user
    if (!filename.startsWith(req.user.userId + '-')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join('uploads/kyc', filename);
    
    try {
      await fs.access(filePath);
      res.download(filePath);
    } catch (error) {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('Download KYC document error:', error);
    res.status(500).json({ message: 'Error downloading document' });
  }
});

// Delete KYC document
router.delete('/documents/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Verify file belongs to user
    if (!filename.startsWith(req.user.userId + '-')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join('uploads/kyc', filename);
    
    try {
      await fs.unlink(filePath);
      
      // Update user's document record
      const userResult = await db.query(`
        SELECT kyc_documents FROM users WHERE id = $1
      `, [req.user.userId]);

      if (userResult.rows[0]) {
        const documents = userResult.rows[0].kyc_documents || {};
        const fieldName = Object.keys(documents).find(key => 
          documents[key] && documents[key].filename === filename
        );
        
        if (fieldName) {
          delete documents[fieldName];
          await db.query(`
            UPDATE users 
            SET kyc_documents = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [JSON.stringify(documents), req.user.userId]);
        }
      }

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('Delete KYC document error:', error);
    res.status(500).json({ message: 'Error deleting document' });
  }
});

module.exports = router;


