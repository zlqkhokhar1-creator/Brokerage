const express = require('express');
const { authenticateToken } = require('../middleware');
const beneficiaryService = require('../services/beneficiaryService');

const router = express.Router();

// All routes in this file are protected
router.use(authenticateToken);

// GET all beneficiaries for the current user
router.get('/', async (req, res, next) => {
  try {
    const beneficiaries = await beneficiaryService.getBeneficiaries(req.user.id);
    res.json({ success: true, data: beneficiaries });
  } catch (error) {
    next(error);
  }
});

// POST a new beneficiary
router.post('/', async (req, res, next) => {
  try {
    const newBeneficiary = await beneficiaryService.addBeneficiary(req.user.id, req.body);
    res.status(201).json({ success: true, data: newBeneficiary });
  } catch (error) {
    next(error);
  }
});

// PUT to update a beneficiary
router.put('/:beneficiaryId', async (req, res, next) => {
  try {
    const { beneficiaryId } = req.params;
    const updatedBeneficiary = await beneficiaryService.updateBeneficiary(req.user.id, beneficiaryId, req.body);
    res.json({ success: true, data: updatedBeneficiary });
  } catch (error) {
    next(error);
  }
});

// DELETE a beneficiary
router.delete('/:beneficiaryId', async (req, res, next) => {
  try {
    const { beneficiaryId } = req.params;
    await beneficiaryService.deleteBeneficiary(req.user.id, beneficiaryId);
    res.json({ success: true, message: 'Beneficiary successfully deleted.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
