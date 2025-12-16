import express from 'express';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all projects (with filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, department, priority, owner } = req.query;
    const filter = { company: req.user.company };

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;
    if (owner) filter.owner = owner;

    const projects = await Project.find(filter)
      .populate('owner', 'firstName lastName email designation')
      .populate('team', 'firstName lastName email designation department')
      .populate('createdBy', 'firstName lastName')
      .populate('updates.addedBy', 'firstName lastName')
      .sort({ endDate: 1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get project stats/summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    
    const projects = await Project.find(filter);
    
    const stats = {
      total: projects.length,
      byStatus: {
        planning: projects.filter(p => p.status === 'planning').length,
        onTrack: projects.filter(p => p.status === 'on-track').length,
        atRisk: projects.filter(p => p.status === 'at-risk').length,
        delayed: projects.filter(p => p.status === 'delayed').length,
        completed: projects.filter(p => p.status === 'completed').length,
        onHold: projects.filter(p => p.status === 'on-hold').length,
      },
      totalBudgetAllocated: projects.reduce((sum, p) => sum + (p.budget?.allocated || 0), 0),
      totalBudgetSpent: projects.reduce((sum, p) => sum + (p.budget?.spent || 0), 0),
      averageProgress: projects.length > 0 
        ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
        : 0,
      totalBlockers: projects.reduce((sum, p) => sum + (p.blockers || 0), 0),
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get project by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'firstName lastName email designation department')
      .populate('team', 'firstName lastName email designation department profileImage')
      .populate('createdBy', 'firstName lastName')
      .populate('updates.addedBy', 'firstName lastName');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new project (admin only)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      owner,
      department,
      startDate,
      endDate,
      status,
      progress,
      budget,
      team,
      priority,
      milestones,
    } = req.body;

    const project = new Project({
      name,
      description,
      owner,
      department,
      startDate,
      endDate,
      status: status || 'planning',
      progress: progress || 0,
      budget: budget || { allocated: 0, spent: 0, currency: 'PKR' },
      team: team || [],
      priority: priority || 'medium',
      milestones: milestones || [],
      company: req.user.company,
      createdBy: req.user._id,
    });

    const savedProject = await project.save();
    const populatedProject = await Project.findById(savedProject._id)
      .populate('owner', 'firstName lastName email designation')
      .populate('team', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update project (admin only)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const allowedFields = [
      'name', 'description', 'owner', 'department', 'startDate', 'endDate',
      'status', 'progress', 'budget', 'team', 'priority', 'blockers', 'milestones'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    const savedProject = await project.save();
    const populatedProject = await Project.findById(savedProject._id)
      .populate('owner', 'firstName lastName email designation')
      .populate('team', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add project update/note
router.post('/:id/updates', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { message, progress, status } = req.body;

    // Add the update note
    project.updates.push({
      message,
      addedBy: req.user._id,
      addedAt: new Date(),
    });

    // Optionally update progress and status
    if (progress !== undefined) {
      project.progress = progress;
    }
    if (status) {
      project.status = status;
    }

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'firstName lastName email designation')
      .populate('team', 'firstName lastName email')
      .populate('updates.addedBy', 'firstName lastName');

    res.json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete project (admin only)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
