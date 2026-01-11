import mongoose from 'mongoose';

/**
 * Currency and Exchange Rate Schema
 * For multi-currency transactions (IAS 21 compliant)
 */

const exchangeRateSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  source: {
    type: String,
    enum: ['sbp', 'manual', 'api', 'interbank'],
    default: 'manual',
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const currencySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Currency code (ISO 4217)
    code: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    name: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    // Decimal places
    decimalPlaces: {
      type: Number,
      default: 2,
    },
    // Is this the functional currency (IAS 21)
    isFunctional: {
      type: Boolean,
      default: false,
    },
    // Is this the reporting currency
    isReporting: {
      type: Boolean,
      default: false,
    },
    // Exchange rates against PKR (functional currency)
    exchangeRates: [exchangeRateSchema],
    // Current rate
    currentRate: {
      type: Number,
      default: 1,
    },
    lastRateUpdate: Date,
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
currencySchema.index({ company: 1, code: 1 }, { unique: true });

// Get rate for a specific date
currencySchema.methods.getRateForDate = function(date) {
  const targetDate = new Date(date);
  
  // Find the closest rate on or before the date
  const applicableRates = this.exchangeRates
    .filter(r => new Date(r.date) <= targetDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return applicableRates.length > 0 ? applicableRates[0].rate : this.currentRate;
};

// Convert amount to PKR
currencySchema.methods.toPKR = function(amount, date = null) {
  const rate = date ? this.getRateForDate(date) : this.currentRate;
  return Math.round(amount * rate * 100) / 100;
};

// Convert from PKR
currencySchema.methods.fromPKR = function(amountPKR, date = null) {
  const rate = date ? this.getRateForDate(date) : this.currentRate;
  return Math.round((amountPKR / rate) * 100) / 100;
};

export default mongoose.model('Currency', currencySchema);


/**
 * Foreign Currency Transaction Schema
 * Tracks multi-currency transactions for revaluation
 */

const foreignTransactionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Source document
    transactionType: {
      type: String,
      enum: ['receivable', 'payable', 'bank', 'advance'],
      required: true,
    },
    sourceDocument: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sourceModel',
    },
    sourceModel: {
      type: String,
      enum: ['JournalEntry', 'BankPaymentBatch', 'Invoice'],
    },
    // Currency details
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Currency',
      required: true,
    },
    currencyCode: String,
    // Original transaction
    transactionDate: {
      type: Date,
      required: true,
    },
    foreignAmount: {
      type: Number,
      required: true,
    },
    originalRate: {
      type: Number,
      required: true,
    },
    originalPKRAmount: {
      type: Number,
      required: true,
    },
    // Current valuation
    currentRate: Number,
    currentPKRAmount: Number,
    unrealizedGainLoss: {
      type: Number,
      default: 0,
    },
    // Settlement
    isSettled: {
      type: Boolean,
      default: false,
    },
    settledDate: Date,
    settledRate: Number,
    settledPKRAmount: Number,
    realizedGainLoss: Number,
    // Related account
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
    },
    // Party
    partyType: {
      type: String,
      enum: ['vendor', 'customer', null],
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'partyModel',
    },
    partyModel: {
      type: String,
      enum: ['Vendor', 'User', null],
    },
  },
  { timestamps: true }
);

foreignTransactionSchema.index({ company: 1, isSettled: 1 });
foreignTransactionSchema.index({ company: 1, currency: 1 });

export const ForeignTransaction = mongoose.model('ForeignTransaction', foreignTransactionSchema);
