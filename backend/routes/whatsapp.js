/**
 * WhatsApp Routes - Twilio Webhook Handlers
 * Handles incoming WhatsApp messages and processes task commands
 */

import express from 'express';
import whatsappService from '../services/whatsappService.js';
import aiService from '../services/aiService.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import logger from '../config/logger.js';
import whatsappConfig from '../config/whatsapp.js';

const router = express.Router();

// Manager roles that can assign tasks to others
const MANAGER_ROLES = ['admin', 'manager', 'hr', 'chairman', 'executive', 'director', 'hod', 'teamlead'];

/**
 * POST /api/whatsapp/webhook
 * Twilio webhook endpoint for incoming WhatsApp messages
 */
router.post('/webhook', async (req, res) => {
  try {
    // Debug: Log raw request body
    logger.info('Raw webhook body:', { body: JSON.stringify(req.body), contentType: req.headers['content-type'] });
    
    // Parse incoming message
    const messageData = whatsappService.parseIncomingMessage(req.body);
    const { from, body, numMedia, mediaUrl, mediaContentType } = messageData;

    logger.info('WhatsApp message received', { from, bodyLength: body?.length, numMedia });

    // Find user by phone number
    const user = await User.findOne({
      $or: [
        { phone: from },
        { phone: from.replace('+', '') },
        { whatsappNumber: from },
        { whatsappNumber: from.replace('+', '') },
      ]
    }).populate('company');

    if (!user) {
      // User not found - send registration instructions
      await whatsappService.sendMessage(from, whatsappConfig.templates.notRegistered);
      return res.status(200).send('OK');
    }

    // Check if WhatsApp notifications are enabled for user
    if (user.whatsappPreferences?.enabled === false) {
      await whatsappService.sendMessage(from, 
        '⚠️ WhatsApp notifications are disabled for your account. Please enable them in your profile settings.');
      return res.status(200).send('OK');
    }

    let messageText = body;

    // Handle voice notes
    if (numMedia > 0 && mediaContentType?.includes('audio')) {
      await whatsappService.sendMessage(from, '🎤 Processing your voice note...');
      
      const transcription = await whatsappService.transcribeVoiceNote(mediaUrl);
      if (transcription) {
        messageText = transcription;
        await whatsappService.sendMessage(from, `Voice note received. Transcription: "${transcription}"\n\nProcessing your request...`);
      } else {
        await whatsappService.sendErrorMessage(from, 
          'Could not transcribe your voice note. Please try again or type your message.');
        return res.status(200).send('OK');
      }
    }

    // Skip if no message text
    if (!messageText || messageText.trim().length === 0) {
      return res.status(200).send('OK');
    }

    // Parse the message to extract action
    const parsedAction = await aiService.parseMessage(messageText, user);
    logger.info('Parsed action', { action: parsedAction.action, userId: user._id });

    // Process the action
    await processAction(parsedAction, user, from);

    res.status(200).send('OK');
  } catch (error) {
    logger.error('WhatsApp webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
});

/**
 * Process parsed action and respond
 * @param {object} action - Parsed action object
 * @param {object} user - User object
 * @param {string} phoneNumber - User's phone number
 */
async function processAction(action, user, phoneNumber) {
  try {
    switch (action.action) {
      case 'welcome':
        await whatsappService.sendWelcomeMessage(phoneNumber);
        break;

      case 'help':
        await whatsappService.sendHelpMessage(phoneNumber);
        break;

      case 'status':
        await sendStatusSummary(user, phoneNumber);
        break;

      case 'listTasks':
        await listUserTasks(user, phoneNumber, action.filters);
        break;

      case 'listDeadlines':
        await listUpcomingDeadlines(user, phoneNumber);
        break;

      case 'viewTask':
        await viewTaskDetails(user, phoneNumber, action.taskId);
        break;

      case 'createTask':
        await createTask(user, phoneNumber, action);
        break;

      case 'assignTask':
        await assignTask(user, phoneNumber, action);
        break;

      case 'updateTaskStatus':
        await updateTaskStatus(user, phoneNumber, action.taskId, action.status);
        break;

      case 'updateTaskStatusAndProgress':
        await updateTaskStatusAndProgress(user, phoneNumber, action.taskId, action.status, action.progress);
        break;

      case 'updateTaskProgress':
        await updateTaskProgress(user, phoneNumber, action.taskId, action.progress);
        break;

      case 'addTaskUpdate':
        await addTaskUpdate(user, phoneNumber, action.taskId, action.message);
        break;

      case 'reportBlocker':
        await reportBlocker(user, phoneNumber, action.taskId, action.blocker);
        break;

      case 'deleteTask':
      case 'cancelTask':
        await cancelTask(user, phoneNumber, action.taskId);
        break;

      case 'unknown':
      default:
        await whatsappService.sendMessage(phoneNumber, 
          `PVARA HRMS - Command Not Recognized\n\nYour message: "${action.originalMessage || 'N/A'}"\n\nType "help" for available commands.`);
        break;
    }
  } catch (error) {
    logger.error('Action processing error:', error);
    await whatsappService.sendErrorMessage(phoneNumber, error.message || 'Failed to process your request');
  }
}

/**
 * Send status summary
 */
async function sendStatusSummary(user, phoneNumber) {
  const tasks = await Task.find({
    $or: [
      { assignedTo: user._id },
      { secondaryAssignees: user._id }
    ],
    company: user.company,
    status: { $ne: 'cancelled' }
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length,
  };

  const message = `PVARA HRMS - Task Summary

Employee: ${user.firstName} ${user.lastName}

Total Tasks: ${stats.total}
Pending: ${stats.pending}
In Progress: ${stats.inProgress}
Completed: ${stats.completed}
Blocked: ${stats.blocked}
Overdue: ${stats.overdue}

Type "show my tasks" to see the full list.`;

  await whatsappService.sendMessage(phoneNumber, message);
}

/**
 * List user tasks
 */
async function listUserTasks(user, phoneNumber, filters = {}) {
  const query = {
    $or: [
      { assignedTo: user._id },
      { secondaryAssignees: user._id }
    ],
    company: user.company,
  };

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.overdue) {
    query.deadline = { $lt: new Date() };
    query.status = { $ne: 'completed' };
  }

  const tasks = await Task.find(query)
    .sort({ deadline: 1 })
    .limit(15)
    .populate('assignedBy', 'firstName lastName');

  await whatsappService.sendTaskList(phoneNumber, tasks);
}

/**
 * List upcoming deadlines
 */
async function listUpcomingDeadlines(user, phoneNumber) {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const tasks = await Task.find({
    $or: [
      { assignedTo: user._id },
      { secondaryAssignees: user._id }
    ],
    company: user.company,
    status: { $nin: ['completed', 'cancelled'] },
    deadline: { $gte: now, $lte: nextWeek }
  }).sort({ deadline: 1 });

  if (tasks.length === 0) {
    await whatsappService.sendMessage(phoneNumber, 
      'PVARA HRMS - Upcoming Deadlines\n\nNo deadlines in the next 7 days.');
    return;
  }

  let message = `PVARA HRMS - Upcoming Deadlines (Next 7 Days)\n\n`;
  tasks.forEach((task, i) => {
    const deadline = new Date(task.deadline);
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    message += `${i + 1}. ${task.title}\n`;
    message += `   Ref: ${task.project}\n`;
    message += `   Deadline: ${deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)\n`;
    message += `   Progress: ${task.progress}%\n\n`;
  });

  await whatsappService.sendMessage(phoneNumber, message);
}

/**
 * View task details
 */
async function viewTaskDetails(user, phoneNumber, taskId) {
  const task = await Task.findOne({
    project: taskId,
    company: user.company
  })
    .populate('assignedTo', 'firstName lastName email')
    .populate('assignedBy', 'firstName lastName')
    .populate('secondaryAssignees', 'firstName lastName');

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${taskId} not found`);
    return;
  }

  // Check access
  const isAssignee = task.assignedTo?._id?.toString() === user._id.toString() ||
    task.secondaryAssignees?.some(s => s._id.toString() === user._id.toString());
  const isManager = MANAGER_ROLES.includes(user.role);

  if (!isAssignee && !isManager) {
    await whatsappService.sendErrorMessage(phoneNumber, 'You do not have access to this task');
    return;
  }

  const statusLabel = task.status?.toUpperCase() || 'PENDING';

  let message = `PVARA HRMS - Task Details

Reference: ${task.project}
Title: ${task.title}
${task.description ? `Description: ${task.description}\n` : ''}
Status: ${statusLabel}
Priority: ${task.priority?.toUpperCase()}
Progress: ${task.progress}%
Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}

Assigned to: ${task.assignedTo?.firstName || 'N/A'} ${task.assignedTo?.lastName || ''}
Assigned by: ${task.assignedBy?.firstName || 'N/A'} ${task.assignedBy?.lastName || ''}
${task.secondaryAssignees?.length ? `Secondary: ${task.secondaryAssignees.map(s => `${s.firstName} ${s.lastName}`).join(', ')}\n` : ''}
${task.blocker ? `\nBlocker: ${task.blocker}` : ''}`;

  // Show recent updates
  if (task.updates?.length > 0) {
    message += `\n\nRecent Updates:\n`;
    task.updates.slice(-3).forEach(update => {
      message += `- ${update.message} (${new Date(update.addedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})\n`;
    });
  }

  await whatsappService.sendMessage(phoneNumber, message);
}

/**
 * Create a new task
 */
async function createTask(user, phoneNumber, action) {
  if (!action.title || action.title.length < 3) {
    await whatsappService.sendErrorMessage(phoneNumber, 'Please provide a task title (at least 3 characters)');
    return;
  }

  // Generate task ID
  const taskCount = await Task.countDocuments({ company: user.company });
  const year = new Date().getFullYear();
  const taskId = `TASK-${year}-${String(taskCount + 1).padStart(4, '0')}`;

  const task = new Task({
    title: action.title,
    description: action.description || '',
    assignedTo: user._id,
    assignedBy: user._id,
    project: taskId,
    department: user.department,
    priority: action.priority || 'medium',
    status: 'pending',
    deadline: action.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 1 week
    company: user.company,
    progress: 0,
  });

  await task.save();
  await task.populate('assignedTo', 'firstName lastName');

  logger.info('Task created via WhatsApp', { taskId, userId: user._id });

  await whatsappService.sendTaskCreatedConfirmation(phoneNumber, task);
}

/**
 * Assign task to another user (admin/manager only)
 */
async function assignTask(user, phoneNumber, action) {
  // Check if user has permission to assign tasks
  if (!MANAGER_ROLES.includes(user.role)) {
    await whatsappService.sendErrorMessage(phoneNumber, 
      'You do not have permission to assign tasks to others. Only managers can assign tasks.');
    return;
  }

  // Find assignee by name or email
  const assigneeName = action.assigneeName.toLowerCase();
  const assignee = await User.findOne({
    company: user.company,
    $or: [
      { email: assigneeName },
      { email: { $regex: assigneeName, $options: 'i' } },
      { firstName: { $regex: assigneeName, $options: 'i' } },
      { lastName: { $regex: assigneeName, $options: 'i' } },
    ]
  });

  if (!assignee) {
    await whatsappService.sendErrorMessage(phoneNumber, 
      `Could not find employee "${action.assigneeName}". Please check the name or email and try again.`);
    return;
  }

  // Generate task ID
  const taskCount = await Task.countDocuments({ company: user.company });
  const year = new Date().getFullYear();
  const taskId = `TASK-${year}-${String(taskCount + 1).padStart(4, '0')}`;

  const task = new Task({
    title: action.title,
    description: action.description || '',
    assignedTo: assignee._id,
    assignedBy: user._id,
    project: taskId,
    department: assignee.department || user.department,
    priority: action.priority || 'medium',
    status: 'pending',
    deadline: action.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    company: user.company,
    progress: 0,
  });

  await task.save();
  await task.populate('assignedTo', 'firstName lastName');
  await task.populate('assignedBy', 'firstName lastName');

  logger.info('Task assigned via WhatsApp', { taskId, assignedTo: assignee._id, assignedBy: user._id });

  // Notify the creator
  await whatsappService.sendMessage(phoneNumber, 
    `PVARA HRMS - Task Assigned

Title: ${task.title}
Reference: ${taskId}
Assigned to: ${assignee.firstName} ${assignee.lastName}
Priority: ${task.priority?.toUpperCase()}
Deadline: ${task.deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`);

  // Notify the assignee if they have WhatsApp enabled
  if (assignee.whatsappNumber || assignee.phone) {
    const assigneePhone = assignee.whatsappNumber || assignee.phone;
    if (assignee.whatsappPreferences?.taskAssigned !== false) {
      await whatsappService.sendTaskAssignedNotification(assigneePhone, task);
    }
  }
}

/**
 * Update task status
 */
async function updateTaskStatus(user, phoneNumber, taskId, status) {
  const task = await Task.findOne({
    project: taskId,
    company: user.company
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${taskId} not found`);
    return;
  }

  // Check access
  const isAssignee = task.assignedTo?.toString() === user._id.toString() ||
    task.secondaryAssignees?.some(s => s.toString() === user._id.toString());
  const isManager = MANAGER_ROLES.includes(user.role);

  if (!isAssignee && !isManager) {
    await whatsappService.sendErrorMessage(phoneNumber, 'You do not have permission to update this task');
    return;
  }

  const oldStatus = task.status;
  task.status = status;

  // Auto-set progress for completed status
  if (status === 'completed' && task.progress < 100) {
    task.progress = 100;
  }

  // Add update entry
  task.updates.push({
    message: `Status changed from ${oldStatus} to ${status} via WhatsApp`,
    addedBy: user._id,
    addedAt: new Date(),
    status: status,
  });

  await task.save();
  await task.populate('assignedTo', 'firstName lastName');

  logger.info('Task status updated via WhatsApp', { taskId, oldStatus, newStatus: status, userId: user._id });

  await whatsappService.sendTaskUpdateConfirmation(phoneNumber, task, 'status');
}

/**
 * Update task status AND progress (single command)
 * This is used when the user explicitly provides both (e.g., "completed 50%").
 */
async function updateTaskStatusAndProgress(user, phoneNumber, taskId, status, progress) {
  const task = await Task.findOne({
    project: taskId,
    company: user.company
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${taskId} not found`);
    return;
  }

  // Check access
  const isAssignee = task.assignedTo?.toString() === user._id.toString() ||
    task.secondaryAssignees?.some(s => s.toString() === user._id.toString());
  const isManager = MANAGER_ROLES.includes(user.role);

  if (!isAssignee && !isManager) {
    await whatsappService.sendErrorMessage(phoneNumber, 'You do not have permission to update this task');
    return;
  }

  const oldStatus = task.status;
  const oldProgress = task.progress;

  task.status = status;

  const normalizedProgress = Math.min(100, Math.max(0, parseInt(progress, 10)));
  if (!Number.isNaN(normalizedProgress)) {
    task.progress = normalizedProgress;
  }

  // If user did NOT provide a usable progress, then apply completion default
  if ((progress === undefined || progress === null || Number.isNaN(normalizedProgress)) && status === 'completed') {
    task.progress = 100;
  }

  // Add update entry
  task.updates.push({
    message: `Status/progress updated via WhatsApp (status: ${oldStatus} → ${task.status}, progress: ${oldProgress}% → ${task.progress}%)`,
    addedBy: user._id,
    addedAt: new Date(),
    status: task.status,
    progress: task.progress,
  });

  await task.save();
  await task.populate('assignedTo', 'firstName lastName');

  logger.info('Task status+progress updated via WhatsApp', {
    taskId,
    oldStatus,
    newStatus: task.status,
    oldProgress,
    newProgress: task.progress,
    userId: user._id,
  });

  await whatsappService.sendTaskUpdateConfirmation(phoneNumber, task, 'status');
}

/**
 * Update task progress
 */
async function updateTaskProgress(user, phoneNumber, taskId, progress) {
  const task = await Task.findOne({
    project: taskId,
    company: user.company
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${taskId} not found`);
    return;
  }

  // Check access
  const isAssignee = task.assignedTo?.toString() === user._id.toString() ||
    task.secondaryAssignees?.some(s => s.toString() === user._id.toString());
  const isManager = MANAGER_ROLES.includes(user.role);

  if (!isAssignee && !isManager) {
    await whatsappService.sendErrorMessage(phoneNumber, 'You do not have permission to update this task');
    return;
  }

  const oldProgress = task.progress;
  task.progress = progress;

  // Auto-complete if progress is 100%
  if (progress === 100 && task.status !== 'completed') {
    task.status = 'completed';
  }

  // Add update entry
  task.updates.push({
    message: `Progress updated from ${oldProgress}% to ${progress}% via WhatsApp`,
    addedBy: user._id,
    addedAt: new Date(),
    progress: progress,
  });

  await task.save();
  await task.populate('assignedTo', 'firstName lastName');

  logger.info('Task progress updated via WhatsApp', { taskId, oldProgress, newProgress: progress, userId: user._id });

  await whatsappService.sendTaskUpdateConfirmation(phoneNumber, task, 'progress');
}

/**
 * Add update/comment to task
 */
async function addTaskUpdate(user, phoneNumber, taskId, message) {
  const task = await Task.findOne({
    project: taskId,
    company: user.company
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${taskId} not found`);
    return;
  }

  // Check access
  const isAssignee = task.assignedTo?.toString() === user._id.toString() ||
    task.secondaryAssignees?.some(s => s.toString() === user._id.toString());
  const isManager = MANAGER_ROLES.includes(user.role);

  if (!isAssignee && !isManager) {
    await whatsappService.sendErrorMessage(phoneNumber, 'You do not have permission to update this task');
    return;
  }

  task.updates.push({
    message: message,
    addedBy: user._id,
    addedAt: new Date(),
  });

  await task.save();

  logger.info('Task update added via WhatsApp', { taskId, userId: user._id });

  await whatsappService.sendMessage(phoneNumber, 
    `PVARA HRMS - Update Added

Reference: ${taskId}
Update: "${message}"

The update has been recorded.`);
}

/**
 * Cancel/Delete a task
 */
async function cancelTask(user, phoneNumber, taskId) {
  const task = await Task.findOne({
    project: taskId,
    company: user.company
  });

  if (!task) {
    await whatsappService.sendMessage(phoneNumber, 
      `PVARA HRMS - Task Not Found\n\nTask ${taskId} was not found in the system.`);
    return;
  }

  // Check if user has permission (task owner, assignee, or admin/manager)
  const isAssignee = task.assignedTo?.toString() === user._id.toString() ||
                     task.secondaryAssignees?.some(a => a.toString() === user._id.toString());
  const isCreator = task.createdBy?.toString() === user._id.toString();
  const isAdmin = ['admin', 'manager', 'chairman'].includes(user.role);

  if (!isAssignee && !isCreator && !isAdmin) {
    await whatsappService.sendMessage(phoneNumber, 
      `PVARA HRMS - Permission Denied\n\nYou do not have permission to cancel task ${taskId}.`);
    return;
  }

  // Update task status to cancelled
  task.status = 'cancelled';
  task.updates.push({
    message: `Task cancelled via WhatsApp`,
    addedBy: user._id,
    addedAt: new Date(),
    status: 'cancelled',
  });

  await task.save();

  logger.info('Task cancelled via WhatsApp', { taskId, userId: user._id });

  await whatsappService.sendMessage(phoneNumber, 
    `PVARA HRMS - Task Cancelled\n\nReference: ${taskId}\nTitle: ${task.title}\n\nThis task has been cancelled successfully.`);
}

/**
 * Report blocker on task
 */
async function reportBlocker(user, phoneNumber, taskId, blocker) {
  const task = await Task.findOne({
    project: taskId,
    company: user.company
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${taskId} not found`);
    return;
  }

  task.status = 'blocked';
  task.blocker = blocker;

  task.updates.push({
    message: `Blocker reported via WhatsApp: ${blocker}`,
    addedBy: user._id,
    addedAt: new Date(),
    status: 'blocked',
  });

  // Add bottleneck entry
  task.bottlenecks.push({
    issue: blocker,
    description: `Reported via WhatsApp`,
    category: 'other',
    severity: 'medium',
    raisedBy: user._id,
    raisedAt: new Date(),
    status: 'open',
  });

  await task.save();

  logger.info('Blocker reported via WhatsApp', { taskId, userId: user._id });

  await whatsappService.sendMessage(phoneNumber, 
    `PVARA HRMS - Blocker Reported

Reference: ${taskId}
Issue: "${blocker}"

Task status has been changed to BLOCKED. Management will be notified.`);
}

/**
 * GET /api/whatsapp/status
 * Check WhatsApp service status
 */
router.get('/status', async (req, res) => {
  const isInitialized = whatsappService.initialize();
  res.json({
    status: isInitialized ? 'connected' : 'not_configured',
    message: isInitialized 
      ? 'WhatsApp service is ready' 
      : 'WhatsApp service not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
  });
});

/**
 * POST /api/whatsapp/send-test
 * Send a test message (admin only, for testing)
 */
router.post('/send-test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ message: 'phoneNumber and message are required' });
    }

    await whatsappService.sendMessage(phoneNumber, message);
    res.json({ success: true, message: 'Test message sent' });
  } catch (error) {
    logger.error('Test message failed:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/whatsapp/test-ai
 * Test AI parsing directly (for debugging)
 */
router.post('/test-ai', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'message is required' });
    }

    // Check API key status
    const hasApiKey = !!whatsappConfig.openaiApiKey;
    const apiKeyPrefix = hasApiKey ? whatsappConfig.openaiApiKey.substring(0, 10) + '...' : 'NOT SET';
    
    // Initialize AI service
    const initialized = aiService.initialize();
    
    // Create mock user
    const mockUser = {
      _id: 'test',
      firstName: 'Test',
      lastName: 'User',
      role: 'employee'
    };
    
    // Parse the message
    const result = await aiService.parseMessage(message, mockUser);
    
    res.json({
      success: true,
      debug: {
        hasApiKey,
        apiKeyPrefix,
        initialized,
        envKeys: Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('API')),
      },
      input: message,
      result
    });
  } catch (error) {
    logger.error('AI test failed:', error);
    res.status(500).json({ 
      success: false,
      message: error.message,
      stack: error.stack 
    });
  }
});

export default router;
