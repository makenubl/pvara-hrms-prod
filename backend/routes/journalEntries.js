/**
 * Journal Entry Routes
 * General Ledger posting and accounting entries
 */

import express from 'express';
import JournalEntry from '../models/JournalEntry.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import Budget from '../models/Budget.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/journal-entries
 * Get all journal entries with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, entryType, fromDate, toDate, search, page = 1, limit = 50 } = req.query;
    
    const query = { company: req.user.company };
    
    if (status) query.status = status;
    if (entryType) query.entryType = entryType;
    if (fromDate || toDate) {
      query.entryDate = {};
      if (fromDate) query.entryDate.$gte = new Date(fromDate);
      if (toDate) query.entryDate.$lte = new Date(toDate);
    }
    if (search) {
      query.$or = [
        { entryNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      JournalEntry.find(query)
        .populate('lines.account', 'accountCode accountName')
        .populate('lines.costCenter', 'code name')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort({ entryDate: -1, entryNumber: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      JournalEntry.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: entries.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: entries
    });
  } catch (error) {
    logger.error('Error fetching journal entries:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/journal-entries/:id
 * Get single journal entry
 */
router.get('/:id', async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('lines.account', 'accountCode accountName accountType')
      .populate('lines.costCenter', 'code name')
      .populate('lines.vendor', 'vendorCode name')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    logger.error('Error fetching journal entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/journal-entries
 * Create new journal entry
 */
router.post('/', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const {
      entryDate,
      entryType,
      description,
      reference,
      lines,
      attachments,
      skipBudgetUpdate  // FIX ISSUE #7: Flag to prevent double budget update
    } = req.body;

    // FIX ISSUE #3: Check if period is locked
    const entryDateObj = new Date(entryDate);
    const entryMonth = entryDateObj.getMonth();
    const entryYear = entryDateObj.getFullYear();
    const fiscalYearStr = entryMonth >= 6 
      ? `${entryYear}-${entryYear + 1}` 
      : `${entryYear - 1}-${entryYear}`;
    
    // Import YearEndClosing model if not already imported
    const YearEndClosing = (await import('../models/YearEndClosing.js')).default;
    const yearEndClosing = await YearEndClosing.findOne({
      company: req.user.company,
      fiscalYear: fiscalYearStr,
      status: 'completed'
    });
    
    if (yearEndClosing && yearEndClosing.periodLocked) {
      return res.status(400).json({
        success: false,
        message: `Cannot post to fiscal year ${fiscalYearStr} - period is locked after year-end closing`
      });
    }

    // Validate lines
    if (!lines || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Journal entry must have at least 2 lines'
      });
    }

    // Calculate totals and validate balance
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;

      // Validate account exists
      const account = await ChartOfAccount.findOne({
        _id: line.account,
        company: req.user.company,
        status: 'active'
      });

      if (!account) {
        return res.status(400).json({
          success: false,
          message: `Invalid account: ${line.account}`
        });
      }
    }

    // Check if debits equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Entry not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`
      });
    }

    // Generate entry number
    const year = new Date(entryDate).getFullYear();
    const month = String(new Date(entryDate).getMonth() + 1).padStart(2, '0');
    const count = await JournalEntry.countDocuments({
      company: req.user.company,
      entryNumber: { $regex: `^JV-${year}${month}` }
    });
    const entryNumber = `JV-${year}${month}-${String(count + 1).padStart(5, '0')}`;

    // Check budget if expense entries
    const budgetWarnings = [];
    // Reuse fiscal year calculated earlier for period locking check
    
    for (const line of lines) {
      if (line.debit > 0 && line.costCenter) {
        const account = await ChartOfAccount.findById(line.account);
        if (account?.accountType === 'expense') {
          const budget = await Budget.findOne({
            company: req.user.company,
            'lines.costCenter': line.costCenter,
            'lines.headOfAccount': line.account,
            fiscalYear: fiscalYearStr,
            status: { $in: ['approved', 'active'] }
          });

          if (budget) {
            // FIX ISSUE #1: Use correct field names from Budget model
            const budgetLine = budget.lines.find(l => 
              l.headOfAccount.toString() === line.account.toString() &&
              l.costCenter?.toString() === line.costCenter.toString()
            );
            if (budgetLine) {
              const newUtilized = (budgetLine.utilized || 0) + (budgetLine.committed || 0) + line.debit;
              const totalBudget = budgetLine.totalBudget || budgetLine.originalBudget || 0;
              const utilizationPercent = (newUtilized / totalBudget) * 100;
              
              // FIX ISSUE #17: Enforce budget blocking based on blockThreshold
              const blockThreshold = budgetLine.blockThreshold || 100;
              const allowOverride = budgetLine.allowOverride || false;
              
              if (utilizationPercent > blockThreshold && !allowOverride && !skipBudgetUpdate) {
                // Budget exceeded and override not allowed - BLOCK
                return res.status(400).json({
                  success: false,
                  message: `Budget exceeded for ${account.accountName}. Allocated: ${totalBudget.toLocaleString()}, ` +
                    `Utilized + Committed: ${(budgetLine.utilized || 0) + (budgetLine.committed || 0)}, ` +
                    `Requested: ${line.debit.toLocaleString()}. Block threshold: ${blockThreshold}%`,
                  budgetBlocked: true,
                  details: {
                    account: account.accountName,
                    allocated: totalBudget,
                    utilized: budgetLine.utilized || 0,
                    committed: budgetLine.committed || 0,
                    requested: line.debit,
                    utilizationPercent: utilizationPercent.toFixed(2),
                    blockThreshold
                  }
                });
              } else if (newUtilized > totalBudget) {
                // Over budget but within threshold or override allowed - WARN
                budgetWarnings.push({
                  account: account.accountName,
                  allocated: totalBudget,
                  utilized: budgetLine.utilized || 0,
                  committed: budgetLine.committed || 0,
                  newAmount: line.debit,
                  overrun: newUtilized - totalBudget,
                  utilizationPercent: utilizationPercent.toFixed(2),
                  allowedByOverride: allowOverride
                });
              }
            }
          }
        }
      }
    }

    const entry = new JournalEntry({
      company: req.user.company,
      entryNumber,
      entryDate: new Date(entryDate),
      entryType: entryType || 'general',
      description,
      reference,
      lines: lines.map(line => ({
        ...line,
        debit: line.debit || 0,
        credit: line.credit || 0
      })),
      totalAmount: totalDebit,
      status: 'draft',
      attachments,
      createdBy: req.user._id
    });

    await entry.save();
    await entry.populate('lines.account', 'accountCode accountName');
    await entry.populate('createdBy', 'firstName lastName');

    logger.info('Journal entry created', { entryNumber, userId: req.user._id });

    res.status(201).json({
      success: true,
      data: entry,
      budgetWarnings: budgetWarnings.length > 0 ? budgetWarnings : undefined
    });
  } catch (error) {
    logger.error('Error creating journal entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/journal-entries/:id
 * Update draft journal entry
 */
router.put('/:id', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft entries can be modified'
      });
    }

    const { entryDate, description, reference, lines, attachments } = req.body;

    if (lines) {
      // Validate balance
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of lines) {
        totalDebit += line.debit || 0;
        totalCredit += line.credit || 0;
      }

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Entry not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`
        });
      }

      entry.lines = lines;
      entry.totalAmount = totalDebit;
    }

    if (entryDate) entry.entryDate = new Date(entryDate);
    if (description) entry.description = description;
    if (reference !== undefined) entry.reference = reference;
    if (attachments) entry.attachments = attachments;

    entry.updatedBy = req.user._id;
    await entry.save();
    await entry.populate('lines.account', 'accountCode accountName');

    logger.info('Journal entry updated', { entryNumber: entry.entryNumber, userId: req.user._id });

    res.json({ success: true, data: entry });
  } catch (error) {
    logger.error('Error updating journal entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/journal-entries/:id/approve
 * Approve a journal entry (moves from pending to approved)
 */
router.post('/:id/approve', authorize('admin', 'finance'), async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status !== 'draft' && entry.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve entry with status: ${entry.status}`
      });
    }

    entry.status = 'approved';
    entry.approvedBy = req.user._id;
    entry.approvedAt = new Date();
    await entry.save();

    logger.info('Journal entry approved', { entryNumber: entry.entryNumber, userId: req.user._id });

    res.json({ success: true, data: entry, message: 'Entry approved successfully' });
  } catch (error) {
    logger.error('Error approving journal entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/journal-entries/:id/reject
 * Reject a journal entry
 */
router.post('/:id/reject', authorize('admin', 'finance'), async (req, res) => {
  try {
    const { reason } = req.body;

    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status === 'posted' || entry.status === 'reversed') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject entry with status: ${entry.status}`
      });
    }

    entry.status = 'rejected';
    entry.rejectedBy = req.user._id;
    entry.rejectedAt = new Date();
    entry.rejectionReason = reason || 'No reason provided';
    await entry.save();

    logger.info('Journal entry rejected', { entryNumber: entry.entryNumber, reason, userId: req.user._id });

    res.json({ success: true, data: entry, message: 'Entry rejected' });
  } catch (error) {
    logger.error('Error rejecting journal entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/journal-entries/:id/post
 * Post (approve) a journal entry
 */
router.post('/:id/post', authorize('admin', 'finance'), async (req, res) => {
  try {
    // FIX ISSUE #7: Allow caller to skip budget update to prevent double counting
    const { skipBudgetUpdate } = req.body;
    
    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status !== 'draft' && entry.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot post entry with status: ${entry.status}`
      });
    }

    // FIX ISSUE #3: Check if period is locked
    const YearEndClosing = (await import('../models/YearEndClosing.js')).default;
    const entryMonth = new Date(entry.entryDate).getMonth();
    const entryYear = new Date(entry.entryDate).getFullYear();
    const fiscalYearStr = entryMonth >= 6 
      ? `${entryYear}-${entryYear + 1}` 
      : `${entryYear - 1}-${entryYear}`;
    
    const yearEndClosing = await YearEndClosing.findOne({
      company: req.user.company,
      fiscalYear: fiscalYearStr,
      status: 'completed'
    });
    
    if (yearEndClosing && yearEndClosing.periodLocked) {
      return res.status(400).json({
        success: false,
        message: `Cannot post to fiscal year ${fiscalYearStr} - period is locked after year-end closing`
      });
    }

    // FIX ISSUE #7: Only update budget if not already updated by caller (e.g., bankPayments)
    if (!skipBudgetUpdate) {
      for (const line of entry.lines) {
        if (line.debit > 0 && line.costCenter) {
          const account = await ChartOfAccount.findById(line.account);
          if (account?.accountType === 'expense') {
            // Update the specific budget line's utilized amount
            await Budget.findOneAndUpdate(
              {
                company: req.user.company,
                fiscalYear: fiscalYearStr,
                status: { $in: ['approved', 'active'] },
                'lines.costCenter': line.costCenter,
                'lines.headOfAccount': line.account
              },
              {
                $inc: { 
                  'lines.$.utilized': line.debit,
                  totalUtilized: line.debit
                }
              }
            );
          }
        }
      }
    }

    entry.status = 'posted';
    entry.postedAt = new Date();
    entry.approvedBy = req.user._id;
    await entry.save();
    
    // FIX ISSUE #8: Update account balances when entry is posted (not during creation)
    for (const line of entry.lines) {
      const account = await ChartOfAccount.findById(line.account);
      if (account) {
        // Calculate balance change based on account type and debit/credit
        // Assets & Expenses: Debits increase, Credits decrease
        // Liabilities, Equity & Revenue: Credits increase, Debits decrease
        let balanceChange = 0;
        const normalDebitTypes = ['asset', 'expense', 'contra-liability'];
        const normalCreditTypes = ['liability', 'equity', 'revenue', 'contra-asset'];
        
        if (normalDebitTypes.includes(account.accountType)) {
          balanceChange = (line.debit || 0) - (line.credit || 0);
        } else if (normalCreditTypes.includes(account.accountType)) {
          balanceChange = (line.credit || 0) - (line.debit || 0);
        }
        
        await ChartOfAccount.findByIdAndUpdate(account._id, {
          $inc: { currentBalance: balanceChange }
        });
      }
    }

    logger.info('Journal entry posted', { entryNumber: entry.entryNumber, userId: req.user._id });

    res.json({ success: true, data: entry, message: 'Entry posted successfully' });
  } catch (error) {
    logger.error('Error posting journal entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/journal-entries/:id/reverse
 * Create reversing entry
 */
router.post('/:id/reverse', authorize('admin', 'finance'), async (req, res) => {
  try {
    const { reason, reversalDate } = req.body;

    const originalEntry = await JournalEntry.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: 'posted'
    });

    if (!originalEntry) {
      return res.status(404).json({
        success: false,
        message: 'Posted journal entry not found'
      });
    }

    // Generate reversal entry number
    const date = new Date(reversalDate || new Date());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await JournalEntry.countDocuments({
      company: req.user.company,
      entryNumber: { $regex: `^JV-${year}${month}` }
    });
    const entryNumber = `JV-${year}${month}-${String(count + 1).padStart(5, '0')}`;

    // Create reversal entry (swap debits and credits)
    const reversalEntry = new JournalEntry({
      company: req.user.company,
      entryNumber,
      entryDate: date,
      entryType: 'reversal',
      description: `Reversal of ${originalEntry.entryNumber}: ${reason || 'Reversal'}`,
      reference: originalEntry.entryNumber,
      lines: originalEntry.lines.map(line => ({
        ...line.toObject(),
        debit: line.credit,
        credit: line.debit
      })),
      totalAmount: originalEntry.totalAmount,
      status: 'posted',
      postedAt: new Date(),
      reversesEntry: originalEntry._id,
      createdBy: req.user._id,
      approvedBy: req.user._id
    });

    await reversalEntry.save();

    // FIX ISSUE #4: Update ChartOfAccount balances for reversal entry
    for (const line of reversalEntry.lines) {
      const account = await ChartOfAccount.findById(line.account);
      if (account) {
        // Reversal entry has swapped debit/credit, so update accordingly
        if (account.normalBalance === 'debit') {
          account.currentBalance += (line.debit - line.credit);
        } else {
          account.currentBalance += (line.credit - line.debit);
        }
        await account.save();
      }
    }

    // Mark original as reversed
    originalEntry.status = 'reversed';
    originalEntry.reversedBy = reversalEntry._id;
    await originalEntry.save();

    // Reverse budget utilization (using Pakistan fiscal year format)
    const origEntryMonth = new Date(originalEntry.entryDate).getMonth();
    const origEntryYear = new Date(originalEntry.entryDate).getFullYear();
    const origFiscalYear = origEntryMonth >= 6 
      ? `${origEntryYear}-${origEntryYear + 1}` 
      : `${origEntryYear - 1}-${origEntryYear}`;
    
    for (const line of originalEntry.lines) {
      if (line.debit > 0 && line.costCenter) {
        const account = await ChartOfAccount.findById(line.account);
        if (account?.accountType === 'expense') {
          await Budget.findOneAndUpdate(
            {
              company: req.user.company,
              fiscalYear: origFiscalYear,
              status: { $in: ['approved', 'active'] },
              'lines.costCenter': line.costCenter,
              'lines.headOfAccount': line.account
            },
            {
              $inc: { 
                'lines.$.utilized': -line.debit,
                totalUtilized: -line.debit
              }
            }
          );
        }
      }
    }

    logger.info('Journal entry reversed', {
      original: originalEntry.entryNumber,
      reversal: reversalEntry.entryNumber,
      userId: req.user._id
    });

    res.json({
      success: true,
      data: reversalEntry,
      message: 'Entry reversed successfully'
    });
  } catch (error) {
    logger.error('Error reversing journal entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/journal-entries/:id
 * Delete draft journal entry
 */
router.delete('/:id', authorize('admin', 'finance'), async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft entries can be deleted. Use reversal for posted entries.'
      });
    }

    await entry.deleteOne();

    logger.info('Journal entry deleted', { entryNumber: entry.entryNumber, userId: req.user._id });

    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (error) {
    logger.error('Error deleting journal entry:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/journal-entries/report/ledger
 * Get general ledger report for an account
 */
router.get('/report/ledger', async (req, res) => {
  try {
    const { accountId, fromDate, toDate } = req.query;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Account ID is required'
      });
    }

    const account = await ChartOfAccount.findOne({
      _id: accountId,
      company: req.user.company
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const dateFilter = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    // FIX ISSUE #2: Calculate opening balance from prior periods
    let openingBalance = 0;
    if (fromDate) {
      const priorEntries = await JournalEntry.aggregate([
        {
          $match: {
            company: req.user.company,
            status: 'posted',
            entryDate: { $lt: new Date(fromDate) },
            'lines.account': account._id
          }
        },
        { $unwind: '$lines' },
        {
          $match: {
            'lines.account': account._id
          }
        },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$lines.debit' },
            totalCredit: { $sum: '$lines.credit' }
          }
        }
      ]);

      if (priorEntries.length > 0) {
        const { totalDebit, totalCredit } = priorEntries[0];
        if (['asset', 'expense'].includes(account.accountType)) {
          openingBalance = totalDebit - totalCredit;
        } else {
          openingBalance = totalCredit - totalDebit;
        }
      }
    } else {
      // Use account's stored opening balance for fiscal year
      openingBalance = account.openingBalance || 0;
    }

    const entries = await JournalEntry.find({
      company: req.user.company,
      status: 'posted',
      'lines.account': accountId,
      ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {})
    })
      .select('entryNumber entryDate description lines')
      .sort({ entryDate: 1, entryNumber: 1 });

    // Build ledger with running balance (starting from opening balance)
    let runningBalance = openingBalance;
    const ledgerEntries = [];

    for (const entry of entries) {
      const relevantLines = entry.lines.filter(
        line => line.account.toString() === accountId
      );

      for (const line of relevantLines) {
        const debit = line.debit || 0;
        const credit = line.credit || 0;

        // For assets/expenses, debit increases balance
        // For liabilities/equity/income, credit increases balance
        if (['asset', 'expense'].includes(account.accountType)) {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }

        ledgerEntries.push({
          date: entry.entryDate,
          entryNumber: entry.entryNumber,
          description: line.description || entry.description,
          debit,
          credit,
          balance: runningBalance
        });
      }
    }

    res.json({
      success: true,
      data: {
        account: {
          code: account.accountCode,
          name: account.accountName,
          type: account.accountType
        },
        period: { from: fromDate, to: toDate },
        openingBalance,  // FIX ISSUE #2: Now calculated from prior periods
        entries: ledgerEntries,
        closingBalance: runningBalance
      }
    });
  } catch (error) {
    logger.error('Error generating ledger report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
