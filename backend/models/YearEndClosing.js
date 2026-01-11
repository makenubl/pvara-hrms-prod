import mongoose from 'mongoose';

/**
 * Year-End Closing Schema
 * For fiscal year-end closing entries and retained earnings
 */

const closingEntrySchema = new mongoose.Schema({
  accountCode: String,
  accountName: String,
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
  },
  accountType: {
    type: String,
    enum: ['revenue', 'expense'],
  },
  closingBalance: Number,
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
  },
});

const yearEndClosingSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    fiscalYear: {
      type: String,
      required: true,
    },
    // Period (Pakistan: July 1 - June 30)
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    // Pre-closing trial balance
    preClosingTrialBalance: {
      totalDebits: Number,
      totalCredits: Number,
      isBalanced: Boolean,
    },
    // Revenue accounts to close
    revenueClosings: [closingEntrySchema],
    totalRevenue: {
      type: Number,
      default: 0,
    },
    // Expense accounts to close
    expenseClosings: [closingEntrySchema],
    totalExpenses: {
      type: Number,
      default: 0,
    },
    // Net Income/Loss
    netIncome: {
      type: Number,
    },
    // Retained Earnings account
    retainedEarningsAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      required: true,
    },
    // Closing journal entries
    closingJournalEntries: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    }],
    // Income summary (temporary account)
    incomeSummaryAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
    },
    // Post-closing trial balance
    postClosingTrialBalance: {
      totalDebits: Number,
      totalCredits: Number,
      isBalanced: Boolean,
    },
    // Dividends (if applicable)
    dividendsDeclared: {
      type: Number,
      default: 0,
    },
    dividendsJournalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    // Status
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'reversed'],
      default: 'draft',
    },
    // Workflow
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    // Lock period
    periodLocked: {
      type: Boolean,
      default: false,
    },
    lockedAt: Date,
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Notes
    notes: String,
  },
  { timestamps: true }
);

// Indexes
yearEndClosingSchema.index({ company: 1, fiscalYear: 1 }, { unique: true });
yearEndClosingSchema.index({ company: 1, status: 1 });

// Calculate net income before save
yearEndClosingSchema.pre('save', function(next) {
  this.totalRevenue = this.revenueClosings.reduce((sum, r) => sum + Math.abs(r.closingBalance || 0), 0);
  this.totalExpenses = this.expenseClosings.reduce((sum, e) => sum + Math.abs(e.closingBalance || 0), 0);
  this.netIncome = this.totalRevenue - this.totalExpenses;
  next();
});

export default mongoose.model('YearEndClosing', yearEndClosingSchema);
