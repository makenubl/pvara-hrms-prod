import mongoose from 'mongoose';

/**
 * Purchase Order Schema
 * For encumbrance accounting and budget commitment
 * Properly tracks committed amounts before actual expenditure
 */

const purchaseOrderLineSchema = new mongoose.Schema({
  lineNumber: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  amount: {
    type: Number,
    required: true,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  // Budget allocation
  headOfAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: true,
  },
  costCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostCenter',
  },
  // Delivery tracking
  quantityReceived: {
    type: Number,
    default: 0,
  },
  quantityInvoiced: {
    type: Number,
    default: 0,
  },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // PO Number
    poNumber: {
      type: String,
      required: true,
    },
    // Vendor
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    // Dates
    poDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    // Fiscal tracking
    fiscalYear: {
      type: String,
      required: true,
    },
    period: {
      type: String, // YYYY-MM
    },
    // Lines
    lines: [purchaseOrderLineSchema],
    // Totals
    subtotal: {
      type: Number,
      default: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    // Currency
    currency: {
      type: String,
      default: 'PKR',
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },
    // Status
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',      // Budget committed at this stage
        'partially_received',
        'received',
        'invoiced',
        'closed',
        'cancelled',
      ],
      default: 'draft',
    },
    // Budget commitment tracking
    budgetCommitted: {
      type: Boolean,
      default: false,
    },
    budgetCommittedAt: {
      type: Date,
    },
    budgetReleasedAt: {
      type: Date,
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
    // Related documents
    requisition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequisition',
    },
    goodsReceipts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoodsReceipt',
    }],
    invoices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorInvoice',
    }],
    // Notes
    terms: String,
    notes: String,
    internalNotes: String,
  },
  { timestamps: true }
);

// Indexes
purchaseOrderSchema.index({ company: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ company: 1, vendor: 1 });
purchaseOrderSchema.index({ company: 1, status: 1 });
purchaseOrderSchema.index({ company: 1, fiscalYear: 1 });

// Calculate totals before save
purchaseOrderSchema.pre('save', function(next) {
  // Calculate line totals
  this.lines.forEach(line => {
    line.amount = line.quantity * line.unitPrice;
    line.totalAmount = line.amount + (line.taxAmount || 0);
  });

  // Calculate PO totals
  this.subtotal = this.lines.reduce((sum, line) => sum + line.amount, 0);
  this.taxTotal = this.lines.reduce((sum, line) => sum + (line.taxAmount || 0), 0);
  this.grandTotal = this.subtotal + this.taxTotal;

  // Auto-calculate fiscal year if not set
  if (!this.fiscalYear && this.poDate) {
    const month = new Date(this.poDate).getMonth();
    const year = new Date(this.poDate).getFullYear();
    this.fiscalYear = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }

  next();
});

// Method to commit budget (when PO is approved)
purchaseOrderSchema.methods.commitBudget = async function() {
  if (this.budgetCommitted) {
    throw new Error('Budget already committed for this PO');
  }

  const Budget = mongoose.model('Budget');

  // Group amounts by head of account and cost center
  const commitments = {};
  for (const line of this.lines) {
    const key = `${line.headOfAccount}-${line.costCenter || 'none'}`;
    if (!commitments[key]) {
      commitments[key] = {
        headOfAccount: line.headOfAccount,
        costCenter: line.costCenter,
        amount: 0,
      };
    }
    commitments[key].amount += line.totalAmount;
  }

  // Update budget committed amounts
  for (const key in commitments) {
    const c = commitments[key];
    await Budget.findOneAndUpdate(
      {
        company: this.company,
        fiscalYear: this.fiscalYear,
        status: { $in: ['approved', 'active'] },
        'lines.headOfAccount': c.headOfAccount,
        ...(c.costCenter && { 'lines.costCenter': c.costCenter })
      },
      {
        $inc: {
          'lines.$.committed': c.amount,
        }
      }
    );
  }

  this.budgetCommitted = true;
  this.budgetCommittedAt = new Date();
  await this.save();

  return true;
};

// Method to release budget commitment (when PO is cancelled or fully invoiced)
purchaseOrderSchema.methods.releaseBudgetCommitment = async function(releaseAmount = null) {
  if (!this.budgetCommitted) {
    return false; // Nothing to release
  }

  const Budget = mongoose.model('Budget');

  // Group amounts by head of account and cost center
  const commitments = {};
  for (const line of this.lines) {
    const key = `${line.headOfAccount}-${line.costCenter || 'none'}`;
    if (!commitments[key]) {
      commitments[key] = {
        headOfAccount: line.headOfAccount,
        costCenter: line.costCenter,
        amount: 0,
      };
    }
    // If releaseAmount specified, use proportional release; otherwise release all
    commitments[key].amount += releaseAmount || line.totalAmount;
  }

  // Release budget committed amounts
  for (const key in commitments) {
    const c = commitments[key];
    await Budget.findOneAndUpdate(
      {
        company: this.company,
        fiscalYear: this.fiscalYear,
        status: { $in: ['approved', 'active'] },
        'lines.headOfAccount': c.headOfAccount,
        ...(c.costCenter && { 'lines.costCenter': c.costCenter })
      },
      {
        $inc: {
          'lines.$.committed': -c.amount,
        }
      }
    );
  }

  this.budgetReleasedAt = new Date();
  
  // If fully released, mark as not committed
  if (!releaseAmount) {
    this.budgetCommitted = false;
  }
  
  await this.save();
  return true;
};

// Method to convert commitment to utilization (when invoice is received)
purchaseOrderSchema.methods.convertToUtilization = async function(invoiceAmount) {
  const Budget = mongoose.model('Budget');

  // Release commitment and add to utilized
  for (const line of this.lines) {
    // Pro-rate the invoice amount across lines
    const lineRatio = line.totalAmount / this.grandTotal;
    const lineInvoiceAmount = invoiceAmount * lineRatio;

    await Budget.findOneAndUpdate(
      {
        company: this.company,
        fiscalYear: this.fiscalYear,
        status: { $in: ['approved', 'active'] },
        'lines.headOfAccount': line.headOfAccount,
        ...(line.costCenter && { 'lines.costCenter': line.costCenter })
      },
      {
        $inc: {
          'lines.$.committed': -lineInvoiceAmount, // Release commitment
          'lines.$.utilized': lineInvoiceAmount,   // Add to utilized
          totalUtilized: lineInvoiceAmount,
        }
      }
    );
  }

  return true;
};

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
