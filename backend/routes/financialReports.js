/**
 * Financial Reports Routes
 * IFRS-compliant financial statements and management reports
 */

import express from 'express';
import JournalEntry from '../models/JournalEntry.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import Budget from '../models/Budget.js';
import CostCenter from '../models/CostCenter.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/financial-reports/trial-balance
 * Generate Trial Balance
 */
router.get('/trial-balance', authorize('admin', 'finance', 'accountant', 'auditor'), async (req, res) => {
  try {
    const { asOfDate, level } = req.query;

    const endDate = asOfDate ? new Date(asOfDate) : new Date();
    const accountLevel = level ? parseInt(level) : 99; // All levels by default

    // Get all posted journal entries up to the date
    const entries = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          status: 'posted',
          entryDate: { $lte: endDate }
        }
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.account',
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' }
        }
      }
    ]);

    // Get account details
    const accounts = await ChartOfAccount.find({
      company: req.user.company,
      status: 'active',
      level: { $lte: accountLevel }
    }).sort({ accountCode: 1 });

    // Build trial balance
    const trialBalance = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of accounts) {
      const entry = entries.find(e => e._id.toString() === account._id.toString());
      const debit = entry?.totalDebit || 0;
      const credit = entry?.totalCredit || 0;

      // Calculate balance based on account type
      let balance = 0;
      let debitBalance = 0;
      let creditBalance = 0;

      if (['asset', 'expense'].includes(account.accountType)) {
        balance = debit - credit;
        if (balance >= 0) {
          debitBalance = balance;
        } else {
          creditBalance = Math.abs(balance);
        }
      } else {
        balance = credit - debit;
        if (balance >= 0) {
          creditBalance = balance;
        } else {
          debitBalance = Math.abs(balance);
        }
      }

      if (debitBalance > 0 || creditBalance > 0) {
        trialBalance.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          level: account.level,
          debit: debitBalance,
          credit: creditBalance
        });

        totalDebit += debitBalance;
        totalCredit += creditBalance;
      }
    }

    res.json({
      success: true,
      data: {
        reportName: 'Trial Balance',
        asOfDate: endDate,
        generatedAt: new Date(),
        accounts: trialBalance,
        totals: {
          debit: totalDebit,
          credit: totalCredit,
          isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
        }
      }
    });
  } catch (error) {
    logger.error('Error generating trial balance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/financial-reports/income-statement
 * Generate Income Statement (Profit & Loss)
 */
router.get('/income-statement', authorize('admin', 'finance', 'accountant', 'auditor'), async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const startDate = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = toDate ? new Date(toDate) : new Date();

    // Get income and expense entries
    const entries = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          status: 'posted',
          entryDate: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'chartofaccounts',
          localField: 'lines.account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: '$account' },
      {
        $match: {
          'account.accountType': { $in: ['revenue', 'expense'] }
        }
      },
      {
        $group: {
          _id: {
            account: '$lines.account',
            accountCode: '$account.accountCode',
            accountName: '$account.accountName',
            accountType: '$account.accountType',
            category: '$account.category'
          },
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' }
        }
      },
      { $sort: { '_id.accountCode': 1 } }
    ]);

    // Categorize income and expenses
    const income = [];
    const expenses = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const entry of entries) {
      // FIX: Use 'revenue' instead of 'income' to match ChartOfAccount enum
      const amount = entry._id.accountType === 'revenue'
        ? entry.totalCredit - entry.totalDebit
        : entry.totalDebit - entry.totalCredit;

      const item = {
        accountCode: entry._id.accountCode,
        accountName: entry._id.accountName,
        category: entry._id.category,
        amount: Math.abs(amount)
      };

      // FIX: Use 'revenue' instead of 'income'
      if (entry._id.accountType === 'revenue') {
        income.push(item);
        totalIncome += item.amount;
      } else {
        expenses.push(item);
        totalExpenses += item.amount;
      }
    }

    const netIncome = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        reportName: 'Income Statement',
        period: { from: startDate, to: endDate },
        generatedAt: new Date(),
        income: {
          items: income,
          total: totalIncome
        },
        expenses: {
          items: expenses,
          total: totalExpenses
        },
        netIncome,
        isProfit: netIncome >= 0
      }
    });
  } catch (error) {
    logger.error('Error generating income statement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/financial-reports/balance-sheet
 * Generate Balance Sheet
 */
router.get('/balance-sheet', authorize('admin', 'finance', 'accountant', 'auditor'), async (req, res) => {
  try {
    const { asOfDate } = req.query;
    const endDate = asOfDate ? new Date(asOfDate) : new Date();

    // Get all balances
    const entries = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          status: 'posted',
          entryDate: { $lte: endDate }
        }
      },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'chartofaccounts',
          localField: 'lines.account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: '$account' },
      {
        $group: {
          _id: {
            account: '$lines.account',
            accountCode: '$account.accountCode',
            accountName: '$account.accountName',
            accountType: '$account.accountType',
            category: '$account.category'
          },
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' }
        }
      },
      { $sort: { '_id.accountCode': 1 } }
    ]);

    // Categorize by type
    const assets = { current: [], nonCurrent: [], total: 0 };
    const liabilities = { current: [], nonCurrent: [], total: 0 };
    const equity = { items: [], total: 0 };

    for (const entry of entries) {
      const balance = ['asset', 'expense'].includes(entry._id.accountType)
        ? entry.totalDebit - entry.totalCredit
        : entry.totalCredit - entry.totalDebit;

      if (Math.abs(balance) < 0.01) continue;

      const item = {
        accountCode: entry._id.accountCode,
        accountName: entry._id.accountName,
        category: entry._id.category,
        balance: Math.abs(balance)
      };

      switch (entry._id.accountType) {
        case 'asset':
          if (entry._id.category === 'current_asset') {
            assets.current.push(item);
          } else {
            assets.nonCurrent.push(item);
          }
          assets.total += item.balance;
          break;
        case 'liability':
          if (entry._id.category === 'current_liability') {
            liabilities.current.push(item);
          } else {
            liabilities.nonCurrent.push(item);
          }
          liabilities.total += item.balance;
          break;
        case 'equity':
          equity.items.push(item);
          equity.total += item.balance;
          break;
      }
    }

    // Calculate retained earnings (income - expenses for the period)
    // FIX: Use Pakistan fiscal year (July 1 - June 30)
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();
    const fiscalStartYear = endMonth >= 6 ? endYear : endYear - 1;
    const yearStart = new Date(fiscalStartYear, 6, 1); // July 1
    const plEntries = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          status: 'posted',
          entryDate: { $gte: yearStart, $lte: endDate }
        }
      },
      { $unwind: '$lines' },
      {
        $lookup: {
          from: 'chartofaccounts',
          localField: 'lines.account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: '$account' },
      {
        $match: {
          // FIX: Use 'revenue' instead of 'income'
          'account.accountType': { $in: ['revenue', 'expense'] }
        }
      },
      {
        $group: {
          _id: '$account.accountType',
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' }
        }
      }
    ]);

    // FIX: Use 'revenue' instead of 'income'
    const incomeEntry = plEntries.find(e => e._id === 'revenue');
    const expenseEntry = plEntries.find(e => e._id === 'expense');
    const totalIncome = (incomeEntry?.totalCredit || 0) - (incomeEntry?.totalDebit || 0);
    const totalExpenses = (expenseEntry?.totalDebit || 0) - (expenseEntry?.totalCredit || 0);
    const retainedEarnings = totalIncome - totalExpenses;

    if (Math.abs(retainedEarnings) > 0.01) {
      equity.items.push({
        accountCode: 'RE',
        accountName: 'Retained Earnings (Current Year)',
        category: 'equity',
        balance: retainedEarnings
      });
      equity.total += retainedEarnings;
    }

    res.json({
      success: true,
      data: {
        reportName: 'Balance Sheet',
        asOfDate: endDate,
        generatedAt: new Date(),
        assets,
        liabilities,
        equity,
        totalLiabilitiesAndEquity: liabilities.total + equity.total,
        isBalanced: Math.abs(assets.total - (liabilities.total + equity.total)) < 0.01
      }
    });
  } catch (error) {
    logger.error('Error generating balance sheet:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/financial-reports/budget-vs-actual
 * Budget vs Actual comparison report
 */
router.get('/budget-vs-actual', authorize('admin', 'finance', 'accountant', 'manager'), async (req, res) => {
  try {
    const { fiscalYear, costCenter } = req.query;

    // FIX ISSUE #6: Use Pakistan fiscal year format (YYYY-YYYY)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const defaultFiscalYear = currentMonth >= 6 
      ? `${currentYear}-${currentYear + 1}` 
      : `${currentYear - 1}-${currentYear}`;
    
    const targetFiscalYear = fiscalYear || defaultFiscalYear;
    
    // Parse fiscal year for date range
    const [startYear] = targetFiscalYear.split('-').map(Number);
    const yearStart = new Date(startYear, 6, 1); // July 1
    const yearEnd = new Date(startYear + 1, 5, 30); // June 30

    const budgetQuery = {
      company: req.user.company,
      fiscalYear: targetFiscalYear,
      status: { $in: ['approved', 'active'] }
    };

    if (costCenter) {
      budgetQuery.costCenter = costCenter;
    }

    // Get budgets - FIX: Use lines array properly
    const budgets = await Budget.find(budgetQuery)
      .populate('lines.headOfAccount', 'accountCode accountName')
      .populate('lines.costCenter', 'code name');

    // Get actuals from journal entries
    const actuals = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          status: 'posted',
          entryDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.debit': { $gt: 0 },
          ...(costCenter ? { 'lines.costCenter': costCenter } : {})
        }
      },
      {
        $group: {
          _id: {
            account: '$lines.account',
            costCenter: '$lines.costCenter'
          },
          actual: { $sum: '$lines.debit' }
        }
      }
    ]);

    // Build comparison
    const comparison = budgets.map(budget => {
      const actual = actuals.find(
        a => a._id.account?.toString() === budget.headOfAccount?._id?.toString() &&
             a._id.costCenter?.toString() === budget.costCenter?._id?.toString()
      );

      const budgetAmount = budget.totalBudget || budget.originalBudget || 0;
      const actualAmount = actual?.actual || 0;
      const variance = budgetAmount - actualAmount;
      const utilizationPercent = budgetAmount > 0
        ? Math.round((actualAmount / budgetAmount) * 100)
        : 0;

      return {
        costCenter: budget.costCenter ? {
          code: budget.costCenter.code,
          name: budget.costCenter.name
        } : null,
        account: {
          code: budget.headOfAccount?.accountCode,
          name: budget.headOfAccount?.accountName
        },
        budgetAmount: budgetAmount,
        actualAmount,
        variance,
        utilizationPercent,
        status: utilizationPercent > 100 ? 'over_budget' : 
                utilizationPercent > 80 ? 'warning' : 'on_track'
      };
    });

    // Summary
    const totals = comparison.reduce((acc, item) => {
      acc.budget += item.budgetAmount;
      acc.actual += item.actualAmount;
      return acc;
    }, { budget: 0, actual: 0 });

    totals.variance = totals.budget - totals.actual;
    totals.utilizationPercent = totals.budget > 0
      ? Math.round((totals.actual / totals.budget) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        reportName: 'Budget vs Actual',
        fiscalYear: year,
        generatedAt: new Date(),
        items: comparison,
        totals
      }
    });
  } catch (error) {
    logger.error('Error generating budget vs actual report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/financial-reports/cash-flow
 * Generate Cash Flow Statement
 */
router.get('/cash-flow', authorize('admin', 'finance', 'accountant', 'auditor'), async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const startDate = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = toDate ? new Date(toDate) : new Date();

    // Get cash/bank account movements
    const cashAccounts = await ChartOfAccount.find({
      company: req.user.company,
      $or: [
        { isBankAccount: true },
        { accountCode: { $regex: /^1[0-2]/ } } // Typically cash accounts start with 10, 11, 12
      ]
    });

    const cashAccountIds = cashAccounts.map(a => a._id);

    const movements = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          status: 'posted',
          entryDate: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.account': { $in: cashAccountIds }
        }
      },
      {
        $group: {
          _id: '$entryType',
          inflows: { $sum: '$lines.debit' },
          outflows: { $sum: '$lines.credit' }
        }
      }
    ]);

    // Categorize into operating, investing, financing
    const operating = { inflows: 0, outflows: 0, net: 0 };
    const investing = { inflows: 0, outflows: 0, net: 0 };
    const financing = { inflows: 0, outflows: 0, net: 0 };

    for (const m of movements) {
      switch (m._id) {
        case 'payment':
        case 'receipt':
        case 'payroll':
        case 'general':
          operating.inflows += m.inflows;
          operating.outflows += m.outflows;
          break;
        case 'asset_purchase':
        case 'asset_sale':
          investing.inflows += m.inflows;
          investing.outflows += m.outflows;
          break;
        case 'loan':
        case 'capital':
          financing.inflows += m.inflows;
          financing.outflows += m.outflows;
          break;
        default:
          operating.inflows += m.inflows;
          operating.outflows += m.outflows;
      }
    }

    operating.net = operating.inflows - operating.outflows;
    investing.net = investing.inflows - investing.outflows;
    financing.net = financing.inflows - financing.outflows;

    const netChange = operating.net + investing.net + financing.net;

    res.json({
      success: true,
      data: {
        reportName: 'Cash Flow Statement',
        period: { from: startDate, to: endDate },
        generatedAt: new Date(),
        operatingActivities: operating,
        investingActivities: investing,
        financingActivities: financing,
        netChangeInCash: netChange
      }
    });
  } catch (error) {
    logger.error('Error generating cash flow statement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/financial-reports/aging
 * Accounts Receivable/Payable Aging Report
 */
router.get('/aging', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const { type = 'payable' } = req.query; // 'receivable' or 'payable'

    const accountType = type === 'receivable' ? 'asset' : 'liability';
    const accountPattern = type === 'receivable' ? /RECEIVABLE|AR/i : /PAYABLE|AP/i;

    // Get relevant accounts
    const accounts = await ChartOfAccount.find({
      company: req.user.company,
      accountType,
      accountCode: { $regex: accountPattern }
    });

    const accountIds = accounts.map(a => a._id);

    // Get outstanding balances with dates
    const entries = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          status: 'posted',
          'lines.account': { $in: accountIds }
        }
      },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.account': { $in: accountIds }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'lines.vendor',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $group: {
          _id: {
            vendor: '$lines.vendor',
            vendorInfo: { $first: '$vendor' }
          },
          entries: {
            $push: {
              date: '$entryDate',
              amount: type === 'receivable' ? '$lines.debit' : '$lines.credit',
              reference: '$entryNumber'
            }
          },
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' }
        }
      }
    ]);

    const today = new Date();
    const aging = entries.map(e => {
      const balance = type === 'receivable'
        ? e.totalDebit - e.totalCredit
        : e.totalCredit - e.totalDebit;

      if (balance <= 0) return null;

      const vendorInfo = e._id.vendorInfo?.[0];
      
      // FIX ISSUE #13: Calculate proper aging buckets based on invoice dates
      let current = 0, days30 = 0, days60 = 0, days90Plus = 0;
      
      for (const entry of e.entries) {
        const entryDate = new Date(entry.date);
        const daysDiff = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
        const amount = entry.amount || 0;
        
        if (daysDiff <= 30) {
          current += amount;
        } else if (daysDiff <= 60) {
          days30 += amount;
        } else if (daysDiff <= 90) {
          days60 += amount;
        } else {
          days90Plus += amount;
        }
      }
      
      return {
        vendorCode: vendorInfo?.vendorCode || 'N/A',
        vendorName: vendorInfo?.name || 'Unknown',
        balance,
        current,
        days30,
        days60,
        days90Plus
      };
    }).filter(Boolean);

    const totals = aging.reduce((acc, item) => {
      acc.balance += item.balance;
      acc.current += item.current;
      acc.days30 += item.days30;
      acc.days60 += item.days60;
      acc.days90Plus += item.days90Plus;
      return acc;
    }, { balance: 0, current: 0, days30: 0, days60: 0, days90Plus: 0 });

    res.json({
      success: true,
      data: {
        reportName: `Accounts ${type === 'receivable' ? 'Receivable' : 'Payable'} Aging`,
        asOfDate: today,
        generatedAt: new Date(),
        items: aging,
        totals
      }
    });
  } catch (error) {
    logger.error('Error generating aging report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/financial-reports/gl-subledger-reconciliation
 * FIX ISSUE #27: Comprehensive GL to Subledger Reconciliation Report
 * Critical for audit - compares GL control accounts with subledger totals
 */
router.get('/gl-subledger-reconciliation', authorize('admin', 'finance', 'accountant', 'auditor'), async (req, res) => {
  try {
    const { asOfDate } = req.query;
    const endDate = asOfDate ? new Date(asOfDate) : new Date();
    
    // Import required models
    const Vendor = (await import('../models/Vendor.js')).default;
    
    const reconciliationResults = [];
    
    // =========================================================================
    // 1. ACCOUNTS PAYABLE RECONCILIATION
    // =========================================================================
    // Get AP Control Account(s)
    const apAccounts = await ChartOfAccount.find({
      company: req.user.company,
      accountType: 'liability',
      $or: [
        { accountName: { $regex: /accounts?\s*payable|trade\s*payable|creditor/i } },
        { accountCode: { $regex: /^2[01]/ } } // Common AP account codes
      ]
    }).lean();
    
    for (const apAccount of apAccounts) {
      // GL Balance
      const glResult = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $lte: endDate }
          }
        },
        { $unwind: '$lines' },
        { $match: { 'lines.account': apAccount._id } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' }
          }
        }
      ]);
      
      const glBalance = glResult[0] 
        ? (glResult[0].totalCredit - glResult[0].totalDebit) 
        : 0;
      
      // Vendor Subledger Total
      const vendorTotals = await Vendor.aggregate([
        { $match: { company: req.user.company, status: 'active' } },
        {
          $group: {
            _id: null,
            totalPayable: { $sum: '$currentBalance' }
          }
        }
      ]);
      
      const subledgerBalance = vendorTotals[0]?.totalPayable || 0;
      const variance = Math.abs(glBalance - subledgerBalance);
      
      reconciliationResults.push({
        type: 'ACCOUNTS_PAYABLE',
        accountCode: apAccount.code,
        accountName: apAccount.name,
        glBalance: glBalance,
        subledgerBalance: subledgerBalance,
        variance: variance,
        variancePercent: glBalance !== 0 ? ((variance / Math.abs(glBalance)) * 100).toFixed(2) : '0.00',
        status: variance < 1 ? 'MATCHED' : variance < 100 ? 'MINOR_VARIANCE' : 'VARIANCE',
        subledgerType: 'Vendor',
        subledgerCount: vendorTotals[0] ? await Vendor.countDocuments({ company: req.user.company, status: 'active' }) : 0
      });
    }
    
    // =========================================================================
    // 2. BANK RECONCILIATION SUMMARY
    // =========================================================================
    const bankAccounts = await ChartOfAccount.find({
      company: req.user.company,
      accountType: 'asset',
      $or: [
        { accountName: { $regex: /bank|cash\s*at\s*bank|current\s*account/i } },
        { accountCode: { $regex: /^1[01][0-1]/ } } // Common bank account codes
      ]
    }).lean();
    
    for (const bankAccount of bankAccounts) {
      // GL Balance
      const glResult = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $lte: endDate }
          }
        },
        { $unwind: '$lines' },
        { $match: { 'lines.account': bankAccount._id } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' }
          }
        }
      ]);
      
      const glBalance = glResult[0] 
        ? (glResult[0].totalDebit - glResult[0].totalCredit) 
        : 0;
      
      // Check for bank reconciliation record
      const BankReconciliation = (await import('../models/BankReconciliation.js')).default;
      const bankRecon = await BankReconciliation.findOne({
        company: req.user.company,
        bankAccount: bankAccount._id
      }).sort({ statementDate: -1 }).lean();
      
      const statementBalance = bankRecon?.closingBalance || 0;
      const adjustedBalance = bankRecon?.adjustedBankBalance || statementBalance;
      const variance = Math.abs(glBalance - adjustedBalance);
      
      reconciliationResults.push({
        type: 'BANK_ACCOUNT',
        accountCode: bankAccount.code,
        accountName: bankAccount.name,
        glBalance: glBalance,
        subledgerBalance: adjustedBalance,
        variance: variance,
        variancePercent: glBalance !== 0 ? ((variance / Math.abs(glBalance)) * 100).toFixed(2) : '0.00',
        status: variance < 1 ? 'MATCHED' : variance < 100 ? 'MINOR_VARIANCE' : 'VARIANCE',
        subledgerType: 'BankStatement',
        lastReconciledDate: bankRecon?.statementDate || null,
        unreconciledItems: bankRecon?.unreconciledItems?.length || 0
      });
    }
    
    // =========================================================================
    // 3. FIXED ASSETS RECONCILIATION
    // =========================================================================
    const faAccount = await ChartOfAccount.findOne({
      company: req.user.company,
      accountType: 'asset',
      $or: [
        { accountName: { $regex: /fixed\s*asset|property.*equipment|ppe/i } },
        { accountCode: { $regex: /^1[234]/ } }
      ]
    }).lean();
    
    if (faAccount) {
      const FixedAsset = (await import('../models/FixedAsset.js')).default;
      
      // GL Balance
      const glResult = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $lte: endDate }
          }
        },
        { $unwind: '$lines' },
        { $match: { 'lines.account': faAccount._id } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' }
          }
        }
      ]);
      
      const glBalance = glResult[0] 
        ? (glResult[0].totalDebit - glResult[0].totalCredit) 
        : 0;
      
      // Fixed Asset Register Total (at cost)
      const faRegister = await FixedAsset.aggregate([
        { $match: { company: req.user.company, status: { $in: ['active', 'disposed'] } } },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$totalCost' }
          }
        }
      ]);
      
      const subledgerBalance = faRegister[0]?.totalCost || 0;
      const variance = Math.abs(glBalance - subledgerBalance);
      
      reconciliationResults.push({
        type: 'FIXED_ASSETS',
        accountCode: faAccount.code,
        accountName: faAccount.name,
        glBalance: glBalance,
        subledgerBalance: subledgerBalance,
        variance: variance,
        variancePercent: glBalance !== 0 ? ((variance / Math.abs(glBalance)) * 100).toFixed(2) : '0.00',
        status: variance < 1 ? 'MATCHED' : variance < 100 ? 'MINOR_VARIANCE' : 'VARIANCE',
        subledgerType: 'FixedAssetRegister',
        subledgerCount: await FixedAsset.countDocuments({ company: req.user.company, status: 'active' })
      });
    }
    
    // =========================================================================
    // SUMMARY
    // =========================================================================
    const summary = {
      totalAccounts: reconciliationResults.length,
      matched: reconciliationResults.filter(r => r.status === 'MATCHED').length,
      minorVariance: reconciliationResults.filter(r => r.status === 'MINOR_VARIANCE').length,
      variance: reconciliationResults.filter(r => r.status === 'VARIANCE').length,
      totalVarianceAmount: reconciliationResults.reduce((sum, r) => sum + r.variance, 0)
    };
    
    res.json({
      success: true,
      data: {
        reportName: 'GL to Subledger Reconciliation',
        asOfDate: endDate,
        generatedAt: new Date(),
        generatedBy: req.user.firstName + ' ' + req.user.lastName,
        reconciliations: reconciliationResults,
        summary,
        recommendation: summary.variance > 0 
          ? 'ATTENTION: Variances found. Please investigate and post adjusting entries before period close.'
          : 'All GL accounts match subledger totals. Ready for period close.'
      }
    });
  } catch (error) {
    logger.error('Error generating GL-Subledger reconciliation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
