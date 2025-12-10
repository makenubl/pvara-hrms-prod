import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { KPIGoal, KPIReview } from '../models/KPI.js';

const router = express.Router();

// Get KPI goals for logged-in employee
router.get('/goals', authenticate, async (req, res) => {
  try {
    const goals = await KPIGoal.find({ 
      employee: req.user._id,
      status: { $in: ['active', 'completed'] }
    })
      .populate('supervisor', 'firstName lastName email')
      .sort({ startDate: -1 });

    res.json(goals);
  } catch (error) {
    console.error('Error fetching KPI goals:', error);
    res.status(500).json({ message: 'Failed to fetch KPI goals', error: error.message });
  }
});

// Get KPI reviews for logged-in employee
router.get('/reviews', authenticate, async (req, res) => {
  try {
    const reviews = await KPIReview.find({ 
      employee: req.user._id,
      status: { $in: ['submitted', 'acknowledged', 'disputed'] }
    })
      .populate('supervisor', 'firstName lastName email profileImage')
      .populate('goals.goalId')
      .sort({ submittedDate: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching KPI reviews:', error);
    res.status(500).json({ message: 'Failed to fetch KPI reviews', error: error.message });
  }
});

// Get single KPI review details
router.get('/reviews/:id', authenticate, async (req, res) => {
  try {
    const review = await KPIReview.findOne({
      _id: req.params.id,
      employee: req.user._id
    })
      .populate('supervisor', 'firstName lastName email profileImage department')
      .populate('employee', 'firstName lastName email employeeId department')
      .populate('goals.goalId');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Error fetching KPI review:', error);
    res.status(500).json({ message: 'Failed to fetch KPI review', error: error.message });
  }
});

// Employee acknowledges a review
router.put('/reviews/:id/acknowledge', authenticate, async (req, res) => {
  try {
    const { employeeComments } = req.body;

    const review = await KPIReview.findOne({
      _id: req.params.id,
      employee: req.user._id,
      status: 'submitted'
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found or already acknowledged' });
    }

    review.status = 'acknowledged';
    review.acknowledgedDate = new Date();
    if (employeeComments) {
      review.employeeComments = employeeComments;
    }

    await review.save();

    res.json({ 
      message: 'Review acknowledged successfully', 
      review 
    });
  } catch (error) {
    console.error('Error acknowledging review:', error);
    res.status(500).json({ message: 'Failed to acknowledge review', error: error.message });
  }
});

// Employee disputes a review
router.put('/reviews/:id/dispute', authenticate, async (req, res) => {
  try {
    const { employeeComments } = req.body;

    if (!employeeComments || !employeeComments.trim()) {
      return res.status(400).json({ message: 'Comments are required when disputing a review' });
    }

    const review = await KPIReview.findOne({
      _id: req.params.id,
      employee: req.user._id,
      status: 'submitted'
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found or already processed' });
    }

    review.status = 'disputed';
    review.employeeComments = employeeComments;
    review.acknowledgedDate = new Date();

    await review.save();

    res.json({ 
      message: 'Review disputed successfully. Your comments have been recorded.', 
      review 
    });
  } catch (error) {
    console.error('Error disputing review:', error);
    res.status(500).json({ message: 'Failed to dispute review', error: error.message });
  }
});

// ==================== SUPERVISOR ROUTES ====================

// Get goals created by supervisor
router.get('/supervisor/goals', authenticate, async (req, res) => {
  try {
    if (!['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only supervisors can access this endpoint' });
    }

    const goals = await KPIGoal.find({ 
      supervisor: req.user._id 
    })
      .populate('employee', 'firstName lastName email employeeId department profileImage')
      .sort({ createdAt: -1 });

    res.json(goals);
  } catch (error) {
    console.error('Error fetching supervisor goals:', error);
    res.status(500).json({ message: 'Failed to fetch goals', error: error.message });
  }
});

// Get reviews created by supervisor
router.get('/supervisor/reviews', authenticate, async (req, res) => {
  try {
    if (!['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only supervisors can access this endpoint' });
    }

    const reviews = await KPIReview.find({ 
      supervisor: req.user._id 
    })
      .populate('employee', 'firstName lastName email employeeId department profileImage')
      .sort({ submittedDate: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching supervisor reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
});

// Get goals for a specific employee (supervisor access)
router.get('/employee/:employeeId/goals', authenticate, async (req, res) => {
  try {
    if (!['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only supervisors can access this endpoint' });
    }

    const goals = await KPIGoal.find({ 
      employee: req.params.employeeId,
      status: { $in: ['active', 'completed'] }
    }).sort({ startDate: -1 });

    res.json(goals);
  } catch (error) {
    console.error('Error fetching employee goals:', error);
    res.status(500).json({ message: 'Failed to fetch employee goals', error: error.message });
  }
});

// Create KPI goals for employee (supervisor only)
router.post('/goals', authenticate, async (req, res) => {
  try {
    // Check if user is supervisor/manager
    if (!['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only supervisors can create KPI goals' });
    }

    const goalData = {
      ...req.body,
      supervisor: req.user._id,
      company: req.user.company
    };

    const goal = new KPIGoal(goalData);
    await goal.save();

    res.status(201).json({ 
      message: 'KPI goal created successfully', 
      goal 
    });
  } catch (error) {
    console.error('Error creating KPI goal:', error);
    res.status(500).json({ message: 'Failed to create KPI goal', error: error.message });
  }
});

// Submit KPI review for employee (supervisor only)
router.post('/reviews', authenticate, async (req, res) => {
  try {
    // Check if user is supervisor/manager
    if (!['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only supervisors can submit KPI reviews' });
    }

    const reviewData = {
      ...req.body,
      supervisor: req.user._id,
      company: req.user.company,
      submittedDate: new Date()
    };

    const review = new KPIReview(reviewData);
    await review.save();

    res.status(201).json({ 
      message: 'KPI review submitted successfully', 
      review 
    });
  } catch (error) {
    console.error('Error creating KPI review:', error);
    res.status(500).json({ message: 'Failed to create KPI review', error: error.message });
  }
});

// Update KPI goal (supervisor only)
router.put('/goals/:id', authenticate, async (req, res) => {
  try {
    // Check if user is supervisor/manager
    if (!['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only supervisors can update KPI goals' });
    }

    const goal = await KPIGoal.findOne({
      _id: req.params.id,
      supervisor: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found or you do not have permission to edit it' });
    }

    // Update goal fields
    Object.assign(goal, req.body);
    await goal.save();

    res.json({ 
      message: 'KPI goal updated successfully', 
      goal 
    });
  } catch (error) {
    console.error('Error updating KPI goal:', error);
    res.status(500).json({ message: 'Failed to update KPI goal', error: error.message });
  }
});

// Delete KPI goal (supervisor only)
router.delete('/goals/:id', authenticate, async (req, res) => {
  try {
    // Check if user is supervisor/manager
    if (!['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only supervisors can delete KPI goals' });
    }

    const goal = await KPIGoal.findOne({
      _id: req.params.id,
      supervisor: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found or you do not have permission to delete it' });
    }

    await goal.deleteOne();

    res.json({ 
      message: 'KPI goal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting KPI goal:', error);
    res.status(500).json({ message: 'Failed to delete KPI goal', error: error.message });
  }
});

export default router;
