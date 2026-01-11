import express from 'express';
import mongoose from 'mongoose';
import YearEndClosing from '../models/YearEndClosing.js';
import JournalEntry from '../models/JournalEntry.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import Budget from '../models/Budget.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/year-end-closing
 * Get all year-end closings
 */
router.get('/', authorize('admin', 'finance'), async (req, res) => {
  try {
    const closings = await YearEndClosing.find({ company: req.user.company })
      .populate('initiatedBy', 'firstName lastName')
      .populate('completedBy', 'firstName lastName')
      .sort({ fiscalYear: -1 });

    res.json({ success: true, data: closings });
  } catch (error) {
    logger.error('Error fetching year-end closings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/year-end-closing/:fiscalYear
 * Get year-end closing for specific fiscal year
 */
router.get('/:fiscalYear', authorize('admin', 'finance'), async (req, res) => {
  try {
    const closing = await YearEndClosing.findOne({
      company: req.user.company,
      fiscalYear: req.params.fiscalYear
    })
      .populate('revenueClosings.account', 'code name')
      .populate('expenseClosings.account', 'code name')
      .populate('retainedEarningsAccount', 'code name')
      .populate('closingJournalEntries');

    if (!closing) {
      return res.status(404).json({ success: false, message: 'Year-end closing not found' });
    }

    res.json({ success: true, data: closing });
  } catch (error) {
    logger.error('Error fetching year-end closing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * FIX ISSUE #24: POST /api/year-end-closing/initiate
 * Initiate year-end closing process
 */
router.post('/initiate', authorize('admin', 'finance'), async (req, res) => {
  try {
    const { fiscalYear } = req.body;
    const companyId = req.user.company;

    // Validate fiscal year format
    if (!fiscalYear || !/^\d{4}-\d{4}$/.test(fiscalYear)) {
      return res.status(400).json({
        success: false,
        message: 'Fiscal year must be in YYYY-YYYY format (e.g., 2025-2026)'
      });
    }

    // Check if already exists
    const existing = await YearEndClosing.findOne({
      company: companyId,
      fiscalYear
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Year-end closing already exists for ${fiscalYear} with status: ${existing.status}`
      });
    }

    // Get retained earnings account
    const retainedEarningsAccount = await ChartOfAccount.findOne({
      company: companyId,
      $or: [
        { accountCode: { $regex: /RETAINED.*EARNING/i } },
        { name: { $regex: /retained.*earning/i } }
      ],
      accountType: 'equity',
      isActive: true
    });

    if (!retainedEarningsAccount) {
      return res.status(400).json({
        success: false,
        message: 'Retained Earnings account not found. Please configure Chart of Accounts.'
      });
    }

    // Calculate period dates (Pakistan fiscal year: July 1 - June 30)
    const [startYear] = fiscalYear.split('-').map(Number);
    const periodStart = new Date(startYear, 6, 1); // July 1
    const periodEnd = new Date(startYear + 1, 5, 30); // June 30

    // Get all revenue accounts with balances
    const revenueAccounts = await ChartOfAccount.find({
      company: companyId,
      accountType: 'revenue',
      isActive: true,
      isPostable: true
    });

    // Get all expense accounts with balances
    const expenseAccounts = await ChartOfAccount.find({
      company: companyId,
      accountType: 'expense',
      isActive: true,
      isPostable: true
    });

    // Calculate balances from journal entries
    const balances = await JournalEntry.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          status: 'posted',
          entryDate: { $gte: periodStart, $lte: periodEnd }
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

    const balanceMap = new Map(balances.map(b => [b._id.toString(), b]));

    // Build revenue closings
    const revenueClosings = revenueAccounts.map(account => {
      const balance = balanceMap.get(account._id.toString());
      const closingBalance = balance ? (balance.totalCredit - balance.totalDebit) : 0;
      return {
        accountCode: account.code,
        accountName: account.name,
        account: account._id,
        accountType: 'revenue',
        closingBalance
      };
    }).filter(c => Math.abs(c.closingBalance) > 0.01);

    // Build expense closings
    const expenseClosings = expenseAccounts.map(account => {
      const balance = balanceMap.get(account._id.toString());
      const closingBalance = balance ? (balance.totalDebit - balance.totalCredit) : 0;
      return {
        accountCode: account.code,
        accountName: account.name,
        account: account._id,
        accountType: 'expense',
        closingBalance
      };
    }).filter(c => Math.abs(c.closingBalance) > 0.01);

    // Get trial balance totals
    const trialBalance = await JournalEntry.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          status: 'posted',
          entryDate: { $lte: periodEnd }
        }
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: null,
          totalDebits: { $sum: '$lines.debit' },
          totalCredits: { $sum: '$lines.credit' }
        }
      }
    ]);

    const tbTotals = trialBalance[0] || { totalDebits: 0, totalCredits: 0 };

    const closing = new YearEndClosing({
      company: companyId,
      fiscalYear,
      periodStart,
      periodEnd,
      preClosingTrialBalance: {
        totalDebits: tbTotals.totalDebits,
        totalCredits: tbTotals.totalCredits,
        isBalanced: Math.abs(tbTotals.totalDebits - tbTotals.totalCredits) < 0.01
      },
      revenueClosings,
      expenseClosings,
      retainedEarningsAccount: retainedEarningsAccount._id,
      status: 'draft',
      initiatedBy: req.user._id,
      initiatedAt: new Date()
    });

    await closing.save();

    logger.info('Year-end closing initiated', { fiscalYear, userId: req.user._id });

    res.status(201).json({
      success: true,
      message: `Year-end closing initiated for ${fiscalYear}`,
      data: {
        fiscalYear,
        totalRevenue: closing.totalRevenue,
        totalExpenses: closing.totalExpenses,
        netIncome: closing.netIncome,
        revenueAccountsCount: revenueClosings.length,
        expenseAccountsCount: expenseClosings.length
      }
    });
  } catch (error) {
    logger.error('Error initiating year-end closing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/year-end-closing/:fiscalYear/execute
 * Execute year-end closing - Create closing journal entries
 */
router.post('/:fiscalYear/execute', authorize('admin', 'finance'), async (req, res) => {
  try {
    const { fiscalYear } = req.params;
    const companyId = req.user.company;

    const closing = await YearEndClosing.findOne({
      company: companyId,
      fiscalYear,
      status: 'draft'
    }).populate('retainedEarningsAccount');

    if (!closing) {
      return res.status(404).json({
        success: false,
        message: 'Draft year-end closing not found'
      });
    }

    // Get or create Income Summary account
    let incomeSummaryAccount = await ChartOfAccount.findOne({
      company: companyId,
      accountCode: { $regex: /INCOME.*SUMMARY/i },
      isActive: true
    });

    if (!incomeSummaryAccount) {
      incomeSummaryAccount = new ChartOfAccount({
        company: companyId,
        code: '3900',
        name: 'Income Summary',
        accountType: 'equity',
        normalBalance: 'credit',
        level: 1,
        isActive: true,
        isPostable: true
      });
      await incomeSummaryAccount.save();
    }

    const closingDate = closing.periodEnd;
    const journalEntries = [];

    // STEP 1: Close Revenue Accounts to Income Summary
    if (closing.revenueClosings.length > 0) {
      const revenueLines = [];
      
      // Debit each revenue account (to zero it out)
      for (const rev of closing.revenueClosings) {
        revenueLines.push({
          account: rev.account,
          accountCode: rev.accountCode,
          accountName: rev.accountName,
          description: `Close ${rev.accountName} to Income Summary`,
          debit: rev.closingBalance,
          credit: 0
        });
      }

      // Credit Income Summary for total revenue
      revenueLines.push({
        account: incomeSummaryAccount._id,
        accountCode: incomeSummaryAccount.code,
        accountName: incomeSummaryAccount.name,
        description: 'Total revenue transferred',
        debit: 0,
        credit: closing.totalRevenue
      });

      const revenueJE = new JournalEntry({
        company: companyId,
        entryNumber: `YE-REV-${fiscalYear}`,
        entryDate: closingDate,
        entryType: 'closing',
        description: `Year-end closing - Close revenue accounts for ${fiscalYear}`,
        lines: revenueLines,
        totalDebit: closing.totalRevenue,
        totalCredit: closing.totalRevenue,
        status: 'posted',
        postedAt: new Date(),
        createdBy: req.user._id,
        approvedBy: req.user._id
      });

      await revenueJE.save();
      journalEntries.push(revenueJE._id);
    }

    // STEP 2: Close Expense Accounts to Income Summary
    if (closing.expenseClosings.length > 0) {
      const expenseLines = [];

      // Debit Income Summary for total expenses
      expenseLines.push({
        account: incomeSummaryAccount._id,
        accountCode: incomeSummaryAccount.code,
        accountName: incomeSummaryAccount.name,
        description: 'Total expenses transferred',
        debit: closing.totalExpenses,
        credit: 0
      });

      // Credit each expense account (to zero it out)
      for (const exp of closing.expenseClosings) {
        expenseLines.push({
          account: exp.account,
          accountCode: exp.accountCode,
          accountName: exp.accountName,
          description: `Close ${exp.accountName} to Income Summary`,
          debit: 0,
          credit: exp.closingBalance
        });
      }

      const expenseJE = new JournalEntry({
        company: companyId,
        entryNumber: `YE-EXP-${fiscalYear}`,
        entryDate: closingDate,
        entryType: 'closing',
        description: `Year-end closing - Close expense accounts for ${fiscalYear}`,
        lines: expenseLines,
        totalDebit: closing.totalExpenses,
        totalCredit: closing.totalExpenses,
        status: 'posted',
        postedAt: new Date(),
        createdBy: req.user._id,
        approvedBy: req.user._id
      });

      await expenseJE.save();
      journalEntries.push(expenseJE._id);
    }

    // STEP 3: Close Income Summary to Retained Earnings
    const netIncome = closing.netIncome;
    const netIncomeLines = [];

    if (netIncome > 0) {
      // Profit: Debit Income Summary, Credit Retained Earnings
      netIncomeLines.push({
        account: incomeSummaryAccount._id,
        accountCode: incomeSummaryAccount.code,
        accountName: incomeSummaryAccount.name,
        description: 'Close net income to Retained Earnings',
        debit: netIncome,
        credit: 0
      });
      netIncomeLines.push({
        account: closing.retainedEarningsAccount._id,
        accountCode: closing.retainedEarningsAccount.code,
        accountName: closing.retainedEarningsAccount.name,
        description: `Net income for ${fiscalYear}`,
        debit: 0,
        credit: netIncome
      });
    } else if (netIncome < 0) {
      // Loss: Credit Income Summary, Debit Retained Earnings
      const netLoss = Math.abs(netIncome);
      netIncomeLines.push({
        account: closing.retainedEarningsAccount._id,
        accountCode: closing.retainedEarningsAccount.code,
        accountName: closing.retainedEarningsAccount.name,
        description: `Net loss for ${fiscalYear}`,
        debit: netLoss,
        credit: 0
      });
      netIncomeLines.push({
        account: incomeSummaryAccount._id,
        accountCode: incomeSummaryAccount.code,
        accountName: incomeSummaryAccount.name,
        description: 'Close net loss to Retained Earnings',
        debit: 0,
        credit: netLoss
      });
    }

    if (netIncomeLines.length > 0) {
      const retainedEarningsJE = new JournalEntry({
        company: companyId,
        entryNumber: `YE-RE-${fiscalYear}`,
        entryDate: closingDate,
        entryType: 'closing',
        description: `Year-end closing - Transfer net ${netIncome >= 0 ? 'income' : 'loss'} to Retained Earnings for ${fiscalYear}`,
        lines: netIncomeLines,
        totalDebit: Math.abs(netIncome),
        totalCredit: Math.abs(netIncome),
        status: 'posted',
        postedAt: new Date(),
        createdBy: req.user._id,
        approvedBy: req.user._id
      });

      await retainedEarningsJE.save();
      journalEntries.push(retainedEarningsJE._id);

      // Update Retained Earnings account balance
      await ChartOfAccount.findByIdAndUpdate(closing.retainedEarningsAccount._id, {
        $inc: { currentBalance: netIncome }
      });
    }

    // Zero out revenue and expense account balances
    for (const rev of closing.revenueClosings) {
      await ChartOfAccount.findByIdAndUpdate(rev.account, {
        $set: { currentBalance: 0 }
      });
    }
    for (const exp of closing.expenseClosings) {
      await ChartOfAccount.findByIdAndUpdate(exp.account, {
        $set: { currentBalance: 0 }
      });
    }

    // Update closing record
    closing.status = 'completed';
    closing.closingJournalEntries = journalEntries;
    closing.incomeSummaryAccount = incomeSummaryAccount._id;
    closing.completedBy = req.user._id;
    closing.completedAt = new Date();
    await closing.save();

    // Close the budget for this fiscal year
    await Budget.updateMany(
      { company: companyId, fiscalYear, status: 'active' },
      { $set: { status: 'closed' } }
    );

    logger.info('Year-end closing executed', {
      fiscalYear,
      netIncome,
      journalEntriesCreated: journalEntries.length,
      userId: req.user._id
    });

    res.json({
      success: true,
      message: `Year-end closing completed for ${fiscalYear}`,
      data: {
        fiscalYear,
        netIncome,
        journalEntriesCreated: journalEntries.length,
        status: 'completed'
      }
    });
  } catch (error) {
    logger.error('Error executing year-end closing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/year-end-closing/:fiscalYear/lock
 * Lock period to prevent further posting
 */
router.post('/:fiscalYear/lock', authorize('admin'), async (req, res) => {
  try {
    const closing = await YearEndClosing.findOne({
      company: req.user.company,
      fiscalYear: req.params.fiscalYear,
      status: 'completed'
    });

    if (!closing) {
      return res.status(404).json({
        success: false,
        message: 'Completed year-end closing not found'
      });
    }

    closing.periodLocked = true;
    closing.lockedAt = new Date();
    closing.lockedBy = req.user._id;
    await closing.save();

    logger.info('Fiscal year locked', {
      fiscalYear: req.params.fiscalYear,
      userId: req.user._id
    });

    res.json({
      success: true,
      message: `Fiscal year ${req.params.fiscalYear} has been locked`,
      data: { fiscalYear: req.params.fiscalYear, periodLocked: true }
    });
  } catch (error) {
    logger.error('Error locking period:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
