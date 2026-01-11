/**
 * Bank Payment Routes
 * RAAST and bulk bank payment management
 */

import express from 'express';
import BankPaymentBatch from '../models/BankPaymentBatch.js';
import JournalEntry from '../models/JournalEntry.js';
import Vendor from '../models/Vendor.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import Budget from '../models/Budget.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/bank-payments
 * Get all payment batches
 */
router.get('/', async (req, res) => {
  try {
    const { status, paymentMethod, fromDate, toDate } = req.query;
    
    const query = { company: req.user.company };
    
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (fromDate || toDate) {
      query.paymentDate = {};
      if (fromDate) query.paymentDate.$gte = new Date(fromDate);
      if (toDate) query.paymentDate.$lte = new Date(toDate);
    }

    const batches = await BankPaymentBatch.find(query)
      .populate('bankAccount', 'accountCode accountName bankDetails')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: batches.length,
      data: batches
    });
  } catch (error) {
    logger.error('Error fetching payment batches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/bank-payments/:id
 * Get single payment batch with details
 */
router.get('/:id', async (req, res) => {
  try {
    const batch = await BankPaymentBatch.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('bankAccount', 'accountCode accountName bankDetails')
      .populate('payments.vendor', 'vendorCode name taxInfo bankDetails')
      .populate('payments.employee', 'firstName lastName employeeId bankDetails')
      .populate('journalEntry')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Payment batch not found' });
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    logger.error('Error fetching payment batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/bank-payments
 * Create new payment batch
 */
router.post('/', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const {
      paymentDate,
      paymentMethod,
      bankAccount,
      description,
      payments
    } = req.body;

    if (!payments || payments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one payment is required'
      });
    }

    // Validate bank account
    const bank = await ChartOfAccount.findOne({
      _id: bankAccount,
      company: req.user.company,
      isBankAccount: true,
      status: 'active'
    });

    if (!bank) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bank account'
      });
    }

    // Process payments and calculate totals
    let totalGross = 0;
    let totalWht = 0;
    let totalNet = 0;
    const processedPayments = [];

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      
      // Validate vendor if vendor payment
      if (payment.vendor) {
        const vendor = await Vendor.findOne({
          _id: payment.vendor,
          company: req.user.company
        });

        if (!vendor) {
          return res.status(400).json({
            success: false,
            message: `Invalid vendor at payment ${i + 1}`
          });
        }

        // Calculate WHT (only applies above Rs. 75,000 threshold per FBR rules)
        let whtAmount = 0;
        const whtThreshold = vendor.wht?.whtThreshold || 75000;
        if (vendor.taxInfo?.whtApplicable && payment.grossAmount >= whtThreshold) {
          const whtRate = vendor.isFiler 
            ? (vendor.wht?.filerRate || 4.5) 
            : (vendor.wht?.nonFilerRate || 9);
          whtAmount = Math.round((payment.grossAmount * whtRate) / 100);
        }

        const netAmount = payment.grossAmount - whtAmount;

        processedPayments.push({
          ...payment,
          whtAmount,
          netAmount,
          beneficiaryName: vendor.name,
          beneficiaryBank: vendor.bankDetails?.bankName,
          beneficiaryAccount: vendor.bankDetails?.accountNumber,
          beneficiaryIBAN: vendor.bankDetails?.iban
        });

        totalGross += payment.grossAmount;
        totalWht += whtAmount;
        totalNet += netAmount;
      } else if (payment.employee) {
        // Employee payment (salary)
        processedPayments.push({
          ...payment,
          whtAmount: payment.whtAmount || 0,
          netAmount: payment.netAmount || payment.grossAmount
        });

        totalGross += payment.grossAmount || 0;
        totalWht += payment.whtAmount || 0;
        totalNet += payment.netAmount || payment.grossAmount || 0;
      }
    }

    // Generate batch number
    const year = new Date(paymentDate).getFullYear();
    const month = String(new Date(paymentDate).getMonth() + 1).padStart(2, '0');
    const count = await BankPaymentBatch.countDocuments({
      company: req.user.company,
      batchNumber: { $regex: `^PAY-${year}${month}` }
    });
    const batchNumber = `PAY-${year}${month}-${String(count + 1).padStart(4, '0')}`;

    const batch = new BankPaymentBatch({
      company: req.user.company,
      batchNumber,
      paymentDate: new Date(paymentDate),
      paymentMethod: paymentMethod || 'bank_transfer',
      bankAccount,
      description,
      payments: processedPayments,
      totalGrossAmount: totalGross,
      totalWhtAmount: totalWht,
      totalNetAmount: totalNet,
      paymentCount: processedPayments.length,
      status: 'draft',
      createdBy: req.user._id
    });

    await batch.save();
    await batch.populate('bankAccount', 'accountCode accountName');

    logger.info('Payment batch created', { batchNumber, userId: req.user._id });

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    logger.error('Error creating payment batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/bank-payments/:id/approve
 * Approve payment batch and create journal entry
 */
router.post('/:id/approve', authorize('admin', 'finance'), async (req, res) => {
  try {
    const batch = await BankPaymentBatch.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: 'draft'
    }).populate('bankAccount');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Draft payment batch not found'
      });
    }

    // Create journal entry for the payment
    const year = new Date(batch.paymentDate).getFullYear();
    const month = String(new Date(batch.paymentDate).getMonth() + 1).padStart(2, '0');
    const jeCount = await JournalEntry.countDocuments({
      company: req.user.company,
      entryNumber: { $regex: `^JV-${year}${month}` }
    });
    const entryNumber = `JV-${year}${month}-${String(jeCount + 1).padStart(5, '0')}`;

    // Get WHT payable account
    const whtAccount = await ChartOfAccount.findOne({
      company: req.user.company,
      accountCode: { $regex: /WHT|WITHHOLDING/i },
      accountType: 'liability'
    });

    const journalLines = [];

    // Credit bank account for total net payment
    journalLines.push({
      account: batch.bankAccount._id,
      description: `Payment batch ${batch.batchNumber}`,
      debit: 0,
      credit: batch.totalNetAmount
    });

    // Credit WHT payable if applicable
    if (batch.totalWhtAmount > 0 && whtAccount) {
      journalLines.push({
        account: whtAccount._id,
        description: `WHT on ${batch.batchNumber}`,
        debit: 0,
        credit: batch.totalWhtAmount
      });
    }

    // Debit expense/payable accounts for each payment
    // For now, use a generic accounts payable debit
    const apAccount = await ChartOfAccount.findOne({
      company: req.user.company,
      accountType: 'liability',
      accountCode: { $regex: /PAYABLE|AP/i }
    });

    if (apAccount) {
      journalLines.push({
        account: apAccount._id,
        description: `Payments - ${batch.batchNumber}`,
        debit: batch.totalGrossAmount,
        credit: 0
      });
    }

    const journalEntry = new JournalEntry({
      company: req.user.company,
      entryNumber,
      entryDate: batch.paymentDate,
      entryType: 'payment',
      description: `Bank payment batch: ${batch.batchNumber}`,
      reference: batch.batchNumber,
      lines: journalLines,
      totalAmount: batch.totalGrossAmount,
      status: 'posted',
      postedAt: new Date(),
      createdBy: req.user._id,
      approvedBy: req.user._id,
      // FIX ISSUE #7: Mark that budget was already updated to prevent double counting
      sourceDocument: {
        type: 'payment',
        documentNumber: batch.batchNumber,
        budgetUpdatedExternally: true  // Flag to prevent double budget update
      }
    });

    await journalEntry.save();

    // =====================================================
    // FIX #1: Update Budget Utilization for Vendor Payments
    // =====================================================
    // Calculate Pakistan fiscal year (July-June)
    const paymentMonth = new Date(batch.paymentDate).getMonth();
    const paymentYear = new Date(batch.paymentDate).getFullYear();
    const fiscalYearStr = paymentMonth >= 6 
      ? `${paymentYear}-${paymentYear + 1}` 
      : `${paymentYear - 1}-${paymentYear}`;

    // Update budget for each vendor payment
    for (const payment of batch.payments) {
      if (payment.vendor && payment.grossAmount > 0) {
        const vendor = await Vendor.findById(payment.vendor);
        if (vendor?.expenseAccount) {
          // Get the expense account
          const expenseAccount = await ChartOfAccount.findById(vendor.expenseAccount);
          if (expenseAccount?.accountType === 'expense') {
            // Update budget utilization
            const budgetUpdate = await Budget.findOneAndUpdate(
              {
                company: req.user.company,
                fiscalYear: fiscalYearStr,
                status: { $in: ['approved', 'active'] },
                'lines.headOfAccount': vendor.expenseAccount,
                ...(vendor.costCenter && { 'lines.costCenter': vendor.costCenter })
              },
              {
                $inc: { 
                  'lines.$.utilized': payment.grossAmount,
                  totalUtilized: payment.grossAmount
                }
              }
            );

            if (budgetUpdate) {
              logger.info('Budget utilized for payment', {
                vendor: vendor.name,
                amount: payment.grossAmount,
                fiscalYear: fiscalYearStr
              });
            }
          }
        }
        
        // FIX ISSUE #10: Update vendor balance (reduce payable)
        await Vendor.findByIdAndUpdate(payment.vendor, {
          $inc: {
            currentBalance: -payment.netAmount,  // Reduce payable balance
            totalPayments: payment.netAmount,
            totalWhtDeducted: payment.whtAmount || 0
          },
          $set: { lastTransactionDate: new Date() }
        });
      }
    }

    // Update batch
    batch.status = 'approved';
    batch.journalEntry = journalEntry._id;
    batch.approvedBy = req.user._id;
    batch.approvedAt = new Date();
    await batch.save();

    logger.info('Payment batch approved', {
      batchNumber: batch.batchNumber,
      journalEntry: entryNumber,
      userId: req.user._id
    });

    res.json({
      success: true,
      data: batch,
      journalEntry: entryNumber,
      message: 'Payment batch approved and journal entry created'
    });
  } catch (error) {
    logger.error('Error approving payment batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/bank-payments/:id/download
 * Download RAAST/bank payment file
 */
router.get('/:id/download', authorize('admin', 'finance', 'accountant'), async (req, res) => {
  try {
    const { format = 'raast' } = req.query;

    const batch = await BankPaymentBatch.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: { $in: ['approved', 'processing', 'completed'] }
    })
      .populate('bankAccount')
      .populate('payments.vendor', 'vendorCode name bankDetails')
      .populate('payments.employee', 'firstName lastName employeeId bankDetails');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Approved payment batch not found'
      });
    }

    let fileContent = '';
    let fileName = '';
    let contentType = 'text/plain';

    if (format === 'raast') {
      // RAAST format (simplified)
      fileName = `RAAST_${batch.batchNumber}.txt`;
      
      const header = [
        'H', // Header record
        batch.batchNumber,
        batch.paymentDate.toISOString().split('T')[0].replace(/-/g, ''),
        batch.paymentCount.toString().padStart(6, '0'),
        batch.totalNetAmount.toFixed(2).replace('.', '').padStart(15, '0'),
        batch.bankAccount.bankDetails?.accountNumber || '',
        'PKR'
      ].join('|');

      const details = batch.payments.map((payment, index) => {
        return [
          'D', // Detail record
          (index + 1).toString().padStart(6, '0'),
          payment.beneficiaryIBAN || payment.beneficiaryAccount || '',
          payment.beneficiaryName?.substring(0, 50) || '',
          payment.netAmount.toFixed(2).replace('.', '').padStart(15, '0'),
          payment.reference || batch.batchNumber,
          payment.description?.substring(0, 100) || 'Payment'
        ].join('|');
      });

      const trailer = [
        'T', // Trailer record
        batch.paymentCount.toString().padStart(6, '0'),
        batch.totalNetAmount.toFixed(2).replace('.', '').padStart(15, '0')
      ].join('|');

      fileContent = [header, ...details, trailer].join('\n');
    } else if (format === 'csv') {
      // CSV format
      fileName = `Payments_${batch.batchNumber}.csv`;
      contentType = 'text/csv';

      const headers = [
        'Sr#', 'Beneficiary Name', 'Bank', 'Account/IBAN',
        'Gross Amount', 'WHT', 'Net Amount', 'Reference', 'Description'
      ];

      const rows = batch.payments.map((payment, index) => [
        index + 1,
        payment.beneficiaryName,
        payment.beneficiaryBank,
        payment.beneficiaryIBAN || payment.beneficiaryAccount,
        payment.grossAmount,
        payment.whtAmount,
        payment.netAmount,
        payment.reference || '',
        payment.description || ''
      ]);

      fileContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
    }

    // Update batch status if first download
    if (batch.status === 'approved') {
      batch.status = 'processing';
      batch.fileGeneratedAt = new Date();
      await batch.save();
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileContent);

    logger.info('Payment file downloaded', {
      batchNumber: batch.batchNumber,
      format,
      userId: req.user._id
    });
  } catch (error) {
    logger.error('Error downloading payment file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/bank-payments/:id/complete
 * Mark payment batch as completed
 */
router.post('/:id/complete', authorize('admin', 'finance'), async (req, res) => {
  try {
    const { bankReference, completedPayments } = req.body;

    const batch = await BankPaymentBatch.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: { $in: ['approved', 'processing'] }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Payment batch not found or already completed'
      });
    }

    // Update individual payment statuses if provided
    if (completedPayments && Array.isArray(completedPayments)) {
      for (const cp of completedPayments) {
        const paymentIndex = batch.payments.findIndex(
          p => p._id.toString() === cp.paymentId
        );
        if (paymentIndex >= 0) {
          batch.payments[paymentIndex].status = cp.status || 'completed';
          batch.payments[paymentIndex].bankReference = cp.bankReference;
          batch.payments[paymentIndex].processedAt = new Date();
        }
      }
    } else {
      // Mark all as completed
      batch.payments.forEach(payment => {
        payment.status = 'completed';
        payment.processedAt = new Date();
      });
    }

    batch.status = 'completed';
    batch.bankReference = bankReference;
    batch.completedAt = new Date();
    await batch.save();

    logger.info('Payment batch completed', {
      batchNumber: batch.batchNumber,
      userId: req.user._id
    });

    res.json({
      success: true,
      data: batch,
      message: 'Payment batch marked as completed'
    });
  } catch (error) {
    logger.error('Error completing payment batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/bank-payments/:id
 * Delete draft payment batch
 */
router.delete('/:id', authorize('admin', 'finance'), async (req, res) => {
  try {
    const batch = await BankPaymentBatch.findOne({
      _id: req.params.id,
      company: req.user.company,
      status: 'draft'
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Draft payment batch not found'
      });
    }

    await batch.deleteOne();

    logger.info('Payment batch deleted', {
      batchNumber: batch.batchNumber,
      userId: req.user._id
    });

    res.json({ success: true, message: 'Payment batch deleted successfully' });
  } catch (error) {
    logger.error('Error deleting payment batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
