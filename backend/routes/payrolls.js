import express from 'express';
import Payroll from '../models/Payroll.js';
import User from '../models/User.js';
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

export default router;
