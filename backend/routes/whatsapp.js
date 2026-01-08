/**
 * WhatsApp Routes - Twilio Webhook Handlers
 * Handles incoming WhatsApp messages and processes task commands
 */

import express from 'express';
import whatsappService from '../services/whatsappService.js';
import aiService from '../services/aiService.js';
import conversationService from '../services/conversationService.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Reminder from '../models/Reminder.js';
import logger from '../config/logger.js';
import whatsappConfig from '../config/whatsapp.js';

const router = express.Router();

// Manager roles that can assign tasks to others
const MANAGER_ROLES = ['admin', 'manager', 'hr', 'chairman', 'executive', 'director', 'hod', 'teamlead'];

/**
 * Helper to get company ID from user (handles populated or unpopulated company)
 * @param {object} user - User object
 * @returns {ObjectId} - Company ID
 */
const getCompanyId = (user) => user.company?._id || user.company;

/**
 * Normalize status string to valid task status
 * @param {string} status - Status string from user
 * @returns {string|null} - Normalized status or null if invalid
 */
const normalizeStatus = (status) => {
  if (!status) return null;
  const lower = status.toLowerCase().trim();
  const statusMap = {
    'completed': 'completed',
    'done': 'completed',
    'finished': 'completed',
    'complete': 'completed',
    'in-progress': 'in-progress',
    'inprogress': 'in-progress',
    'in progress': 'in-progress',
    'started': 'in-progress',
    'working': 'in-progress',
    'pending': 'pending',
    'todo': 'pending',
    'blocked': 'blocked',
    'stuck': 'blocked',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'cancel': 'cancelled',
  };
  return statusMap[lower] || null;
};

/**
 * Normalize task ID to proper format
 * @param {string} taskId - Task ID from user
 * @returns {string} - Normalized task ID
 */
const normalizeTaskId = (taskId) => {
  if (!taskId) return null;
  let normalized = taskId.toUpperCase().trim();
  if (!normalized.startsWith('TASK-')) {
    normalized = `TASK-${normalized}`;
  }
  return normalized;
};

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

    // Check for cancel command
    if (messageText.toLowerCase().trim() === 'cancel') {
      await conversationService.clearPendingState(from);
      await whatsappService.sendMessage(from, 'PVARA HRMS\n\nAction cancelled. How can I help you?');
      return res.status(200).send('OK');
    }

    // Check if there's a pending conversation that needs more info
    const pendingState = await conversationService.getPendingState(from);
    
    if (pendingState && pendingState.pendingAction) {
      // User is continuing a multi-turn conversation
      logger.info('Continuing pending conversation', { 
        action: pendingState.pendingAction, 
        missingFields: pendingState.missingFields 
      });

      // Merge user's reply with pending data
      const mergedData = conversationService.mergeUserReply(
        pendingState.pendingAction,
        pendingState.pendingData,
        pendingState.missingFields,
        messageText
      );

      // Check if we now have all required fields
      const check = conversationService.checkRequiredFields(pendingState.pendingAction, mergedData);
      
      if (check.isComplete) {
        // Clear pending state and process the complete action
        await conversationService.clearPendingState(from);
        
        const completeAction = {
          action: pendingState.pendingAction,
          ...mergedData
        };
        
        logger.info('Multi-turn conversation complete, processing action', { action: completeAction.action });
        await processAction(completeAction, user, from);
      } else {
        // Still missing fields, update state and prompt for next field
        await conversationService.setPendingState(
          from,
          user._id,
          pendingState.pendingAction,
          mergedData,
          check.missingFields,
          check.prompt
        );
        await whatsappService.sendMessage(from, check.prompt);
      }
      
      return res.status(200).send('OK');
    }

    // Parse the message to extract action (new conversation)
    const parsedAction = await aiService.parseMessage(messageText, user);
    logger.info('Parsed action', { action: parsedAction.action, userId: user._id });

    // Check if action has required fields
    const fieldCheck = conversationService.checkRequiredFields(parsedAction.action, parsedAction);
    
    if (!fieldCheck.isComplete) {
      // Missing required fields - start multi-turn conversation
      logger.info('Starting multi-turn conversation', { 
        action: parsedAction.action, 
        missingFields: fieldCheck.missingFields 
      });
      
      await conversationService.setPendingState(
        from,
        user._id,
        parsedAction.action,
        parsedAction,
        fieldCheck.missingFields,
        fieldCheck.prompt
      );
      await whatsappService.sendMessage(from, fieldCheck.prompt);
      return res.status(200).send('OK');
    }

    // Process the action (all fields present)
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
        if (!action.taskId) {
          await whatsappService.sendMessage(phoneNumber, 'PVARA HRMS - Error\n\nPlease specify a task ID.\n\nExample: "Show task TASK-2026-0001"');
          break;
        }
        await viewTaskDetails(user, phoneNumber, action.taskId);
        break;

      case 'createTask':
        await createTask(user, phoneNumber, action);
        break;

      case 'assignTask':
        await assignTask(user, phoneNumber, action);
        break;

      case 'updateTaskStatus':
        logger.info('Processing updateTaskStatus', { taskId: action.taskId, status: action.status, rawAction: action });
        if (!action.taskId) {
          await whatsappService.sendMessage(phoneNumber, 'PVARA HRMS - Error\n\nPlease specify a task ID.\n\nExample: "Task TASK-2026-0001 completed"');
          break;
        }
        await updateTaskStatus(user, phoneNumber, action.taskId, action.status);
        break;

      case 'updateTaskStatusAndProgress':
        await updateTaskStatusAndProgress(user, phoneNumber, action.taskId, action.status, action.progress);
        break;

      case 'updateTaskProgress':
        if (!action.taskId) {
          await whatsappService.sendMessage(phoneNumber, 'PVARA HRMS - Error\n\nPlease specify a task ID.\n\nExample: "Task TASK-2026-0001 progress 50%"');
          break;
        }
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
        if (!action.taskId) {
          await whatsappService.sendMessage(phoneNumber, 'PVARA HRMS - Error\n\nPlease specify a task ID.\n\nExample: "Cancel task TASK-2026-0001"');
          break;
        }
        await cancelTask(user, phoneNumber, action.taskId);
        break;

      case 'setReminder':
        await setReminder(user, phoneNumber, action);
        break;

      case 'scheduleMeeting':
        await scheduleMeeting(user, phoneNumber, action);
        break;

      case 'listReminders':
      case 'viewReminders':
        await listReminders(user, phoneNumber);
        break;

      case 'listMeetings':
      case 'viewMeetings':
        await listMeetings(user, phoneNumber, action.filters);
        break;

      case 'cancelReminder':
      case 'deleteReminder':
        await cancelReminder(user, phoneNumber, action.reminderId);
        break;

      case 'cancelMeeting':
      case 'deleteMeeting':
        await cancelReminder(user, phoneNumber, action.reminderId); // Reuse cancel logic
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
    company: getCompanyId(user),
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
    company: getCompanyId(user),
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
    company: getCompanyId(user),
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
  // Normalize task ID
  const normalizedTaskId = normalizeTaskId(taskId);
  
  const task = await Task.findOne({
    project: normalizedTaskId,
    company: getCompanyId(user)
  })
    .populate('assignedTo', 'firstName lastName email')
    .populate('assignedBy', 'firstName lastName')
    .populate('secondaryAssignees', 'firstName lastName');

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${normalizedTaskId || taskId} not found`);
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
  const taskCount = await Task.countDocuments({ company: getCompanyId(user) });
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
    company: getCompanyId(user),
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
    company: getCompanyId(user),
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
  const taskCount = await Task.countDocuments({ company: getCompanyId(user) });
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
    company: getCompanyId(user),
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
  // Validate status is provided
  if (!status) {
    await whatsappService.sendMessage(phoneNumber, 
      `PVARA HRMS - Status Required\n\nPlease specify the new status.\n\nExample: "Task ${taskId} completed"\n\nValid statuses: pending, in-progress, completed, blocked, cancelled`);
    return;
  }

  // Normalize the status
  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus) {
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Invalid Status\n\n"${status}" is not a valid status.\n\nValid statuses: pending, in-progress, completed, blocked, cancelled`);
    return;
  }

  // Normalize task ID (add TASK- prefix if missing)
  let normalizedTaskId = taskId;
  if (taskId && !taskId.toUpperCase().startsWith('TASK-')) {
    normalizedTaskId = `TASK-${taskId}`;
  }
  normalizedTaskId = normalizedTaskId.toUpperCase();

  const task = await Task.findOne({
    project: normalizedTaskId,
    company: getCompanyId(user)
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${normalizedTaskId} not found`);
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
  
  // Build atomic update
  const updateData = {
    status: normalizedStatus,
    $push: {
      updates: {
        message: `Status changed from ${oldStatus} to ${normalizedStatus} via WhatsApp`,
        addedBy: user._id,
        addedAt: new Date(),
        status: normalizedStatus,
      }
    }
  };

  // Auto-set progress for completed status
  if (normalizedStatus === 'completed' && oldProgress < 100) {
    updateData.progress = 100;
  }

  // Atomic update with verification
  const updatedTask = await Task.findOneAndUpdate(
    { _id: task._id },
    updateData,
    { new: true, runValidators: true }
  ).populate('assignedTo', 'firstName lastName');

  if (!updatedTask || updatedTask.status !== normalizedStatus) {
    logger.error('Task status update failed', { taskId: normalizedTaskId, expected: normalizedStatus, actual: updatedTask?.status, userId: user._id });
    await whatsappService.sendErrorMessage(phoneNumber, `Failed to update task ${normalizedTaskId}. Please try again.`);
    return;
  }

  logger.info('Task status updated via WhatsApp', { 
    taskId: normalizedTaskId, 
    oldStatus, 
    newStatus: updatedTask.status, 
    userId: user._id,
    verified: true 
  });

  await whatsappService.sendTaskUpdateConfirmation(phoneNumber, updatedTask, 'status');
}

/**
 * Update task status AND progress (single command)
 * This is used when the user explicitly provides both (e.g., "completed 50%").
 */
async function updateTaskStatusAndProgress(user, phoneNumber, taskId, status, progress) {
  // Normalize task ID
  const normalizedTaskId = normalizeTaskId(taskId);
  if (!normalizedTaskId) {
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Task ID Required\n\nPlease specify a task ID.\n\nExample: "TASK-2026-0001 completed 50%"`);
    return;
  }

  // Normalize status
  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus) {
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Invalid Status\n\n"${status}" is not valid.\n\nValid statuses: pending, in-progress, completed, blocked, cancelled`);
    return;
  }

  const task = await Task.findOne({
    project: normalizedTaskId,
    company: getCompanyId(user)
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${normalizedTaskId} not found`);
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

  const parsedProgress = parseInt(progress, 10);
  const normalizedProgress = !isNaN(parsedProgress) ? Math.min(100, Math.max(0, parsedProgress)) : 
    (normalizedStatus === 'completed' ? 100 : oldProgress);

  // Build atomic update
  const updateData = {
    status: normalizedStatus,
    progress: normalizedProgress,
    $push: {
      updates: {
        message: `Status/progress updated via WhatsApp (status: ${oldStatus} → ${normalizedStatus}, progress: ${oldProgress}% → ${normalizedProgress}%)`,
        addedBy: user._id,
        addedAt: new Date(),
        status: normalizedStatus,
        progress: normalizedProgress,
      }
    }
  };

  // Atomic update with verification
  const updatedTask = await Task.findOneAndUpdate(
    { _id: task._id },
    updateData,
    { new: true, runValidators: true }
  ).populate('assignedTo', 'firstName lastName');

  if (!updatedTask || updatedTask.status !== normalizedStatus) {
    logger.error('Task status+progress update failed', { 
      taskId: normalizedTaskId, 
      expectedStatus: normalizedStatus, 
      actualStatus: updatedTask?.status,
      expectedProgress: normalizedProgress,
      actualProgress: updatedTask?.progress,
      userId: user._id 
    });
    await whatsappService.sendErrorMessage(phoneNumber, `Failed to update task ${normalizedTaskId}. Please try again.`);
    return;
  }

  logger.info('Task status+progress updated via WhatsApp', {
    taskId: normalizedTaskId,
    oldStatus,
    newStatus: updatedTask.status,
    oldProgress,
    newProgress: updatedTask.progress,
    userId: user._id,
    verified: true,
  });

  await whatsappService.sendTaskUpdateConfirmation(phoneNumber, updatedTask, 'status');
}

/**
 * Update task progress
 */
async function updateTaskProgress(user, phoneNumber, taskId, progress) {
  // Validate progress
  if (progress === undefined || progress === null) {
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Progress Required\n\nPlease specify the progress percentage.\n\nExample: "Task ${taskId} progress 50%"`);
    return;
  }

  const progressNum = parseInt(progress, 10);
  if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Invalid Progress\n\n"${progress}" is not valid. Please use a number between 0-100.\n\nExample: "Task ${taskId} progress 75%"`);
    return;
  }

  // Normalize task ID
  const normalizedTaskId = normalizeTaskId(taskId);
  if (!normalizedTaskId) {
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Task ID Required\n\nPlease specify a task ID.\n\nExample: "TASK-2026-0001 progress 50%"`);
    return;
  }

  const task = await Task.findOne({
    project: normalizedTaskId,
    company: getCompanyId(user)
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${normalizedTaskId} not found`);
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
  
  // Use findOneAndUpdate for atomic operation to ensure database persistence
  const updateData = {
    progress: progressNum,
    $push: {
      updates: {
        message: `Progress updated from ${oldProgress}% to ${progressNum}% via WhatsApp`,
        addedBy: user._id,
        addedAt: new Date(),
        progress: progressNum,
      }
    }
  };

  // Auto-complete if progress is 100%
  if (progressNum === 100 && task.status !== 'completed') {
    updateData.status = 'completed';
  }

  // Atomic update with verification
  const updatedTask = await Task.findOneAndUpdate(
    { _id: task._id },
    updateData,
    { new: true, runValidators: true }
  ).populate('assignedTo', 'firstName lastName');

  if (!updatedTask) {
    logger.error('Task update failed - document not found after update', { taskId: normalizedTaskId, userId: user._id });
    await whatsappService.sendErrorMessage(phoneNumber, `Failed to update task ${normalizedTaskId}. Please try again.`);
    return;
  }

  // Verify the update actually persisted by checking the returned document
  if (updatedTask.progress !== progressNum) {
    logger.error('Task progress mismatch after save', { 
      taskId: normalizedTaskId, 
      expected: progressNum, 
      actual: updatedTask.progress,
      userId: user._id 
    });
    await whatsappService.sendErrorMessage(phoneNumber, `Failed to save progress update. Please try again.`);
    return;
  }

  logger.info('Task progress updated via WhatsApp', { 
    taskId: normalizedTaskId, 
    oldProgress, 
    newProgress: updatedTask.progress, 
    userId: user._id,
    verified: true 
  });

  await whatsappService.sendTaskUpdateConfirmation(phoneNumber, updatedTask, 'progress');
}

/**
 * Add update/comment to task
 */
async function addTaskUpdate(user, phoneNumber, taskId, message) {
  // Normalize task ID
  const normalizedTaskId = normalizeTaskId(taskId);
  
  const task = await Task.findOne({
    project: normalizedTaskId,
    company: getCompanyId(user)
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${normalizedTaskId || taskId} not found`);
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
  // Normalize task ID
  const normalizedTaskId = normalizeTaskId(taskId);
  
  const task = await Task.findOne({
    project: normalizedTaskId,
    company: getCompanyId(user)
  });

  if (!task) {
    await whatsappService.sendMessage(phoneNumber, 
      `PVARA HRMS - Task Not Found\n\nTask ${normalizedTaskId || taskId} was not found in the system.`);
    return;
  }

  // Check if user has permission (task owner, assignee, or admin/manager)
  const isAssignee = task.assignedTo?.toString() === user._id.toString() ||
                     task.secondaryAssignees?.some(a => a.toString() === user._id.toString());
  const isCreator = task.createdBy?.toString() === user._id.toString();
  const isAdmin = ['admin', 'manager', 'chairman'].includes(user.role);

  if (!isAssignee && !isCreator && !isAdmin) {
    await whatsappService.sendMessage(phoneNumber, 
      `PVARA HRMS - Permission Denied\n\nYou do not have permission to cancel task ${normalizedTaskId}.`);
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
  // Normalize task ID
  const normalizedTaskId = normalizeTaskId(taskId);
  
  const task = await Task.findOne({
    project: normalizedTaskId,
    company: getCompanyId(user)
  });

  if (!task) {
    await whatsappService.sendErrorMessage(phoneNumber, `Task ${normalizedTaskId || taskId} not found`);
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
 * Set a personal reminder
 */
async function setReminder(user, phoneNumber, parsed) {
  try {
    const { reminderTitle, reminderMessage, reminderTime } = parsed;
    
    if (!reminderTime) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Reminder Error\n\nPlease specify when you want to be reminded.\n\nExample: "Remind me about the meeting at 2:30 PM tomorrow"`);
      return;
    }

    // Parse the reminder time - AI returns PKT time string (no timezone suffix)
    // We need to interpret it as PKT and convert to UTC for storage
    let reminderDate;
    try {
      // The AI returns time like "2026-01-09T14:30:00" which is PKT
      // Parse it and treat as PKT (UTC+5)
      
      // First, parse as-is (JavaScript will treat it as local time on server)
      // Since server is UTC, we need to manually handle the PKT offset
      
      // Create date from the string (interpreted as UTC since no suffix)
      const parsedDate = new Date(reminderTime);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
      
      // The AI already calculated the time in PKT. The string represents PKT time.
      // When parsed without timezone, JS treats it as local time (UTC on Vercel).
      // So "14:30:00" becomes 2:30 PM UTC, but it should be 2:30 PM PKT = 9:30 AM UTC.
      // We need to SUBTRACT 5 hours to convert PKT → UTC.
      const pktOffsetMs = 5 * 60 * 60 * 1000;
      reminderDate = new Date(parsedDate.getTime() - pktOffsetMs);
      
      logger.info('Reminder time parsing', {
        input: reminderTime,
        parsedAsUTC: parsedDate.toISOString(),
        convertedToUTC: reminderDate.toISOString(),
        displayPKT: reminderDate.toLocaleString('en-GB', { timeZone: 'Asia/Karachi' }),
      });
    } catch (err) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Reminder Error\n\nCould not understand the date/time. Please try again.\n\nExample: "Remind me about meeting at 3pm on 10th Jan"`);
      return;
    }

    // Check if reminder time is in the future (compare in UTC)
    if (reminderDate <= new Date()) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Reminder Error\n\nThe reminder time must be in the future. Please try again.`);
      return;
    }

    // Generate reminder ID
    const count = await Reminder.countDocuments({ user: user._id });
    const reminderId = `REM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create the reminder
    const reminder = new Reminder({
      reminderId,
      user: user._id,
      company: getCompanyId(user),
      title: reminderTitle || reminderMessage || 'Reminder',
      message: reminderMessage || reminderTitle || 'You have a reminder',
      reminderTime: reminderDate,
      status: 'pending',
      source: 'whatsapp',
    });

    await reminder.save();

    logger.info('Reminder created via WhatsApp', { reminderId, userId: user._id, reminderTime: reminderDate });

    // Format the date nicely in PKT timezone for display
    const formattedDate = reminderDate.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    });
    const formattedTime = reminderDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });

    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Reminder Set\n\nReference: ${reminderId}\nTitle: ${reminder.title}\nWhen: ${formattedDate} at ${formattedTime}\n\nYou will receive a WhatsApp notification at the scheduled time.`);

  } catch (error) {
    logger.error('Error setting reminder:', error);
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Error\n\nFailed to set reminder. Please try again later.`);
  }
}

/**
 * List user's upcoming reminders
 */
async function listReminders(user, phoneNumber) {
  try {
    const reminders = await Reminder.find({
      user: user._id,
      status: 'pending',
      reminderTime: { $gte: new Date() }
    })
    .sort({ reminderTime: 1 })
    .limit(10);

    if (reminders.length === 0) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - No Upcoming Reminders\n\nYou have no upcoming reminders.\n\nTo set a reminder, say: "Remind me about [something] at [time] on [date]"`);
      return;
    }

    let message = `PVARA HRMS - Your Upcoming Reminders\n\n`;

    reminders.forEach((reminder, index) => {
      const date = reminder.reminderTime.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Karachi'
      });
      const time = reminder.reminderTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi'
      });
      
      message += `${index + 1}. ${reminder.title}\n`;
      message += `   ID: ${reminder.reminderId}\n`;
      message += `   When: ${date} at ${time}\n\n`;
    });

    message += `To cancel a reminder, say: "Cancel reminder [ID]"`;

    await whatsappService.sendMessage(phoneNumber, message);

  } catch (error) {
    logger.error('Error listing reminders:', error);
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Error\n\nFailed to retrieve reminders. Please try again later.`);
  }
}

/**
 * Cancel a reminder
 */
async function cancelReminder(user, phoneNumber, reminderId) {
  try {
    if (!reminderId) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Reminder ID Required\n\nPlease specify the reminder ID to cancel.\n\nSay "list reminders" to see your reminder IDs.`);
      return;
    }

    // Normalize reminder ID
    let normalizedId = reminderId;
    if (!normalizedId.startsWith('REM-')) {
      normalizedId = `REM-${normalizedId}`;
    }

    const reminder = await Reminder.findOne({
      $or: [
        { reminderId: normalizedId },
        { reminderId: reminderId }
      ],
      user: user._id
    });

    if (!reminder) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Reminder Not Found\n\nReminder ${reminderId} was not found or does not belong to you.`);
      return;
    }

    reminder.status = 'cancelled';
    await reminder.save();

    logger.info('Reminder cancelled via WhatsApp', { reminderId: reminder.reminderId, userId: user._id });

    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Reminder Cancelled\n\nReference: ${reminder.reminderId}\nTitle: ${reminder.title}\n\nThis reminder has been cancelled.`);

  } catch (error) {
    logger.error('Error cancelling reminder:', error);
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Error\n\nFailed to cancel reminder. Please try again later.`);
  }
}

/**
 * Schedule a meeting (creates a reminder with type='meeting')
 */
async function scheduleMeeting(user, phoneNumber, parsed) {
  try {
    const { meetingSubject, meetingWith, meetingLocation, reminderTime, reminderTitle } = parsed;
    
    const subject = meetingSubject || reminderTitle;
    
    if (!reminderTime) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Meeting Time Required\n\nPlease specify when the meeting is.\n\nExample: "Schedule meeting with Ahmed about budget at 3pm tomorrow"`);
      return;
    }

    if (!subject) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Meeting Subject Required\n\nPlease specify what the meeting is about.\n\nExample: "Meeting with team about project update at 2pm"`);
      return;
    }

    // Parse the meeting time - AI returns PKT time, convert to UTC for storage
    let meetingDate;
    try {
      const pktDate = new Date(reminderTime);
      if (isNaN(pktDate.getTime())) {
        throw new Error('Invalid date');
      }
      // Subtract 5 hours to convert PKT → UTC
      const pktOffsetMs = 5 * 60 * 60 * 1000;
      meetingDate = new Date(pktDate.getTime() - pktOffsetMs);
    } catch (err) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Meeting Error\n\nCould not understand the date/time. Please try again.\n\nExample: "Meeting with client at 3pm on Monday"`);
      return;
    }

    // Check if meeting time is in the future
    if (meetingDate <= new Date()) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - Meeting Error\n\nThe meeting time must be in the future. Please try again.`);
      return;
    }

    // Generate meeting ID (using MTG prefix)
    const count = await Reminder.countDocuments({ user: user._id, reminderType: 'meeting' });
    const meetingId = `MTG-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Build meeting title
    let title = subject;
    if (meetingWith) {
      title = `Meeting with ${meetingWith}: ${subject}`;
    }

    // Create the meeting as a reminder
    const meeting = new Reminder({
      reminderId: meetingId,
      user: user._id,
      company: getCompanyId(user),
      title: title,
      message: `Meeting: ${subject}${meetingWith ? `\nWith: ${meetingWith}` : ''}${meetingLocation ? `\nLocation: ${meetingLocation}` : ''}`,
      reminderTime: meetingDate,
      status: 'pending',
      source: 'whatsapp',
      reminderType: 'meeting',
      meetingWith: meetingWith || null,
      meetingLocation: meetingLocation || null,
    });

    await meeting.save();

    logger.info('Meeting scheduled via WhatsApp', { meetingId, userId: user._id, meetingTime: meetingDate });

    // Format the date nicely in PKT timezone for display
    const formattedDate = meetingDate.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    });
    const formattedTime = meetingDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });

    let confirmMsg = `PVARA HRMS - Meeting Scheduled\n\nReference: ${meetingId}\nSubject: ${subject}`;
    if (meetingWith) confirmMsg += `\nWith: ${meetingWith}`;
    if (meetingLocation) confirmMsg += `\nLocation: ${meetingLocation}`;
    confirmMsg += `\nWhen: ${formattedDate} at ${formattedTime}`;
    confirmMsg += `\n\nYou will receive a WhatsApp reminder at the scheduled time.`;

    await whatsappService.sendMessage(phoneNumber, confirmMsg);

  } catch (error) {
    logger.error('Error scheduling meeting:', error);
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Error\n\nFailed to schedule meeting. Please try again later.`);
  }
}

/**
 * List user's scheduled meetings
 */
async function listMeetings(user, phoneNumber, filters = {}) {
  try {
    // Determine date range - default to today
    const now = new Date();
    let startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1); // Tomorrow at midnight
    
    let periodLabel = 'Today';
    
    // Check for date filters
    if (filters?.period === 'tomorrow') {
      startDate.setDate(startDate.getDate() + 1);
      endDate.setDate(endDate.getDate() + 1);
      periodLabel = 'Tomorrow';
    } else if (filters?.period === 'week' || filters?.period === 'this week') {
      endDate.setDate(startDate.getDate() + 7);
      periodLabel = 'This Week';
    } else if (filters?.period === 'all') {
      endDate = null; // No end date
      periodLabel = 'All Upcoming';
    }

    const query = {
      user: user._id,
      reminderType: 'meeting',
      status: 'pending',
      reminderTime: { $gte: startDate }
    };
    
    if (endDate) {
      query.reminderTime.$lt = endDate;
    }

    const meetings = await Reminder.find(query)
      .sort({ reminderTime: 1 })
      .limit(15);

    if (meetings.length === 0) {
      await whatsappService.sendMessage(phoneNumber,
        `PVARA HRMS - No Meetings ${periodLabel}\n\nYou have no scheduled meetings for ${periodLabel.toLowerCase()}.\n\nTo schedule a meeting, say: "Schedule meeting with [person] about [subject] at [time]"`);
      return;
    }

    let message = `PVARA HRMS - Your Meetings (${periodLabel})\n\n`;

    meetings.forEach((meeting, index) => {
      const date = meeting.reminderTime.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Karachi'
      });
      const time = meeting.reminderTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi'
      });
      
      message += `${index + 1}. ${meeting.title}\n`;
      message += `   ID: ${meeting.reminderId}\n`;
      message += `   When: ${date} at ${time}\n`;
      if (meeting.meetingWith) message += `   With: ${meeting.meetingWith}\n`;
      if (meeting.meetingLocation) message += `   Location: ${meeting.meetingLocation}\n`;
      message += `\n`;
    });

    message += `To cancel a meeting, say: "Cancel meeting [ID]"`;

    await whatsappService.sendMessage(phoneNumber, message);

  } catch (error) {
    logger.error('Error listing meetings:', error);
    await whatsappService.sendMessage(phoneNumber,
      `PVARA HRMS - Error\n\nFailed to retrieve meetings. Please try again later.`);
  }
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

/**
 * POST /api/whatsapp/trigger-digest
 * Manually trigger daily digest (for admin/testing)
 */
router.post('/trigger-digest', async (req, res) => {
  try {
    const reminderScheduler = (await import('../services/reminderScheduler.js')).default;
    
    logger.info('Manually triggering daily digest via API');
    await reminderScheduler.triggerDailyDigest();
    
    res.json({ success: true, message: 'Daily digest triggered successfully' });
  } catch (error) {
    logger.error('Failed to trigger daily digest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/whatsapp/trigger-reminders
 * Manually check and send due reminders (for admin/testing)
 */
router.post('/trigger-reminders', async (req, res) => {
  try {
    logger.info('Manually triggering reminder check via API');
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // Last 5 minutes
    const windowEnd = now;

    const dueReminders = await Reminder.find({
      status: 'pending',
      sent: { $ne: true },
      reminderTime: { $gte: windowStart, $lte: windowEnd }
    }).populate('user', 'firstName lastName phone whatsappNumber whatsappPreferences');

    logger.info(`Found ${dueReminders.length} due reminders`);

    let sentCount = 0;
    let errorCount = 0;
    const results = [];

    for (const reminder of dueReminders) {
      try {
        const user = reminder.user;
        if (!user) {
          results.push({ id: reminder.reminderId, status: 'skipped', reason: 'No user' });
          continue;
        }

        const phoneNumber = user.whatsappNumber || user.phone;
        if (!phoneNumber) {
          results.push({ id: reminder.reminderId, status: 'skipped', reason: 'No phone' });
          continue;
        }

        if (user.whatsappPreferences?.enabled === false) {
          results.push({ id: reminder.reminderId, status: 'skipped', reason: 'WhatsApp disabled' });
          continue;
        }

        // Build message
        const isMeeting = reminder.reminderType === 'meeting';
        const headerType = isMeeting ? 'Meeting Reminder' : 'Reminder';
        
        let message = `PVARA HRMS - ${headerType}\n\n${reminder.title}`;
        if (reminder.message && reminder.message !== reminder.title) {
          message += `\n\n${reminder.message}`;
        }
        if (isMeeting && reminder.meetingWith) {
          message += `\n\nWith: ${reminder.meetingWith}`;
        }
        message += `\n\nReference: ${reminder.reminderId}`;
        message += `\nTime: ${reminder.reminderTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' 
        })}`;

        await whatsappService.sendMessage(phoneNumber, message.trim());

        // Mark as sent
        reminder.sent = true;
        reminder.sentAt = new Date();
        reminder.status = 'completed';
        await reminder.save();

        results.push({ id: reminder.reminderId, status: 'sent', to: user.firstName });
        sentCount++;
      } catch (error) {
        results.push({ id: reminder.reminderId, status: 'error', error: error.message });
        errorCount++;
      }
    }

    res.json({ 
      success: true, 
      checked: dueReminders.length,
      sent: sentCount, 
      errors: errorCount,
      results 
    });
  } catch (error) {
    logger.error('Failed to trigger reminder check:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/whatsapp/pending-reminders
 * List all pending reminders (for debugging)
 */
router.get('/pending-reminders', async (req, res) => {
  try {
    const reminders = await Reminder.find({
      status: 'pending',
      sent: { $ne: true }
    })
    .populate('user', 'firstName lastName phone whatsappNumber')
    .sort({ reminderTime: 1 })
    .limit(50);

    res.json({
      success: true,
      count: reminders.length,
      currentTime: new Date().toISOString(),
      currentTimePKT: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' }),
      reminders: reminders.map(r => ({
        id: r.reminderId,
        title: r.title,
        type: r.reminderType || 'reminder',
        time: r.reminderTime,
        timePKT: r.reminderTime.toLocaleString('en-GB', { timeZone: 'Asia/Karachi' }),
        user: r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Unknown',
        phone: r.user?.whatsappNumber || r.user?.phone || 'No phone',
      }))
    });
  } catch (error) {
    logger.error('Failed to list pending reminders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
