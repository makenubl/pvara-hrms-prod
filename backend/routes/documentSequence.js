import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// ============================================================================
// DOCUMENT SEQUENCE MODULE - CA/CFO CRITICAL (Issue #19)
// Provides gap-free sequential numbering for financial documents
// NAM/IFRS Compliance: Audit-trail ready document numbering
// ============================================================================

// DocumentSequence Schema
const documentSequenceSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Document Type
  documentType: {
    type: String,
    enum: [
      'JOURNAL_VOUCHER', 'JV',
      'BANK_PAYMENT_VOUCHER', 'BPV',
      'BANK_RECEIPT_VOUCHER', 'BRV',
      'CASH_PAYMENT_VOUCHER', 'CPV',
      'CASH_RECEIPT_VOUCHER', 'CRV',
      'PURCHASE_ORDER', 'PO',
      'GOODS_RECEIVED_NOTE', 'GRN',
      'SALES_INVOICE', 'SI',
      'PURCHASE_INVOICE', 'PI',
      'DEBIT_NOTE', 'DN',
      'CREDIT_NOTE', 'CN',
      'EMPLOYEE_ID', 'EMP',
      'PAYSLIP', 'PS',
      'ASSET_TAG', 'FA'
    ],
    required: true,
    index: true
  },
  
  // Prefix Configuration
  prefix: {
    type: String,
    default: ''
  },
  
  // Suffix (optional, e.g., location code)
  suffix: {
    type: String,
    default: ''
  },
  
  // Fiscal Year Format
  fiscalYear: {
    type: String,
    validate: {
      validator: v => !v || /^\d{4}-\d{4}$/.test(v),
      message: 'Fiscal year must be in YYYY-YYYY format'
    }
  },
  
  // Include fiscal year in number?
  includeFiscalYear: {
    type: Boolean,
    default: true
  },
  
  // Fiscal year format in number
  fiscalYearFormat: {
    type: String,
    enum: ['FULL', 'SHORT', 'END_YEAR_ONLY'], // 2024-2025, 24-25, 25
    default: 'SHORT'
  },
  
  // Current Counter
  currentNumber: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Number Padding (e.g., 4 = 0001, 5 = 00001)
  paddingLength: {
    type: Number,
    default: 4,
    min: 1,
    max: 10
  },
  
  // Separator
  separator: {
    type: String,
    default: '-',
    maxlength: 3
  },
  
  // Reset Counter on New Fiscal Year
  resetOnFiscalYear: {
    type: Boolean,
    default: true
  },
  
  // Last reset date
  lastResetDate: {
    type: Date
  },
  
  // Starting Number
  startingNumber: {
    type: Number,
    default: 1
  },
  
  // Is Active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Allocated Numbers (for reservations)
  allocatedNumbers: [{
    number: Number,
    allocatedAt: Date,
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt: Date,
    documentId: { type: mongoose.Schema.Types.ObjectId },
    status: { type: String, enum: ['ALLOCATED', 'USED', 'VOIDED'], default: 'ALLOCATED' }
  }],
  
  // Used Numbers Log (for gap detection)
  usedNumbers: [{
    number: Number,
    generatedNumber: String, // Full formatted number
    usedAt: Date,
    documentId: { type: mongoose.Schema.Types.ObjectId }
  }],
  
  // Example format preview
  exampleFormat: {
    type: String
  }
  
}, { timestamps: true });

documentSequenceSchema.index({ company: 1, documentType: 1, fiscalYear: 1 }, { unique: true });

// Pre-save: Generate example format
documentSequenceSchema.pre('save', function(next) {
  this.generateExampleFormat();
  next();
});

documentSequenceSchema.methods.generateExampleFormat = function() {
  const parts = [];
  
  if (this.prefix) parts.push(this.prefix);
  
  if (this.includeFiscalYear && this.fiscalYear) {
    const [start, end] = this.fiscalYear.split('-');
    switch (this.fiscalYearFormat) {
      case 'FULL':
        parts.push(`${start}-${end}`);
        break;
      case 'SHORT':
        parts.push(`${start.slice(-2)}-${end.slice(-2)}`);
        break;
      case 'END_YEAR_ONLY':
        parts.push(end.slice(-2));
        break;
    }
  }
  
  const paddedNumber = String(this.currentNumber + 1).padStart(this.paddingLength, '0');
  parts.push(paddedNumber);
  
  if (this.suffix) parts.push(this.suffix);
  
  this.exampleFormat = parts.join(this.separator);
};

const DocumentSequence = mongoose.model('DocumentSequence', documentSequenceSchema);

// ============================================================================
// GET / - Get All Sequences
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { documentType, fiscalYear } = req.query;
    
    const query = { company: req.user.company };
    if (documentType) query.documentType = documentType;
    if (fiscalYear) query.fiscalYear = fiscalYear;
    
    const sequences = await DocumentSequence.find(query)
      .sort({ documentType: 1, fiscalYear: -1 })
      .lean();
    
    res.json({ success: true, data: sequences });
    
  } catch (error) {
    console.error('Get sequences error:', error);
    res.status(500).json({ message: 'Error fetching sequences', error: error.message });
  }
});

// ============================================================================
// POST / - Create New Sequence
// ============================================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      documentType, prefix, suffix, fiscalYear,
      includeFiscalYear, fiscalYearFormat, paddingLength,
      separator, resetOnFiscalYear, startingNumber
    } = req.body;
    
    if (!documentType) {
      return res.status(400).json({ message: 'Document type required' });
    }
    
    // Check for existing sequence
    const existing = await DocumentSequence.findOne({
      company: req.user.company,
      documentType,
      fiscalYear: fiscalYear || null
    });
    
    if (existing) {
      return res.status(400).json({ 
        message: 'Sequence already exists for this document type and fiscal year' 
      });
    }
    
    const sequence = new DocumentSequence({
      company: req.user.company,
      documentType,
      prefix: prefix || documentType.split('_')[0],
      suffix,
      fiscalYear,
      includeFiscalYear: includeFiscalYear !== false,
      fiscalYearFormat: fiscalYearFormat || 'SHORT',
      paddingLength: paddingLength || 4,
      separator: separator || '-',
      resetOnFiscalYear: resetOnFiscalYear !== false,
      startingNumber: startingNumber || 1,
      currentNumber: (startingNumber || 1) - 1
    });
    
    await sequence.save();
    
    res.status(201).json({
      success: true,
      message: 'Sequence created',
      data: sequence
    });
    
  } catch (error) {
    console.error('Create sequence error:', error);
    res.status(500).json({ message: 'Error creating sequence', error: error.message });
  }
});

// ============================================================================
// POST /next - Get Next Number (Atomic Operation)
// ============================================================================
router.post('/next', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { documentType, fiscalYear, documentId } = req.body;
    
    if (!documentType) {
      return res.status(400).json({ message: 'Document type required' });
    }
    
    // Determine fiscal year if not provided
    let targetFiscalYear = fiscalYear;
    if (!targetFiscalYear) {
      const now = new Date();
      const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      targetFiscalYear = `${startYear}-${startYear + 1}`;
    }
    
    // Find and increment atomically
    let sequence = await DocumentSequence.findOneAndUpdate(
      {
        company: req.user.company,
        documentType,
        fiscalYear: targetFiscalYear
      },
      { $inc: { currentNumber: 1 } },
      { new: true, session }
    );
    
    // If sequence doesn't exist, create it
    if (!sequence) {
      sequence = new DocumentSequence({
        company: req.user.company,
        documentType,
        prefix: documentType.split('_')[0],
        fiscalYear: targetFiscalYear,
        currentNumber: 1,
        startingNumber: 1
      });
      await sequence.save({ session });
    }
    
    // Build the formatted number
    const parts = [];
    
    if (sequence.prefix) parts.push(sequence.prefix);
    
    if (sequence.includeFiscalYear && sequence.fiscalYear) {
      const [start, end] = sequence.fiscalYear.split('-');
      switch (sequence.fiscalYearFormat) {
        case 'FULL':
          parts.push(`${start}-${end}`);
          break;
        case 'SHORT':
          parts.push(`${start.slice(-2)}-${end.slice(-2)}`);
          break;
        case 'END_YEAR_ONLY':
          parts.push(end.slice(-2));
          break;
      }
    }
    
    const paddedNumber = String(sequence.currentNumber).padStart(sequence.paddingLength, '0');
    parts.push(paddedNumber);
    
    if (sequence.suffix) parts.push(sequence.suffix);
    
    const generatedNumber = parts.join(sequence.separator);
    
    // Log the usage
    await DocumentSequence.updateOne(
      { _id: sequence._id },
      {
        $push: {
          usedNumbers: {
            number: sequence.currentNumber,
            generatedNumber,
            usedAt: new Date(),
            documentId
          }
        }
      },
      { session }
    );
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      data: {
        number: sequence.currentNumber,
        formattedNumber: generatedNumber,
        fiscalYear: targetFiscalYear
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Get next number error:', error);
    res.status(500).json({ message: 'Error generating number', error: error.message });
  } finally {
    session.endSession();
  }
});

// ============================================================================
// POST /allocate - Pre-allocate Numbers (Reserve for batch operations)
// ============================================================================
router.post('/allocate', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { documentType, fiscalYear, count = 1 } = req.body;
    
    if (count > 100) {
      return res.status(400).json({ message: 'Maximum 100 numbers can be allocated at once' });
    }
    
    // Determine fiscal year
    let targetFiscalYear = fiscalYear;
    if (!targetFiscalYear) {
      const now = new Date();
      const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      targetFiscalYear = `${startYear}-${startYear + 1}`;
    }
    
    const sequence = await DocumentSequence.findOneAndUpdate(
      {
        company: req.user.company,
        documentType,
        fiscalYear: targetFiscalYear
      },
      { $inc: { currentNumber: count } },
      { new: true, session }
    );
    
    if (!sequence) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Sequence not found' });
    }
    
    const allocatedNumbers = [];
    const startNum = sequence.currentNumber - count + 1;
    
    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      allocatedNumbers.push({
        number: num,
        allocatedAt: new Date(),
        allocatedBy: req.user._id,
        status: 'ALLOCATED'
      });
    }
    
    await DocumentSequence.updateOne(
      { _id: sequence._id },
      { $push: { allocatedNumbers: { $each: allocatedNumbers } } },
      { session }
    );
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: `Allocated ${count} numbers`,
      data: {
        startNumber: startNum,
        endNumber: sequence.currentNumber,
        count,
        numbers: allocatedNumbers.map(a => a.number)
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Allocate numbers error:', error);
    res.status(500).json({ message: 'Error allocating numbers', error: error.message });
  } finally {
    session.endSession();
  }
});

// ============================================================================
// GET /gaps - Detect Gaps in Sequence
// ============================================================================
router.get('/gaps/:documentType', authenticate, async (req, res) => {
  try {
    const { documentType } = req.params;
    const { fiscalYear } = req.query;
    
    const sequence = await DocumentSequence.findOne({
      company: req.user.company,
      documentType,
      fiscalYear
    }).lean();
    
    if (!sequence) {
      return res.status(404).json({ message: 'Sequence not found' });
    }
    
    const usedNumbers = new Set(sequence.usedNumbers.map(u => u.number));
    const allocatedNumbers = new Set(
      sequence.allocatedNumbers.filter(a => a.status !== 'VOIDED').map(a => a.number)
    );
    
    const gaps = [];
    for (let i = sequence.startingNumber; i <= sequence.currentNumber; i++) {
      if (!usedNumbers.has(i) && !allocatedNumbers.has(i)) {
        gaps.push(i);
      }
    }
    
    res.json({
      success: true,
      data: {
        documentType,
        fiscalYear: sequence.fiscalYear,
        startingNumber: sequence.startingNumber,
        currentNumber: sequence.currentNumber,
        totalIssued: sequence.currentNumber - sequence.startingNumber + 1,
        usedCount: usedNumbers.size,
        allocatedCount: allocatedNumbers.size,
        gapsCount: gaps.length,
        gaps,
        hasGaps: gaps.length > 0
      }
    });
    
  } catch (error) {
    console.error('Detect gaps error:', error);
    res.status(500).json({ message: 'Error detecting gaps', error: error.message });
  }
});

// ============================================================================
// POST /void - Void an Allocated/Used Number
// ============================================================================
router.post('/void', authenticate, async (req, res) => {
  try {
    const { documentType, fiscalYear, number, reason } = req.body;
    
    if (!reason || reason.length < 10) {
      return res.status(400).json({ message: 'Detailed reason required (min 10 chars)' });
    }
    
    const sequence = await DocumentSequence.findOne({
      company: req.user.company,
      documentType,
      fiscalYear
    });
    
    if (!sequence) {
      return res.status(404).json({ message: 'Sequence not found' });
    }
    
    // Find and void the allocated number
    const allocIndex = sequence.allocatedNumbers.findIndex(a => a.number === number);
    if (allocIndex >= 0) {
      sequence.allocatedNumbers[allocIndex].status = 'VOIDED';
      sequence.allocatedNumbers[allocIndex].voidReason = reason;
      sequence.allocatedNumbers[allocIndex].voidedAt = new Date();
      sequence.allocatedNumbers[allocIndex].voidedBy = req.user._id;
    }
    
    await sequence.save();
    
    res.json({
      success: true,
      message: `Number ${number} voided`,
      data: { number, reason }
    });
    
  } catch (error) {
    console.error('Void number error:', error);
    res.status(500).json({ message: 'Error voiding number', error: error.message });
  }
});

// ============================================================================
// PUT /:id - Update Sequence Configuration
// ============================================================================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { prefix, suffix, paddingLength, separator } = req.body;
    
    // Only allow non-destructive updates
    const updates = {};
    if (prefix !== undefined) updates.prefix = prefix;
    if (suffix !== undefined) updates.suffix = suffix;
    if (paddingLength !== undefined) updates.paddingLength = paddingLength;
    if (separator !== undefined) updates.separator = separator;
    
    const sequence = await DocumentSequence.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      updates,
      { new: true }
    );
    
    if (!sequence) {
      return res.status(404).json({ message: 'Sequence not found' });
    }
    
    res.json({
      success: true,
      message: 'Sequence updated',
      data: sequence
    });
    
  } catch (error) {
    console.error('Update sequence error:', error);
    res.status(500).json({ message: 'Error updating sequence', error: error.message });
  }
});

// ============================================================================
// POST /reset - Reset Sequence for New Fiscal Year
// ============================================================================
router.post('/reset', authenticate, async (req, res) => {
  try {
    const { documentType, oldFiscalYear, newFiscalYear } = req.body;
    
    // Only CFO/Admin can reset
    if (!['admin', 'cfo', 'controller'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    // Get old sequence
    const oldSequence = await DocumentSequence.findOne({
      company: req.user.company,
      documentType,
      fiscalYear: oldFiscalYear
    });
    
    if (!oldSequence) {
      return res.status(404).json({ message: 'Old sequence not found' });
    }
    
    // Create new sequence for new fiscal year
    const newSequence = new DocumentSequence({
      company: req.user.company,
      documentType,
      prefix: oldSequence.prefix,
      suffix: oldSequence.suffix,
      fiscalYear: newFiscalYear,
      includeFiscalYear: oldSequence.includeFiscalYear,
      fiscalYearFormat: oldSequence.fiscalYearFormat,
      paddingLength: oldSequence.paddingLength,
      separator: oldSequence.separator,
      resetOnFiscalYear: oldSequence.resetOnFiscalYear,
      startingNumber: oldSequence.startingNumber,
      currentNumber: oldSequence.startingNumber - 1,
      lastResetDate: new Date()
    });
    
    await newSequence.save();
    
    res.json({
      success: true,
      message: `Sequence reset for fiscal year ${newFiscalYear}`,
      data: {
        oldSequence: { fiscalYear: oldFiscalYear, lastNumber: oldSequence.currentNumber },
        newSequence: { fiscalYear: newFiscalYear, startingNumber: newSequence.startingNumber }
      }
    });
    
  } catch (error) {
    console.error('Reset sequence error:', error);
    res.status(500).json({ message: 'Error resetting sequence', error: error.message });
  }
});

// ============================================================================
// UTILITY: Get Next Number Helper (Exported for use in other routes)
// ============================================================================
export const getNextDocumentNumber = async (company, documentType, fiscalYear = null, documentId = null) => {
  // Determine fiscal year if not provided
  let targetFiscalYear = fiscalYear;
  if (!targetFiscalYear) {
    const now = new Date();
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    targetFiscalYear = `${startYear}-${startYear + 1}`;
  }
  
  // Atomic increment
  let sequence = await DocumentSequence.findOneAndUpdate(
    { company, documentType, fiscalYear: targetFiscalYear },
    { $inc: { currentNumber: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  
  // Build formatted number
  const parts = [];
  if (sequence.prefix) parts.push(sequence.prefix);
  
  if (sequence.includeFiscalYear && sequence.fiscalYear) {
    const [start, end] = sequence.fiscalYear.split('-');
    switch (sequence.fiscalYearFormat) {
      case 'FULL': parts.push(`${start}-${end}`); break;
      case 'SHORT': parts.push(`${start.slice(-2)}-${end.slice(-2)}`); break;
      case 'END_YEAR_ONLY': parts.push(end.slice(-2)); break;
    }
  }
  
  parts.push(String(sequence.currentNumber).padStart(sequence.paddingLength || 4, '0'));
  if (sequence.suffix) parts.push(sequence.suffix);
  
  const formattedNumber = parts.join(sequence.separator || '-');
  
  // Log usage
  if (documentId) {
    await DocumentSequence.updateOne(
      { _id: sequence._id },
      {
        $push: {
          usedNumbers: {
            number: sequence.currentNumber,
            generatedNumber: formattedNumber,
            usedAt: new Date(),
            documentId
          }
        }
      }
    );
  }
  
  return formattedNumber;
};

export { DocumentSequence };
export default router;
