import express from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// Roles that can manage tasks (view all, create, assign)
const MANAGER_ROLES = ['admin', 'manager', 'hr', 'chairman', 'executive', 'director', 'hod', 'teamlead'];

// Check if user has manager-level access
const isManager = (role) => MANAGER_ROLES.includes(role);

// Get all tasks (with filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, assignedTo, project, priority, all } = req.query;
    const filter = { company: req.user.company };

    // Manager roles can see all tasks, regular employees only their own
    if (!isManager(req.user.role)) {
      filter.assignedTo = req.user._id;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    // If 'all' query param is set and user is manager, show all company tasks
    if (all === 'true' && isManager(req.user.role)) {
      delete filter.assignedTo;
    }

    if (status) filter.status = status;
    if (project) filter.project = project;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('updates.addedBy', 'firstName lastName')
      .sort({ deadline: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('updates.addedBy', 'firstName lastName');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task (managers can view all, employees only their own)
    const assignedToId = task.assignedTo?._id?.toString() || task.assignedTo?.toString();
    if (!isManager(req.user.role) && assignedToId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new task (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create tasks' });
    }

    const {
      title,
      description,
      assignedTo,
      project,
      department,
      priority,
      status,
      deadline,
      capacity,
    } = req.body;

    // Verify assigned user exists and belongs to same company
    const assignedUser = await User.findOne({ _id: assignedTo, company: req.user.company });
    if (!assignedUser) {
      return res.status(404).json({ message: 'Assigned user not found' });
    }

    // Generate a task ID (e.g., TASK-2024-001)
    const taskCount = await Task.countDocuments({ company: req.user.company });
    const year = new Date().getFullYear();
    const taskId = `TASK-${year}-${String(taskCount + 1).padStart(4, '0')}`;

    const task = new Task({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      project: project || taskId,
      department: department || assignedUser.department,
      priority: priority || 'medium',
      status: status || 'pending',
      deadline,
      capacity: capacity || 0,
      company: req.user.company,
    });

    const savedTask = await task.save();
    const populatedTask = await Task.findById(savedTask._id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    const isAssignee = task.assignedTo.toString() === req.user._id.toString();
    const hasManagerAccess = isManager(req.user.role);

    if (!isAssignee && !hasManagerAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      title,
      description,
      assignedTo,
      project,
      department,
      priority,
      status,
      progress,
      deadline,
      capacity,
      blocker,
    } = req.body;

    // Managers can update all fields
    if (hasManagerAccess) {
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
      if (project !== undefined) task.project = project;
      if (department !== undefined) task.department = department;
      if (priority !== undefined) task.priority = priority;
      if (deadline !== undefined) task.deadline = deadline;
      if (capacity !== undefined) task.capacity = capacity;
    }

    // Both managers and assignee can update status, progress, and blocker
    if (status !== undefined) task.status = status;
    if (progress !== undefined) task.progress = progress;
    if (blocker !== undefined) task.blocker = blocker;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email');

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add update to task
router.post('/:id/updates', authenticate, async (req, res) => {
  try {
    const { message, progress, status } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    const isAssignee = task.assignedTo.toString() === req.user._id.toString();
    const hasManagerAccess = isManager(req.user.role);

    if (!isAssignee && !hasManagerAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    task.updates.push({
      message,
      addedBy: req.user._id,
      progress,
      status,
    });

    // Update task progress and status if provided
    if (progress !== undefined) task.progress = progress;
    if (status !== undefined) task.status = status;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('updates.addedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete task (managers only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!isManager(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can delete tasks' });
    }
    
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tasks statistics
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    if (!isManager(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const stats = await Task.aggregate([
      { $match: { company: req.user.company } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress' },
        },
      },
    ]);

    const totalTasks = await Task.countDocuments({ company: req.user.company });
    const overdueTasks = await Task.countDocuments({
      company: req.user.company,
      deadline: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] },
    });

    res.json({
      total: totalTasks,
      overdue: overdueTasks,
      byStatus: stats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Temporary seed endpoint - creates demo tasks if none exist
router.post('/seed-demo', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    
    const existingTasks = await Task.countDocuments({ company: req.user.company });
    if (existingTasks > 0) {
      return res.json({ message: 'Tasks already exist', count: existingTasks });
    }
    
    const employees = await User.find({ company: req.user.company, role: { $ne: 'admin' } }).limit(4);
    
    const demoTasks = [
      {
        title: 'Complete Q4 Financial Report',
        description: 'Prepare and finalize the quarterly financial report for board review.',
        assignedTo: employees[0]?._id,
        assignedBy: req.user._id,
        project: 'TASK-2025-0002',
        department: employees[0]?.department || 'Finance',
        priority: 'high',
        status: 'in-progress',
        progress: 65,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        company: req.user.company,
      },
      {
        title: 'Employee Training Program Setup',
        description: 'Design the new employee onboarding training program.',
        assignedTo: employees[1]?._id,
        assignedBy: req.user._id,
        project: 'TASK-2025-0003',
        department: employees[1]?.department || 'HR',
        priority: 'medium',
        status: 'pending',
        progress: 0,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        company: req.user.company,
      },
      {
        title: 'Security Audit - Infrastructure Review',
        description: 'Conduct comprehensive security audit of IT infrastructure.',
        assignedTo: employees[2]?._id,
        assignedBy: req.user._id,
        project: 'TASK-2025-0004',
        department: employees[2]?.department || 'IT',
        priority: 'high',
        status: 'in-progress',
        progress: 40,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        company: req.user.company,
      },
      {
        title: 'Client Proposal - Project Alpha',
        description: 'Prepare detailed proposal for Project Alpha.',
        assignedTo: employees[3]?._id || employees[0]?._id,
        assignedBy: req.user._id,
        project: 'TASK-2025-0005',
        department: 'Operations',
        priority: 'critical',
        status: 'in-progress',
        progress: 80,
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        company: req.user.company,
      }
    ];
    
    await Task.insertMany(demoTasks);
    res.json({ message: 'Created demo tasks', count: demoTasks.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
