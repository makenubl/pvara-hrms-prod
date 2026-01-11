import mongoose from 'mongoose';

/**
 * Audit Log Schema
 * For comprehensive financial audit trail
 */

const auditLogSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // User who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: String,
    userEmail: String,
    // Action details
    action: {
      type: String,
      enum: [
        'create',
        'update',
        'delete',
        'approve',
        'reject',
        'post',
        'reverse',
        'void',
        'print',
        'export',
        'view',
        'login',
        'logout',
        'lock',
        'unlock',
      ],
      required: true,
    },
    // Entity details
    entityType: {
      type: String,
      enum: [
        'JournalEntry',
        'ChartOfAccount',
        'Budget',
        'Vendor',
        'BankPaymentBatch',
        'BankReconciliation',
        'FixedAsset',
        'TaxFiling',
        'YearEndClosing',
        'User',
        'Company',
        'Setting',
      ],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    entityReference: String, // e.g., Entry number, vendor name
    // Change details
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
    },
    changedFields: [String],
    // Financial impact
    financialImpact: {
      hasImpact: { type: Boolean, default: false },
      amount: Number,
      currency: { type: String, default: 'PKR' },
      affectedAccounts: [String],
    },
    // Request details
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    // Status
    status: {
      type: String,
      enum: ['success', 'failed', 'warning'],
      default: 'success',
    },
    errorMessage: String,
    // Additional context
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Indexes for querying
auditLogSchema.index({ company: 1, createdAt: -1 });
auditLogSchema.index({ company: 1, entityType: 1, entityId: 1 });
auditLogSchema.index({ company: 1, user: 1, createdAt: -1 });
auditLogSchema.index({ company: 1, action: 1 });

// Static method to log an action
auditLogSchema.statics.log = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break main flow
    return null;
  }
};

// Static method to get entity history
auditLogSchema.statics.getEntityHistory = function(company, entityType, entityId) {
  return this.find({ company, entityType, entityId })
    .sort({ createdAt: -1 })
    .populate('user', 'firstName lastName email')
    .lean();
};

export default mongoose.model('AuditLog', auditLogSchema);
