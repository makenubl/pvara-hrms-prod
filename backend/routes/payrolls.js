import express from 'express';
import Payroll from '../models/Payroll.js';
import User from '../models/User.js';
import JournalEntry from '../models/JournalEntry.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import Budget from '../models/Budget.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Bulk upload payroll entries for a month
router.post('/bulk', authenticate, authorize(['hr', 'admin']), async (req, res) => {
  const { records = [] } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: 'records array is required' });
  }

  try {
    const companyId = req.user.company;

    const results = [];
    for (const record of records) {
      const { employeeId, email, month, amount, currency = 'PKR', notes = '' } = record;
      if (!month || !amount || (!employeeId && !email)) {
        continue;
      }

      const employee = employeeId
        ? await User.findOne({ _id: employeeId, company: companyId })
        : await User.findOne({ email, company: companyId });

      if (!employee) {
        results.push({ status: 'skipped', reason: 'employee not found', record });
        continue;
      }

      const doc = await Payroll.findOneAndUpdate(
        { company: companyId, employee: employee._id, month },
        {
          company: companyId,
          employee: employee._id,
          month,
          amount: Number(amount) || 0,
          currency,
          notes,
          status: 'uploaded',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      results.push({ status: 'saved', id: doc._id, employee: employee._id, month });
    }

    res.json({ message: 'Payroll upload processed', results });
  } catch (error) {
    console.error('❌ Payroll bulk upload error:', error);
    res.status(500).json({ message: error.message || 'Failed to upload payroll' });
  }
});

// Get payroll entries (optionally by month)
router.get('/', authenticate, async (req, res) => {
  const { month } = req.query;
  try {
    const query = { company: req.user.company };
    if (month) query.month = month;

    const entries = await Payroll.find(query)
      .populate('employee', 'firstName lastName email department position')
      .sort({ month: -1, createdAt: -1 })
      .lean();

    res.json(entries);
  } catch (error) {
    console.error('❌ Payroll fetch error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch payroll' });
  }
});

// Get payroll summary for a month
router.get('/summary', authenticate, async (req, res) => {
  const { month } = req.query;
  try {
    const query = { company: req.user.company };
    if (month) query.month = month;

    const entries = await Payroll.find(query).lean();
    const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    res.json({
      month: month || 'all',
      total,
      count: entries.length,
    });
  } catch (error) {
    console.error('❌ Payroll summary error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch payroll summary' });
  }
});

/**
 * FIX ISSUE #8: POST /api/payrolls/:month/post
 * Post payroll to GL - Creates journal entry for salary expenses
 */
router.post('/:month/post', authenticate, authorize(['admin', 'finance', 'hr']), async (req, res) => {
  try {
    const { month } = req.params;
    const companyId = req.user.company;

    // Get all payroll entries for the month
    const payrollEntries = await Payroll.find({
      company: companyId,
      month,
      status: { $in: ['uploaded', 'approved'] }
    }).populate('employee', 'firstName lastName department');

    if (payrollEntries.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No payroll entries found for this month' 
      });
    }

    // Get salary expense account
    const salaryExpenseAccount = await ChartOfAccount.findOne({
      company: companyId,
      accountCode: { $regex: /SALARY|WAGE|EMPLOYEE.*COST/i },
      accountType: 'expense',
      isActive: true
    });

    // Get salary payable account
    const salaryPayableAccount = await ChartOfAccount.findOne({
      company: companyId,
      accountCode: { $regex: /SALARY.*PAYABLE|ACCRUED.*SALARY/i },
      accountType: 'liability',
      isActive: true
    });

    if (!salaryExpenseAccount || !salaryPayableAccount) {
      return res.status(400).json({
        success: false,
        message: 'Salary expense or payable account not configured. Please set up Chart of Accounts.'
      });
    }

    // Calculate total
    const totalSalary = payrollEntries.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Generate journal entry number
    const [yearStr, monthStr] = month.split('-');
    const jeCount = await JournalEntry.countDocuments({
      company: companyId,
      entryNumber: { $regex: `^JV-${yearStr}${monthStr}` }
    });
    const entryNumber = `JV-${yearStr}${monthStr}-${String(jeCount + 1).padStart(5, '0')}`;

    // Create journal entry
    const journalEntry = new JournalEntry({
      company: companyId,
      entryNumber,
      entryDate: new Date(`${month}-28`), // Last week of month
      entryType: 'payroll',
      description: `Payroll expense for ${month} - ${payrollEntries.length} employees`,
      lines: [
        {
          account: salaryExpenseAccount._id,
          accountCode: salaryExpenseAccount.accountCode,
          accountName: salaryExpenseAccount.name,
          description: `Salary expense ${month}`,
          debit: totalSalary,
          credit: 0,
        },
        {
          account: salaryPayableAccount._id,
          accountCode: salaryPayableAccount.accountCode,
          accountName: salaryPayableAccount.name,
          description: `Salary payable ${month}`,
          debit: 0,
          credit: totalSalary,
        }
      ],
      totalDebit: totalSalary,
      totalCredit: totalSalary,
      sourceDocument: {
        type: 'payroll',
        documentNumber: `PAYROLL-${month}`,
        budgetUpdatedExternally: false
      },
      status: 'posted',
      postedAt: new Date(),
      createdBy: req.user._id,
      approvedBy: req.user._id
    });

    await journalEntry.save();

    // Update account balances
    salaryExpenseAccount.currentBalance += totalSalary;
    await salaryExpenseAccount.save();
    
    salaryPayableAccount.currentBalance += totalSalary;
    await salaryPayableAccount.save();

    // Update budget utilization
    const payrollMonth = new Date(`${month}-01`);
    const fyMonth = payrollMonth.getMonth();
    const fyYear = payrollMonth.getFullYear();
    const fiscalYear = fyMonth >= 6 ? `${fyYear}-${fyYear + 1}` : `${fyYear - 1}-${fyYear}`;

    await Budget.findOneAndUpdate(
      {
        company: companyId,
        fiscalYear,
        status: { $in: ['approved', 'active'] },
        'lines.headOfAccount': salaryExpenseAccount._id
      },
      {
        $inc: {
          'lines.$.utilized': totalSalary,
          totalUtilized: totalSalary
        }
      }
    );

    // Update payroll entries status
    await Payroll.updateMany(
      { company: companyId, month, status: { $in: ['uploaded', 'approved'] } },
      { 
        $set: { 
          status: 'posted',
          journalEntry: journalEntry._id,
          postedAt: new Date()
        } 
      }
    );

    res.json({
      success: true,
      message: `Payroll posted to GL successfully`,
      data: {
        journalEntry: entryNumber,
        employeeCount: payrollEntries.length,
        totalAmount: totalSalary,
        fiscalYear
      }
    });
  } catch (error) {
    console.error('❌ Payroll post error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
