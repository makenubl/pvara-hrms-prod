import express from 'express';
import mongoose from 'mongoose';
import FixedAsset from '../models/FixedAsset.js';
import JournalEntry from '../models/JournalEntry.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/fixed-assets
 * Get all fixed assets
 */
router.get('/', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const { status, assetClass, department } = req.query;
    const query = { company: req.user.company };
    
    if (status) query.status = status;
    if (assetClass) query.assetClass = assetClass;
    if (department) query.department = department;

    const assets = await FixedAsset.find(query)
      .populate('department', 'name')
      .populate('assetAccount', 'code name')
      .populate('depreciationExpenseAccount', 'code name')
      .populate('accumulatedDepreciationAccount', 'code name')
      .sort({ assetCode: 1 });

    res.json({ success: true, data: assets });
  } catch (error) {
    logger.error('Error fetching fixed assets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/fixed-assets/:id
 * Get single asset
 */
router.get('/:id', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const asset = await FixedAsset.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('department', 'name')
      .populate('assetAccount', 'code name')
      .populate('depreciationExpenseAccount', 'code name')
      .populate('accumulatedDepreciationAccount', 'code name');

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    logger.error('Error fetching asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/fixed-assets
 * Create new fixed asset
 */
router.post('/', authorize('admin', 'finance'), async (req, res) => {
  try {
    const assetCount = await FixedAsset.countDocuments({ company: req.user.company });
    const assetCode = `FA-${String(assetCount + 1).padStart(5, '0')}`;

    const asset = new FixedAsset({
      ...req.body,
      company: req.user.company,
      assetCode,
      createdBy: req.user._id
    });

    await asset.save();

    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    logger.error('Error creating fixed asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * FIX ISSUE #9: POST /api/fixed-assets/run-depreciation
 * Run monthly depreciation and create journal entries
 */
router.post('/run-depreciation', authorize('admin', 'finance'), async (req, res) => {
  try {
    const { period } = req.body; // YYYY-MM format
    
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Period must be in YYYY-MM format' 
      });
    }

    const companyId = req.user.company;
    const periodDate = new Date(`${period}-15`);

    // Get all active assets with depreciation
    const assets = await FixedAsset.find({
      company: companyId,
      status: 'active',
      depreciationMethod: { $ne: 'no_depreciation' }
    }).populate('depreciationExpenseAccount accumulatedDepreciationAccount');

    if (assets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No depreciable assets found'
      });
    }

    // Group by expense account for consolidated journal entry
    const depreciationByAccount = {};
    let totalDepreciation = 0;

    for (const asset of assets) {
      const depreciation = asset.calculateDepreciation(periodDate);
      
      if (depreciation > 0) {
        const expenseKey = asset.depreciationExpenseAccount?._id?.toString() || 'default';
        const accumKey = asset.accumulatedDepreciationAccount?._id?.toString() || 'default';

        if (!depreciationByAccount[expenseKey]) {
          depreciationByAccount[expenseKey] = {
            expenseAccount: asset.depreciationExpenseAccount,
            accumAccount: asset.accumulatedDepreciationAccount,
            amount: 0,
            assets: []
          };
        }

        depreciationByAccount[expenseKey].amount += depreciation;
        depreciationByAccount[expenseKey].assets.push({
          assetCode: asset.assetCode,
          name: asset.name,
          depreciation
        });
        totalDepreciation += depreciation;

        // Update asset
        asset.accumulatedDepreciation += depreciation;
        asset.currentBookValue = asset.totalCost - asset.accumulatedDepreciation;
        asset.depreciationHistory.push({
          period,
          amount: depreciation,
          method: asset.depreciationMethod,
          runDate: new Date()
        });
        await asset.save();
      }
    }

    if (totalDepreciation === 0) {
      return res.json({
        success: true,
        message: 'No depreciation to record for this period',
        data: { totalDepreciation: 0 }
      });
    }

    // Create journal entry
    const [yearStr, monthStr] = period.split('-');
    const jeCount = await JournalEntry.countDocuments({
      company: companyId,
      entryNumber: { $regex: `^JV-${yearStr}${monthStr}` }
    });
    const entryNumber = `JV-${yearStr}${monthStr}-${String(jeCount + 1).padStart(5, '0')}`;

    const journalLines = [];

    for (const key in depreciationByAccount) {
      const entry = depreciationByAccount[key];
      
      if (entry.expenseAccount) {
        // Debit depreciation expense
        journalLines.push({
          account: entry.expenseAccount._id,
          accountCode: entry.expenseAccount.code,
          accountName: entry.expenseAccount.name,
          description: `Depreciation expense for ${period}`,
          debit: entry.amount,
          credit: 0
        });
      }

      if (entry.accumAccount) {
        // Credit accumulated depreciation
        journalLines.push({
          account: entry.accumAccount._id,
          accountCode: entry.accumAccount.code,
          accountName: entry.accumAccount.name,
          description: `Accumulated depreciation for ${period}`,
          debit: 0,
          credit: entry.amount
        });
      }
    }

    const journalEntry = new JournalEntry({
      company: companyId,
      entryNumber,
      entryDate: new Date(`${period}-28`),
      entryType: 'general',
      description: `Fixed asset depreciation for ${period}`,
      lines: journalLines,
      totalDebit: totalDepreciation,
      totalCredit: totalDepreciation,
      status: 'posted',
      postedAt: new Date(),
      createdBy: req.user._id,
      approvedBy: req.user._id
    });

    await journalEntry.save();

    // Update account balances
    for (const key in depreciationByAccount) {
      const entry = depreciationByAccount[key];
      
      if (entry.expenseAccount) {
        await ChartOfAccount.findByIdAndUpdate(entry.expenseAccount._id, {
          $inc: { currentBalance: entry.amount }
        });
      }
      
      if (entry.accumAccount) {
        await ChartOfAccount.findByIdAndUpdate(entry.accumAccount._id, {
          $inc: { currentBalance: entry.amount }
        });
      }
    }

    logger.info('Depreciation run completed', {
      period,
      totalDepreciation,
      assetCount: assets.length,
      journalEntry: entryNumber
    });

    res.json({
      success: true,
      message: 'Depreciation run completed successfully',
      data: {
        period,
        journalEntry: entryNumber,
        totalDepreciation,
        assetCount: Object.keys(depreciationByAccount).reduce(
          (sum, k) => sum + depreciationByAccount[k].assets.length, 0
        )
      }
    });
  } catch (error) {
    logger.error('Error running depreciation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/fixed-assets/report/depreciation-schedule
 * FIX ISSUE #26: Depreciation schedule report
 */
router.get('/report/depreciation-schedule', authorize('admin', 'finance', 'accountant', 'auditor'), async (req, res) => {
  try {
    const { fiscalYear, assetClass } = req.query;
    const companyId = req.user.company;

    const query = {
      company: companyId,
      status: { $in: ['active', 'disposed'] }
    };

    if (assetClass) query.assetClass = assetClass;

    const assets = await FixedAsset.find(query)
      .populate('department', 'name')
      .sort({ assetClass: 1, assetCode: 1 });

    const schedule = assets.map(asset => ({
      assetCode: asset.assetCode,
      name: asset.name,
      assetClass: asset.assetClass,
      acquisitionDate: asset.acquisitionDate,
      acquisitionCost: asset.acquisitionCost,
      totalCost: asset.totalCost,
      residualValue: asset.residualValue,
      usefulLifeMonths: asset.usefulLifeMonths,
      depreciationMethod: asset.depreciationMethod,
      annualDepreciation: asset.annualDepreciation,
      monthlyDepreciation: asset.monthlyDepreciation,
      accumulatedDepreciation: asset.accumulatedDepreciation,
      currentBookValue: asset.currentBookValue,
      status: asset.status
    }));

    const totals = {
      totalCost: schedule.reduce((sum, a) => sum + a.totalCost, 0),
      accumulatedDepreciation: schedule.reduce((sum, a) => sum + a.accumulatedDepreciation, 0),
      currentBookValue: schedule.reduce((sum, a) => sum + a.currentBookValue, 0),
      annualDepreciation: schedule.reduce((sum, a) => sum + a.annualDepreciation, 0)
    };

    res.json({
      success: true,
      data: {
        reportName: 'Fixed Asset Depreciation Schedule',
        generatedAt: new Date(),
        fiscalYear: fiscalYear || 'All',
        assets: schedule,
        totals
      }
    });
  } catch (error) {
    logger.error('Error generating depreciation schedule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
