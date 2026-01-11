/**
 * Vendor Routes
 * Vendor management with withholding tax support
 */

import express from 'express';
import Vendor from '../models/Vendor.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/vendors
 * Get all vendors with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, vendorType, whtApplicable, search } = req.query;
    
    const query = { company: req.user.company };
    
    if (status) query.status = status;
    if (vendorType) query.vendorType = vendorType;
    if (whtApplicable !== undefined) query['taxInfo.whtApplicable'] = whtApplicable === 'true';
    if (search) {
      query.$or = [
        { vendorCode: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { 'taxInfo.ntn': { $regex: search, $options: 'i' } }
      ];
    }

    const vendors = await Vendor.find(query)
      .sort({ name: 1 });

    res.json({
      success: true,
      count: vendors.length,
      data: vendors
    });
  } catch (error) {
    logger.error('Error fetching vendors:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vendors/:id
 * Get single vendor with payment history
 */
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.json({ success: true, data: vendor });
  } catch (error) {
    logger.error('Error fetching vendor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vendors/:id/payments
 * Get vendor payment history
 */
router.get('/:id/payments', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Get payments from journal entries
    const JournalEntry = (await import('../models/JournalEntry.js')).default;
    const payments = await JournalEntry.find({
      company: req.user.company,
      'lines.vendor': vendor._id,
      status: 'posted'
    })
      .select('entryNumber entryDate description lines totalAmount')
      .sort({ entryDate: -1 })
      .limit(50);

    res.json({ success: true, data: payments });
  } catch (error) {
    logger.error('Error fetching vendor payments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vendors
 * Create new vendor
 */
router.post('/', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const {
      name,
      vendorType,
      contactPerson,
      email,
      phone,
      address,
      taxInfo,
      bankDetails,
      paymentTerms
    } = req.body;

    // Check for duplicate NTN if provided
    if (taxInfo?.ntn) {
      const existingNtn = await Vendor.findOne({
        company: req.user.company,
        'taxInfo.ntn': taxInfo.ntn
      });

      if (existingNtn) {
        return res.status(400).json({
          success: false,
          message: 'Vendor with this NTN already exists'
        });
      }
    }

    // Generate vendor code
    const count = await Vendor.countDocuments({ company: req.user.company });
    const vendorCode = `VND-${String(count + 1).padStart(5, '0')}`;

    const vendor = new Vendor({
      company: req.user.company,
      vendorCode,
      name,
      vendorType: vendorType || 'supplier',
      contactPerson,
      email,
      phone,
      address,
      taxInfo: {
        ...taxInfo,
        whtApplicable: taxInfo?.whtApplicable !== false,
        whtRate: taxInfo?.whtRate || (taxInfo?.filerStatus === 'filer' ? 4.5 : 9)
      },
      bankDetails,
      paymentTerms: paymentTerms || 30,
      createdBy: req.user._id
    });

    await vendor.save();

    logger.info('Vendor created', { vendorCode: vendor.vendorCode, userId: req.user._id });

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    logger.error('Error creating vendor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/vendors/:id
 * Update vendor
 */
router.put('/:id', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const allowedUpdates = [
      'name', 'vendorType', 'contactPerson', 'email', 'phone',
      'address', 'taxInfo', 'bankDetails', 'paymentTerms', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    // Recalculate WHT rate based on filer status AND applicable section (ITO 2001)
    if (req.body.taxInfo?.filerStatus || req.body.wht?.applicableSection) {
      const isFiler = (req.body.taxInfo?.filerStatus || vendor.taxInfo?.filerStatus) === 'filer';
      const section = req.body.wht?.applicableSection || vendor.wht?.applicableSection || '153-1a';
      
      // WHT rates as per FBR (updated 2025)
      const whtRates = {
        '153-1a': { filer: 4.5, nonFiler: 9 },      // Supply of goods
        '153-1b': { filer: 8, nonFiler: 16 },       // Services (general)
        '153-1c': { filer: 7.5, nonFiler: 15 },     // Contracts
        '233': { filer: 10, nonFiler: 20 },          // Brokerage/Commission
        '234': { filer: 2, nonFiler: 4 },            // Transport
        '235': { filer: 7.5, nonFiler: 15 },         // Electricity
        'none': { filer: 0, nonFiler: 0 }
      };
      
      const rates = whtRates[section] || whtRates['153-1a'];
      vendor.wht = vendor.wht || {};
      vendor.wht.filerRate = rates.filer;
      vendor.wht.nonFilerRate = rates.nonFiler;
      vendor.taxInfo.whtRate = isFiler ? rates.filer : rates.nonFiler;
    }

    vendor.updatedBy = req.user._id;
    await vendor.save();

    logger.info('Vendor updated', { vendorCode: vendor.vendorCode, userId: req.user._id });

    res.json({ success: true, data: vendor });
  } catch (error) {
    logger.error('Error updating vendor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/vendors/:id
 * Delete/deactivate vendor
 */
router.delete('/:id', authorize('admin', 'finance'), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Check for transactions
    const JournalEntry = (await import('../models/JournalEntry.js')).default;
    const hasTransactions = await JournalEntry.findOne({
      company: req.user.company,
      'lines.vendor': vendor._id
    });

    if (hasTransactions) {
      vendor.status = 'inactive';
      await vendor.save();
      return res.json({
        success: true,
        message: 'Vendor deactivated (has transactions)',
        data: vendor
      });
    }

    await vendor.deleteOne();

    logger.info('Vendor deleted', { vendorCode: vendor.vendorCode, userId: req.user._id });

    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vendor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vendors/:id/calculate-wht
 * Calculate withholding tax for a payment amount
 */
router.post('/:id/calculate-wht', async (req, res) => {
  try {
    const { amount } = req.body;

    const vendor = await Vendor.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (!vendor.taxInfo.whtApplicable) {
      return res.json({
        success: true,
        data: {
          grossAmount: amount,
          whtAmount: 0,
          netPayable: amount,
          whtApplicable: false
        }
      });
    }

    const whtRate = vendor.taxInfo.whtRate || 4.5;
    const whtAmount = Math.round((amount * whtRate) / 100);
    const netPayable = amount - whtAmount;

    res.json({
      success: true,
      data: {
        grossAmount: amount,
        whtRate,
        whtAmount,
        netPayable,
        whtApplicable: true,
        filerStatus: vendor.taxInfo.filerStatus
      }
    });
  } catch (error) {
    logger.error('Error calculating WHT:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vendors/report/wht-summary
 * WHT summary report for tax filing
 */
router.get('/report/wht-summary', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const start = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = toDate ? new Date(toDate) : new Date();

    const JournalEntry = (await import('../models/JournalEntry.js')).default;

    const whtEntries = await JournalEntry.aggregate([
      {
        $match: {
          company: req.user.company,
          entryDate: { $gte: start, $lte: end },
          status: 'posted'
        }
      },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.vendor': { $exists: true },
          'lines.whtAmount': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$lines.vendor',
          totalGross: { $sum: '$lines.debit' },
          totalWht: { $sum: '$lines.whtAmount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          vendorCode: '$vendor.vendorCode',
          vendorName: '$vendor.name',
          ntn: '$vendor.taxInfo.ntn',
          filerStatus: '$vendor.taxInfo.filerStatus',
          totalGross: 1,
          totalWht: 1,
          transactionCount: 1
        }
      },
      { $sort: { vendorName: 1 } }
    ]);

    const summary = {
      period: { from: start, to: end },
      totalGross: whtEntries.reduce((sum, e) => sum + e.totalGross, 0),
      totalWht: whtEntries.reduce((sum, e) => sum + e.totalWht, 0),
      vendorCount: whtEntries.length,
      details: whtEntries
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Error generating WHT summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
