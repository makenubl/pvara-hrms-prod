import mongoose from 'mongoose';

/**
 * Journal Entry Schema
 * For general ledger postings with double-entry accounting
 */

const journalLineSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: true,
  },
  accountCode: {
    type: String,
  },
  accountName: {
    type: String,
  },
  description: {
    type: String,
  },
  costCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostCenter',
  },
  debit: {
    type: Number,
    default: 0,
    min: 0,
  },
  credit: {
    type: Number,
    default: 0,
    min: 0,
  },
  // For subledger entries
  subledgerType: {
    type: String,
    enum: ['vendor', 'customer', 'employee', 'bank', null],
    default: null,
  },
  subledgerRef: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'subledgerModel',
  },
  subledgerModel: {
    type: String,
    enum: ['Vendor', 'User', null],
    default: null,
  },
  // Tax details
  taxType: {
    type: String,
    enum: ['wht', 'sales-tax', 'income-tax', null],
    default: null,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  // Reference
  reference: {
    type: String,
  },
});

const journalEntrySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Journal Entry number
    entryNumber: {
      type: String,
      required: true,
    },
    // Entry type
    entryType: {
      type: String,
      enum: [
        'general',     // Manual journal entry
        'payroll',     // Payroll posting
        'payment',     // Vendor/Employee payment
        'receipt',     // Receipt/Collection
        'purchase',    // Purchase/Bill entry
        'adjustment',  // Adjustment entry
        'opening',     // Opening balance
        'closing',     // Year-end closing
        'reversal',    // Reversal entry
      ],
      default: 'general',
    },
    // Dates
    entryDate: {
      type: Date,
      required: true,
    },
    postingDate: {
      type: Date,
    },
    fiscalYear: {
      type: String,
      required: true,
    },
    period: {
      type: String, // YYYY-MM
      required: true,
    },
    // Description
    description: {
      type: String,
      required: true,
    },
    narration: {
      type: String,
    },
    // Journal lines
    lines: [journalLineSchema],
    // Totals
    totalDebit: {
      type: Number,
      default: 0,
    },
    totalCredit: {
      type: Number,
      default: 0,
    },
    // Source document reference
    sourceDocument: {
      type: {
        type: String,
        enum: ['payroll', 'payment', 'invoice', 'receipt', 'manual', 'budget'],
      },
      documentId: mongoose.Schema.Types.ObjectId,
      documentNumber: String,
    },
    // Status and workflow
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'posted', 'reversed', 'cancelled', 'rejected'],
      default: 'draft',
    },
    // Workflow
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    postedAt: {
      type: Date,
    },
    // Reversal info
    isReversal: {
      type: Boolean,
      default: false,
    },
    reversedEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    reversalReason: {
      type: String,
    },
    // Attachments
    attachments: [{
      name: String,
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    // Audit trail
    auditLog: [{
      action: String,
      performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      performedAt: { type: Date, default: Date.now },
      details: mongoose.Schema.Types.Mixed,
    }],
  },
  { timestamps: true }
);

// Indexes
journalEntrySchema.index({ company: 1, entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ company: 1, entryDate: 1 });
journalEntrySchema.index({ company: 1, fiscalYear: 1, period: 1 });
journalEntrySchema.index({ company: 1, status: 1 });
journalEntrySchema.index({ company: 1, entryType: 1 });

// Validate balanced entry before save
journalEntrySchema.pre('save', function(next) {
  // Calculate totals
  this.totalDebit = this.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  this.totalCredit = this.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  // Round to 2 decimal places
  this.totalDebit = Math.round(this.totalDebit * 100) / 100;
  this.totalCredit = Math.round(this.totalCredit * 100) / 100;

  // Check if balanced
  if (Math.abs(this.totalDebit - this.totalCredit) > 0.01) {
    return next(new Error(`Journal entry not balanced. Debit: ${this.totalDebit}, Credit: ${this.totalCredit}`));
  }

  // Auto-calculate fiscal year (Pakistan: July-June) and period
  if (this.entryDate) {
    const entryMonth = this.entryDate.getMonth();
    const entryYear = this.entryDate.getFullYear();
    
    // Pakistan fiscal year runs July to June
    this.fiscalYear = entryMonth >= 6 
      ? `${entryYear}-${entryYear + 1}` 
      : `${entryYear - 1}-${entryYear}`;
    
    this.period = this.entryDate.toISOString().slice(0, 7); // YYYY-MM
  }

  next();
});

// Post the journal entry (update account balances)
journalEntrySchema.methods.post = async function(userId) {
  if (this.status === 'posted') {
    throw new Error('Journal entry already posted');
  }

  const ChartOfAccount = mongoose.model('ChartOfAccount');

  // Update account balances
  for (const line of this.lines) {
    const account = await ChartOfAccount.findById(line.account);
    if (!account) continue;

    // Update balance based on normal balance
    if (account.normalBalance === 'debit') {
      account.currentBalance += (line.debit - line.credit);
    } else {
      account.currentBalance += (line.credit - line.debit);
    }

    await account.save();
  }

  // Update status
  this.status = 'posted';
  this.postedBy = userId;
  this.postedAt = new Date();
  this.postingDate = new Date();

  // Add audit log
  this.auditLog.push({
    action: 'posted',
    performedBy: userId,
    performedAt: new Date(),
  });

  await this.save();
};

// Reverse the journal entry
journalEntrySchema.methods.reverse = async function(userId, reason) {
  if (this.status !== 'posted') {
    throw new Error('Only posted entries can be reversed');
  }

  const JournalEntry = mongoose.model('JournalEntry');
  const ChartOfAccount = mongoose.model('ChartOfAccount');

  // Create reversal entry
  const reversalLines = this.lines.map(line => ({
    account: line.account,
    accountCode: line.accountCode,
    accountName: line.accountName,
    description: `Reversal: ${line.description}`,
    costCenter: line.costCenter,
    debit: line.credit, // Swap debit and credit
    credit: line.debit,
    subledgerType: line.subledgerType,
    subledgerRef: line.subledgerRef,
  }));

  // Generate reversal entry number
  const count = await JournalEntry.countDocuments({ company: this.company });
  const reversalNumber = `JV-REV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

  const reversalEntry = new JournalEntry({
    company: this.company,
    entryNumber: reversalNumber,
    entryType: 'reversal',
    entryDate: new Date(),
    fiscalYear: this.fiscalYear,
    period: new Date().toISOString().slice(0, 7),
    description: `Reversal of ${this.entryNumber}: ${reason}`,
    narration: reason,
    lines: reversalLines,
    isReversal: true,
    reversedEntry: this._id,
    reversalReason: reason,
    createdBy: userId,
    status: 'draft',
  });

  await reversalEntry.save();

  // Update original entry status
  this.status = 'reversed';
  this.auditLog.push({
    action: 'reversed',
    performedBy: userId,
    performedAt: new Date(),
    details: { reversalEntry: reversalEntry._id, reason },
  });

  await this.save();

  return reversalEntry;
};

// Static method to generate next entry number
journalEntrySchema.statics.generateEntryNumber = async function(companyId, type = 'JV') {
  const count = await this.countDocuments({ company: companyId });
  const year = new Date().getFullYear();
  return `${type}-${year}-${String(count + 1).padStart(6, '0')}`;
};

export default mongoose.model('JournalEntry', journalEntrySchema);
