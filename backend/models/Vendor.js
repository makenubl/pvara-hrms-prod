import mongoose from 'mongoose';

/**
 * Vendor Schema
 * Manages vendor/supplier information with WHT (Withholding Tax) configuration
 */

const vendorSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Vendor identification
    vendorCode: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    tradeName: {
      type: String,
    },
    // Contact information
    contactPerson: {
      type: String,
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    mobile: {
      type: String,
    },
    fax: {
      type: String,
    },
    website: {
      type: String,
    },
    // Address
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'Pakistan' },
      postalCode: String,
    },
    // Tax registration
    ntn: {
      type: String, // National Tax Number
    },
    strn: {
      type: String, // Sales Tax Registration Number
    },
    cnic: {
      type: String, // For unregistered vendors
    },
    isFiler: {
      type: Boolean,
      default: false, // FBR Active Taxpayer List status
    },
    filerVerifiedAt: {
      type: Date,
    },
    // Vendor classification
    vendorType: {
      type: String,
      enum: ['supplier', 'contractor', 'consultant', 'service-provider', 'utility', 'government', 'other'],
      default: 'supplier',
    },
    category: {
      type: String,
      enum: ['goods', 'services', 'works', 'mixed'],
      default: 'goods',
    },
    // WHT Configuration
    wht: {
      applicableSection: {
        type: String,
        enum: [
          '153-1a', // Supply of goods
          '153-1b', // Services
          '153-1c', // Contracts
          '233',    // Brokerage/Commission
          '234',    // Transport
          '235',    // Electricity
          'none',
        ],
        default: '153-1a',
      },
      // Rates for filers vs non-filers (updated as per latest FBR rates)
      filerRate: {
        type: Number,
        default: 4.5, // Current rate for filers on goods
      },
      nonFilerRate: {
        type: Number,
        default: 9, // Current rate for non-filers on goods
      },
      // Minimum threshold for WHT
      whtThreshold: {
        type: Number,
        default: 75000, // WHT applicable above this amount per transaction
      },
      // Exemption details
      isExempt: {
        type: Boolean,
        default: false,
      },
      exemptionCertificate: {
        type: String,
      },
      exemptionValidTill: {
        type: Date,
      },
    },
    // Sales Tax
    salesTax: {
      isRegistered: {
        type: Boolean,
        default: false,
      },
      rate: {
        type: Number,
        default: 18, // Standard GST rate
      },
      isExempt: {
        type: Boolean,
        default: false,
      },
    },
    // Bank details for payments
    bankDetails: {
      bankName: String,
      branchName: String,
      branchCode: String,
      accountTitle: String,
      accountNumber: String,
      iban: String,
      swiftCode: String,
    },
    // Payment terms
    paymentTerms: {
      type: String,
      enum: ['immediate', 'net-7', 'net-15', 'net-30', 'net-45', 'net-60', 'custom'],
      default: 'net-30',
    },
    customPaymentDays: {
      type: Number,
    },
    creditLimit: {
      type: Number,
      default: 0,
    },
    // GL Account mapping
    payableAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
    },
    expenseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
    },
    advanceAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked', 'pending-approval'],
      default: 'active',
    },
    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    // Balances
    currentBalance: {
      type: Number,
      default: 0, // Payable balance
    },
    advanceBalance: {
      type: Number,
      default: 0, // Advance paid
    },
    // Statistics
    totalPurchases: {
      type: Number,
      default: 0,
    },
    totalPayments: {
      type: Number,
      default: 0,
    },
    totalWhtDeducted: {
      type: Number,
      default: 0,
    },
    lastTransactionDate: {
      type: Date,
    },
    // Documents
    documents: [{
      name: String,
      type: {
        type: String,
        enum: ['ntn-certificate', 'strn-certificate', 'bank-certificate', 'contract', 'other'],
      },
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes
vendorSchema.index({ company: 1, vendorCode: 1 }, { unique: true });
vendorSchema.index({ company: 1, ntn: 1 });
vendorSchema.index({ company: 1, name: 'text' });
vendorSchema.index({ company: 1, status: 1 });

// Calculate WHT amount
vendorSchema.methods.calculateWHT = function(grossAmount) {
  // Check if WHT is applicable
  if (this.wht.isExempt) {
    return { whtAmount: 0, whtRate: 0, isExempt: true };
  }

  // Check threshold
  if (grossAmount < this.wht.whtThreshold) {
    return { whtAmount: 0, whtRate: 0, belowThreshold: true };
  }

  // Determine rate based on filer status
  const rate = this.isFiler ? this.wht.filerRate : this.wht.nonFilerRate;
  const whtAmount = Math.round(grossAmount * rate / 100);

  return {
    whtAmount,
    whtRate: rate,
    isFiler: this.isFiler,
    section: this.wht.applicableSection,
    netPayable: grossAmount - whtAmount,
  };
};

// Check if vendor NTN is in FBR Active Taxpayer List
vendorSchema.methods.verifyFilerStatus = async function() {
  // This would integrate with FBR ATL API
  // For now, return current status
  return {
    isFiler: this.isFiler,
    verifiedAt: this.filerVerifiedAt,
  };
};

export default mongoose.model('Vendor', vendorSchema);
