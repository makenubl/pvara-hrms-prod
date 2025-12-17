import express from 'express';
import mongoose from 'mongoose';
import Worklog from '../models/Worklog.js';
import { authenticate as auth } from '../middleware/auth.js';

const router = express.Router();

// Get worklogs with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { date, view = 'day' } = req.query;
    const userId = req.user.id;
    
    let startDate, endDate;
    const baseDate = date ? new Date(date) : new Date();
    
    if (view === 'day') {
      startDate = new Date(baseDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(baseDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (view === 'month') {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const worklogs = await Worklog.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1, createdAt: -1 });

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayLogs, weekLogs, monthLogs, totalCount] = await Promise.all([
      Worklog.aggregate([
        { $match: { user: req.user._id, date: { $gte: today, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$hoursWorked' } } }
      ]),
      Worklog.aggregate([
        { $match: { user: req.user._id, date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$hoursWorked' } } }
      ]),
      Worklog.aggregate([
        { $match: { user: req.user._id, date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$hoursWorked' } } }
      ]),
      Worklog.countDocuments({ user: userId })
    ]);

    // Format worklogs for response
    const formattedWorklogs = worklogs.map(log => ({
      _id: log._id,
      date: log.date.toISOString().split('T')[0],
      project: log.project,
      task: log.task,
      description: log.description,
      hoursWorked: log.hoursWorked,
      status: log.status,
      createdAt: log.createdAt
    }));

    res.json({
      worklogs: formattedWorklogs,
      stats: {
        todayHours: todayLogs[0]?.total || 0,
        weekHours: weekLogs[0]?.total || 0,
        monthHours: monthLogs[0]?.total || 0,
        totalEntries: totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching worklogs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create worklog
router.post('/', auth, async (req, res) => {
  try {
    const { date, project, task, description, hoursWorked, status } = req.body;

    const worklog = new Worklog({
      user: req.user.id,
      date: new Date(date),
      project,
      task,
      description,
      hoursWorked,
      status: status || 'completed'
    });

    await worklog.save();

    res.status(201).json({
      _id: worklog._id,
      date: worklog.date.toISOString().split('T')[0],
      project: worklog.project,
      task: worklog.task,
      description: worklog.description,
      hoursWorked: worklog.hoursWorked,
      status: worklog.status,
      createdAt: worklog.createdAt
    });
  } catch (error) {
    console.error('Error creating worklog:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update worklog
router.put('/:id', auth, async (req, res) => {
  try {
    const { date, project, task, description, hoursWorked, status } = req.body;

    const worklog = await Worklog.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!worklog) {
      return res.status(404).json({ message: 'Worklog not found' });
    }

    worklog.date = date ? new Date(date) : worklog.date;
    worklog.project = project || worklog.project;
    worklog.task = task || worklog.task;
    worklog.description = description || worklog.description;
    worklog.hoursWorked = hoursWorked || worklog.hoursWorked;
    worklog.status = status || worklog.status;

    await worklog.save();

    res.json({
      _id: worklog._id,
      date: worklog.date.toISOString().split('T')[0],
      project: worklog.project,
      task: worklog.task,
      description: worklog.description,
      hoursWorked: worklog.hoursWorked,
      status: worklog.status,
      createdAt: worklog.createdAt
    });
  } catch (error) {
    console.error('Error updating worklog:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete worklog
router.delete('/:id', auth, async (req, res) => {
  try {
    const worklog = await Worklog.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    
    if (!worklog) {
      return res.status(404).json({ message: 'Worklog not found' });
    }

    res.json({ message: 'Worklog deleted' });
  } catch (error) {
    console.error('Error deleting worklog:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's worklog summary (for managers/admins)
router.get('/summary/:userId', auth, async (req, res) => {
  try {
    // Only admins and managers can view other users' summaries
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const summary = await Worklog.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.params.userId),
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$project',
          totalHours: { $sum: '$hoursWorked' },
          entries: { $sum: 1 }
        }
      },
      { $sort: { totalHours: -1 } }
    ]);

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching worklog summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
