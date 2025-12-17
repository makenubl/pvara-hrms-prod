import express from 'express';
import Highlight from '../models/Highlight.js';
import { authenticate as auth } from '../middleware/auth.js';

const router = express.Router();

// Get all highlights (active ones by default)
router.get('/', auth, async (req, res) => {
  try {
    const { resolved, type, department, limit = 50 } = req.query;
    
    const filter = {};
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    if (type) filter.type = type;
    if (department) filter.department = department;
    
    // By default, get unresolved highlights
    if (resolved === undefined) filter.resolved = false;
    
    const highlights = await Highlight.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName')
      .populate('resolvedBy', 'firstName lastName');
    
    // Sort by priority order
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    highlights.sort((a, b) => 
      (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    );
    
    res.json(highlights);
  } catch (error) {
    console.error('Error fetching highlights:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get highlights summary for dashboard
router.get('/summary', auth, async (req, res) => {
  try {
    const [achievements, milestones, showstoppers, supportNeeded] = await Promise.all([
      Highlight.countDocuments({ type: 'achievement', resolved: false }),
      Highlight.countDocuments({ type: 'milestone', resolved: false }),
      Highlight.countDocuments({ type: 'showstopper', resolved: false }),
      Highlight.countDocuments({ type: 'support-needed', resolved: false }),
    ]);
    
    res.json({
      achievements,
      milestones,
      showstoppers,
      supportNeeded,
      total: achievements + milestones + showstoppers + supportNeeded
    });
  } catch (error) {
    console.error('Error fetching highlights summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a highlight
router.post('/', auth, async (req, res) => {
  try {
    const { type, title, description, department, priority, dueDate } = req.body;
    
    // Only admins and managers can create highlights
    if (!['admin', 'manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create highlights' });
    }
    
    const highlight = new Highlight({
      type,
      title,
      description,
      department,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: req.user.id
    });
    
    await highlight.save();
    
    res.status(201).json(highlight);
  } catch (error) {
    console.error('Error creating highlight:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a highlight
router.put('/:id', auth, async (req, res) => {
  try {
    const { type, title, description, department, priority, dueDate, resolved } = req.body;
    
    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res.status(404).json({ message: 'Highlight not found' });
    }
    
    // Only admins can update
    if (!['admin', 'manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (type) highlight.type = type;
    if (title) highlight.title = title;
    if (description !== undefined) highlight.description = description;
    if (department !== undefined) highlight.department = department;
    if (priority) highlight.priority = priority;
    if (dueDate !== undefined) highlight.dueDate = dueDate ? new Date(dueDate) : null;
    
    // Handle resolution
    if (resolved !== undefined) {
      highlight.resolved = resolved;
      if (resolved) {
        highlight.resolvedAt = new Date();
        highlight.resolvedBy = req.user.id;
      } else {
        highlight.resolvedAt = null;
        highlight.resolvedBy = null;
      }
    }
    
    await highlight.save();
    
    res.json(highlight);
  } catch (error) {
    console.error('Error updating highlight:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resolve a highlight (mark as done)
router.post('/:id/resolve', auth, async (req, res) => {
  try {
    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res.status(404).json({ message: 'Highlight not found' });
    }
    
    // Only admins can resolve
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can resolve highlights' });
    }
    
    highlight.resolved = true;
    highlight.resolvedAt = new Date();
    highlight.resolvedBy = req.user.id;
    
    await highlight.save();
    
    res.json(highlight);
  } catch (error) {
    console.error('Error resolving highlight:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a highlight
router.delete('/:id', auth, async (req, res) => {
  try {
    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res.status(404).json({ message: 'Highlight not found' });
    }
    
    // Only admins can delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete highlights' });
    }
    
    await Highlight.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Highlight deleted' });
  } catch (error) {
    console.error('Error deleting highlight:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
