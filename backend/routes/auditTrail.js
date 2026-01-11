import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// ============================================================================
// AUDIT TRAIL MODULE - CA/CFO CRITICAL (Issue #25/#26)
// Provides immutable audit logging for all financial transactions
// NAM/IFRS Compliance: Complete audit trail with hash verification
// ============================================================================

// AuditLog Schema (inline for immediate use)
const auditLogSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Action Details
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'REVERSE', 'POST', 'VOID'],
    required: true,
    index: true
  },
  
  // Module Reference
  module: {
    type: String,
    enum: [
      'JOURNAL_ENTRY', 'BANK_PAYMENT', 'PURCHASE_ORDER', 'VENDOR', 
      'FIXED_ASSET', 'PAYROLL', 'BUDGET', 'CHART_OF_ACCOUNTS',
      'YEAR_END_CLOSING', 'PERIOD_LOCK', 'TAX_FILING', 'RECONCILIATION'
    ],
    required: true,
    index: true
  },
  
  // Document Reference
  documentType: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  documentNumber: { type: String }, // Human-readable reference (e.g., JV-2024-0001)
  
  // User who performed action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  performedByName: { type: String }, // Snapshot for audit immutability
  performedByEmail: { type: String },
  
  // Timestamp
  performedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // IP Address & Session
  ipAddress: { type: String },
  userAgent: { type: String },
  sessionId: { type: String },
  
  // Changes Snapshot
  previousState: { type: mongoose.Schema.Types.Mixed }, // Before
  newState: { type: mongoose.Schema.Types.Mixed }, // After
  changedFields: [{ type: String }], // List of changed field names
  
  // Financial Impact
  financialImpact: {
    debitAmount: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 },
    netImpact: { type: Number, default: 0 },
    affectedAccounts: [{ type: String }]
  },
  
  // Hash for immutability verification
  previousHash: { type: String }, // Hash of previous audit log
  currentHash: { type: String }, // Hash of this entry (for chain verification)
  
  // Reason/Notes
  reason: { type: String },
  notes: { type: String },
  
  // Flags
  isSystemGenerated: { type: Boolean, default: false },
  isReversed: { type: Boolean, default: false },
  reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reversedAt: { type: Date }
  
}, { timestamps: true });

// Compound indexes for efficient queries
auditLogSchema.index({ company: 1, module: 1, performedAt: -1 });
auditLogSchema.index({ company: 1, documentId: 1, performedAt: -1 });
auditLogSchema.index({ company: 1, performedBy: 1, performedAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// ============================================================================
// HELPER: Create Hash for Audit Chain
// ============================================================================
import crypto from 'crypto';

const createAuditHash = (data, previousHash = '') => {
  const hashContent = JSON.stringify({
    previousHash,
    action: data.action,
    module: data.module,
    documentId: data.documentId,
    performedBy: data.performedBy,
    performedAt: data.performedAt,
    newState: data.newState
  });
  
  return crypto.createHash('sha256').update(hashContent).digest('hex');
};

// ============================================================================
// POST /log - Create Audit Log Entry (Internal Use)
// ============================================================================
router.post('/log', authenticate, async (req, res) => {
  try {
    const {
      action, module, documentType, documentId, documentNumber,
      previousState, newState, changedFields, financialImpact,
      reason, notes, isSystemGenerated
    } = req.body;
    
    // Get previous audit log for hash chain
    const previousLog = await AuditLog.findOne({ company: req.user.company })
      .sort({ performedAt: -1 })
      .select('currentHash');
    
    const previousHash = previousLog?.currentHash || 'GENESIS';
    
    // Prepare audit entry
    const auditData = {
      company: req.user.company,
      action,
      module,
      documentType,
      documentId,
      documentNumber,
      performedBy: req.user._id,
      performedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      performedByEmail: req.user.email,
      performedAt: new Date(),
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      previousState,
      newState,
      changedFields,
      financialImpact,
      previousHash,
      reason,
      notes,
      isSystemGenerated: isSystemGenerated || false
    };
    
    // Create hash for this entry
    auditData.currentHash = createAuditHash(auditData, previousHash);
    
    const auditLog = new AuditLog(auditData);
    await auditLog.save();
    
    res.status(201).json({
      success: true,
      message: 'Audit log created',
      auditId: auditLog._id
    });
    
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ message: 'Error creating audit log', error: error.message });
  }
});

// ============================================================================
// GET / - Get Audit Logs with Filters
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      module, action, documentId, performedBy,
      startDate, endDate, page = 1, limit = 50
    } = req.query;
    
    const query = { company: req.user.company };
    
    if (module) query.module = module;
    if (action) query.action = action;
    if (documentId) query.documentId = documentId;
    if (performedBy) query.performedBy = performedBy;
    
    if (startDate || endDate) {
      query.performedAt = {};
      if (startDate) query.performedAt.$gte = new Date(startDate);
      if (endDate) query.performedAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ performedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'firstName lastName email')
        .lean(),
      AuditLog.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
});

// ============================================================================
// GET /document/:documentId - Get All Logs for a Document
// ============================================================================
router.get('/document/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const logs = await AuditLog.find({
      company: req.user.company,
      documentId: documentId
    })
      .sort({ performedAt: -1 })
      .populate('performedBy', 'firstName lastName email')
      .lean();
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Get document audit trail error:', error);
    res.status(500).json({ message: 'Error fetching audit trail', error: error.message });
  }
});

// ============================================================================
// GET /verify-chain - Verify Audit Chain Integrity
// ============================================================================
router.get('/verify-chain', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, recalculateHashes = false } = req.query;
    
    const query = { company: req.user.company };
    if (startDate || endDate) {
      query.performedAt = {};
      if (startDate) query.performedAt.$gte = new Date(startDate);
      if (endDate) query.performedAt.$lte = new Date(endDate);
    }
    
    const logs = await AuditLog.find(query)
      .sort({ performedAt: 1 }) // Oldest first for chain verification
      .lean();
    
    let isValid = true;
    const invalidEntries = [];
    let previousHash = 'GENESIS';
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      // Verify previous hash matches (chain integrity)
      if (log.previousHash !== previousHash) {
        isValid = false;
        invalidEntries.push({
          auditId: log._id,
          position: i + 1,
          expectedPreviousHash: previousHash,
          actualPreviousHash: log.previousHash,
          issue: 'BROKEN_CHAIN'
        });
      }
      
      // FIX ISSUE #88: Also verify currentHash by recalculating (data integrity)
      if (recalculateHashes === 'true') {
        const recalculatedHash = createAuditHash({
          module: log.module,
          action: log.action,
          documentId: log.documentId,
          documentType: log.documentType,
          previousState: log.previousState,
          newState: log.newState,
          changes: log.changes,
          performedBy: log.performedBy,
          performedAt: log.performedAt,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          transactionAmount: log.transactionAmount,
          transactionCurrency: log.transactionCurrency
        }, log.previousHash);
        
        if (log.currentHash !== recalculatedHash) {
          isValid = false;
          invalidEntries.push({
            auditId: log._id,
            position: i + 1,
            expectedHash: recalculatedHash,
            actualHash: log.currentHash,
            issue: 'HASH_MISMATCH_DATA_TAMPERED'
          });
        }
      }
      
      previousHash = log.currentHash;
    }
    
    res.json({
      success: true,
      isValid,
      totalEntries: logs.length,
      hashRecalculated: recalculateHashes === 'true',
      invalidEntries,
      verifiedAt: new Date(),
      message: isValid 
        ? 'Audit chain integrity verified - no tampering detected'
        : `Audit chain integrity FAILED - ${invalidEntries.length} issues found`
    });
    
  } catch (error) {
    console.error('Verify chain error:', error);
    res.status(500).json({ message: 'Error verifying audit chain', error: error.message });
  }
});

// ============================================================================
// GET /user-activity/:userId - Get User Activity Report
// ============================================================================
router.get('/user-activity/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    const query = {
      company: req.user.company,
      performedBy: userId
    };
    
    if (startDate || endDate) {
      query.performedAt = {};
      if (startDate) query.performedAt.$gte = new Date(startDate);
      if (endDate) query.performedAt.$lte = new Date(endDate);
    }
    
    const logs = await AuditLog.find(query)
      .sort({ performedAt: -1 })
      .lean();
    
    // Summary by module
    const byModule = {};
    const byAction = {};
    let totalFinancialImpact = 0;
    
    logs.forEach(log => {
      byModule[log.module] = (byModule[log.module] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      totalFinancialImpact += Math.abs(log.financialImpact?.netImpact || 0);
    });
    
    res.json({
      success: true,
      userId,
      summary: {
        totalActions: logs.length,
        byModule,
        byAction,
        totalFinancialImpact
      },
      recentActivity: logs.slice(0, 50)
    });
    
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Error fetching user activity', error: error.message });
  }
});

// ============================================================================
// GET /financial-impact - Financial Impact Report
// ============================================================================
router.get('/financial-impact', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const startOfFiscalYear = new Date();
    startOfFiscalYear.setMonth(6, 1); // July 1
    if (new Date().getMonth() < 6) {
      startOfFiscalYear.setFullYear(startOfFiscalYear.getFullYear() - 1);
    }
    startOfFiscalYear.setHours(0, 0, 0, 0);
    
    const query = {
      company: req.user.company,
      performedAt: {
        $gte: startDate ? new Date(startDate) : startOfFiscalYear,
        $lte: endDate ? new Date(endDate) : new Date()
      }
    };
    
    const logs = await AuditLog.find(query)
      .select('action module financialImpact performedAt documentNumber')
      .lean();
    
    const summary = {
      totalDebits: 0,
      totalCredits: 0,
      netImpact: 0,
      byModule: {},
      byAction: {},
      affectedAccounts: new Set()
    };
    
    logs.forEach(log => {
      const impact = log.financialImpact || {};
      summary.totalDebits += impact.debitAmount || 0;
      summary.totalCredits += impact.creditAmount || 0;
      summary.netImpact += impact.netImpact || 0;
      
      if (!summary.byModule[log.module]) {
        summary.byModule[log.module] = { debits: 0, credits: 0, count: 0 };
      }
      summary.byModule[log.module].debits += impact.debitAmount || 0;
      summary.byModule[log.module].credits += impact.creditAmount || 0;
      summary.byModule[log.module].count += 1;
      
      if (!summary.byAction[log.action]) {
        summary.byAction[log.action] = { debits: 0, credits: 0, count: 0 };
      }
      summary.byAction[log.action].debits += impact.debitAmount || 0;
      summary.byAction[log.action].credits += impact.creditAmount || 0;
      summary.byAction[log.action].count += 1;
      
      (impact.affectedAccounts || []).forEach(acc => summary.affectedAccounts.add(acc));
    });
    
    summary.affectedAccounts = Array.from(summary.affectedAccounts);
    
    res.json({
      success: true,
      data: summary,
      period: {
        from: query.performedAt.$gte,
        to: query.performedAt.$lte
      }
    });
    
  } catch (error) {
    console.error('Financial impact report error:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
});

// ============================================================================
// GET /export - Export Audit Logs (CSV/JSON)
// ============================================================================
router.get('/export', authenticate, async (req, res) => {
  try {
    const { format = 'json', module, startDate, endDate } = req.query;
    
    const query = { company: req.user.company };
    if (module) query.module = module;
    if (startDate || endDate) {
      query.performedAt = {};
      if (startDate) query.performedAt.$gte = new Date(startDate);
      if (endDate) query.performedAt.$lte = new Date(endDate);
    }
    
    const logs = await AuditLog.find(query)
      .sort({ performedAt: -1 })
      .populate('performedBy', 'firstName lastName email')
      .lean();
    
    if (format === 'csv') {
      const headers = [
        'Date', 'Time', 'Action', 'Module', 'Document Number',
        'Performed By', 'Email', 'Debit', 'Credit', 'Reason'
      ].join(',');
      
      const rows = logs.map(log => [
        new Date(log.performedAt).toLocaleDateString('en-PK'),
        new Date(log.performedAt).toLocaleTimeString('en-PK'),
        log.action,
        log.module,
        log.documentNumber || '',
        log.performedByName || '',
        log.performedByEmail || '',
        log.financialImpact?.debitAmount || 0,
        log.financialImpact?.creditAmount || 0,
        `"${(log.reason || '').replace(/"/g, '""')}"`
      ].join(','));
      
      const csv = [headers, ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-trail-${Date.now()}.csv`);
      return res.send(csv);
    }
    
    res.json({
      success: true,
      data: logs,
      exportedAt: new Date(),
      count: logs.length
    });
    
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ message: 'Error exporting audit logs', error: error.message });
  }
});

// ============================================================================
// UTILITY: Log Financial Transaction (Exported Helper)
// ============================================================================
export const logFinancialTransaction = async ({
  company, action, module, documentType, documentId, documentNumber,
  previousState, newState, changedFields, financialImpact,
  performedBy, performedByName, performedByEmail,
  ipAddress, reason, notes, isSystemGenerated
}) => {
  try {
    // Get previous hash
    const previousLog = await AuditLog.findOne({ company }).sort({ performedAt: -1 }).select('currentHash');
    const previousHash = previousLog?.currentHash || 'GENESIS';
    
    const auditData = {
      company,
      action,
      module,
      documentType,
      documentId,
      documentNumber,
      performedBy,
      performedByName,
      performedByEmail,
      performedAt: new Date(),
      ipAddress,
      previousState,
      newState,
      changedFields,
      financialImpact,
      previousHash,
      reason,
      notes,
      isSystemGenerated: isSystemGenerated || false
    };
    
    auditData.currentHash = createAuditHash(auditData, previousHash);
    
    const auditLog = new AuditLog(auditData);
    await auditLog.save();
    
    return auditLog._id;
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit failure shouldn't break transactions
    return null;
  }
};

export { AuditLog };
export default router;
