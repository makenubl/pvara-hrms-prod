import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// ============================================================================
// MONTHLY CLOSING & PERIOD CONTROL MODULE - CA/CFO CRITICAL (Issue #18-#22)
// Provides period locking, month-end closing, and reconciliation controls
// NAM/IFRS Compliance: Proper period controls with multi-step validation
// ============================================================================

// AccountingPeriod Schema
const accountingPeriodSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Period Definition
  fiscalYear: {
    type: String,
    required: true,
    validate: {
      validator: v => /^\d{4}-\d{4}$/.test(v),
      message: 'Fiscal year must be in YYYY-YYYY format (e.g., 2024-2025)'
    }
  },
  
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  
  year: {
    type: Number,
    required: true
  },
  
  periodName: { type: String }, // e.g., "July 2024", "August 2024"
  
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  
  // Status
  status: {
    type: String,
    enum: ['OPEN', 'SOFT_CLOSE', 'HARD_CLOSE', 'LOCKED'],
    default: 'OPEN',
    index: true
  },
  
  // Closing Checklist
  closingChecklist: {
    bankReconciliationComplete: { type: Boolean, default: false },
    vendorReconciliationComplete: { type: Boolean, default: false },
    customerReconciliationComplete: { type: Boolean, default: false },
    inventoryReconciliationComplete: { type: Boolean, default: false },
    fixedAssetDepreciationPosted: { type: Boolean, default: false },
    accrualsPosted: { type: Boolean, default: false },
    prepaidsAmortized: { type: Boolean, default: false },
    payrollPosted: { type: Boolean, default: false },
    intercompanyReconciled: { type: Boolean, default: false },
    taxProvisionCalculated: { type: Boolean, default: false },
    trialBalanceReviewed: { type: Boolean, default: false },
    varianceAnalysisComplete: { type: Boolean, default: false }
  },
  
  // Balances Snapshot
  closingBalances: {
    totalAssets: { type: Number },
    totalLiabilities: { type: Number },
    totalEquity: { type: Number },
    totalRevenue: { type: Number },
    totalExpenses: { type: Number },
    netIncome: { type: Number },
    cashBalance: { type: Number }
  },
  
  // Reconciliation Results
  reconciliationResults: [{
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' },
    accountCode: String,
    accountName: String,
    glBalance: Number,
    subledgerBalance: Number,
    variance: Number,
    status: { type: String, enum: ['MATCHED', 'VARIANCE', 'UNRECONCILED'] },
    notes: String
  }],
  
  // Closing Actions
  softClosedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  softClosedAt: { type: Date },
  hardClosedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hardClosedAt: { type: Date },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt: { type: Date },
  reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reopenedAt: { type: Date },
  reopenReason: { type: String },
  
  // Approval Chain
  preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  notes: { type: String }
  
}, { timestamps: true });

accountingPeriodSchema.index({ company: 1, fiscalYear: 1, month: 1 }, { unique: true });
accountingPeriodSchema.index({ company: 1, status: 1 });

const AccountingPeriod = mongoose.model('AccountingPeriod', accountingPeriodSchema);

// ============================================================================
// GET /periods - Get All Accounting Periods
// ============================================================================
router.get('/periods', authenticate, async (req, res) => {
  try {
    const { fiscalYear, status } = req.query;
    
    const query = { company: req.user.company };
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (status) query.status = status;
    
    const periods = await AccountingPeriod.find(query)
      .sort({ year: -1, month: -1 })
      .populate('softClosedBy hardClosedBy lockedBy', 'firstName lastName')
      .lean();
    
    res.json({ success: true, data: periods });
    
  } catch (error) {
    console.error('Get periods error:', error);
    res.status(500).json({ message: 'Error fetching periods', error: error.message });
  }
});

// ============================================================================
// POST /periods/initialize - Initialize Periods for Fiscal Year
// ============================================================================
router.post('/periods/initialize', authenticate, async (req, res) => {
  try {
    const { fiscalYear } = req.body; // e.g., "2024-2025"
    
    if (!fiscalYear || !/^\d{4}-\d{4}$/.test(fiscalYear)) {
      return res.status(400).json({ message: 'Valid fiscal year required (YYYY-YYYY)' });
    }
    
    const [startYear, endYear] = fiscalYear.split('-').map(Number);
    
    // Pakistan fiscal year: July (startYear) to June (endYear)
    const periods = [];
    
    // July to December of start year
    for (let month = 7; month <= 12; month++) {
      const periodStart = new Date(startYear, month - 1, 1);
      const periodEnd = new Date(startYear, month, 0, 23, 59, 59, 999);
      
      periods.push({
        company: req.user.company,
        fiscalYear,
        month,
        year: startYear,
        periodName: periodStart.toLocaleString('en-PK', { month: 'long', year: 'numeric' }),
        periodStart,
        periodEnd,
        status: 'OPEN'
      });
    }
    
    // January to June of end year
    for (let month = 1; month <= 6; month++) {
      const periodStart = new Date(endYear, month - 1, 1);
      const periodEnd = new Date(endYear, month, 0, 23, 59, 59, 999);
      
      periods.push({
        company: req.user.company,
        fiscalYear,
        month,
        year: endYear,
        periodName: periodStart.toLocaleString('en-PK', { month: 'long', year: 'numeric' }),
        periodStart,
        periodEnd,
        status: 'OPEN'
      });
    }
    
    // Use upsert to avoid duplicates
    const results = await Promise.all(
      periods.map(p => 
        AccountingPeriod.findOneAndUpdate(
          { company: p.company, fiscalYear: p.fiscalYear, month: p.month, year: p.year },
          { $setOnInsert: p },
          { upsert: true, new: true }
        )
      )
    );
    
    res.json({
      success: true,
      message: `Initialized ${results.length} periods for fiscal year ${fiscalYear}`,
      data: results
    });
    
  } catch (error) {
    console.error('Initialize periods error:', error);
    res.status(500).json({ message: 'Error initializing periods', error: error.message });
  }
});

// ============================================================================
// GET /periods/:periodId - Get Single Period Details
// ============================================================================
router.get('/periods/:periodId', authenticate, async (req, res) => {
  try {
    const period = await AccountingPeriod.findOne({
      _id: req.params.periodId,
      company: req.user.company
    })
      .populate('softClosedBy hardClosedBy lockedBy preparedBy reviewedBy approvedBy', 'firstName lastName email')
      .lean();
    
    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }
    
    res.json({ success: true, data: period });
    
  } catch (error) {
    console.error('Get period error:', error);
    res.status(500).json({ message: 'Error fetching period', error: error.message });
  }
});

// ============================================================================
// POST /periods/:periodId/soft-close - Soft Close Period (Preliminary)
// ============================================================================
router.post('/periods/:periodId/soft-close', authenticate, async (req, res) => {
  try {
    const { periodId } = req.params;
    const { closingChecklist, notes } = req.body;
    
    const period = await AccountingPeriod.findOne({
      _id: periodId,
      company: req.user.company
    });
    
    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }
    
    if (period.status !== 'OPEN') {
      return res.status(400).json({ message: `Period is already ${period.status}` });
    }
    
    // Update checklist
    if (closingChecklist) {
      Object.assign(period.closingChecklist, closingChecklist);
    }
    
    // Check minimum requirements
    const checklist = period.closingChecklist;
    const requiredItems = ['bankReconciliationComplete', 'trialBalanceReviewed'];
    const missingItems = requiredItems.filter(item => !checklist[item]);
    
    if (missingItems.length > 0) {
      return res.status(400).json({
        message: 'Cannot soft-close: Required checklist items incomplete',
        missingItems
      });
    }
    
    period.status = 'SOFT_CLOSE';
    period.softClosedBy = req.user._id;
    period.softClosedAt = new Date();
    period.preparedBy = req.user._id;
    if (notes) period.notes = notes;
    
    await period.save();
    
    res.json({
      success: true,
      message: 'Period soft-closed successfully',
      data: period
    });
    
  } catch (error) {
    console.error('Soft close error:', error);
    res.status(500).json({ message: 'Error soft-closing period', error: error.message });
  }
});

// ============================================================================
// POST /periods/:periodId/hard-close - Hard Close Period
// ============================================================================
router.post('/periods/:periodId/hard-close', authenticate, async (req, res) => {
  try {
    const { periodId } = req.params;
    const { closingBalances } = req.body;
    
    const period = await AccountingPeriod.findOne({
      _id: periodId,
      company: req.user.company
    });
    
    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }
    
    if (period.status !== 'SOFT_CLOSE') {
      return res.status(400).json({ message: 'Period must be soft-closed first' });
    }
    
    // Verify all checklist items (for hard close, more items required)
    const checklist = period.closingChecklist;
    const hardCloseRequirements = [
      'bankReconciliationComplete',
      'vendorReconciliationComplete',
      'fixedAssetDepreciationPosted',
      'payrollPosted',
      'trialBalanceReviewed'
    ];
    
    const missingItems = hardCloseRequirements.filter(item => !checklist[item]);
    if (missingItems.length > 0) {
      return res.status(400).json({
        message: 'Cannot hard-close: Required checklist items incomplete',
        missingItems
      });
    }
    
    // Capture closing balances
    if (closingBalances) {
      period.closingBalances = closingBalances;
    }
    
    period.status = 'HARD_CLOSE';
    period.hardClosedBy = req.user._id;
    period.hardClosedAt = new Date();
    period.reviewedBy = req.user._id;
    
    await period.save();
    
    res.json({
      success: true,
      message: 'Period hard-closed successfully',
      data: period
    });
    
  } catch (error) {
    console.error('Hard close error:', error);
    res.status(500).json({ message: 'Error hard-closing period', error: error.message });
  }
});

// ============================================================================
// POST /periods/:periodId/lock - Lock Period (Final - No More Changes)
// ============================================================================
router.post('/periods/:periodId/lock', authenticate, async (req, res) => {
  try {
    const { periodId } = req.params;
    
    // Only CFO/Admin can lock
    if (!['admin', 'cfo', 'controller'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only CFO/Admin can lock periods' });
    }
    
    const period = await AccountingPeriod.findOne({
      _id: periodId,
      company: req.user.company
    });
    
    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }
    
    if (period.status !== 'HARD_CLOSE') {
      return res.status(400).json({ message: 'Period must be hard-closed before locking' });
    }
    
    period.status = 'LOCKED';
    period.lockedBy = req.user._id;
    period.lockedAt = new Date();
    period.approvedBy = req.user._id;
    
    await period.save();
    
    res.json({
      success: true,
      message: 'Period locked successfully. No further changes allowed.',
      data: period
    });
    
  } catch (error) {
    console.error('Lock period error:', error);
    res.status(500).json({ message: 'Error locking period', error: error.message });
  }
});

// ============================================================================
// POST /periods/:periodId/reopen - Reopen Locked Period (Emergency Only)
// ============================================================================
router.post('/periods/:periodId/reopen', authenticate, async (req, res) => {
  try {
    const { periodId } = req.params;
    const { reason, targetStatus = 'OPEN' } = req.body;
    
    // Only CFO/Admin can reopen
    if (!['admin', 'cfo'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only CFO/Admin can reopen periods' });
    }
    
    if (!reason || reason.length < 20) {
      return res.status(400).json({ message: 'Detailed reason required (min 20 characters)' });
    }
    
    const period = await AccountingPeriod.findOne({
      _id: periodId,
      company: req.user.company
    });
    
    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }
    
    const previousStatus = period.status;
    period.status = targetStatus;
    period.reopenedBy = req.user._id;
    period.reopenedAt = new Date();
    period.reopenReason = reason;
    
    await period.save();
    
    // Create audit log for period reopen (critical action)
    try {
      const AuditLog = (await import('../models/AuditLog.js')).default;
      if (AuditLog) {
        await AuditLog.create({
          company: req.user.company,
          module: 'PERIOD_CONTROL',
          action: 'PERIOD_REOPEN',
          documentId: period._id.toString(),
          documentType: 'AccountingPeriod',
          previousState: { status: previousStatus },
          newState: { status: targetStatus },
          changes: [
            { field: 'status', oldValue: previousStatus, newValue: targetStatus }
          ],
          performedBy: req.user._id,
          performedAt: new Date(),
          ipAddress: req.ip,
          reason: reason,
          criticalAction: true
        });
      }
    } catch (auditError) {
      console.error('Audit log failed for period reopen:', auditError);
      // Don't fail the operation if audit logging fails
    }
    
    res.json({
      success: true,
      message: `Period reopened from ${previousStatus} to ${targetStatus}`,
      data: period,
      warning: 'This action has been logged. Ensure all adjustments are properly documented.'
    });
    
  } catch (error) {
    console.error('Reopen period error:', error);
    res.status(500).json({ message: 'Error reopening period', error: error.message });
  }
});

// ============================================================================
// PUT /periods/:periodId/checklist - Update Closing Checklist
// ============================================================================
router.put('/periods/:periodId/checklist', authenticate, async (req, res) => {
  try {
    const { periodId } = req.params;
    const { closingChecklist } = req.body;
    
    const period = await AccountingPeriod.findOne({
      _id: periodId,
      company: req.user.company
    });
    
    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }
    
    if (period.status === 'LOCKED') {
      return res.status(400).json({ message: 'Cannot modify locked period' });
    }
    
    Object.assign(period.closingChecklist, closingChecklist);
    await period.save();
    
    // Calculate completion percentage
    const items = Object.values(period.closingChecklist);
    const completed = items.filter(v => v === true).length;
    const percentage = Math.round((completed / items.length) * 100);
    
    res.json({
      success: true,
      message: 'Checklist updated',
      data: period,
      completionPercentage: percentage
    });
    
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ message: 'Error updating checklist', error: error.message });
  }
});

// ============================================================================
// POST /periods/:periodId/reconcile - Run Account Reconciliation
// ============================================================================
router.post('/periods/:periodId/reconcile', authenticate, async (req, res) => {
  try {
    const { periodId } = req.params;
    
    const period = await AccountingPeriod.findOne({
      _id: periodId,
      company: req.user.company
    });
    
    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }
    
    // Import required models
    const ChartOfAccount = mongoose.model('ChartOfAccount');
    const JournalEntry = mongoose.model('JournalEntry');
    const Vendor = mongoose.model('Vendor');
    const BankPayment = mongoose.model('BankPayment');
    
    const reconciliationResults = [];
    
    // 1. Bank Account Reconciliation
    const bankAccounts = await ChartOfAccount.find({
      company: req.user.company,
      accountType: 'asset',
      accountName: /bank/i
    }).lean();
    
    for (const account of bankAccounts) {
      // GL Balance
      const glEntries = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $lte: period.periodEnd }
          }
        },
        { $unwind: '$lines' },
        { $match: { 'lines.account': account._id } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' }
          }
        }
      ]);
      
      const glBalance = glEntries[0] 
        ? (glEntries[0].totalDebit - glEntries[0].totalCredit)
        : 0;
      
      // Subledger Balance (Bank Payments)
      const bankPayments = await BankPayment.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'Approved',
            paymentDate: { $lte: period.periodEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$netPayable' }
          }
        }
      ]);
      
      const subledgerBalance = bankPayments[0]?.total || 0;
      
      // Note: This is simplified - real reconciliation would match specific transactions
      const variance = Math.abs(glBalance) - Math.abs(subledgerBalance);
      
      reconciliationResults.push({
        accountId: account._id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        glBalance,
        subledgerBalance,
        variance,
        status: Math.abs(variance) < 1 ? 'MATCHED' : 'VARIANCE'
      });
    }
    
    // 2. Vendor/AP Reconciliation
    const apAccount = await ChartOfAccount.findOne({
      company: req.user.company,
      accountType: 'liability',
      accountCode: /^2[12]/
    }).lean();
    
    if (apAccount) {
      // GL Balance
      const glAP = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $lte: period.periodEnd }
          }
        },
        { $unwind: '$lines' },
        { $match: { 'lines.account': apAccount._id } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' }
          }
        }
      ]);
      
      const glAPBalance = glAP[0] 
        ? (glAP[0].totalCredit - glAP[0].totalDebit)
        : 0;
      
      // Vendor Subledger
      const vendorTotals = await Vendor.aggregate([
        { $match: { company: req.user.company, isActive: true } },
        {
          $group: {
            _id: null,
            totalBalance: { $sum: '$currentBalance' }
          }
        }
      ]);
      
      const vendorBalance = vendorTotals[0]?.totalBalance || 0;
      const apVariance = glAPBalance - vendorBalance;
      
      reconciliationResults.push({
        accountId: apAccount._id,
        accountCode: apAccount.accountCode,
        accountName: 'Accounts Payable (Control)',
        glBalance: glAPBalance,
        subledgerBalance: vendorBalance,
        variance: apVariance,
        status: Math.abs(apVariance) < 1 ? 'MATCHED' : 'VARIANCE'
      });
    }
    
    // Save results
    period.reconciliationResults = reconciliationResults;
    
    // Update checklist based on results
    const allMatched = reconciliationResults.every(r => r.status === 'MATCHED');
    period.closingChecklist.bankReconciliationComplete = reconciliationResults
      .filter(r => r.accountName.toLowerCase().includes('bank'))
      .every(r => r.status === 'MATCHED');
    period.closingChecklist.vendorReconciliationComplete = reconciliationResults
      .filter(r => r.accountName.toLowerCase().includes('payable'))
      .every(r => r.status === 'MATCHED');
    
    await period.save();
    
    res.json({
      success: true,
      message: 'Reconciliation complete',
      data: {
        results: reconciliationResults,
        allMatched,
        variances: reconciliationResults.filter(r => r.status === 'VARIANCE')
      }
    });
    
  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ message: 'Error running reconciliation', error: error.message });
  }
});

// ============================================================================
// GET /current-period - Get Current Open Period
// ============================================================================
router.get('/current-period', authenticate, async (req, res) => {
  try {
    const today = new Date();
    
    const period = await AccountingPeriod.findOne({
      company: req.user.company,
      periodStart: { $lte: today },
      periodEnd: { $gte: today }
    }).lean();
    
    if (!period) {
      // Auto-calculate what the current period should be
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const fiscalYear = currentMonth >= 7 
        ? `${currentYear}-${currentYear + 1}`
        : `${currentYear - 1}-${currentYear}`;
      
      return res.json({
        success: true,
        data: null,
        suggestedPeriod: {
          fiscalYear,
          month: currentMonth,
          year: currentYear,
          needsInitialization: true
        }
      });
    }
    
    res.json({ success: true, data: period });
    
  } catch (error) {
    console.error('Get current period error:', error);
    res.status(500).json({ message: 'Error fetching current period', error: error.message });
  }
});

// ============================================================================
// GET /status-summary - Get Period Status Summary for Dashboard
// ============================================================================
router.get('/status-summary', authenticate, async (req, res) => {
  try {
    const periods = await AccountingPeriod.find({ company: req.user.company })
      .select('fiscalYear month year periodName status closingChecklist')
      .sort({ year: -1, month: -1 })
      .limit(24) // Last 2 years
      .lean();
    
    const summary = {
      total: periods.length,
      open: periods.filter(p => p.status === 'OPEN').length,
      softClosed: periods.filter(p => p.status === 'SOFT_CLOSE').length,
      hardClosed: periods.filter(p => p.status === 'HARD_CLOSE').length,
      locked: periods.filter(p => p.status === 'LOCKED').length,
      periods
    };
    
    res.json({ success: true, data: summary });
    
  } catch (error) {
    console.error('Get status summary error:', error);
    res.status(500).json({ message: 'Error fetching summary', error: error.message });
  }
});

// ============================================================================
// HELPER: Check if Date is in Open Period (exported for use in other routes)
// ============================================================================
export const isDateInOpenPeriod = async (company, date) => {
  const period = await AccountingPeriod.findOne({
    company,
    periodStart: { $lte: date },
    periodEnd: { $gte: date }
  }).select('status').lean();
  
  if (!period) return true; // If no period defined, allow
  return period.status === 'OPEN';
};

export { AccountingPeriod };
export default router;
