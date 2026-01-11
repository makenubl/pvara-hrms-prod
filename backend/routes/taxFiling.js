import express from 'express';
import { authenticate } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// ============================================================================
// TAX FILING MODULE - CA/CFO CRITICAL (Issue #23)
// Pakistan FBR Tax Compliance: WHT, Sales Tax, Income Tax Returns
// ============================================================================

// TaxFiling Schema
const taxFilingSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Filing Type
  filingType: {
    type: String,
    enum: [
      'WHT_STATEMENT',      // Monthly WHT Statement
      'SALES_TAX_RETURN',   // Monthly Sales Tax Return
      'INCOME_TAX_RETURN',  // Annual Income Tax Return
      'ANNUAL_STATEMENT',   // Annual Statement u/s 165
      'WEALTH_STATEMENT'    // Wealth Statement u/s 116
    ],
    required: true,
    index: true
  },
  
  // Period
  fiscalYear: {
    type: String,
    required: true,
    validate: {
      validator: v => /^\d{4}-\d{4}$/.test(v),
      message: 'Fiscal year must be YYYY-YYYY format'
    }
  },
  
  month: { type: Number, min: 1, max: 12 }, // For monthly filings
  
  periodFrom: { type: Date, required: true },
  periodTo: { type: Date, required: true },
  
  // Due Date
  dueDate: { type: Date, required: true },
  
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'PREPARED', 'REVIEWED', 'SUBMITTED', 'ACKNOWLEDGED', 'AMENDED'],
    default: 'DRAFT',
    index: true
  },
  
  // FBR Submission Details
  fbrSubmission: {
    submissionDate: { type: Date },
    acknowledgementNumber: { type: String },
    cprNumber: { type: String }, // Computerized Payment Receipt
    challanNumber: { type: String },
    paymentDate: { type: Date },
    paymentAmount: { type: Number },
    paymentBank: { type: String }
  },
  
  // WHT Details (for WHT_STATEMENT)
  whtDetails: {
    section153Services: { type: Number, default: 0 },    // 153(1)(a)
    section153Supplies: { type: Number, default: 0 },    // 153(1)(b)
    section153Contracts: { type: Number, default: 0 },   // 153(1)(c)
    section233Rent: { type: Number, default: 0 },
    section234Salaries: { type: Number, default: 0 },
    section235Electricity: { type: Number, default: 0 },
    section236BankProfit: { type: Number, default: 0 },
    totalWhtDeducted: { type: Number, default: 0 },
    totalWhtDeposited: { type: Number, default: 0 },
    variance: { type: Number, default: 0 }
  },
  
  // Transaction Details (linked payments)
  transactions: [{
    transactionId: { type: mongoose.Schema.Types.ObjectId },
    transactionType: { type: String }, // BANK_PAYMENT, PAYROLL, etc.
    vendorName: { type: String },
    vendorNtn: { type: String },
    vendorCnic: { type: String },
    grossAmount: { type: Number },
    whtRate: { type: Number },
    whtAmount: { type: Number },
    whtSection: { type: String },
    paymentDate: { type: Date }
  }],
  
  // Sales Tax Details
  salesTaxDetails: {
    outputTax: { type: Number, default: 0 },
    inputTax: { type: Number, default: 0 },
    netTaxPayable: { type: Number, default: 0 },
    carryForward: { type: Number, default: 0 }
  },
  
  // Totals
  totalTaxableAmount: { type: Number, default: 0 },
  totalTaxDeducted: { type: Number, default: 0 },
  totalTaxPayable: { type: Number, default: 0 },
  
  // Workflow
  preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  preparedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedAt: { type: Date },
  
  // Attachments
  attachments: [{
    name: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  
  notes: { type: String }
  
}, { timestamps: true });

taxFilingSchema.index({ company: 1, filingType: 1, fiscalYear: 1, month: 1 });

const TaxFiling = mongoose.model('TaxFiling', taxFilingSchema);

// ============================================================================
// GET / - List Tax Filings
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { filingType, fiscalYear, status } = req.query;
    
    const query = { company: req.user.company };
    if (filingType) query.filingType = filingType;
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (status) query.status = status;
    
    const filings = await TaxFiling.find(query)
      .sort({ periodTo: -1 })
      .populate('preparedBy reviewedBy submittedBy', 'firstName lastName')
      .lean();
    
    res.json({ success: true, data: filings });
    
  } catch (error) {
    console.error('Get filings error:', error);
    res.status(500).json({ message: 'Error fetching filings', error: error.message });
  }
});

// ============================================================================
// POST /generate-wht - Generate WHT Statement
// ============================================================================
router.post('/generate-wht', authenticate, async (req, res) => {
  try {
    const { fiscalYear, month, year } = req.body;
    
    if (!fiscalYear || !month || !year) {
      return res.status(400).json({ message: 'Fiscal year, month, and year required' });
    }
    
    // Calculate period dates
    const periodFrom = new Date(year, month - 1, 1);
    const periodTo = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Due date: 15th of following month
    const dueDate = new Date(year, month, 15);
    
    // Get all bank payments with WHT for this period
    const BankPayment = mongoose.model('BankPayment');
    
    const payments = await BankPayment.find({
      company: req.user.company,
      status: 'Approved',
      paymentDate: { $gte: periodFrom, $lte: periodTo },
      whtAmount: { $gt: 0 }
    })
      .populate('vendor', 'name ntn cnic')
      .lean();
    
    // Group by WHT section
    const whtDetails = {
      section153Services: 0,
      section153Supplies: 0,
      section153Contracts: 0,
      section233Rent: 0,
      section234Salaries: 0,
      section235Electricity: 0,
      section236BankProfit: 0,
      totalWhtDeducted: 0
    };
    
    const transactions = [];
    
    for (const payment of payments) {
      const section = payment.whtSection || '153(1)(b)';
      
      // Map section to field
      if (section.includes('153(1)(a)') || section.includes('services')) {
        whtDetails.section153Services += payment.whtAmount;
      } else if (section.includes('153(1)(b)') || section.includes('supplies')) {
        whtDetails.section153Supplies += payment.whtAmount;
      } else if (section.includes('153(1)(c)') || section.includes('contracts')) {
        whtDetails.section153Contracts += payment.whtAmount;
      } else if (section.includes('233') || section.includes('rent')) {
        whtDetails.section233Rent += payment.whtAmount;
      }
      
      whtDetails.totalWhtDeducted += payment.whtAmount;
      
      transactions.push({
        transactionId: payment._id,
        transactionType: 'BANK_PAYMENT',
        vendorName: payment.vendor?.name || payment.payeeName,
        vendorNtn: payment.vendor?.ntn,
        vendorCnic: payment.vendor?.cnic,
        grossAmount: payment.grossAmount,
        whtRate: payment.whtRate,
        whtAmount: payment.whtAmount,
        whtSection: section,
        paymentDate: payment.paymentDate
      });
    }
    
    // Get salary WHT from payrolls
    const Payroll = mongoose.model('Payroll');
    
    const payrolls = await Payroll.find({
      company: req.user.company,
      status: { $in: ['Approved', 'Paid', 'Processed'] },
      processedDate: { $gte: periodFrom, $lte: periodTo }
    }).lean();
    
    for (const payroll of payrolls) {
      const incomeTax = payroll.deductions?.incomeTax || 0;
      if (incomeTax > 0) {
        whtDetails.section234Salaries += incomeTax;
        whtDetails.totalWhtDeducted += incomeTax;
        
        transactions.push({
          transactionId: payroll._id,
          transactionType: 'PAYROLL',
          vendorName: `Salary - ${payroll.month}`,
          grossAmount: payroll.totalAmount,
          whtRate: 0,
          whtAmount: incomeTax,
          whtSection: '234 Salaries',
          paymentDate: payroll.processedDate
        });
      }
    }
    
    // Check for existing filing
    let filing = await TaxFiling.findOne({
      company: req.user.company,
      filingType: 'WHT_STATEMENT',
      fiscalYear,
      month
    });
    
    if (filing) {
      // Update existing
      filing.whtDetails = whtDetails;
      filing.transactions = transactions;
      filing.totalTaxDeducted = whtDetails.totalWhtDeducted;
      filing.totalTaxPayable = whtDetails.totalWhtDeducted;
      filing.status = 'PREPARED';
      filing.preparedBy = req.user._id;
      filing.preparedAt = new Date();
    } else {
      // Create new
      filing = new TaxFiling({
        company: req.user.company,
        filingType: 'WHT_STATEMENT',
        fiscalYear,
        month,
        periodFrom,
        periodTo,
        dueDate,
        status: 'PREPARED',
        whtDetails,
        transactions,
        totalTaxDeducted: whtDetails.totalWhtDeducted,
        totalTaxPayable: whtDetails.totalWhtDeducted,
        preparedBy: req.user._id,
        preparedAt: new Date()
      });
    }
    
    await filing.save();
    
    res.json({
      success: true,
      message: 'WHT statement generated',
      data: filing
    });
    
  } catch (error) {
    console.error('Generate WHT error:', error);
    res.status(500).json({ message: 'Error generating WHT statement', error: error.message });
  }
});

// ============================================================================
// GET /:id - Get Filing Details
// ============================================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const filing = await TaxFiling.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('preparedBy reviewedBy submittedBy', 'firstName lastName email')
      .lean();
    
    if (!filing) {
      return res.status(404).json({ message: 'Filing not found' });
    }
    
    res.json({ success: true, data: filing });
    
  } catch (error) {
    console.error('Get filing error:', error);
    res.status(500).json({ message: 'Error fetching filing', error: error.message });
  }
});

// ============================================================================
// POST /:id/review - Mark Filing as Reviewed
// ============================================================================
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const filing = await TaxFiling.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    
    if (!filing) {
      return res.status(404).json({ message: 'Filing not found' });
    }
    
    if (filing.status !== 'PREPARED') {
      return res.status(400).json({ message: 'Filing must be in PREPARED status' });
    }
    
    filing.status = 'REVIEWED';
    filing.reviewedBy = req.user._id;
    filing.reviewedAt = new Date();
    
    await filing.save();
    
    res.json({
      success: true,
      message: 'Filing reviewed',
      data: filing
    });
    
  } catch (error) {
    console.error('Review filing error:', error);
    res.status(500).json({ message: 'Error reviewing filing', error: error.message });
  }
});

// ============================================================================
// POST /:id/submit - Mark Filing as Submitted to FBR
// ============================================================================
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { acknowledgementNumber, cprNumber, challanNumber, paymentDate, paymentAmount, paymentBank } = req.body;
    
    const filing = await TaxFiling.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    
    if (!filing) {
      return res.status(404).json({ message: 'Filing not found' });
    }
    
    if (filing.status !== 'REVIEWED') {
      return res.status(400).json({ message: 'Filing must be reviewed before submission' });
    }
    
    filing.status = 'SUBMITTED';
    filing.submittedBy = req.user._id;
    filing.submittedAt = new Date();
    filing.fbrSubmission = {
      submissionDate: new Date(),
      acknowledgementNumber,
      cprNumber,
      challanNumber,
      paymentDate: paymentDate ? new Date(paymentDate) : null,
      paymentAmount,
      paymentBank
    };
    
    await filing.save();
    
    // Create journal entry for WHT deposit if payment info provided
    if (paymentAmount && paymentDate) {
      const JournalEntry = mongoose.model('JournalEntry');
      const ChartOfAccount = mongoose.model('ChartOfAccount');
      
      // Find WHT payable and Bank accounts
      const whtPayable = await ChartOfAccount.findOne({
        company: req.user.company,
        accountCode: { $regex: /^23/ } // WHT Payable
      });
      
      const bankAccount = await ChartOfAccount.findOne({
        company: req.user.company,
        accountType: 'asset',
        accountName: { $regex: new RegExp(paymentBank || 'bank', 'i') }
      });
      
      if (whtPayable && bankAccount) {
        const entry = new JournalEntry({
          company: req.user.company,
          entryNumber: `WHT-DEP-${filing.fiscalYear}-${filing.month}`,
          entryDate: new Date(paymentDate),
          description: `WHT deposit for ${filing.fiscalYear} - Month ${filing.month}`,
          reference: challanNumber || cprNumber,
          lines: [
            {
              account: whtPayable._id,
              debit: paymentAmount,
              credit: 0,
              description: 'WHT Payable - Deposit'
            },
            {
              account: bankAccount._id,
              debit: 0,
              credit: paymentAmount,
              description: `Bank - WHT Challan ${challanNumber || ''}`
            }
          ],
          status: 'posted',
          postedBy: req.user._id,
          postedAt: new Date(),
          skipBudgetUpdate: true
        });
        
        await entry.save();
        filing.fbrSubmission.journalEntryId = entry._id;
        await filing.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Filing submitted to FBR',
      data: filing
    });
    
  } catch (error) {
    console.error('Submit filing error:', error);
    res.status(500).json({ message: 'Error submitting filing', error: error.message });
  }
});

// ============================================================================
// GET /reports/wht-summary - WHT Summary Report
// ============================================================================
router.get('/reports/wht-summary', authenticate, async (req, res) => {
  try {
    const { fiscalYear } = req.query;
    
    if (!fiscalYear) {
      return res.status(400).json({ message: 'Fiscal year required' });
    }
    
    const filings = await TaxFiling.find({
      company: req.user.company,
      filingType: 'WHT_STATEMENT',
      fiscalYear
    })
      .sort({ month: 1 })
      .lean();
    
    // Build monthly summary
    const monthlySummary = filings.map(f => ({
      month: f.month,
      periodName: f.periodFrom.toLocaleString('en-PK', { month: 'long', year: 'numeric' }),
      section153Services: f.whtDetails?.section153Services || 0,
      section153Supplies: f.whtDetails?.section153Supplies || 0,
      section153Contracts: f.whtDetails?.section153Contracts || 0,
      section233Rent: f.whtDetails?.section233Rent || 0,
      section234Salaries: f.whtDetails?.section234Salaries || 0,
      totalDeducted: f.whtDetails?.totalWhtDeducted || 0,
      totalDeposited: f.whtDetails?.totalWhtDeposited || 0,
      status: f.status,
      submitted: f.status === 'SUBMITTED' || f.status === 'ACKNOWLEDGED'
    }));
    
    // Calculate totals
    const totals = {
      section153Services: monthlySummary.reduce((s, m) => s + m.section153Services, 0),
      section153Supplies: monthlySummary.reduce((s, m) => s + m.section153Supplies, 0),
      section153Contracts: monthlySummary.reduce((s, m) => s + m.section153Contracts, 0),
      section233Rent: monthlySummary.reduce((s, m) => s + m.section233Rent, 0),
      section234Salaries: monthlySummary.reduce((s, m) => s + m.section234Salaries, 0),
      totalDeducted: monthlySummary.reduce((s, m) => s + m.totalDeducted, 0),
      totalDeposited: monthlySummary.reduce((s, m) => s + m.totalDeposited, 0)
    };
    
    res.json({
      success: true,
      data: {
        fiscalYear,
        monthlySummary,
        totals,
        pendingMonths: monthlySummary.filter(m => !m.submitted).length
      }
    });
    
  } catch (error) {
    console.error('WHT summary error:', error);
    res.status(500).json({ message: 'Error generating summary', error: error.message });
  }
});

// ============================================================================
// GET /reports/vendor-wht - Vendor-wise WHT Report
// ============================================================================
router.get('/reports/vendor-wht', authenticate, async (req, res) => {
  try {
    const { fiscalYear, vendorId } = req.query;
    
    const query = {
      company: req.user.company,
      filingType: 'WHT_STATEMENT'
    };
    if (fiscalYear) query.fiscalYear = fiscalYear;
    
    const filings = await TaxFiling.find(query).lean();
    
    // Aggregate by vendor
    const vendorMap = {};
    
    for (const filing of filings) {
      for (const txn of filing.transactions || []) {
        const key = txn.vendorNtn || txn.vendorCnic || txn.vendorName;
        if (!key) continue;
        
        if (!vendorMap[key]) {
          vendorMap[key] = {
            vendorName: txn.vendorName,
            vendorNtn: txn.vendorNtn,
            vendorCnic: txn.vendorCnic,
            totalGross: 0,
            totalWht: 0,
            transactions: []
          };
        }
        
        vendorMap[key].totalGross += txn.grossAmount || 0;
        vendorMap[key].totalWht += txn.whtAmount || 0;
        vendorMap[key].transactions.push({
          date: txn.paymentDate,
          grossAmount: txn.grossAmount,
          whtAmount: txn.whtAmount,
          section: txn.whtSection
        });
      }
    }
    
    const vendors = Object.values(vendorMap).sort((a, b) => b.totalWht - a.totalWht);
    
    res.json({
      success: true,
      data: {
        fiscalYear,
        vendors,
        totalVendors: vendors.length,
        grandTotalGross: vendors.reduce((s, v) => s + v.totalGross, 0),
        grandTotalWht: vendors.reduce((s, v) => s + v.totalWht, 0)
      }
    });
    
  } catch (error) {
    console.error('Vendor WHT report error:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
});

// ============================================================================
// GET /compliance/status - Tax Compliance Dashboard
// ============================================================================
router.get('/compliance/status', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const fiscalYear = currentMonth >= 7 
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
    
    // Get all filings for current fiscal year
    const filings = await TaxFiling.find({
      company: req.user.company,
      fiscalYear
    }).lean();
    
    // Check WHT compliance (monthly)
    const whtFilings = filings.filter(f => f.filingType === 'WHT_STATEMENT');
    const submittedMonths = new Set(
      whtFilings.filter(f => ['SUBMITTED', 'ACKNOWLEDGED'].includes(f.status)).map(f => f.month)
    );
    
    // Determine which months should be filed
    const fiscalStartMonth = 7; // July
    const monthsToFile = [];
    let checkMonth = fiscalStartMonth;
    let checkYear = parseInt(fiscalYear.split('-')[0]);
    
    while (true) {
      const checkDate = new Date(checkYear, checkMonth - 1, 15); // Due date is 15th of next month
      if (checkDate > now) break;
      
      monthsToFile.push({ month: checkMonth, year: checkYear });
      
      checkMonth++;
      if (checkMonth > 12) {
        checkMonth = 1;
        checkYear++;
      }
      
      if (monthsToFile.length >= 12) break;
    }
    
    const pendingWht = monthsToFile.filter(m => !submittedMonths.has(m.month));
    
    // Check for overdue filings
    const overdueFilings = filings.filter(f => 
      f.dueDate < now && 
      !['SUBMITTED', 'ACKNOWLEDGED'].includes(f.status)
    );
    
    res.json({
      success: true,
      data: {
        fiscalYear,
        whtCompliance: {
          totalMonthsDue: monthsToFile.length,
          monthsFiled: submittedMonths.size,
          monthsPending: pendingWht.length,
          pendingMonths: pendingWht,
          complianceRate: monthsToFile.length > 0 
            ? Math.round((submittedMonths.size / monthsToFile.length) * 100) 
            : 100
        },
        overdueFilings: overdueFilings.map(f => ({
          type: f.filingType,
          period: f.month ? `Month ${f.month}` : 'Annual',
          dueDate: f.dueDate,
          daysOverdue: Math.floor((now - f.dueDate) / (1000 * 60 * 60 * 24))
        })),
        upcomingDueDates: filings
          .filter(f => f.dueDate > now && f.status !== 'SUBMITTED')
          .map(f => ({
            type: f.filingType,
            period: f.month ? `Month ${f.month}` : 'Annual',
            dueDate: f.dueDate,
            daysRemaining: Math.ceil((f.dueDate - now) / (1000 * 60 * 60 * 24))
          }))
          .sort((a, b) => a.daysRemaining - b.daysRemaining)
      }
    });
    
  } catch (error) {
    console.error('Compliance status error:', error);
    res.status(500).json({ message: 'Error fetching compliance status', error: error.message });
  }
});

export { TaxFiling };
export default router;
