import express from 'express';
import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Budget from '../models/Budget.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Purchase Order Routes
 * Implements encumbrance accounting with proper budget commitment
 */

// Generate PO Number
async function generatePONumber(companyId) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const fiscalYear = month >= 7 ? year : year - 1;
  
  const count = await PurchaseOrder.countDocuments({
    company: companyId,
    poNumber: { $regex: `^PO-${fiscalYear}` },
  });
  
  return `PO-${fiscalYear}-${String(count + 1).padStart(5, '0')}`;
}

// ================================
// GET Routes
// ================================

// Get all POs
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      vendor,
      fiscalYear,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { company: req.user.company };

    if (status) query.status = status;
    if (vendor) query.vendor = vendor;
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (fromDate || toDate) {
      query.poDate = {};
      if (fromDate) query.poDate.$gte = new Date(fromDate);
      if (toDate) query.poDate.$lte = new Date(toDate);
    }

    const total = await PurchaseOrder.countDocuments(query);
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('vendor', 'name vendorCode')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: purchaseOrders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get PO summary/dashboard
router.get('/summary', authenticate, async (req, res) => {
  try {
    const companyId = req.user.company;
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const fiscalYear = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

    const summary = await PurchaseOrder.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          fiscalYear: fiscalYear,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' },
        },
      },
    ]);

    // Calculate totals
    const totals = {
      draft: { count: 0, value: 0 },
      pending_approval: { count: 0, value: 0 },
      approved: { count: 0, value: 0 },
      partially_received: { count: 0, value: 0 },
      received: { count: 0, value: 0 },
      invoiced: { count: 0, value: 0 },
      closed: { count: 0, value: 0 },
      cancelled: { count: 0, value: 0 },
    };

    summary.forEach((s) => {
      if (totals[s._id]) {
        totals[s._id] = {
          count: s.count,
          value: s.totalValue,
        };
      }
    });

    // Total committed (approved but not invoiced)
    const committedValue =
      totals.approved.value +
      totals.partially_received.value +
      totals.received.value;

    res.json({
      success: true,
      data: {
        fiscalYear,
        byStatus: totals,
        totalPOs: Object.values(totals).reduce((sum, t) => sum + t.count, 0),
        totalValue: Object.values(totals).reduce((sum, t) => sum + t.value, 0),
        committedValue,
        pendingApprovalCount: totals.pending_approval.count,
        pendingApprovalValue: totals.pending_approval.value,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check budget availability for PO lines
router.post('/check-budget', authenticate, async (req, res) => {
  try {
    const { lines, fiscalYear } = req.body;
    const companyId = req.user.company;

    const results = [];

    for (const line of lines) {
      // Find budget for this head of account
      const budget = await Budget.findOne({
        company: companyId,
        fiscalYear: fiscalYear,
        status: { $in: ['approved', 'active'] },
        'lines.headOfAccount': line.headOfAccount,
        ...(line.costCenter && { 'lines.costCenter': line.costCenter }),
      });

      if (!budget) {
        results.push({
          headOfAccount: line.headOfAccount,
          available: false,
          reason: 'No approved budget found',
        });
        continue;
      }

      // Find the matching line
      const budgetLine = budget.lines.find(
        (bl) =>
          bl.headOfAccount.toString() === line.headOfAccount.toString() &&
          (!line.costCenter ||
            bl.costCenter?.toString() === line.costCenter.toString())
      );

      if (!budgetLine) {
        results.push({
          headOfAccount: line.headOfAccount,
          available: false,
          reason: 'Budget line not found',
        });
        continue;
      }

      const budgetAmount = budgetLine.totalBudget || budgetLine.originalBudget || 0;
      const available =
        budgetAmount -
        (budgetLine.utilized || 0) -
        (budgetLine.committed || 0);

      const lineTotal = line.quantity * line.unitPrice + (line.taxAmount || 0);

      results.push({
        headOfAccount: line.headOfAccount,
        costCenter: line.costCenter,
        requestedAmount: lineTotal,
        allocated: budgetAmount,
        utilized: budgetLine.utilized || 0,
        committed: budgetLine.committed || 0,
        available,
        sufficient: available >= lineTotal,
      });
    }

    const allSufficient = results.every((r) => r.sufficient !== false);

    res.json({
      success: true,
      data: {
        canProceed: allSufficient,
        details: results,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single PO
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid PO ID' });
    }

    const po = await PurchaseOrder.findById(req.params.id)
      .populate('vendor')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('lines.headOfAccount', 'code name')
      .populate('lines.costCenter', 'code name');

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    res.json({ success: true, data: po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================================
// POST Routes
// ================================

// Create new PO
router.post('/', authenticate, async (req, res) => {
  try {
    const poNumber = await generatePONumber(req.user.company);

    const po = new PurchaseOrder({
      ...req.body,
      company: req.user.company,
      poNumber,
      createdBy: req.user._id,
      status: 'draft',
    });

    await po.save();

    res.status(201).json({ success: true, data: po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit for approval
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (po.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft POs can be submitted for approval',
      });
    }

    po.status = 'pending_approval';
    await po.save();

    res.json({
      success: true,
      message: 'PO submitted for approval',
      data: po,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve PO - THIS IS WHERE BUDGET COMMITMENT HAPPENS
router.post('/:id/approve', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (po.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Only pending POs can be approved',
      });
    }

    // **CRITICAL: Commit budget when PO is approved**
    try {
      await po.commitBudget();
    } catch (budgetError) {
      return res.status(400).json({
        success: false,
        message: `Budget commitment failed: ${budgetError.message}`,
      });
    }

    po.status = 'approved';
    po.approvedBy = req.user._id;
    po.approvedAt = new Date();
    await po.save();

    res.json({
      success: true,
      message: 'PO approved and budget committed',
      data: po,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reject PO
router.post('/:id/reject', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (po.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Only pending POs can be rejected',
      });
    }

    po.status = 'draft';
    po.internalNotes = `${po.internalNotes || ''}\nRejected by ${
      req.user.name
    } on ${new Date().toISOString()}: ${req.body.reason || 'No reason provided'}`;
    await po.save();

    res.json({
      success: true,
      message: 'PO rejected and returned to draft',
      data: po,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel PO - RELEASES BUDGET COMMITMENT
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (['invoiced', 'closed', 'cancelled'].includes(po.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this PO',
      });
    }

    // **CRITICAL: Release budget commitment if it was committed**
    if (po.budgetCommitted) {
      await po.releaseBudgetCommitment();
    }

    po.status = 'cancelled';
    po.internalNotes = `${po.internalNotes || ''}\nCancelled by ${
      req.user.name
    } on ${new Date().toISOString()}: ${req.body.reason || 'No reason provided'}`;
    await po.save();

    res.json({
      success: true,
      message: 'PO cancelled and budget commitment released',
      data: po,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record goods receipt
router.post('/:id/receive', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (!['approved', 'partially_received'].includes(po.status)) {
      return res.status(400).json({
        success: false,
        message: 'PO is not in a receivable status',
      });
    }

    const { receivedItems } = req.body;

    // Update received quantities
    let allReceived = true;
    for (const item of receivedItems) {
      const line = po.lines.id(item.lineId);
      if (line) {
        line.quantityReceived = (line.quantityReceived || 0) + item.quantity;
        if (line.quantityReceived < line.quantity) {
          allReceived = false;
        }
      }
    }

    po.status = allReceived ? 'received' : 'partially_received';
    await po.save();

    res.json({
      success: true,
      message: `Goods received - PO ${allReceived ? 'fully' : 'partially'} received`,
      data: po,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record invoice - CONVERTS COMMITMENT TO UTILIZATION
router.post('/:id/invoice', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (!['approved', 'partially_received', 'received'].includes(po.status)) {
      return res.status(400).json({
        success: false,
        message: 'PO is not in an invoiceable status',
      });
    }

    const { invoiceAmount, invoiceNumber, invoiceId } = req.body;

    // **CRITICAL: Convert commitment to utilization**
    await po.convertToUtilization(invoiceAmount);

    po.invoices.push(invoiceId);
    po.status = 'invoiced';
    po.internalNotes = `${po.internalNotes || ''}\nInvoice ${invoiceNumber} recorded for PKR ${invoiceAmount.toLocaleString()}`;
    await po.save();

    res.json({
      success: true,
      message: 'Invoice recorded - budget commitment converted to utilization',
      data: po,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Close PO
router.post('/:id/close', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (po.status !== 'invoiced') {
      return res.status(400).json({
        success: false,
        message: 'Only invoiced POs can be closed',
      });
    }

    // Release any remaining commitment (e.g., if invoice was less than PO)
    if (po.budgetCommitted) {
      await po.releaseBudgetCommitment();
    }

    po.status = 'closed';
    await po.save();

    res.json({
      success: true,
      message: 'PO closed successfully',
      data: po,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================================
// PUT Routes
// ================================

// Update PO (only draft)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (po.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft POs can be edited',
      });
    }

    // Prevent changing critical fields
    const { company, poNumber, createdBy, ...updates } = req.body;

    Object.assign(po, updates);
    await po.save();

    res.json({ success: true, data: po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================================
// DELETE Routes
// ================================

// Delete PO (only draft)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }

    if (po.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft POs can be deleted',
      });
    }

    await po.deleteOne();

    res.json({
      success: true,
      message: 'PO deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
