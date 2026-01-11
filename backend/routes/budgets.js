import express from 'express';
import Budget from '../models/Budget.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import CostCenter from '../models/CostCenter.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * @route   GET /api/budgets
 * @desc    Get all budgets for company
 * @access  Private (Admin, Finance)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { fiscalYear, status } = req.query;
    const query = { company: req.user.company };

    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (status) query.status = status;

    const budgets = await Budget.find(query)
      .populate('submittedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: budgets,
    });
  } catch (error) {
    logger.error('Error fetching budgets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/budgets/summary
 * @desc    Get budget summary for dashboard (current fiscal year)
 * @access  Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    // Calculate current Pakistan fiscal year (July-June)
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    const currentFiscalYear = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

    // Get active budget for current fiscal year
    const budget = await Budget.findOne({
      company: req.user.company,
      fiscalYear: currentFiscalYear,
      status: 'active',
    });

    if (!budget) {
      // Return empty summary if no active budget
      return res.json({
        success: true,
        data: {
          fiscalYear: currentFiscalYear,
          totalAllocated: 0,
          totalUtilized: 0,
          totalRemaining: 0,
          utilizationPercent: 0,
          alerts: [],
        },
      });
    }

    // Calculate totals from budget lines (FIX: Use correct field names from Budget model)
    const totalAllocated = budget.lines.reduce((sum, line) => sum + (line.totalBudget || line.originalBudget || 0), 0);
    const totalUtilized = budget.lines.reduce((sum, line) => sum + (line.utilized || 0), 0);
    const totalCommitted = budget.lines.reduce((sum, line) => sum + (line.committed || 0), 0);
    const totalRemaining = totalAllocated - totalUtilized - totalCommitted;
    const utilizationPercent = totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0;

    // Generate alerts for budget lines exceeding thresholds
    const alerts = [];
    budget.lines.forEach(line => {
      const lineTotal = line.totalBudget || line.originalBudget || 0;
      const lineUtilization = lineTotal > 0 
        ? ((line.utilized || 0) / lineTotal) * 100 
        : 0;
      
      if (lineUtilization >= 100) {
        alerts.push({
          type: 'exceeded',
          severity: 'critical',
          message: `Budget exceeded for line ${line.lineNumber}`,
          utilization: lineUtilization,
        });
      } else if (lineUtilization >= 90) {
        alerts.push({
          type: 'warning',
          severity: 'high',
          message: `Budget at ${Math.round(lineUtilization)}% for line ${line.lineNumber}`,
          utilization: lineUtilization,
        });
      } else if (lineUtilization >= 75) {
        alerts.push({
          type: 'caution',
          severity: 'medium',
          message: `Budget at ${Math.round(lineUtilization)}% for line ${line.lineNumber}`,
          utilization: lineUtilization,
        });
      }
    });

    // Overall budget alert
    if (utilizationPercent >= 90) {
      alerts.unshift({
        type: utilizationPercent >= 100 ? 'exceeded' : 'warning',
        severity: utilizationPercent >= 100 ? 'critical' : 'high',
        message: `Overall budget at ${utilizationPercent}%`,
        utilization: utilizationPercent,
      });
    }

    res.json({
      success: true,
      data: {
        fiscalYear: currentFiscalYear,
        budgetId: budget._id,
        budgetTitle: budget.title,
        totalAllocated,
        totalUtilized,
        totalRemaining,
        utilizationPercent,
        alerts: alerts.slice(0, 5), // Return top 5 alerts
        status: budget.status,
      },
    });
  } catch (error) {
    logger.error('Error fetching budget summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/budgets/:id
 * @desc    Get budget by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid budget ID format' });
    }

    const budget = await Budget.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .populate('lines.headOfAccount', 'code name accountType')
      .populate('lines.costCenter', 'code name')
      .populate('submittedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    res.json({ success: true, data: budget });
  } catch (error) {
    logger.error('Error fetching budget:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/budgets/active/:fiscalYear
 * @desc    Get active budget for fiscal year
 * @access  Private
 */
router.get('/active/:fiscalYear', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      company: req.user.company,
      fiscalYear: req.params.fiscalYear,
      status: 'active',
    })
      .populate('lines.headOfAccount', 'code name accountType')
      .populate('lines.costCenter', 'code name');

    if (!budget) {
      return res.status(404).json({ success: false, message: 'No active budget found for this fiscal year' });
    }

    res.json({ success: true, data: budget });
  } catch (error) {
    logger.error('Error fetching active budget:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/budgets
 * @desc    Create new budget
 * @access  Private (Admin, Finance)
 */
router.post('/', authenticate, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { fiscalYear, title, description, budgetType, lines } = req.body;

    // Check if budget already exists for this fiscal year and type
    const existing = await Budget.findOne({
      company: req.user.company,
      fiscalYear,
      budgetType: budgetType || 'original',
    });

    if (existing && budgetType === 'original') {
      return res.status(400).json({
        success: false,
        message: 'Original budget already exists for this fiscal year',
      });
    }

    const budget = new Budget({
      company: req.user.company,
      fiscalYear,
      title,
      description,
      budgetType: budgetType || 'original',
      lines: lines || [],
      history: [{
        action: 'created',
        performedBy: req.user._id,
        performedAt: new Date(),
      }],
    });

    await budget.save();

    logger.info('Budget created', { budgetId: budget._id, fiscalYear });

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    logger.error('Error creating budget:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/budgets/:id
 * @desc    Update budget
 * @access  Private (Admin, Finance)
 */
router.put('/:id', authenticate, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    if (budget.status === 'active' || budget.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify active or closed budget',
      });
    }

    const { title, description, lines } = req.body;

    if (title) budget.title = title;
    if (description) budget.description = description;
    if (lines) budget.lines = lines;

    budget.history.push({
      action: 'updated',
      performedBy: req.user._id,
      performedAt: new Date(),
      changes: req.body,
    });

    await budget.save();

    res.json({ success: true, data: budget });
  } catch (error) {
    logger.error('Error updating budget:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/budgets/:id/lines
 * @desc    Add budget line
 * @access  Private (Admin, Finance)
 */
router.post('/:id/lines', authenticate, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    if (budget.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only add lines to draft budget',
      });
    }

    const { headOfAccount, costCenter, description, originalBudget, alertThreshold, blockThreshold } = req.body;

    // Check if line already exists
    const existingLine = budget.lines.find(
      l => l.headOfAccount.toString() === headOfAccount &&
           (!costCenter || l.costCenter?.toString() === costCenter)
    );

    if (existingLine) {
      return res.status(400).json({
        success: false,
        message: 'Budget line already exists for this account and cost center',
      });
    }

    budget.lines.push({
      headOfAccount,
      costCenter,
      description,
      originalBudget: originalBudget || 0,
      alertThreshold: alertThreshold || 80,
      blockThreshold: blockThreshold || 100,
    });

    budget.history.push({
      action: 'updated',
      performedBy: req.user._id,
      performedAt: new Date(),
      remarks: `Added budget line for account ${headOfAccount}`,
    });

    await budget.save();

    res.json({ success: true, data: budget });
  } catch (error) {
    logger.error('Error adding budget line:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/budgets/:id/submit
 * @desc    Submit budget for approval
 * @access  Private (Admin, Finance)
 */
router.post('/:id/submit', authenticate, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    if (budget.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft budgets can be submitted',
      });
    }

    budget.status = 'submitted';
    budget.submittedBy = req.user._id;
    budget.submittedAt = new Date();
    budget.history.push({
      action: 'submitted',
      performedBy: req.user._id,
      performedAt: new Date(),
    });

    await budget.save();

    res.json({ success: true, data: budget, message: 'Budget submitted for approval' });
  } catch (error) {
    logger.error('Error submitting budget:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/budgets/:id/approve
 * @desc    Approve budget
 * @access  Private (Admin, Chairman)
 */
router.post('/:id/approve', authenticate, authorize('admin', 'chairman'), async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    if (budget.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only submitted budgets can be approved',
      });
    }

    budget.status = 'approved';
    budget.approvedBy = req.user._id;
    budget.approvedAt = new Date();
    budget.history.push({
      action: 'approved',
      performedBy: req.user._id,
      performedAt: new Date(),
      remarks: req.body.remarks,
    });

    await budget.save();

    res.json({ success: true, data: budget, message: 'Budget approved' });
  } catch (error) {
    logger.error('Error approving budget:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/budgets/:id/activate
 * @desc    Activate approved budget
 * @access  Private (Admin)
 */
router.post('/:id/activate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    if (budget.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved budgets can be activated',
      });
    }

    // Deactivate any existing active budget for the same fiscal year
    await Budget.updateMany(
      { company: req.user.company, fiscalYear: budget.fiscalYear, status: 'active' },
      { $set: { status: 'closed' } }
    );

    budget.status = 'active';
    budget.history.push({
      action: 'activated',
      performedBy: req.user._id,
      performedAt: new Date(),
    });

    await budget.save();

    res.json({ success: true, data: budget, message: 'Budget activated' });
  } catch (error) {
    logger.error('Error activating budget:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/budgets/check-availability
 * @desc    Check budget availability for an expense
 * @access  Private
 */
router.post('/check-availability', authenticate, async (req, res) => {
  try {
    const { headOfAccount, costCenter, amount, fiscalYear } = req.body;

    const budget = await Budget.findOne({
      company: req.user.company,
      fiscalYear: fiscalYear || getCurrentFiscalYear(),
      status: 'active',
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'No active budget found',
      });
    }

    const result = budget.checkBudgetAvailability(headOfAccount, amount, costCenter);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error checking budget availability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/budgets/:id/utilization
 * @desc    Get budget utilization report
 * @access  Private
 */
router.get('/:id/utilization', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .populate('lines.headOfAccount', 'code name accountType accountCategory')
      .populate('lines.costCenter', 'code name');

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    // Calculate utilization summary
    const utilization = {
      fiscalYear: budget.fiscalYear,
      totalBudget: budget.totalRevisedBudget,
      totalUtilized: budget.totalUtilized,
      totalAvailable: budget.totalAvailable,
      utilizationPercent: budget.totalRevisedBudget > 0 
        ? ((budget.totalUtilized / budget.totalRevisedBudget) * 100).toFixed(2) 
        : 0,
      lines: budget.lines.map(line => ({
        account: line.headOfAccount,
        costCenter: line.costCenter,
        description: line.description,
        originalBudget: line.originalBudget,
        totalBudget: line.totalBudget,
        utilized: line.utilized,
        committed: line.committed,
        available: line.available,
        utilizationPercent: line.totalBudget > 0 
          ? ((line.utilized / line.totalBudget) * 100).toFixed(2) 
          : 0,
        status: getLineStatus(line),
      })),
    };

    res.json({ success: true, data: utilization });
  } catch (error) {
    logger.error('Error fetching budget utilization:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to get current fiscal year
function getCurrentFiscalYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // Fiscal year starts July 1 in Pakistan
  if (month >= 7) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

// Helper function to get budget line status
function getLineStatus(line) {
  const utilizationPercent = line.totalBudget > 0 
    ? ((line.utilized + line.committed) / line.totalBudget) * 100 
    : 0;

  if (utilizationPercent >= line.blockThreshold) return 'exhausted';
  if (utilizationPercent >= line.alertThreshold) return 'warning';
  if (utilizationPercent >= 50) return 'moderate';
  return 'healthy';
}

export default router;
