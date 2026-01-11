import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// ============================================================================
// MULTI-CURRENCY & FOREX MODULE - CA/CFO CRITICAL (Issue #14)
// Provides exchange rates, currency conversion, and realized/unrealized gains
// IAS 21 Compliance: The Effects of Changes in Foreign Exchange Rates
// ============================================================================

// ExchangeRate Schema
const exchangeRateSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Base Currency (usually PKR for Pakistan)
  baseCurrency: {
    type: String,
    default: 'PKR',
    uppercase: true,
    trim: true
  },
  
  // Foreign Currency
  foreignCurrency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  
  // Rate (1 foreign currency = X base currency)
  // e.g., 1 USD = 278.50 PKR, so rate = 278.50
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Effective Date
  effectiveDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Rate Type
  rateType: {
    type: String,
    enum: ['SPOT', 'AVERAGE', 'CLOSING', 'BUDGET'],
    default: 'SPOT'
  },
  
  // Source
  source: {
    type: String,
    enum: ['SBP', 'OPEN_MARKET', 'BANK', 'MANUAL'],
    default: 'MANUAL'
  },
  
  // Buying/Selling rates
  buyRate: { type: Number },
  sellRate: { type: Number },
  
  notes: { type: String },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

exchangeRateSchema.index({ company: 1, foreignCurrency: 1, effectiveDate: -1 });

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

// Foreign Currency Balance Schema
const fcyBalanceSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Account (Bank, AR, AP)
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: true,
    index: true
  },
  
  // Vendor/Customer (if applicable)
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  
  // Currency
  currency: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  
  // Foreign Currency Amount
  fcyBalance: {
    type: Number,
    default: 0
  },
  
  // Base Currency Equivalent (at original rates)
  baseCurrencyBalance: {
    type: Number,
    default: 0
  },
  
  // Last Revaluation
  lastRevaluationDate: { type: Date },
  lastRevaluationRate: { type: Number },
  revaluedBalance: { type: Number },
  unrealizedGainLoss: { type: Number, default: 0 }
  
}, { timestamps: true });

fcyBalanceSchema.index({ company: 1, account: 1, currency: 1 }, { unique: true });

const FCYBalance = mongoose.model('FCYBalance', fcyBalanceSchema);

// ============================================================================
// EXCHANGE RATES CRUD
// ============================================================================

// GET /rates - Get Exchange Rates
router.get('/rates', authenticate, async (req, res) => {
  try {
    const { currency, startDate, endDate, rateType } = req.query;
    
    const query = { company: req.user.company };
    if (currency) query.foreignCurrency = currency.toUpperCase();
    if (rateType) query.rateType = rateType;
    if (startDate || endDate) {
      query.effectiveDate = {};
      if (startDate) query.effectiveDate.$gte = new Date(startDate);
      if (endDate) query.effectiveDate.$lte = new Date(endDate);
    }
    
    const rates = await ExchangeRate.find(query)
      .sort({ foreignCurrency: 1, effectiveDate: -1 })
      .lean();
    
    res.json({ success: true, data: rates });
    
  } catch (error) {
    console.error('Get rates error:', error);
    res.status(500).json({ message: 'Error fetching rates', error: error.message });
  }
});

// POST /rates - Add Exchange Rate
router.post('/rates', authenticate, async (req, res) => {
  try {
    const { foreignCurrency, rate, effectiveDate, rateType, source, buyRate, sellRate, notes } = req.body;
    
    if (!foreignCurrency || !rate || !effectiveDate) {
      return res.status(400).json({ message: 'Currency, rate, and effective date required' });
    }
    
    const exchangeRate = new ExchangeRate({
      company: req.user.company,
      baseCurrency: 'PKR',
      foreignCurrency: foreignCurrency.toUpperCase(),
      rate,
      effectiveDate: new Date(effectiveDate),
      rateType: rateType || 'SPOT',
      source: source || 'MANUAL',
      buyRate,
      sellRate,
      notes,
      createdBy: req.user._id
    });
    
    await exchangeRate.save();
    
    res.status(201).json({
      success: true,
      message: 'Exchange rate added',
      data: exchangeRate
    });
    
  } catch (error) {
    console.error('Add rate error:', error);
    res.status(500).json({ message: 'Error adding rate', error: error.message });
  }
});

// GET /rates/current/:currency - Get Current Rate for Currency
router.get('/rates/current/:currency', authenticate, async (req, res) => {
  try {
    const { currency } = req.params;
    const { asOfDate } = req.query;
    
    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    
    const rate = await ExchangeRate.findOne({
      company: req.user.company,
      foreignCurrency: currency.toUpperCase(),
      effectiveDate: { $lte: targetDate }
    })
      .sort({ effectiveDate: -1 })
      .lean();
    
    if (!rate) {
      return res.status(404).json({ message: `No rate found for ${currency}` });
    }
    
    res.json({
      success: true,
      data: rate,
      asOfDate: targetDate
    });
    
  } catch (error) {
    console.error('Get current rate error:', error);
    res.status(500).json({ message: 'Error fetching rate', error: error.message });
  }
});

// ============================================================================
// CURRENCY CONVERSION
// ============================================================================

// POST /convert - Convert Currency Amount
router.post('/convert', authenticate, async (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount, asOfDate } = req.body;
    
    if (!fromCurrency || !toCurrency || amount === undefined) {
      return res.status(400).json({ message: 'From currency, to currency, and amount required' });
    }
    
    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    
    let convertedAmount = amount;
    let usedRate = 1;
    
    if (fromCurrency.toUpperCase() === 'PKR' && toCurrency.toUpperCase() !== 'PKR') {
      // PKR to Foreign: divide by rate
      const rate = await ExchangeRate.findOne({
        company: req.user.company,
        foreignCurrency: toCurrency.toUpperCase(),
        effectiveDate: { $lte: targetDate }
      }).sort({ effectiveDate: -1 });
      
      if (!rate) {
        return res.status(404).json({ message: `No rate found for ${toCurrency}` });
      }
      
      convertedAmount = amount / rate.rate;
      usedRate = rate.rate;
      
    } else if (fromCurrency.toUpperCase() !== 'PKR' && toCurrency.toUpperCase() === 'PKR') {
      // Foreign to PKR: multiply by rate
      const rate = await ExchangeRate.findOne({
        company: req.user.company,
        foreignCurrency: fromCurrency.toUpperCase(),
        effectiveDate: { $lte: targetDate }
      }).sort({ effectiveDate: -1 });
      
      if (!rate) {
        return res.status(404).json({ message: `No rate found for ${fromCurrency}` });
      }
      
      convertedAmount = amount * rate.rate;
      usedRate = rate.rate;
      
    } else if (fromCurrency.toUpperCase() !== toCurrency.toUpperCase()) {
      // Cross-rate: Foreign to Foreign via PKR
      const fromRate = await ExchangeRate.findOne({
        company: req.user.company,
        foreignCurrency: fromCurrency.toUpperCase(),
        effectiveDate: { $lte: targetDate }
      }).sort({ effectiveDate: -1 });
      
      const toRate = await ExchangeRate.findOne({
        company: req.user.company,
        foreignCurrency: toCurrency.toUpperCase(),
        effectiveDate: { $lte: targetDate }
      }).sort({ effectiveDate: -1 });
      
      if (!fromRate || !toRate) {
        return res.status(404).json({ message: 'Exchange rates not found for cross conversion' });
      }
      
      // Convert to PKR, then to target currency
      const pkrAmount = amount * fromRate.rate;
      convertedAmount = pkrAmount / toRate.rate;
      usedRate = fromRate.rate / toRate.rate;
    }
    
    res.json({
      success: true,
      data: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        originalAmount: amount,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        rate: usedRate,
        asOfDate: targetDate
      }
    });
    
  } catch (error) {
    console.error('Convert currency error:', error);
    res.status(500).json({ message: 'Error converting currency', error: error.message });
  }
});

// ============================================================================
// REVALUATION (Unrealized Gain/Loss)
// ============================================================================

// GET /balances - Get FCY Balances
router.get('/balances', authenticate, async (req, res) => {
  try {
    const { currency, accountType } = req.query;
    
    const query = { company: req.user.company };
    if (currency) query.currency = currency.toUpperCase();
    
    const balances = await FCYBalance.find(query)
      .populate('account', 'accountCode accountName accountType')
      .populate('vendor', 'name vendorCode')
      .lean();
    
    res.json({ success: true, data: balances });
    
  } catch (error) {
    console.error('Get FCY balances error:', error);
    res.status(500).json({ message: 'Error fetching balances', error: error.message });
  }
});

// POST /revalue - Revalue FCY Balances (Month-end Process)
router.post('/revalue', authenticate, async (req, res) => {
  try {
    const { asOfDate, currencies, createJournalEntries = false } = req.body;
    
    const revalDate = asOfDate ? new Date(asOfDate) : new Date();
    const targetCurrencies = currencies || ['USD', 'EUR', 'GBP', 'AED', 'SAR'];
    
    const results = [];
    let totalUnrealizedGain = 0;
    let totalUnrealizedLoss = 0;
    
    for (const currency of targetCurrencies) {
      // Get current rate
      const currentRate = await ExchangeRate.findOne({
        company: req.user.company,
        foreignCurrency: currency,
        effectiveDate: { $lte: revalDate }
      }).sort({ effectiveDate: -1 });
      
      if (!currentRate) continue;
      
      // Get all FCY balances for this currency
      const balances = await FCYBalance.find({
        company: req.user.company,
        currency,
        fcyBalance: { $ne: 0 }
      }).populate('account', 'accountCode accountName accountType');
      
      for (const balance of balances) {
        const newRevaluedBalance = balance.fcyBalance * currentRate.rate;
        const gainLoss = newRevaluedBalance - balance.baseCurrencyBalance;
        
        if (gainLoss > 0) {
          totalUnrealizedGain += gainLoss;
        } else {
          totalUnrealizedLoss += Math.abs(gainLoss);
        }
        
        // Update balance
        balance.lastRevaluationDate = revalDate;
        balance.lastRevaluationRate = currentRate.rate;
        balance.revaluedBalance = newRevaluedBalance;
        balance.unrealizedGainLoss = gainLoss;
        await balance.save();
        
        results.push({
          account: balance.account?.accountName,
          accountCode: balance.account?.accountCode,
          currency,
          fcyBalance: balance.fcyBalance,
          originalBaseBalance: balance.baseCurrencyBalance,
          currentRate: currentRate.rate,
          revaluedBalance: newRevaluedBalance,
          gainLoss,
          type: gainLoss >= 0 ? 'GAIN' : 'LOSS'
        });
      }
    }
    
    // Create revaluation journal entry if requested
    let journalEntryId = null;
    if (createJournalEntries && (totalUnrealizedGain !== 0 || totalUnrealizedLoss !== 0)) {
      const JournalEntry = mongoose.model('JournalEntry');
      const ChartOfAccount = mongoose.model('ChartOfAccount');
      
      // Find forex gain/loss accounts
      const forexGainAccount = await ChartOfAccount.findOne({
        company: req.user.company,
        accountName: /forex.*gain|unrealized.*gain|exchange.*gain/i
      });
      
      const forexLossAccount = await ChartOfAccount.findOne({
        company: req.user.company,
        accountName: /forex.*loss|unrealized.*loss|exchange.*loss/i
      });
      
      if (forexGainAccount && forexLossAccount) {
        const lines = [];
        
        // Group by account for cleaner entries
        const accountTotals = {};
        results.forEach(r => {
          const key = r.accountCode;
          if (!accountTotals[key]) {
            accountTotals[key] = { account: r.account, total: 0 };
          }
          accountTotals[key].total += r.gainLoss;
        });
        
        for (const key of Object.keys(accountTotals)) {
          const { total } = accountTotals[key];
          // Find the actual account
          const account = await ChartOfAccount.findOne({
            company: req.user.company,
            accountCode: key
          });
          
          if (account && total !== 0) {
            if (total > 0) {
              // Asset increase or Liability decrease = Debit
              lines.push({
                account: account._id,
                debit: total,
                credit: 0,
                description: `Revaluation adjustment - ${key}`
              });
            } else {
              // Asset decrease or Liability increase = Credit
              lines.push({
                account: account._id,
                debit: 0,
                credit: Math.abs(total),
                description: `Revaluation adjustment - ${key}`
              });
            }
          }
        }
        
        // Offset to forex gain/loss
        const netGainLoss = totalUnrealizedGain - totalUnrealizedLoss;
        if (netGainLoss > 0) {
          lines.push({
            account: forexGainAccount._id,
            debit: 0,
            credit: netGainLoss,
            description: 'Unrealized forex gain'
          });
        } else if (netGainLoss < 0) {
          lines.push({
            account: forexLossAccount._id,
            debit: Math.abs(netGainLoss),
            credit: 0,
            description: 'Unrealized forex loss'
          });
        }
        
        if (lines.length >= 2) {
          const entry = new JournalEntry({
            company: req.user.company,
            entryNumber: `REVAL-${revalDate.toISOString().slice(0, 7)}`,
            entryDate: revalDate,
            description: `Month-end forex revaluation as of ${revalDate.toDateString()}`,
            lines,
            status: 'posted',
            postedBy: req.user._id,
            postedAt: new Date(),
            reference: 'FOREX_REVALUATION',
            skipBudgetUpdate: true
          });
          
          await entry.save();
          journalEntryId = entry._id;
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Revaluation complete',
      data: {
        asOfDate: revalDate,
        results,
        summary: {
          totalUnrealizedGain,
          totalUnrealizedLoss,
          netGainLoss: totalUnrealizedGain - totalUnrealizedLoss
        },
        journalEntryId
      }
    });
    
  } catch (error) {
    console.error('Revaluation error:', error);
    res.status(500).json({ message: 'Error performing revaluation', error: error.message });
  }
});

// ============================================================================
// REALIZED GAIN/LOSS (On Settlement)
// ============================================================================

// POST /settle - Calculate Realized Gain/Loss on Payment
router.post('/settle', authenticate, async (req, res) => {
  try {
    const { 
      account, // Account being settled
      currency,
      fcyAmount, // Foreign currency amount being paid
      settlementRate, // Rate at which payment is made
      settlementDate,
      vendor
    } = req.body;
    
    // Get the FCY balance
    const balance = await FCYBalance.findOne({
      company: req.user.company,
      account,
      currency: currency.toUpperCase(),
      vendor
    });
    
    if (!balance) {
      return res.status(404).json({ message: 'FCY balance not found' });
    }
    
    // Calculate weighted average rate
    const avgRate = balance.fcyBalance !== 0 
      ? balance.baseCurrencyBalance / balance.fcyBalance 
      : settlementRate;
    
    const settledAtOriginalRate = fcyAmount * avgRate;
    const settledAtCurrentRate = fcyAmount * settlementRate;
    const realizedGainLoss = settledAtCurrentRate - settledAtOriginalRate;
    
    // Update balance
    balance.fcyBalance -= fcyAmount;
    balance.baseCurrencyBalance -= settledAtOriginalRate;
    await balance.save();
    
    // FIX ISSUE #98: Create journal entry for realized forex gain/loss
    let journalEntryId = null;
    if (Math.abs(realizedGainLoss) >= 0.01) {
      // Get realized forex gain/loss accounts
      const forexGainAccount = await ChartOfAccount.findOne({
        company: req.user.company,
        accountType: 'revenue',
        accountName: { $regex: /realized.*forex.*gain|exchange.*gain|forex.*income/i }
      });
      
      const forexLossAccount = await ChartOfAccount.findOne({
        company: req.user.company,
        accountType: 'expense',
        accountName: { $regex: /realized.*forex.*loss|exchange.*loss|forex.*expense/i }
      });
      
      const bankAccount = await ChartOfAccount.findOne({
        company: req.user.company,
        _id: account
      });
      
      if (bankAccount && (forexGainAccount || forexLossAccount)) {
        const lines = [];
        const absGainLoss = Math.abs(realizedGainLoss);
        
        if (realizedGainLoss > 0 && forexGainAccount) {
          // Gain: Debit Bank (more PKR received), Credit Forex Gain
          lines.push({
            account: bankAccount._id,
            accountCode: bankAccount.code,
            accountName: bankAccount.name,
            description: `Realized forex gain on ${currency} settlement`,
            debit: absGainLoss,
            credit: 0
          });
          lines.push({
            account: forexGainAccount._id,
            accountCode: forexGainAccount.code,
            accountName: forexGainAccount.name,
            description: `Realized forex gain on ${currency} settlement`,
            debit: 0,
            credit: absGainLoss
          });
        } else if (realizedGainLoss < 0 && forexLossAccount) {
          // Loss: Debit Forex Loss, Credit Bank (less PKR available)
          lines.push({
            account: forexLossAccount._id,
            accountCode: forexLossAccount.code,
            accountName: forexLossAccount.name,
            description: `Realized forex loss on ${currency} settlement`,
            debit: absGainLoss,
            credit: 0
          });
          lines.push({
            account: bankAccount._id,
            accountCode: bankAccount.code,
            accountName: bankAccount.name,
            description: `Realized forex loss on ${currency} settlement`,
            debit: 0,
            credit: absGainLoss
          });
        }
        
        if (lines.length === 2) {
          const settleDate = new Date(settlementDate || new Date());
          const year = settleDate.getFullYear();
          const month = String(settleDate.getMonth() + 1).padStart(2, '0');
          
          const jeCount = await JournalEntry.countDocuments({
            company: req.user.company,
            entryNumber: { $regex: `^JV-${year}${month}` }
          });
          const entryNumber = `JV-${year}${month}-${String(jeCount + 1).padStart(5, '0')}`;
          
          const journalEntry = new JournalEntry({
            company: req.user.company,
            entryNumber,
            entryDate: settleDate,
            entryType: 'general',
            description: `Realized forex ${realizedGainLoss >= 0 ? 'gain' : 'loss'} on ${currency} settlement at rate ${settlementRate}`,
            lines,
            totalDebit: absGainLoss,
            totalCredit: absGainLoss,
            status: 'posted',
            postedAt: new Date(),
            createdBy: req.user._id,
            approvedBy: req.user._id,
            reference: `FOREX-SETTLE-${currency}`,
            skipBudgetUpdate: true
          });
          
          await journalEntry.save();
          journalEntryId = journalEntry._id;
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        fcyAmount,
        currency,
        originalRate: avgRate,
        settlementRate,
        settledAtOriginalRate,
        settledAtCurrentRate,
        realizedGainLoss,
        type: realizedGainLoss >= 0 ? 'GAIN' : 'LOSS',
        journalEntryId,
        remainingFcyBalance: balance.fcyBalance,
        remainingBaseCurrencyBalance: balance.baseCurrencyBalance
      }
    });
    
  } catch (error) {
    console.error('Settlement error:', error);
    res.status(500).json({ message: 'Error calculating settlement', error: error.message });
  }
});

// ============================================================================
// UTILITY: Get Exchange Rate Helper (Exported)
// ============================================================================
export const getExchangeRate = async (company, currency, asOfDate = new Date()) => {
  if (currency.toUpperCase() === 'PKR') return 1;
  
  const rate = await ExchangeRate.findOne({
    company,
    foreignCurrency: currency.toUpperCase(),
    effectiveDate: { $lte: asOfDate }
  }).sort({ effectiveDate: -1 });
  
  return rate?.rate || null;
};

export const convertToPKR = async (company, amount, currency, asOfDate = new Date()) => {
  const rate = await getExchangeRate(company, currency, asOfDate);
  if (!rate) throw new Error(`No exchange rate found for ${currency}`);
  return amount * rate;
};

export { ExchangeRate, FCYBalance };
export default router;
