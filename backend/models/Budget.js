import mongoose from 'mongoose';

/**
 * Budget Schema
 * Manages budget allocation by Fiscal Year, Head of Account, and Cost Center
 * Aligned with NAM (New Accounting Model) and government Chart of Accounts
 */

const budgetLineSchema = new mongoose.Schema({
  headOfAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: true,
  },
  costCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostCenter',
  },
  description: {
    type: String,
    required: true,
  },
  originalBudget: {
    type: Number,
    required: true,
    min: 0,
  },
  revisedBudget: {
    type: Number,
    default: 0,
  },
  supplementaryBudget: {
    type: Number,
    default: 0,
  },
  surrenderedAmount: {
    type: Number,
    default: 0,
  },
  reappropriatedIn: {
    type: Number,
    default: 0,
  },
  reappropriatedOut: {
    type: Number,
    default: 0,
  },
  // Calculated fields
  totalBudget: {
    type: Number,
    default: 0,
  },
  utilized: {
    type: Number,
    default: 0,
  },
  committed: {
    type: Number,
    default: 0,
  },
  available: {
    type: Number,
    default: 0,
  },
  // Control settings
  alertThreshold: {
    type: Number,
    default: 80, // Alert when 80% utilized
  },
  blockThreshold: {
    type: Number,
    default: 100, // Block when 100% utilized
  },
  allowOverride: {
    type: Boolean,
    default: false,
  },
});

const budgetSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    fiscalYear: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{4}-\d{4}$/.test(v); // e.g., "2025-2026"
        },
        message: 'Fiscal year must be in format YYYY-YYYY (e.g., 2025-2026)'
      }
    },
    budgetType: {
      type: String,
      enum: ['original', 'revised', 'supplementary'],
      default: 'original',
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'active', 'closed'],
      default: 'draft',
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    // Budget lines by Head of Account
    lines: [budgetLineSchema],
    // Totals
    totalOriginalBudget: {
      type: Number,
      default: 0,
    },
    totalRevisedBudget: {
      type: Number,
      default: 0,
    },
    totalUtilized: {
      type: Number,
      default: 0,
    },
    totalAvailable: {
      type: Number,
      default: 0,
    },
    // Approval workflow
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    // Audit trail
    history: [{
      action: {
        type: String,
        enum: ['created', 'updated', 'submitted', 'approved', 'rejected', 'revised'],
      },
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      performedAt: {
        type: Date,
        default: Date.now,
      },
      changes: {
        type: mongoose.Schema.Types.Mixed,
      },
      remarks: {
        type: String,
      },
    }],
  },
  { timestamps: true }
);

// Indexes for performance
budgetSchema.index({ company: 1, fiscalYear: 1 });
budgetSchema.index({ company: 1, status: 1 });

// Calculate totals before save
budgetSchema.pre('save', function(next) {
  // Calculate line totals
  this.lines.forEach(line => {
    line.totalBudget = 
      line.originalBudget + 
      line.revisedBudget + 
      line.supplementaryBudget - 
      line.surrenderedAmount + 
      line.reappropriatedIn - 
      line.reappropriatedOut;
    
    line.available = line.totalBudget - line.utilized - line.committed;
  });

  // Calculate budget totals
  this.totalOriginalBudget = this.lines.reduce((sum, line) => sum + line.originalBudget, 0);
  this.totalRevisedBudget = this.lines.reduce((sum, line) => sum + line.totalBudget, 0);
  this.totalUtilized = this.lines.reduce((sum, line) => sum + line.utilized, 0);
  this.totalAvailable = this.lines.reduce((sum, line) => sum + line.available, 0);

  next();
});

// Method to check budget availability
budgetSchema.methods.checkBudgetAvailability = function(headOfAccountId, amount, costCenterId = null) {
  const line = this.lines.find(l => 
    l.headOfAccount.toString() === headOfAccountId.toString() &&
    (!costCenterId || l.costCenter?.toString() === costCenterId.toString())
  );

  if (!line) {
    return { available: false, message: 'Budget line not found' };
  }

  const utilizationPercent = ((line.utilized + line.committed + amount) / line.totalBudget) * 100;

  if (utilizationPercent > line.blockThreshold && !line.allowOverride) {
    return { 
      available: false, 
      message: `Budget exceeded. Available: PKR ${line.available.toLocaleString()}`,
      utilizationPercent,
      budgetLine: line
    };
  }

  if (utilizationPercent > line.alertThreshold) {
    return { 
      available: true, 
      warning: true,
      message: `Warning: Budget utilization at ${utilizationPercent.toFixed(1)}%`,
      utilizationPercent,
      budgetLine: line
    };
  }

  return { 
    available: true, 
    message: 'Budget available',
    utilizationPercent,
    budgetLine: line
  };
};

// Method to commit budget (when expense is approved but not yet paid)
budgetSchema.methods.commitBudget = function(headOfAccountId, amount, costCenterId = null) {
  const line = this.lines.find(l => 
    l.headOfAccount.toString() === headOfAccountId.toString() &&
    (!costCenterId || l.costCenter?.toString() === costCenterId.toString())
  );

  if (line) {
    line.committed += amount;
    line.available = line.totalBudget - line.utilized - line.committed;
  }
};

// Method to utilize budget (when expense is paid)
budgetSchema.methods.utilizeBudget = function(headOfAccountId, amount, costCenterId = null, releaseCommitted = true) {
  const line = this.lines.find(l => 
    l.headOfAccount.toString() === headOfAccountId.toString() &&
    (!costCenterId || l.costCenter?.toString() === costCenterId.toString())
  );

  if (line) {
    line.utilized += amount;
    if (releaseCommitted) {
      line.committed = Math.max(0, line.committed - amount);
    }
    line.available = line.totalBudget - line.utilized - line.committed;
  }
};

export default mongoose.model('Budget', budgetSchema);
