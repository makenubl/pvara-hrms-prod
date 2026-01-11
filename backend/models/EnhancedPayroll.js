import mongoose from 'mongoose';

/**
 * Enhanced Payroll Schema
 * Supports government payroll with GPF, Pension, Deputation, and detailed salary components
 */

// Allowance/Deduction line item
const payrollLineSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['allowance', 'deduction', 'earning', 'statutory'],
    required: true,
  },
  category: {
    type: String,
    enum: [
      // Allowances
      'basic-pay', 'ad-hoc-relief', 'house-rent', 'conveyance', 'medical', 
      'utility', 'special-allowance', 'qualification', 'charge-allowance',
      'deputation-allowance', 'officiating-allowance', 'other-allowance',
      // Deductions
      'income-tax', 'gpf', 'pension-contribution', 'benevolent-fund',
      'group-insurance', 'house-rent-recovery', 'advance-recovery',
      'loan-recovery', 'court-attachment', 'other-deduction',
    ],
  },
  // For tax calculation
  isTaxable: {
    type: Boolean,
    default: true,
  },
  // Calculation method
  calculationMethod: {
    type: String,
    enum: ['fixed', 'percentage', 'formula'],
    default: 'fixed',
  },
  // For percentage-based items
  baseCode: {
    type: String, // Code of the item this is calculated on (e.g., 'BASIC')
  },
  percentage: {
    type: Number,
  },
  // Amount
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  // GL Account for posting
  glAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
  },
});

// Deputation details
const deputationSchema = new mongoose.Schema({
  isOnDeputation: {
    type: Boolean,
    default: false,
  },
  parentDepartment: {
    type: String,
  },
  borrowingDepartment: {
    type: String,
  },
  deputationStartDate: {
    type: Date,
  },
  deputationEndDate: {
    type: Date,
  },
  deputationAllowancePercent: {
    type: Number,
    default: 20, // Standard 20% deputation allowance
  },
  settlementStatus: {
    type: String,
    enum: ['pending', 'claimed', 'received', 'settled'],
    default: 'pending',
  },
  settlementAmount: {
    type: Number,
    default: 0,
  },
});

// GPF (General Provident Fund) details
const gpfSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
  },
  monthlyContribution: {
    type: Number,
    default: 0,
  },
  contributionRate: {
    type: Number, // Percentage of basic pay
    default: 8.33,
  },
  currentBalance: {
    type: Number,
    default: 0,
  },
  interestRate: {
    type: Number,
    default: 13, // Current GPF interest rate
  },
  lastInterestDate: {
    type: Date,
  },
  // Advances
  advancesTaken: {
    type: Number,
    default: 0,
  },
  advancesRecovered: {
    type: Number,
    default: 0,
  },
  pendingAdvanceBalance: {
    type: Number,
    default: 0,
  },
});

// Pension details
const pensionSchema = new mongoose.Schema({
  isPensionable: {
    type: Boolean,
    default: true,
  },
  pensionScheme: {
    type: String,
    enum: ['gps', 'cps', 'none'], // Government Pension Scheme, Contributory Pension Scheme
    default: 'gps',
  },
  pensionAccountNumber: {
    type: String,
  },
  employeeContribution: {
    type: Number,
    default: 0,
  },
  employerContribution: {
    type: Number,
    default: 0,
  },
  contributionRate: {
    type: Number,
    default: 10, // Percentage
  },
  serviceStartDate: {
    type: Date,
  },
  qualifyingService: {
    years: { type: Number, default: 0 },
    months: { type: Number, default: 0 },
    days: { type: Number, default: 0 },
  },
});

const enhancedPayrollSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Payroll period
    fiscalYear: {
      type: String,
      required: true,
    },
    month: {
      type: String, // YYYY-MM format
      required: true,
    },
    payPeriodStart: {
      type: Date,
    },
    payPeriodEnd: {
      type: Date,
    },
    // Employee snapshot at time of payroll
    employeeSnapshot: {
      employeeId: String,
      name: String,
      designation: String,
      department: String,
      bps: Number, // Basic Pay Scale (1-22)
      stage: Number, // Stage within BPS
      bankAccount: String,
      iban: String,
    },
    // Pay scale details
    payScale: {
      bps: { type: Number, min: 1, max: 22 },
      stage: { type: Number, min: 1 },
      basicPay: { type: Number, default: 0 },
    },
    // Salary components
    earnings: [payrollLineSchema],
    deductions: [payrollLineSchema],
    // Calculated totals
    grossEarnings: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netPay: {
      type: Number,
      default: 0,
    },
    // Tax details
    taxableIncome: {
      type: Number,
      default: 0,
    },
    incomeTax: {
      type: Number,
      default: 0,
    },
    taxSlab: {
      type: String,
    },
    // GPF
    gpf: gpfSchema,
    // Pension
    pension: pensionSchema,
    // Deputation
    deputation: deputationSchema,
    // Attendance summary
    attendance: {
      workingDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      leaveDays: { type: Number, default: 0 },
      lateCount: { type: Number, default: 0 },
      overtimeHours: { type: Number, default: 0 },
    },
    // Status and workflow
    status: {
      type: String,
      enum: ['draft', 'calculated', 'verified', 'approved', 'paid', 'cancelled'],
      default: 'draft',
    },
    // Workflow tracking
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    calculatedAt: {
      type: Date,
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
    paidAt: {
      type: Date,
    },
    // Payment details
    paymentMethod: {
      type: String,
      enum: ['bank-transfer', 'raast', 'cheque', 'cash'],
    },
    paymentReference: {
      type: String,
    },
    bankPaymentBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankPaymentBatch',
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
    // Budget tracking
    budgetLine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Budget',
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    // Remarks
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes
enhancedPayrollSchema.index({ company: 1, month: 1 });
enhancedPayrollSchema.index({ company: 1, employee: 1, month: 1 }, { unique: true });
enhancedPayrollSchema.index({ company: 1, status: 1 });
enhancedPayrollSchema.index({ company: 1, fiscalYear: 1 });

// Calculate totals before save
enhancedPayrollSchema.pre('save', function(next) {
  // Calculate gross earnings
  this.grossEarnings = this.earnings.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate total deductions
  this.totalDeductions = this.deductions.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate net pay
  this.netPay = this.grossEarnings - this.totalDeductions;
  
  // Calculate taxable income (exclude non-taxable allowances)
  this.taxableIncome = this.earnings
    .filter(e => e.isTaxable)
    .reduce((sum, item) => sum + item.amount, 0);
  
  next();
});

// Method to calculate income tax based on FBR slabs
enhancedPayrollSchema.methods.calculateIncomeTax = function(annualTaxableIncome) {
  // FBR Tax Slabs FY 2025-26 (example - update as per latest)
  const taxSlabs = [
    { min: 0, max: 600000, rate: 0, fixed: 0 },
    { min: 600001, max: 1200000, rate: 2.5, fixed: 0 },
    { min: 1200001, max: 2400000, rate: 12.5, fixed: 15000 },
    { min: 2400001, max: 3600000, rate: 22.5, fixed: 165000 },
    { min: 3600001, max: 6000000, rate: 27.5, fixed: 435000 },
    { min: 6000001, max: Infinity, rate: 35, fixed: 1095000 },
  ];

  for (const slab of taxSlabs) {
    if (annualTaxableIncome >= slab.min && annualTaxableIncome <= slab.max) {
      const taxableAmount = annualTaxableIncome - slab.min + 1;
      const tax = slab.fixed + (taxableAmount * slab.rate / 100);
      this.taxSlab = `${slab.rate}%`;
      return Math.round(tax / 12); // Monthly tax
    }
  }
  
  return 0;
};

export default mongoose.model('EnhancedPayroll', enhancedPayrollSchema);
