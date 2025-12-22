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
    const { status, assignedTo, project, priority, all, myTasks } = req.query;
    const filter = { company: req.user.company };

    // If myTasks=true, always filter by current user's ID (for "My Tasks" page)
    if (myTasks === 'true') {
      filter.assignedTo = req.user._id;
    }
    // Manager roles can see all tasks, regular employees only their own
    else if (!isManager(req.user.role)) {
      filter.assignedTo = req.user._id;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    // If 'all' query param is set and user is manager, show all company tasks
    if (all === 'true' && isManager(req.user.role) && myTasks !== 'true') {
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

// Add chairman comment to task
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { comment } = req.body;
    
    if (!comment?.trim()) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only admins (chairman) can add comments
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin/chairman can add comments' });
    }

    task.chairmanComments.push({
      comment: comment.trim(),
      addedBy: req.user._id,
      addedAt: new Date(),
    });

    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('chairmanComments.addedBy', 'firstName lastName')
      .populate('activities.addedBy', 'firstName lastName')
      .populate('attachments.uploadedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add activity to task (task journey/timeline)
router.post('/:id/activities', authenticate, async (req, res) => {
  try {
    const { action, department, poc, pocEmail, sentAt, responseReceivedAt, status, notes } = req.body;
    
    if (!action?.trim()) {
      return res.status(400).json({ message: 'Action is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only admins (chairman) can add activities
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin/chairman can add activities' });
    }

    task.activities.push({
      action: action.trim(),
      department: department?.trim(),
      poc: poc?.trim(),
      pocEmail: pocEmail?.trim(),
      sentAt: sentAt ? new Date(sentAt) : new Date(),
      responseReceivedAt: responseReceivedAt ? new Date(responseReceivedAt) : null,
      status: status || 'sent',
      notes: notes?.trim(),
      addedBy: req.user._id,
      addedAt: new Date(),
    });

    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('chairmanComments.addedBy', 'firstName lastName')
      .populate('activities.addedBy', 'firstName lastName')
      .populate('attachments.uploadedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update activity status (e.g., mark response received)
router.patch('/:id/activities/:activityId', authenticate, async (req, res) => {
  try {
    const { status, responseReceivedAt, notes } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only admins (chairman) can update activities
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin/chairman can update activities' });
    }

    const activity = task.activities.id(req.params.activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    if (status) activity.status = status;
    if (responseReceivedAt) activity.responseReceivedAt = new Date(responseReceivedAt);
    if (notes !== undefined) activity.notes = notes?.trim();

    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('chairmanComments.addedBy', 'firstName lastName')
      .populate('activities.addedBy', 'firstName lastName')
      .populate('attachments.uploadedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add attachment to task (stores URL - actual upload handled separately or via base64)
router.post('/:id/attachments', authenticate, async (req, res) => {
  try {
    const { name, url, type, size } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ message: 'Name and URL are required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Allow admin, assignee (task owner), or assigner (task creator) to add attachments
    const isAdmin = req.user.role === 'admin';
    const isAssignee = task.assignedTo?.toString() === req.user._id.toString();
    const isAssigner = task.assignedBy?.toString() === req.user._id.toString();
    
    if (!isAdmin && !isAssignee && !isAssigner) {
      return res.status(403).json({ message: 'Only assignee, assigner, or admin can add attachments' });
    }

    task.attachments.push({
      name,
      url,
      type: type || 'document',
      size: size || 0,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });

    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('chairmanComments.addedBy', 'firstName lastName')
      .populate('activities.addedBy', 'firstName lastName')
      .populate('attachments.uploadedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete attachment
router.delete('/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Allow admin, assignee, or assigner to delete attachments
    // Also allow the person who uploaded the attachment to delete it
    const isAdmin = req.user.role === 'admin';
    const isAssignee = task.assignedTo?.toString() === req.user._id.toString();
    const isAssigner = task.assignedBy?.toString() === req.user._id.toString();
    const attachment = task.attachments.id(req.params.attachmentId);
    const isUploader = attachment && attachment.uploadedBy?.toString() === req.user._id.toString();
    
    if (!isAdmin && !isAssignee && !isAssigner && !isUploader) {
      return res.status(403).json({ message: 'Only assignee, assigner, uploader, or admin can delete attachments' });
    }

    task.attachments.pull(req.params.attachmentId);
    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('chairmanComments.addedBy', 'firstName lastName')
      .populate('activities.addedBy', 'firstName lastName')
      .populate('attachments.uploadedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Boost/Expedite a task (chairperson energizes/prioritizes a task)
router.post('/:id/boost', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only admin/chairman can boost tasks
    const chairmanRoles = ['admin', 'chairman', 'executive', 'director'];
    if (!chairmanRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin/chairman can boost tasks' });
    }

    task.boosts.push({
      boostedBy: req.user._id,
      boostedAt: new Date(),
      message: message?.trim() || 'Task has been expedited - please provide an update.',
      acknowledged: false,
    });

    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('chairmanComments.addedBy', 'firstName lastName')
      .populate('activities.addedBy', 'firstName lastName')
      .populate('attachments.uploadedBy', 'firstName lastName')
      .populate('boosts.boostedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Respond to a boost (assignee acknowledges and responds)
router.patch('/:id/boost/:boostId', authenticate, async (req, res) => {
  try {
    const { response, acknowledged } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only assignee can respond to boost
    const isAssignee = task.assignedTo?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAssignee && !isAdmin) {
      return res.status(403).json({ message: 'Only the assignee can respond to boost' });
    }

    const boost = task.boosts.id(req.params.boostId);
    if (!boost) {
      return res.status(404).json({ message: 'Boost not found' });
    }

    if (acknowledged !== undefined) {
      boost.acknowledged = acknowledged;
      if (acknowledged && !boost.acknowledgedAt) {
        boost.acknowledgedAt = new Date();
      }
    }
    
    if (response) {
      boost.response = response.trim();
      boost.respondedAt = new Date();
      boost.acknowledged = true;
      if (!boost.acknowledgedAt) {
        boost.acknowledgedAt = new Date();
      }
    }

    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('chairmanComments.addedBy', 'firstName lastName')
      .populate('activities.addedBy', 'firstName lastName')
      .populate('attachments.uploadedBy', 'firstName lastName')
      .populate('boosts.boostedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== BOTTLENECK ROUTES ====================

// Add a bottleneck to a task (assignee requests support from chairperson)
router.post('/:id/bottleneck', authenticate, async (req, res) => {
  try {
    const { issue, description, category, severity } = req.body;

    if (!issue || !issue.trim()) {
      return res.status(400).json({ message: 'Issue description is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only assignee can raise bottleneck
    const isAssignee = task.assignedTo?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isAssignee && !isAdmin) {
      return res.status(403).json({ message: 'Only the assignee can raise a bottleneck' });
    }

    task.bottlenecks.push({
      issue: issue.trim(),
      description: description?.trim() || '',
      category: category || 'other',
      severity: severity || 'medium',
      raisedBy: req.user._id,
      raisedAt: new Date(),
      status: 'open',
    });

    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('bottlenecks.raisedBy', 'firstName lastName')
      .populate('bottlenecks.respondedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Respond to a bottleneck (chairperson provides support/response)
router.patch('/:id/bottleneck/:bottleneckId', authenticate, async (req, res) => {
  try {
    const { chairpersonResponse, status, resolution } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only admin/chairman can respond to bottlenecks
    if (req.user.role !== 'admin' && req.user.role !== 'chairman') {
      return res.status(403).json({ message: 'Only chairperson can respond to bottlenecks' });
    }

    const bottleneck = task.bottlenecks.id(req.params.bottleneckId);
    if (!bottleneck) {
      return res.status(404).json({ message: 'Bottleneck not found' });
    }

    // Update status
    if (status) {
      bottleneck.status = status;
      if (status === 'resolved' && !bottleneck.resolvedAt) {
        bottleneck.resolvedAt = new Date();
      }
    }

    // Add chairperson response
    if (chairpersonResponse) {
      bottleneck.chairpersonResponse = chairpersonResponse.trim();
      bottleneck.respondedBy = req.user._id;
      bottleneck.respondedAt = new Date();
      if (bottleneck.status === 'open') {
        bottleneck.status = 'acknowledged';
      }
    }

    // Add resolution
    if (resolution) {
      bottleneck.resolution = resolution.trim();
      bottleneck.resolvedAt = new Date();
      bottleneck.status = 'resolved';
    }

    await task.save();
    
    const updatedTask = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('assignedBy', 'firstName lastName email')
      .populate('bottlenecks.raisedBy', 'firstName lastName')
      .populate('bottlenecks.respondedBy', 'firstName lastName');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all open bottlenecks across all tasks (for chairperson dashboard)
router.get('/bottlenecks/all', authenticate, async (req, res) => {
  try {
    // Only admin/chairman can view all bottlenecks
    if (req.user.role !== 'admin' && req.user.role !== 'chairman') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.find({
      company: req.user.company,
      'bottlenecks.0': { $exists: true }, // Has at least one bottleneck
    })
      .populate('assignedTo', 'firstName lastName email designation department')
      .populate('bottlenecks.raisedBy', 'firstName lastName')
      .populate('bottlenecks.respondedBy', 'firstName lastName')
      .sort({ 'bottlenecks.raisedAt': -1 });

    // Extract and format bottlenecks with task info
    const bottlenecksWithTasks = [];
    tasks.forEach(task => {
      task.bottlenecks.forEach(bn => {
        bottlenecksWithTasks.push({
          ...bn.toObject(),
          taskId: task._id,
          taskTitle: task.title,
          taskProject: task.project,
          taskPriority: task.priority,
          taskStatus: task.status,
          taskDeadline: task.deadline,
          assignedTo: task.assignedTo,
        });
      });
    });

    // Sort by status (open first) then by raisedAt (newest first)
    bottlenecksWithTasks.sort((a, b) => {
      const statusOrder = { open: 0, acknowledged: 1, 'in-progress': 2, resolved: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.raisedAt) - new Date(a.raisedAt);
    });

    res.json(bottlenecksWithTasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
