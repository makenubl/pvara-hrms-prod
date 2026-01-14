import express from 'express';
import mongoose from 'mongoose';
import DailyWorklog from '../models/DailyWorklog.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Helper function to get start and end of day
const getDayBounds = (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
};

// ============================================
// USER ENDPOINTS
// ============================================

// GET /api/daily-worklogs - Get user's own worklogs
router.get('/', authenticate, async (req, res) => {
  try {
    const { date, startDate, endDate, view = 'day' } = req.query;
    const userId = req.user._id;
    
    let query = { user: userId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (date) {
      const { startOfDay, endOfDay } = getDayBounds(date);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo };
    }

    const worklogs = await DailyWorklog.find(query)
      .sort({ date: -1 })
      .lean();

    // Calculate stats
    const today = new Date();
    const { startOfDay: todayStart, endOfDay: todayEnd } = getDayBounds(today);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayLog, weekStats, monthStats] = await Promise.all([
      DailyWorklog.findOne({ 
        user: userId, 
        date: { $gte: todayStart, $lte: todayEnd }
      }),
      DailyWorklog.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: weekStart } } },
        { $group: { _id: null, totalHours: { $sum: '$totalHours' }, count: { $sum: 1 } } }
      ]),
      DailyWorklog.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: monthStart } } },
        { $group: { _id: null, totalHours: { $sum: '$totalHours' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      worklogs,
      todaySubmitted: !!todayLog,
      todayLog: todayLog || null,
      stats: {
        todayHours: todayLog?.totalHours || 0,
        weekHours: weekStats[0]?.totalHours || 0,
        weekEntries: weekStats[0]?.count || 0,
        monthHours: monthStats[0]?.totalHours || 0,
        monthEntries: monthStats[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching worklogs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/daily-worklogs/today - Check today's submission
router.get('/today', authenticate, async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDayBounds(new Date());
    
    const todayLog = await DailyWorklog.findOne({
      user: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    res.json({
      submitted: !!todayLog,
      worklog: todayLog || null,
      canEdit: true // Always true if it's today
    });
  } catch (error) {
    console.error('Error checking today\'s log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/daily-worklogs - Create daily worklog
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      date, 
      startTime, 
      endTime, 
      workedOnToday, 
      planToWorkOn, 
      showstopper 
    } = req.body;

    // Validate required fields
    if (!date || !startTime || !endTime || !workedOnToday || !planToWorkOn) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['date', 'startTime', 'endTime', 'workedOnToday', 'planToWorkOn']
      });
    }

    // Check if entry already exists for this date
    const { startOfDay, endOfDay } = getDayBounds(date);
    const existingLog = await DailyWorklog.findOne({
      user: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingLog) {
      return res.status(400).json({ 
        message: 'You have already submitted a worklog for this date. Please edit the existing entry.',
        existingId: existingLog._id
      });
    }

    // Create new worklog
    const worklog = new DailyWorklog({
      user: req.user._id,
      company: req.user.company,
      date: new Date(date),
      startTime,
      endTime,
      workedOnToday,
      planToWorkOn,
      showstopper: showstopper || { hasShowstopper: false }
    });

    await worklog.save();

    res.status(201).json({
      message: 'Worklog submitted successfully',
      worklog
    });
  } catch (error) {
    console.error('Error creating worklog:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'You have already submitted a worklog for this date'
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/daily-worklogs/:id - Update worklog (only same day)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const worklog = await DailyWorklog.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!worklog) {
      return res.status(404).json({ message: 'Worklog not found' });
    }

    // Check if user can still edit (same day only)
    const canEdit = DailyWorklog.canEditToday(worklog.date);
    if (!canEdit) {
      return res.status(403).json({ 
        message: 'You can only edit worklogs for today. Past entries are locked.'
      });
    }

    const { startTime, endTime, workedOnToday, planToWorkOn, showstopper } = req.body;

    // Update fields
    if (startTime) worklog.startTime = startTime;
    if (endTime) worklog.endTime = endTime;
    if (workedOnToday) worklog.workedOnToday = workedOnToday;
    if (planToWorkOn) worklog.planToWorkOn = planToWorkOn;
    if (showstopper !== undefined) worklog.showstopper = showstopper;

    await worklog.save();

    res.json({
      message: 'Worklog updated successfully',
      worklog
    });
  } catch (error) {
    console.error('Error updating worklog:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/daily-worklogs/:id - Delete worklog (only same day)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const worklog = await DailyWorklog.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!worklog) {
      return res.status(404).json({ message: 'Worklog not found' });
    }

    // Check if user can still delete (same day only)
    const canEdit = DailyWorklog.canEditToday(worklog.date);
    if (!canEdit) {
      return res.status(403).json({ 
        message: 'You can only delete worklogs for today. Past entries are locked.'
      });
    }

    await DailyWorklog.deleteOne({ _id: req.params.id });

    res.json({ message: 'Worklog deleted successfully' });
  } catch (error) {
    console.error('Error deleting worklog:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/daily-worklogs/admin/all - Get all worklogs (Admin/HR/Manager only)
router.get('/admin/all', authenticate, authorize(['admin', 'hr', 'manager']), async (req, res) => {
  try {
    const { 
      date, 
      startDate, 
      endDate, 
      userId, 
      hasShowstopper,
      showstopperPriority,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = { company: req.user.company };
    
    // Date filters
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (date) {
      const { startOfDay, endOfDay } = getDayBounds(date);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // User filter
    if (userId) {
      query.user = userId;
    }

    // Showstopper filter
    if (hasShowstopper === 'true') {
      query['showstopper.hasShowstopper'] = true;
    } else if (hasShowstopper === 'false') {
      query['showstopper.hasShowstopper'] = false;
    }

    // Showstopper priority filter
    if (showstopperPriority) {
      query['showstopper.priority'] = showstopperPriority;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [worklogs, total] = await Promise.all([
      DailyWorklog.find(query)
        .populate('user', 'firstName lastName email avatar department')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DailyWorklog.countDocuments(query)
    ]);

    res.json({
      worklogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all worklogs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/daily-worklogs/admin/submission-status - Get submission status for a date
router.get('/admin/submission-status', authenticate, authorize(['admin', 'hr', 'manager']), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const { startOfDay, endOfDay } = getDayBounds(targetDate);

    // Get all active users in the company
    const allUsers = await User.find({ 
      company: req.user.company, 
      status: 'active' 
    }).select('_id firstName lastName email avatar department role');

    // Get all submissions for the day
    const submissions = await DailyWorklog.find({
      company: req.user.company,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('user', 'firstName lastName email avatar department role');

    const submittedUserIds = new Set(submissions.map(s => s.user?._id?.toString()));

    const submitted = [];
    const notSubmitted = [];

    allUsers.forEach(user => {
      const userSubmission = submissions.find(s => s.user?._id?.toString() === user._id.toString());
      if (userSubmission) {
        submitted.push({
          user,
          worklog: userSubmission
        });
      } else {
        notSubmitted.push(user);
      }
    });

    // Count showstoppers
    const showstopperCount = submissions.filter(s => s.showstopper?.hasShowstopper).length;
    const criticalCount = submissions.filter(s => 
      s.showstopper?.hasShowstopper && s.showstopper?.priority === 'critical'
    ).length;

    res.json({
      date: targetDate.toISOString().split('T')[0],
      submitted,
      notSubmitted,
      stats: {
        totalUsers: allUsers.length,
        submittedCount: submitted.length,
        notSubmittedCount: notSubmitted.length,
        submissionRate: allUsers.length > 0 
          ? Math.round((submitted.length / allUsers.length) * 100) 
          : 0,
        showstopperCount,
        criticalCount
      }
    });
  } catch (error) {
    console.error('Error fetching submission status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/daily-worklogs/admin/showstoppers - Get all active showstoppers
router.get('/admin/showstoppers', authenticate, authorize(['admin', 'hr', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, priority } = req.query;

    let query = { 
      company: req.user.company,
      'showstopper.hasShowstopper': true
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.date = { $gte: sevenDaysAgo };
    }

    if (priority) {
      query['showstopper.priority'] = priority;
    }

    const showstoppers = await DailyWorklog.find(query)
      .populate('user', 'firstName lastName email avatar department')
      .sort({ 
        'showstopper.priority': 1, // Critical first
        date: -1 
      })
      .lean();

    // Sort by priority (critical > medium > low)
    const priorityOrder = { critical: 0, medium: 1, low: 2 };
    showstoppers.sort((a, b) => {
      const aPriority = priorityOrder[a.showstopper?.priority] ?? 3;
      const bPriority = priorityOrder[b.showstopper?.priority] ?? 3;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.date) - new Date(a.date);
    });

    res.json({ showstoppers });
  } catch (error) {
    console.error('Error fetching showstoppers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/daily-worklogs/admin/:id - Get specific worklog (Admin view)
router.get('/admin/:id', authenticate, authorize(['admin', 'hr', 'manager']), async (req, res) => {
  try {
    const worklog = await DailyWorklog.findOne({
      _id: req.params.id,
      company: req.user.company
    }).populate('user', 'firstName lastName email avatar department role')
      .populate('reviewedBy', 'firstName lastName');

    if (!worklog) {
      return res.status(404).json({ message: 'Worklog not found' });
    }

    res.json({ worklog });
  } catch (error) {
    console.error('Error fetching worklog:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/daily-worklogs/admin/:id/review - Add admin notes (Admin only)
router.put('/admin/:id/review', authenticate, authorize(['admin', 'hr']), async (req, res) => {
  try {
    const { adminNotes, status } = req.body;

    const worklog = await DailyWorklog.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!worklog) {
      return res.status(404).json({ message: 'Worklog not found' });
    }

    if (adminNotes !== undefined) worklog.adminNotes = adminNotes;
    if (status) worklog.status = status;
    worklog.reviewedBy = req.user._id;
    worklog.reviewedAt = new Date();

    await worklog.save();

    res.json({
      message: 'Review added successfully',
      worklog
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/daily-worklogs/admin/stats - Get overall statistics
router.get('/admin/stats', authenticate, authorize(['admin', 'hr', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const [totalStats, dailyStats, userStats] = await Promise.all([
      // Overall stats
      DailyWorklog.aggregate([
        { 
          $match: { 
            company: new mongoose.Types.ObjectId(req.user.company),
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalHours: { $sum: '$totalHours' },
            avgHoursPerDay: { $avg: '$totalHours' },
            showstopperCount: {
              $sum: { $cond: ['$showstopper.hasShowstopper', 1, 0] }
            }
          }
        }
      ]),
      // Daily submission counts
      DailyWorklog.aggregate([
        { 
          $match: { 
            company: new mongoose.Types.ObjectId(req.user.company),
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            count: { $sum: 1 },
            totalHours: { $sum: '$totalHours' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]),
      // Top contributors
      DailyWorklog.aggregate([
        { 
          $match: { 
            company: new mongoose.Types.ObjectId(req.user.company),
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$user',
            totalEntries: { $sum: 1 },
            totalHours: { $sum: '$totalHours' }
          }
        },
        { $sort: { totalEntries: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            totalEntries: 1,
            totalHours: 1,
            'user.firstName': 1,
            'user.lastName': 1,
            'user.email': 1,
            'user.avatar': 1
          }
        }
      ])
    ]);

    res.json({
      overview: totalStats[0] || {
        totalEntries: 0,
        totalHours: 0,
        avgHoursPerDay: 0,
        showstopperCount: 0
      },
      dailyStats,
      topContributors: userStats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
