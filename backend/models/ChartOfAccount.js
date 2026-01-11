import mongoose from 'mongoose';

/**
 * Chart of Accounts Schema
 * Aligned with NAM (New Accounting Model) and Government Chart of Accounts
 * Supports IFRS-compliant classification
 */

const chartOfAccountSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Account Code following NAM structure
    // Format: XX-XXXX-XXXX-XXXX (Major-Minor-Detailed-Object)
    code: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    nameUrdu: {
      type: String,
    },
    description: {
      type: String,
    },
    // Account hierarchy
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      default: null,
    },
    // NAM Classification
    majorHead: {
      type: String, // e.g., "A01" for Employee Related Expenses
    },
    minorHead: {
      type: String,
    },
    detailedHead: {
      type: String,
    },
    objectHead: {
      type: String,
    },
    // Account Type (IFRS aligned)
    accountType: {
      type: String,
      enum: [
        'asset',           // Balance Sheet - Debit
        'liability',       // Balance Sheet - Credit
        'equity',          // Balance Sheet - Credit
        'revenue',         // Income Statement - Credit
        'expense',         // Income Statement - Debit
        'contra-asset',    // Balance Sheet - Credit
        'contra-liability' // Balance Sheet - Debit
      ],
      required: true,
    },
    // Sub-classification
    accountCategory: {
      type: String,
      enum: [
        // Assets
        'current-asset',
        'fixed-asset',
        'investment',
        'receivable',
        'cash-bank',
        // Liabilities
        'current-liability',
        'long-term-liability',
        'payable',
        // Equity
        'capital',
        'reserves',
        'retained-earnings',
        // Revenue
        'operating-revenue',
        'non-operating-revenue',
        'grant',
        // Expenses
        'employee-cost',
        'operating-expense',
        'administrative-expense',
        'financial-cost',
        'depreciation',
        'other-expense',
      ],
    },
    // Balance type
    normalBalance: {
      type: String,
      enum: ['debit', 'credit'],
      required: true,
    },
    // Control flags
    isActive: {
      type: Boolean,
      default: true,
    },
    isPostable: {
      type: Boolean,
      default: true, // False for header accounts
    },
    isBudgeted: {
      type: Boolean,
      default: true, // Whether this account is controlled by budget
    },
    requiresCostCenter: {
      type: Boolean,
      default: false,
    },
    // For bank accounts
    isBankAccount: {
      type: Boolean,
      default: false,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      iban: String,
      branchCode: String,
    },
    // For control accounts (linked to subledgers)
    isControlAccount: {
      type: Boolean,
      default: false,
    },
    subledgerType: {
      type: String,
      enum: ['vendor', 'customer', 'employee', 'bank', null],
      default: null,
    },
    // For tax accounts
    isTaxAccount: {
      type: Boolean,
      default: false,
    },
    taxType: {
      type: String,
      enum: ['income-tax', 'sales-tax', 'wht', 'custom-duty', null],
      default: null,
    },
    // Current balance (updated by GL postings)
    currentBalance: {
      type: Number,
      default: 0,
    },
    // Opening balance for the fiscal year
    openingBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound unique index for code within company
chartOfAccountSchema.index({ company: 1, code: 1 }, { unique: true });
chartOfAccountSchema.index({ company: 1, accountType: 1 });
chartOfAccountSchema.index({ company: 1, parent: 1 });
chartOfAccountSchema.index({ company: 1, level: 1 });

// Get full account path (breadcrumb)
chartOfAccountSchema.methods.getPath = async function() {
  const path = [this];
  let current = this;
  
  while (current.parent) {
    current = await mongoose.model('ChartOfAccount').findById(current.parent);
    if (current) {
      path.unshift(current);
    } else {
      break;
    }
  }
  
  return path.map(a => ({ code: a.code, name: a.name }));
};

// Get all children accounts
chartOfAccountSchema.methods.getChildren = async function() {
  return mongoose.model('ChartOfAccount').find({ parent: this._id, isActive: true }).sort('code');
};

// Static method to get account tree
chartOfAccountSchema.statics.getAccountTree = async function(companyId, accountType = null) {
  const query = { company: companyId, isActive: true };
  if (accountType) query.accountType = accountType;

  const accounts = await this.find(query).sort('code').lean();
  
  // Build tree structure
  const accountMap = new Map();
  const rootAccounts = [];

  accounts.forEach(account => {
    account.children = [];
    accountMap.set(account._id.toString(), account);
  });

  accounts.forEach(account => {
    if (account.parent) {
      const parent = accountMap.get(account.parent.toString());
      if (parent) {
        parent.children.push(account);
      } else {
        rootAccounts.push(account);
      }
    } else {
      rootAccounts.push(account);
    }
  });

  return rootAccounts;
};

export default mongoose.model('ChartOfAccount', chartOfAccountSchema);
