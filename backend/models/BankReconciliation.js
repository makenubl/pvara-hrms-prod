import mongoose from 'mongoose';

/**
 * Bank Reconciliation Schema
 * For matching bank statements with GL entries
 */

const bankStatementLineSchema = new mongoose.Schema({
  transactionDate: {
    type: Date,
    required: true,
  },
  valueDate: {
    type: Date,
  },
  reference: {
    type: String,
  },
  description: {
    type: String,
    required: true,
  },
  debit: {
    type: Number,
    default: 0,
  },
  credit: {
    type: Number,
    default: 0,
  },
  balance: {
    type: Number,
  },
  // Matching status
  status: {
    type: String,
    enum: ['unmatched', 'matched', 'partially_matched', 'excluded'],
    default: 'unmatched',
  },
  matchedEntries: [{
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    lineIndex: Number,
    matchedAmount: Number,
  }],
  // For manual adjustments
  adjustmentType: {
    type: String,
    enum: ['bank_charge', 'interest', 'error', 'timing', null],
    default: null,
  },
  remarks: String,
});

const bankReconciliationSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      required: true,
    },
    // Reconciliation period
    reconciliationDate: {
      type: Date,
      required: true,
    },
    period: {
      type: String, // YYYY-MM
      required: true,
    },
    fiscalYear: {
      type: String,
      required: true,
    },
    // Opening balances
    openingBalanceBank: {
      type: Number,
      required: true,
    },
    openingBalanceGL: {
      type: Number,
      required: true,
    },
    // Closing balances
    closingBalanceBank: {
      type: Number,
      required: true,
    },
    closingBalanceGL: {
      type: Number,
    },
    // Bank statement lines
    statementLines: [bankStatementLineSchema],
    // Reconciliation items
    reconciliationItems: {
      // Deposits in transit (recorded in GL, not yet in bank)
      depositsInTransit: [{
        journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
        entryNumber: String,
        date: Date,
        amount: Number,
        description: String,
      }],
      // Outstanding checks (recorded in GL, not yet cleared)
      outstandingChecks: [{
        journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
        entryNumber: String,
        date: Date,
        checkNumber: String,
        amount: Number,
        payee: String,
      }],
      // Bank charges (in bank, not in GL)
      bankCharges: [{
        date: Date,
        amount: Number,
        description: String,
        glPosted: { type: Boolean, default: false },
        journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
      }],
      // Interest earned (in bank, not in GL)
      interestEarned: [{
        date: Date,
        amount: Number,
        description: String,
        glPosted: { type: Boolean, default: false },
        journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
      }],
      // NSF/Returned checks
      returnedChecks: [{
        date: Date,
        amount: Number,
        originalCheckNumber: String,
        reason: String,
        glPosted: { type: Boolean, default: false },
        journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
      }],
      // Errors and corrections
      errors: [{
        type: { type: String, enum: ['bank_error', 'gl_error'] },
        date: Date,
        amount: Number,
        description: String,
        corrected: { type: Boolean, default: false },
      }],
    },
    // Calculated reconciliation
    adjustedBankBalance: {
      type: Number,
    },
    adjustedGLBalance: {
      type: Number,
    },
    difference: {
      type: Number,
    },
    isReconciled: {
      type: Boolean,
      default: false,
    },
    // Status
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'approved'],
      default: 'draft',
    },
    // Workflow
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    // Notes
    notes: String,
  },
  { timestamps: true }
);

// Indexes
bankReconciliationSchema.index({ company: 1, bankAccount: 1, period: 1 }, { unique: true });
bankReconciliationSchema.index({ company: 1, status: 1 });

// Calculate adjusted balances before save
bankReconciliationSchema.pre('save', function(next) {
  const ri = this.reconciliationItems;
  
  // Adjusted Bank Balance = Closing Bank Balance + Deposits in Transit - Outstanding Checks
  const depositsInTransitTotal = ri.depositsInTransit.reduce((sum, d) => sum + d.amount, 0);
  const outstandingChecksTotal = ri.outstandingChecks.reduce((sum, c) => sum + c.amount, 0);
  
  this.adjustedBankBalance = this.closingBalanceBank + depositsInTransitTotal - outstandingChecksTotal;
  
  // Adjusted GL Balance = GL Balance + Interest - Bank Charges - Returned Checks
  const bankChargesTotal = ri.bankCharges.filter(bc => !bc.glPosted).reduce((sum, bc) => sum + bc.amount, 0);
  const interestTotal = ri.interestEarned.filter(i => !i.glPosted).reduce((sum, i) => sum + i.amount, 0);
  const returnedChecksTotal = ri.returnedChecks.filter(rc => !rc.glPosted).reduce((sum, rc) => sum + rc.amount, 0);
  
  this.adjustedGLBalance = (this.closingBalanceGL || 0) + interestTotal - bankChargesTotal - returnedChecksTotal;
  
  // Difference
  this.difference = Math.round((this.adjustedBankBalance - this.adjustedGLBalance) * 100) / 100;
  this.isReconciled = Math.abs(this.difference) < 0.01;
  
  next();
});

// =====================================================
// FIX #2: Static method to calculate GL balance from Journal Entries
// =====================================================
bankReconciliationSchema.statics.calculateGLBalance = async function(company, bankAccountId, asOfDate) {
  const mongoose = (await import('mongoose')).default;
  const JournalEntry = mongoose.model('JournalEntry');
  
  // Aggregate all posted journal entries for this bank account up to the date
  const result = await JournalEntry.aggregate([
    {
      $match: {
        company: new mongoose.Types.ObjectId(company),
        status: 'posted',
        entryDate: { $lte: new Date(asOfDate) }
      }
    },
    { $unwind: '$lines' },
    {
      $match: {
        'lines.account': new mongoose.Types.ObjectId(bankAccountId)
      }
    },
    {
      $group: {
        _id: null,
        totalDebit: { $sum: '$lines.debit' },
        totalCredit: { $sum: '$lines.credit' }
      }
    }
  ]);
  
  if (result.length === 0) {
    return 0;
  }
  
  // Bank is an asset, so balance = Debits - Credits
  const balance = result[0].totalDebit - result[0].totalCredit;
  return Math.round(balance * 100) / 100;
};

// Method to auto-populate GL balance
bankReconciliationSchema.methods.fetchGLBalance = async function() {
  const endOfMonth = new Date(this.reconciliationDate);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0); // Last day of the reconciliation month
  
  const glBalance = await this.constructor.calculateGLBalance(
    this.company,
    this.bankAccount,
    endOfMonth
  );
  
  this.closingBalanceGL = glBalance;
  return glBalance;
};

export default mongoose.model('BankReconciliation', bankReconciliationSchema);
