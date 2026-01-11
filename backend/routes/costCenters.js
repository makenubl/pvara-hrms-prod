/**
 * Cost Center Routes
 * Department/Division cost center management
 */

import express from 'express';
import CostCenter from '../models/CostCenter.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/cost-centers
 * Get all cost centers
 */
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    
    const query = { company: req.user.company };
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const costCenters = await CostCenter.find(query)
      .populate('manager', 'firstName lastName email')
      .populate('parentCostCenter', 'code name')
      .sort({ code: 1 });

    res.json({
      success: true,
      count: costCenters.length,
      data: costCenters
    });
  } catch (error) {
    logger.error('Error fetching cost centers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/cost-centers/:id
 * Get single cost center
 */
router.get('/:id', async (req, res) => {
  try {
    const costCenter = await CostCenter.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('manager', 'firstName lastName email')
      .populate('parentCostCenter', 'code name');

    if (!costCenter) {
      return res.status(404).json({ success: false, message: 'Cost center not found' });
    }

    res.json({ success: true, data: costCenter });
  } catch (error) {
    logger.error('Error fetching cost center:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/cost-centers
 * Create new cost center
 */
router.post('/', authorize('admin', 'finance', 'hr'), async (req, res) => {
  try {
    const { code, name, description, manager, parentCostCenter, budgetLimit } = req.body;

    // Check for duplicate code
    const existing = await CostCenter.findOne({
      company: req.user.company,
      code: code.toUpperCase()
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Cost center code already exists'
      });
    }

    const costCenter = new CostCenter({
      company: req.user.company,
      code: code.toUpperCase(),
      name,
      description,
      manager,
      parentCostCenter,
      budgetLimit,
      createdBy: req.user._id
    });

    await costCenter.save();
    await costCenter.populate('manager', 'firstName lastName email');

    logger.info('Cost center created', { code: costCenter.code, userId: req.user._id });

    res.status(201).json({ success: true, data: costCenter });
  } catch (error) {
    logger.error('Error creating cost center:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/cost-centers/:id
 * Update cost center
 */
router.put('/:id', authorize('admin', 'finance', 'hr'), async (req, res) => {
  try {
    const costCenter = await CostCenter.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!costCenter) {
      return res.status(404).json({ success: false, message: 'Cost center not found' });
    }

    const allowedUpdates = ['name', 'description', 'manager', 'parentCostCenter', 'budgetLimit', 'status'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        costCenter[field] = req.body[field];
      }
    });

    costCenter.updatedBy = req.user._id;
    await costCenter.save();
    await costCenter.populate('manager', 'firstName lastName email');

    logger.info('Cost center updated', { code: costCenter.code, userId: req.user._id });

    res.json({ success: true, data: costCenter });
  } catch (error) {
    logger.error('Error updating cost center:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/cost-centers/:id
 * Delete cost center
 */
router.delete('/:id', authorize('admin', 'finance'), async (req, res) => {
  try {
    const costCenter = await CostCenter.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!costCenter) {
      return res.status(404).json({ success: false, message: 'Cost center not found' });
    }

    // Check for child cost centers
    const hasChildren = await CostCenter.findOne({
      parentCostCenter: costCenter._id,
      status: 'active'
    });

    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cost center with active child cost centers'
      });
    }

    // Check for budget allocations
    const Budget = (await import('../models/Budget.js')).default;
    const hasBudgets = await Budget.findOne({
      costCenter: costCenter._id
    });

    if (hasBudgets) {
      costCenter.status = 'inactive';
      await costCenter.save();
      return res.json({
        success: true,
        message: 'Cost center deactivated (has budget allocations)',
        data: costCenter
      });
    }

    await costCenter.deleteOne();

    logger.info('Cost center deleted', { code: costCenter.code, userId: req.user._id });

    res.json({ success: true, message: 'Cost center deleted successfully' });
  } catch (error) {
    logger.error('Error deleting cost center:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
