/**
 * Chart of Accounts Routes
 * NAM/IFRS compliant chart of accounts management
 */

import express from 'express';
import ChartOfAccount from '../models/ChartOfAccount.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/chart-of-accounts
 * Get all accounts with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { type, category, level, status, search } = req.query;
    
    const query = { company: req.user.company };
    
    if (type) query.accountType = type;
    if (category) query.category = category;
    if (level) query.level = parseInt(level);
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { accountCode: { $regex: search, $options: 'i' } },
        { accountName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const accounts = await ChartOfAccount.find(query)
      .populate('parentAccount', 'accountCode accountName')
      .sort({ accountCode: 1 });

    res.json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    logger.error('Error fetching chart of accounts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/chart-of-accounts/tree
 * Get accounts in hierarchical tree structure
 */
router.get('/tree', async (req, res) => {
  try {
    const accounts = await ChartOfAccount.find({ 
      company: req.user.company,
      status: 'active'
    }).sort({ accountCode: 1 });

    // Build tree structure
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => {
          const itemParent = item.parentAccount?.toString() || null;
          return itemParent === parentId;
        })
        .map(item => ({
          ...item.toObject(),
          children: buildTree(items, item._id.toString())
        }));
    };

    const tree = buildTree(accounts);

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    logger.error('Error fetching COA tree:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/chart-of-accounts/:id
 * Get single account by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const account = await ChartOfAccount.findOne({
      _id: req.params.id,
      company: req.user.company
    }).populate('parentAccount', 'accountCode accountName');

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    logger.error('Error fetching account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/chart-of-accounts
 * Create new account
 */
router.post('/', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const {
      accountCode,
      accountName,
      accountType,
      category,
      parentAccount,
      description,
      isBankAccount,
      bankDetails,
      budgetCode,
      namCode,
      ifrsMapping
    } = req.body;

    // Check for duplicate account code
    const existing = await ChartOfAccount.findOne({
      company: req.user.company,
      accountCode: accountCode.toUpperCase()
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Account code already exists' 
      });
    }

    // Determine level based on parent
    let level = 1;
    if (parentAccount) {
      const parent = await ChartOfAccount.findById(parentAccount);
      if (parent) {
        level = parent.level + 1;
      }
    }

    const account = new ChartOfAccount({
      company: req.user.company,
      accountCode: accountCode.toUpperCase(),
      accountName,
      accountType,
      category,
      parentAccount: parentAccount || null,
      level,
      description,
      isBankAccount: isBankAccount || false,
      bankDetails: isBankAccount ? bankDetails : undefined,
      budgetCode,
      namCode,
      ifrsMapping,
      createdBy: req.user._id
    });

    await account.save();

    logger.info('Chart of Account created', { 
      accountCode: account.accountCode, 
      userId: req.user._id 
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    logger.error('Error creating account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/chart-of-accounts/:id
 * Update account
 */
router.put('/:id', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const account = await ChartOfAccount.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Don't allow changing account code if transactions exist
    if (req.body.accountCode && req.body.accountCode !== account.accountCode) {
      // Check for journal entries using this account
      const JournalEntry = (await import('../models/JournalEntry.js')).default;
      const hasTransactions = await JournalEntry.findOne({
        company: req.user.company,
        'lines.account': account._id
      });

      if (hasTransactions) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change account code - transactions exist for this account'
        });
      }
    }

    const allowedUpdates = [
      'accountName', 'description', 'status', 'isBankAccount',
      'bankDetails', 'budgetCode', 'namCode', 'ifrsMapping'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        account[field] = req.body[field];
      }
    });

    account.updatedBy = req.user._id;
    await account.save();

    logger.info('Chart of Account updated', { 
      accountCode: account.accountCode, 
      userId: req.user._id 
    });

    res.json({ success: true, data: account });
  } catch (error) {
    logger.error('Error updating account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/chart-of-accounts/:id
 * Delete account (soft delete - set status to inactive)
 */
router.delete('/:id', authorize('admin', 'finance'), async (req, res) => {
  try {
    const account = await ChartOfAccount.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Check for child accounts
    const hasChildren = await ChartOfAccount.findOne({
      parentAccount: account._id,
      status: 'active'
    });

    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with active child accounts'
      });
    }

    // Check for transactions
    const JournalEntry = (await import('../models/JournalEntry.js')).default;
    const hasTransactions = await JournalEntry.findOne({
      company: req.user.company,
      'lines.account': account._id
    });

    if (hasTransactions) {
      // Soft delete
      account.status = 'inactive';
      await account.save();
      return res.json({ 
        success: true, 
        message: 'Account deactivated (has transactions)',
        data: account 
      });
    }

    // Hard delete if no transactions
    await account.deleteOne();

    logger.info('Chart of Account deleted', { 
      accountCode: account.accountCode, 
      userId: req.user._id 
    });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/chart-of-accounts/import
 * Bulk import accounts from NAM template
 */
router.post('/import', authorize('admin', 'finance'), async (req, res) => {
  try {
    const { accounts } = req.body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of accounts to import'
      });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const acc of accounts) {
      try {
        const existing = await ChartOfAccount.findOne({
          company: req.user.company,
          accountCode: acc.accountCode.toUpperCase()
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        const newAccount = new ChartOfAccount({
          ...acc,
          company: req.user.company,
          accountCode: acc.accountCode.toUpperCase(),
          createdBy: req.user._id
        });

        await newAccount.save();
        results.created++;
      } catch (err) {
        results.errors.push({
          accountCode: acc.accountCode,
          error: err.message
        });
      }
    }

    logger.info('COA bulk import completed', { 
      results, 
      userId: req.user._id 
    });

    res.json({
      success: true,
      message: `Import completed: ${results.created} created, ${results.skipped} skipped`,
      data: results
    });
  } catch (error) {
    logger.error('Error importing accounts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
