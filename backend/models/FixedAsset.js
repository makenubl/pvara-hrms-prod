import mongoose from 'mongoose';

/**
 * Fixed Asset Schema
 * For asset register and depreciation tracking (IFRS/IAS 16 compliant)
 */

const depreciationScheduleSchema = new mongoose.Schema({
  period: {
    type: String, // YYYY-MM
    required: true,
  },
  fiscalYear: {
    type: String,
    required: true,
  },
  openingValue: {
    type: Number,
    required: true,
  },
  depreciationAmount: {
    type: Number,
    required: true,
  },
  accumulatedDepreciation: {
    type: Number,
    required: true,
  },
  closingValue: {
    type: Number,
    required: true,
  },
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
  },
  posted: {
    type: Boolean,
    default: false,
  },
  postedAt: Date,
});

const fixedAssetSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Asset identification
    assetCode: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    // Classification
    assetClass: {
      type: String,
      enum: [
        'land',
        'buildings',
        'plant_machinery',
        'vehicles',
        'furniture_fixtures',
        'office_equipment',
        'computer_equipment',
        'intangible',
        'leasehold_improvements',
        'other',
      ],
      required: true,
    },
    // Location and custody
    location: String,
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    custodian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Acquisition details
    acquisitionDate: {
      type: Date,
      required: true,
    },
    acquisitionCost: {
      type: Number,
      required: true,
    },
    // Additional costs capitalized
    installationCost: {
      type: Number,
      default: 0,
    },
    otherCapitalizedCosts: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      required: true,
    },
    // Supplier/Vendor
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    purchaseInvoice: String,
    // GL Accounts
    assetAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      required: true,
    },
    accumulatedDepreciationAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      required: true,
    },
    depreciationExpenseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      required: true,
    },
    // Depreciation settings (IAS 16 / Income Tax Rules)
    depreciationMethod: {
      type: String,
      enum: [
        'straight_line',      // SLM - IFRS standard
        'reducing_balance',   // WDV - Pakistan Income Tax
        'units_of_production',
        'sum_of_years',
        'no_depreciation',    // For land
      ],
      default: 'straight_line',
    },
    usefulLifeMonths: {
      type: Number,
      required: true,
    },
    // Pakistan Income Tax depreciation rates (Third Schedule)
    incomeTaxRate: {
      type: Number, // e.g., 10, 15, 30 for WDV method
    },
    residualValue: {
      type: Number,
      default: 0,
    },
    depreciableAmount: {
      type: Number,
    },
    monthlyDepreciation: {
      type: Number,
    },
    annualDepreciation: {
      type: Number,
    },
    // Depreciation start
    depreciationStartDate: {
      type: Date,
      required: true,
    },
    // Current values
    currentBookValue: {
      type: Number,
    },
    accumulatedDepreciation: {
      type: Number,
      default: 0,
    },
    // Depreciation schedule
    depreciationSchedule: [depreciationScheduleSchema],
    // Revaluation (IAS 16)
    revaluations: [{
      date: Date,
      previousValue: Number,
      newValue: Number,
      revaluationSurplus: Number,
      appraiser: String,
      remarks: String,
      journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    }],
    // Impairment (IAS 36)
    impairments: [{
      date: Date,
      previousValue: Number,
      impairmentLoss: Number,
      newValue: Number,
      reason: String,
      journalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    }],
    // Disposal
    isDisposed: {
      type: Boolean,
      default: false,
    },
    disposalDate: Date,
    disposalMethod: {
      type: String,
      enum: ['sale', 'scrap', 'donation', 'write_off', 'theft', 'damage'],
    },
    saleProceeds: Number,
    disposalCosts: Number,
    gainLossOnDisposal: Number,
    disposalJournalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'under_maintenance', 'idle', 'disposed', 'written_off'],
      default: 'active',
    },
    // Physical verification
    lastVerificationDate: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Insurance
    isInsured: {
      type: Boolean,
      default: false,
    },
    insurancePolicy: String,
    insuredValue: Number,
    insuranceExpiry: Date,
    // Warranty
    warrantyExpiry: Date,
    // Attachments
    attachments: [{
      name: String,
      type: { type: String, enum: ['invoice', 'photo', 'warranty', 'insurance', 'other'] },
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Indexes
fixedAssetSchema.index({ company: 1, assetCode: 1 }, { unique: true });
fixedAssetSchema.index({ company: 1, assetClass: 1 });
fixedAssetSchema.index({ company: 1, status: 1 });
fixedAssetSchema.index({ company: 1, department: 1 });

// Calculate depreciation values before save
fixedAssetSchema.pre('save', function(next) {
  // Calculate total cost
  this.totalCost = this.acquisitionCost + (this.installationCost || 0) + (this.otherCapitalizedCosts || 0);
  
  // Calculate depreciable amount (IAS 16: Cost - Residual Value)
  this.depreciableAmount = this.totalCost - (this.residualValue || 0);
  
  // Calculate depreciation based on method
  if (this.depreciationMethod === 'straight_line') {
    this.annualDepreciation = this.depreciableAmount / (this.usefulLifeMonths / 12);
    this.monthlyDepreciation = this.annualDepreciation / 12;
  } else if (this.depreciationMethod === 'reducing_balance') {
    // For WDV method, use income tax rate
    const rate = this.incomeTaxRate || 10;
    this.annualDepreciation = (this.currentBookValue || this.totalCost) * (rate / 100);
    this.monthlyDepreciation = this.annualDepreciation / 12;
  } else if (this.depreciationMethod === 'sum_of_years') {
    // SYD (Sum of Years Digits) method
    // FIX ISSUE #76: Implement SYD depreciation
    const usefulLifeYears = Math.ceil(this.usefulLifeMonths / 12);
    const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
    // Calculate remaining years from acquisition
    const monthsElapsed = this.accumulatedDepreciation > 0 
      ? Math.floor((this.totalCost - this.currentBookValue - this.residualValue) / (this.depreciableAmount / usefulLifeYears))
      : 0;
    const remainingYears = Math.max(usefulLifeYears - monthsElapsed, 1);
    this.annualDepreciation = (remainingYears / sumOfYears) * this.depreciableAmount;
    this.monthlyDepreciation = this.annualDepreciation / 12;
  } else if (this.depreciationMethod === 'no_depreciation') {
    this.annualDepreciation = 0;
    this.monthlyDepreciation = 0;
  }
  
  // Calculate current book value
  this.currentBookValue = this.totalCost - this.accumulatedDepreciation;
  
  next();
});

// Method to calculate depreciation for a period
fixedAssetSchema.methods.calculateDepreciation = function(periodDate) {
  if (this.depreciationMethod === 'no_depreciation' || this.isDisposed) {
    return 0;
  }
  
  if (new Date(periodDate) < new Date(this.depreciationStartDate)) {
    return 0;
  }
  
  // Check if fully depreciated
  if (this.currentBookValue <= this.residualValue) {
    return 0;
  }
  
  let depreciation = this.monthlyDepreciation;
  
  // For reducing balance, recalculate based on current WDV
  if (this.depreciationMethod === 'reducing_balance') {
    const rate = this.incomeTaxRate || 10;
    depreciation = (this.currentBookValue * (rate / 100)) / 12;
  }
  
  // FIX ISSUE #76: For SYD, recalculate based on remaining life
  if (this.depreciationMethod === 'sum_of_years') {
    const usefulLifeYears = Math.ceil(this.usefulLifeMonths / 12);
    const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
    const acquisitionDate = new Date(this.acquisitionDate);
    const periodDateObj = new Date(periodDate);
    const monthsFromAcquisition = Math.floor(
      (periodDateObj.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
    );
    const yearsElapsed = Math.floor(monthsFromAcquisition / 12);
    const remainingYears = Math.max(usefulLifeYears - yearsElapsed, 1);
    depreciation = ((remainingYears / sumOfYears) * this.depreciableAmount) / 12;
  }
  
  // Ensure we don't depreciate below residual value
  const maxDepreciation = this.currentBookValue - this.residualValue;
  return Math.min(depreciation, maxDepreciation);
};

// Static: Pakistan Income Tax Depreciation Rates (Third Schedule)
fixedAssetSchema.statics.getIncomeTaxRates = function() {
  return {
    buildings: { normal: 10, factory: 10 },
    furniture_fixtures: 15,
    plant_machinery: { normal: 15, initial: 25 },
    vehicles: { normal: 15, commercial: 30 },
    computer_equipment: 30,
    office_equipment: 15,
    intangible: { patents: 10, software: 30 },
  };
};

export default mongoose.model('FixedAsset', fixedAssetSchema);
