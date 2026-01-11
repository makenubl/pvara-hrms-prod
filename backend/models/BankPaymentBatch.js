import mongoose from 'mongoose';

/**
 * Bank Payment Batch Schema
 * Manages bulk bank payments and RAAST payment file generation
 */

const paymentLineSchema = new mongoose.Schema({
  // Payment type
  paymentType: {
    type: String,
    enum: ['salary', 'vendor', 'reimbursement', 'advance', 'other'],
    required: true,
  },
  // Beneficiary details
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'beneficiaryModel',
  },
  beneficiaryModel: {
    type: String,
    enum: ['User', 'Vendor'],
  },
  beneficiaryName: {
    type: String,
    required: true,
  },
  beneficiaryAccount: {
    type: String,
    required: true,
  },
  beneficiaryIBAN: {
    type: String,
  },
  beneficiaryBank: {
    type: String,
  },
  beneficiaryBranchCode: {
    type: String,
  },
  // RAAST ID (for RAAST payments)
  raastId: {
    type: String, // Mobile number or CNIC for RAAST
  },
  // Amount details
  grossAmount: {
    type: Number,
    required: true,
  },
  whtAmount: {
    type: Number,
    default: 0,
  },
  otherDeductions: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    required: true,
  },
  // Reference
  reference: {
    type: String,
  },
  narration: {
    type: String,
  },
  // Source document
  sourceDocument: {
    type: {
      type: String,
      enum: ['payroll', 'invoice', 'expense', 'advance'],
    },
    documentId: mongoose.Schema.Types.ObjectId,
    documentNumber: String,
  },
  // Line status
  status: {
    type: String,
    enum: ['pending', 'processed', 'rejected', 'cancelled'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
  },
  // Bank response
  bankReference: {
    type: String,
  },
  bankResponseCode: {
    type: String,
  },
  bankResponseMessage: {
    type: String,
  },
  processedAt: {
    type: Date,
  },
});

const bankPaymentBatchSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Batch identification
    batchNumber: {
      type: String,
      required: true,
    },
    batchDate: {
      type: Date,
      required: true,
    },
    // Payment method
    paymentMethod: {
      type: String,
      enum: ['bank-transfer', 'raast', 'rtgs', 'ibft'],
      default: 'bank-transfer',
    },
    // Bank details (from which payments are made)
    sourceBank: {
      bankName: String,
      accountNumber: String,
      accountTitle: String,
      iban: String,
      branchCode: String,
    },
    // Batch type
    batchType: {
      type: String,
      enum: ['salary', 'vendor', 'mixed'],
      default: 'salary',
    },
    // Period (for salary batches)
    payrollMonth: {
      type: String, // YYYY-MM
    },
    // Payment lines
    payments: [paymentLineSchema],
    // Totals
    totalPayments: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalWHT: {
      type: Number,
      default: 0,
    },
    totalNetAmount: {
      type: Number,
      default: 0,
    },
    processedCount: {
      type: Number,
      default: 0,
    },
    rejectedCount: {
      type: Number,
      default: 0,
    },
    // Status
    status: {
      type: String,
      enum: ['draft', 'pending-approval', 'approved', 'file-generated', 'submitted', 'partially-processed', 'completed', 'cancelled'],
      default: 'draft',
    },
    // File generation
    paymentFile: {
      fileName: String,
      fileFormat: {
        type: String,
        enum: ['text', 'csv', 'xml', 'raast-json'],
      },
      fileUrl: String,
      generatedAt: Date,
      generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    // Workflow
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedAt: {
      type: Date,
    },
    // GL posting
    isPosted: {
      type: Boolean,
      default: false,
    },
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    // Bank response (after file upload)
    bankResponse: {
      receivedAt: Date,
      status: String,
      message: String,
      responseFile: String,
    },
    // Remarks
    remarks: {
      type: String,
    },
    // Audit log
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
bankPaymentBatchSchema.index({ company: 1, batchNumber: 1 }, { unique: true });
bankPaymentBatchSchema.index({ company: 1, batchDate: 1 });
bankPaymentBatchSchema.index({ company: 1, status: 1 });

// Calculate totals before save
bankPaymentBatchSchema.pre('save', function(next) {
  this.totalPayments = this.payments.length;
  this.totalAmount = this.payments.reduce((sum, p) => sum + p.grossAmount, 0);
  this.totalWHT = this.payments.reduce((sum, p) => sum + p.whtAmount, 0);
  this.totalNetAmount = this.payments.reduce((sum, p) => sum + p.netAmount, 0);
  this.processedCount = this.payments.filter(p => p.status === 'processed').length;
  this.rejectedCount = this.payments.filter(p => p.status === 'rejected').length;
  next();
});

// Generate RAAST payment file
bankPaymentBatchSchema.methods.generateRAAST = function() {
  const payments = this.payments.filter(p => p.status === 'pending');
  
  const raastData = {
    header: {
      batchId: this.batchNumber,
      batchDate: this.batchDate.toISOString().slice(0, 10),
      senderIBAN: this.sourceBank.iban,
      senderName: this.sourceBank.accountTitle,
      totalRecords: payments.length,
      totalAmount: this.totalNetAmount,
      currency: 'PKR',
    },
    transactions: payments.map((payment, index) => ({
      transactionId: `${this.batchNumber}-${String(index + 1).padStart(4, '0')}`,
      beneficiaryName: payment.beneficiaryName,
      beneficiaryIBAN: payment.beneficiaryIBAN,
      beneficiaryAccount: payment.beneficiaryAccount,
      beneficiaryRaastId: payment.raastId,
      amount: payment.netAmount,
      currency: 'PKR',
      purposeCode: payment.paymentType === 'salary' ? 'SAL' : 'VEN',
      narration: payment.narration || payment.reference,
    })),
  };

  return JSON.stringify(raastData, null, 2);
};

// Generate bank-specific payment file (CSV format)
bankPaymentBatchSchema.methods.generateCSV = function() {
  const payments = this.payments.filter(p => p.status === 'pending');
  
  // CSV Header
  const header = [
    'Sr#',
    'Beneficiary Name',
    'Account Number',
    'IBAN',
    'Bank',
    'Branch Code',
    'Amount',
    'Reference',
    'Narration',
  ].join(',');

  // CSV Rows
  const rows = payments.map((payment, index) => [
    index + 1,
    `"${payment.beneficiaryName}"`,
    payment.beneficiaryAccount,
    payment.beneficiaryIBAN || '',
    payment.beneficiaryBank || '',
    payment.beneficiaryBranchCode || '',
    payment.netAmount,
    payment.reference || '',
    `"${payment.narration || ''}"`,
  ].join(','));

  return [header, ...rows].join('\n');
};

// Generate text file (for older bank systems)
bankPaymentBatchSchema.methods.generateTextFile = function() {
  const payments = this.payments.filter(p => p.status === 'pending');
  
  // Fixed-width format (common for Pakistani banks)
  const lines = payments.map((payment, index) => {
    const sr = String(index + 1).padStart(5, '0');
    const name = payment.beneficiaryName.padEnd(50, ' ').slice(0, 50);
    const account = payment.beneficiaryAccount.padEnd(20, ' ').slice(0, 20);
    const amount = String(Math.round(payment.netAmount * 100)).padStart(15, '0'); // In paisa
    const ref = (payment.reference || '').padEnd(20, ' ').slice(0, 20);
    
    return `${sr}${name}${account}${amount}${ref}`;
  });

  // Add header
  const header = [
    'BATCH:' + this.batchNumber.padEnd(20, ' '),
    'DATE:' + this.batchDate.toISOString().slice(0, 10),
    'COUNT:' + String(payments.length).padStart(6, '0'),
    'TOTAL:' + String(Math.round(this.totalNetAmount * 100)).padStart(15, '0'),
  ].join('');

  return [header, ...lines].join('\n');
};

// Static method to generate batch number
bankPaymentBatchSchema.statics.generateBatchNumber = async function(companyId, type = 'PAY') {
  const count = await this.countDocuments({ company: companyId });
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `${type}-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

export default mongoose.model('BankPaymentBatch', bankPaymentBatchSchema);
