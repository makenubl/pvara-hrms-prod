/**
 * Reminder Scheduler Service
 * Sends WhatsApp notifications for task deadlines, daily digests, and personal reminders
 */

import Task from '../models/Task.js';
import User from '../models/User.js';
import Reminder from '../models/Reminder.js';
import whatsappService from './whatsappService.js';
import whatsappConfig from '../config/whatsapp.js';
import logger from '../config/logger.js';

class ReminderScheduler {
  constructor() {
    this.intervalId = null;
    this.dailyDigestIntervalId = null;
    this.checkIntervalMs = 60 * 1000; // Check every minute
    this.isRunning = false;
    this.lastDigestDate = null; // Track when last digest was sent
  }

  /**
   * Start the reminder scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Reminder scheduler is already running');
      return;
    }

    // Initialize WhatsApp service
    if (!whatsappService.initialize()) {
      logger.warn('Reminder scheduler not started: WhatsApp service not configured');
      return;
    }

    this.isRunning = true;
    logger.info('Reminder scheduler started');

    // Run immediately on start
    this.checkAndSendReminders();
    this.checkPersonalReminders(); // Also check personal reminders on start

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkAndSendReminders();
      this.checkDailyDigest(); // Check if it's time for daily digest
      this.checkPersonalReminders(); // Check for personal reminders
    }, this.checkIntervalMs);
  }

  /**
   * Stop the reminder scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('🔔 Reminder scheduler stopped');
  }

  /**
   * Check for upcoming deadlines and send reminders
   */
  async checkAndSendReminders() {
    try {
      const now = new Date();
      
      // Get all reminder intervals from config
      for (const interval of whatsappConfig.reminderIntervals) {
        await this.processReminderInterval(now, interval);
      }
    } catch (error) {
      logger.error('Reminder check failed:', error);
    }
  }

  /**
   * Process reminders for a specific interval
   * @param {Date} now - Current time
   * @param {object} interval - Interval configuration { minutes, label }
   */
  async processReminderInterval(now, interval) {
    try {
      const { minutes, label } = interval;
      
      // Calculate the deadline window (within 1 minute of the target time)
      const targetTime = new Date(now.getTime() + minutes * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 30 * 1000); // 30 seconds before
      const windowEnd = new Date(targetTime.getTime() + 30 * 1000);   // 30 seconds after

      // Find tasks with deadlines in this window that haven't been reminded
      const tasks = await Task.find({
        deadline: { $gte: windowStart, $lte: windowEnd },
        status: { $nin: ['completed', 'cancelled'] },
        // Check if this reminder hasn't been sent yet
        [`reminders.${minutes}`]: { $ne: true }
      })
        .populate('assignedTo', 'firstName lastName phone whatsappNumber whatsappPreferences')
        .populate('secondaryAssignees', 'firstName lastName phone whatsappNumber whatsappPreferences')
        .populate('assignedBy', 'firstName lastName');

      for (const task of tasks) {
        await this.sendTaskReminders(task, label, minutes);
      }
    } catch (error) {
      logger.error(`Failed to process ${interval.label} reminders:`, error);
    }
  }

  /**
   * Send reminders for a specific task to all assignees
   * @param {object} task - Task document
   * @param {string} timeLabel - Human readable time left
   * @param {number} minutes - Minutes before deadline
   */
  async sendTaskReminders(task, timeLabel, minutes) {
    try {
      // Get all assignees (primary + secondary)
      const assignees = [task.assignedTo, ...(task.secondaryAssignees || [])].filter(Boolean);

      for (const assignee of assignees) {
        // Check if assignee has WhatsApp configured
        const phoneNumber = assignee.whatsappNumber || assignee.phone;
        if (!phoneNumber) continue;

        // Check if reminders are enabled for this user
        if (assignee.whatsappPreferences?.enabled === false) continue;
        if (assignee.whatsappPreferences?.reminders === false) continue;

        // Check user's preferred reminder intervals
        const userIntervals = assignee.whatsappPreferences?.reminderIntervals || 
          whatsappConfig.reminderIntervals.map(i => i.minutes);
        if (!userIntervals.includes(minutes)) continue;

        try {
          await whatsappService.sendTaskReminder(phoneNumber, task, timeLabel);
          logger.info(`Reminder sent for task ${task.project} to ${assignee.firstName}`, {
            taskId: task._id,
            userId: assignee._id,
            timeLabel
          });
        } catch (error) {
          logger.error(`Failed to send reminder to ${phoneNumber}:`, error);
        }
      }

      // Mark reminder as sent
      await Task.updateOne(
        { _id: task._id },
        { $set: { [`reminders.${minutes}`]: true } }
      );
    } catch (error) {
      logger.error('Failed to send task reminders:', error);
    }
  }

  /**
   * Send immediate notification when task is assigned
   * @param {object} task - Task document (populated)
   */
  async sendTaskAssignedNotification(task) {
    try {
      const assignees = [task.assignedTo, ...(task.secondaryAssignees || [])].filter(Boolean);

      for (const assignee of assignees) {
        const phoneNumber = assignee.whatsappNumber || assignee.phone;
        if (!phoneNumber) continue;

        // Check preferences
        if (assignee.whatsappPreferences?.enabled === false) continue;
        if (assignee.whatsappPreferences?.taskAssigned === false) continue;

        try {
          await whatsappService.sendTaskAssignedNotification(phoneNumber, task);
          logger.info(`Task assignment notification sent to ${assignee.firstName}`, {
            taskId: task._id,
            userId: assignee._id
          });
        } catch (error) {
          logger.error(`Failed to send assignment notification to ${phoneNumber}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to send task assigned notifications:', error);
    }
  }

  /**
   * Reset reminders for a task (e.g., when deadline is changed)
   * @param {string} taskId - Task ID
   */
  async resetReminders(taskId) {
    try {
      await Task.updateOne(
        { _id: taskId },
        { $unset: { reminders: 1 } }
      );
      logger.info(`Reminders reset for task ${taskId}`);
    } catch (error) {
      logger.error('Failed to reset reminders:', error);
    }
  }

  /**
   * Send overdue notification
   * @param {object} task - Task document
   */
  async sendOverdueNotification(task) {
    try {
      const assignees = [task.assignedTo, ...(task.secondaryAssignees || [])].filter(Boolean);

      for (const assignee of assignees) {
        const phoneNumber = assignee.whatsappNumber || assignee.phone;
        if (!phoneNumber) continue;

        if (assignee.whatsappPreferences?.enabled === false) continue;

        // Use professional template
        const message = whatsappConfig.templates.taskOverdue(task);

        try {
          await whatsappService.sendMessage(phoneNumber, message);
          logger.info(`Overdue notification sent for task ${task.project}`, {
            taskId: task._id,
            userId: assignee._id
          });
        } catch (error) {
          logger.error(`Failed to send overdue notification to ${phoneNumber}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to send overdue notifications:', error);
    }
  }

  /**
   * Check and send overdue notifications (run daily)
   */
  async checkOverdueTasks() {
    try {
      const now = new Date();
      const tasks = await Task.find({
        deadline: { $lt: now },
        status: { $nin: ['completed', 'cancelled'] },
        'reminders.overdue': { $ne: true }
      })
        .populate('assignedTo', 'firstName lastName phone whatsappNumber whatsappPreferences')
        .populate('secondaryAssignees', 'firstName lastName phone whatsappNumber whatsappPreferences');

      for (const task of tasks) {
        await this.sendOverdueNotification(task);
        
        // Mark overdue notification as sent
        await Task.updateOne(
          { _id: task._id },
          { $set: { 'reminders.overdue': true } }
        );
      }

      logger.info(`Checked ${tasks.length} overdue tasks`);
    } catch (error) {
      logger.error('Failed to check overdue tasks:', error);
    }
  }

  /**
   * Check if it's time to send daily digest (10:30 AM PKT)
   */
  async checkDailyDigest() {
    try {
      const digestConfig = whatsappConfig.dailyDigest;
      if (!digestConfig?.enabled) return;

      // Get current time in Pakistan timezone
      const now = new Date();
      const pakistanTime = new Date(now.toLocaleString('en-US', { timeZone: digestConfig.timezone || 'Asia/Karachi' }));
      
      const currentHour = pakistanTime.getHours();
      const currentMinute = pakistanTime.getMinutes();
      const [targetHour, targetMinute] = (digestConfig.time || '10:30').split(':').map(Number);
      
      // Check if it's the right time (within 1 minute window)
      const isDigestTime = currentHour === targetHour && currentMinute === targetMinute;
      
      // Check if we already sent digest today
      const today = pakistanTime.toDateString();
      if (this.lastDigestDate === today) return;
      
      if (isDigestTime) {
        logger.info('Starting daily digest at 10:30 AM PKT');
        await this.sendDailyDigestToAll();
        this.lastDigestDate = today;
      }
    } catch (error) {
      logger.error('Failed to check daily digest:', error);
    }
  }

  /**
   * Send daily digest to all users with open tasks
   */
  async sendDailyDigestToAll() {
    try {
      // Get all active users with WhatsApp enabled (exclude chairman)
      const users = await User.find({
        status: 'active',
        role: { $ne: 'chairman' },
        'whatsappPreferences.enabled': { $ne: false },
        $or: [
          { whatsappNumber: { $exists: true, $ne: '' } },
          { phone: { $exists: true, $ne: '' } }
        ]
      });

      logger.info(`Sending daily digest to ${users.length} users`);
      let sentCount = 0;
      let skipCount = 0;

      for (const user of users) {
        try {
          const sent = await this.sendDailyDigestToUser(user);
          if (sent) sentCount++;
          else skipCount++;
        } catch (error) {
          logger.error(`Failed to send digest to ${user.email}:`, error.message);
        }
      }

      logger.info(`Daily digest complete: ${sentCount} sent, ${skipCount} skipped`);
    } catch (error) {
      logger.error('Failed to send daily digests:', error);
    }
  }

  /**
   * Send daily digest to a specific user
   * @param {object} user - User document
   * @returns {boolean} - Whether message was sent
   */
  async sendDailyDigestToUser(user) {
    try {
      const phoneNumber = user.whatsappNumber || user.phone;
      if (!phoneNumber) return false;

      // Get user's open tasks
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasks = await Task.find({
        $or: [
          { assignedTo: user._id },
          { secondaryAssignees: user._id }
        ],
        status: { $nin: ['completed', 'cancelled'] }
      }).sort({ deadline: 1 });

      // Calculate stats
      const stats = {
        open: tasks.length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        dueToday: tasks.filter(t => {
          if (!t.deadline) return false;
          const deadline = new Date(t.deadline);
          return deadline >= today && deadline < tomorrow;
        }).length,
        overdue: tasks.filter(t => {
          if (!t.deadline) return false;
          return new Date(t.deadline) < now;
        }).length,
      };

      // Skip if user has no open tasks
      if (stats.open === 0) return false;

      // Generate and send message
      const message = whatsappConfig.templates.dailyDigest(user, tasks, stats);
      await whatsappService.sendMessage(phoneNumber, message);
      
      logger.info(`Daily digest sent to ${user.firstName} ${user.lastName}`, {
        userId: user._id,
        openTasks: stats.open,
        overdue: stats.overdue
      });

      return true;
    } catch (error) {
      logger.error(`Failed to send daily digest to user ${user._id}:`, error);
      return false;
    }
  }

  /**
   * Manually trigger daily digest (for testing or admin use)
   */
  async triggerDailyDigest() {
    logger.info('Manually triggering daily digest');
    await this.sendDailyDigestToAll();
  }

  /**
   * Check and send personal reminders that are due
   */
  async checkPersonalReminders() {
    try {
      const now = new Date();
      // Find reminders due within the last 2 minutes (to account for check interval and timing)
      const windowStart = new Date(now.getTime() - 2 * 60 * 1000);
      const windowEnd = now;

      const dueReminders = await Reminder.find({
        status: 'pending',
        sent: { $ne: true },
        reminderTime: { $gte: windowStart, $lte: windowEnd }
      }).populate('user', 'firstName lastName phone whatsappNumber whatsappPreferences');

      for (const reminder of dueReminders) {
        await this.sendPersonalReminder(reminder);
      }

      if (dueReminders.length > 0) {
        logger.info(`Processed ${dueReminders.length} personal reminders`);
      }
    } catch (error) {
      logger.error('Failed to check personal reminders:', error);
    }
  }

  /**
   * Send a personal reminder notification
   * @param {object} reminder - Reminder document
   */
  async sendPersonalReminder(reminder) {
    try {
      const user = reminder.user;
      if (!user) {
        logger.warn(`Reminder ${reminder.reminderId} has no user`);
        return;
      }

      const phoneNumber = user.whatsappNumber || user.phone;
      if (!phoneNumber) {
        logger.warn(`User ${user._id} has no WhatsApp number for reminder`);
        return;
      }

      // Check if user has WhatsApp enabled
      if (user.whatsappPreferences?.enabled === false) {
        logger.info(`Skipping reminder for ${user._id} - WhatsApp disabled`);
        return;
      }

      // Build message based on type (meeting vs reminder)
      const isMeeting = reminder.reminderType === 'meeting';
      const headerType = isMeeting ? 'Meeting Reminder' : 'Reminder';
      
      let message = `PVARA HRMS - ${headerType}\n\n${reminder.title}`;
      
      if (reminder.message && reminder.message !== reminder.title) {
        message += `\n\n${reminder.message}`;
      }
      
      if (isMeeting) {
        if (reminder.meetingWith) message += `\n\nWith: ${reminder.meetingWith}`;
        if (reminder.meetingLocation) message += `\nLocation: ${reminder.meetingLocation}`;
      }
      
      message += `\n\nReference: ${reminder.reminderId}`;
      message += `\nTime: ${reminder.reminderTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' 
      })}`;

      await whatsappService.sendMessage(phoneNumber, message.trim());

      // Mark reminder as sent
      reminder.sent = true;
      reminder.sentAt = new Date();
      reminder.status = 'completed';
      await reminder.save();

      logger.info(`Personal reminder sent: ${reminder.reminderId}`, {
        userId: user._id,
        reminderId: reminder.reminderId
      });

      // Handle recurring reminders
      if (reminder.recurring?.recurType !== 'none') {
        await this.createNextRecurringReminder(reminder);
      }
    } catch (error) {
      logger.error(`Failed to send personal reminder ${reminder.reminderId}:`, error);
    }
  }

  /**
   * Create the next occurrence for a recurring reminder
   * @param {object} reminder - Original reminder document
   */
  async createNextRecurringReminder(reminder) {
    try {
      const { recurType, interval, endDate } = reminder.recurring;
      let nextTime = new Date(reminder.reminderTime);

      // Calculate next reminder time based on recurType
      switch (recurType) {
        case 'daily':
          nextTime.setDate(nextTime.getDate() + (interval || 1));
          break;
        case 'weekly':
          nextTime.setDate(nextTime.getDate() + (7 * (interval || 1)));
          break;
        case 'monthly':
          nextTime.setMonth(nextTime.getMonth() + (interval || 1));
          break;
        default:
          return; // No recurring
      }

      // Check if next time is past end date
      if (endDate && nextTime > new Date(endDate)) {
        logger.info(`Recurring reminder ${reminder.reminderId} ended`);
        return;
      }

      // Generate new reminder ID
      const count = await Reminder.countDocuments({ user: reminder.user._id });
      const newReminderId = `REM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      // Create next reminder
      const nextReminder = new Reminder({
        reminderId: newReminderId,
        user: reminder.user._id,
        title: reminder.title,
        message: reminder.message,
        reminderTime: nextTime,
        recurring: reminder.recurring,
        status: 'pending',
        relatedTask: reminder.relatedTask
      });

      await nextReminder.save();
      logger.info(`Created next recurring reminder: ${newReminderId}`);
    } catch (error) {
      logger.error(`Failed to create recurring reminder:`, error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: `${this.checkIntervalMs / 1000} seconds`,
      reminderIntervals: whatsappConfig.reminderIntervals.map(i => i.label),
      dailyDigest: {
        enabled: whatsappConfig.dailyDigest?.enabled || false,
        time: whatsappConfig.dailyDigest?.time || '10:30',
        timezone: whatsappConfig.dailyDigest?.timezone || 'Asia/Karachi',
        lastSent: this.lastDigestDate || 'Never',
      },
    };
  }
}

// Export singleton instance
const reminderScheduler = new ReminderScheduler();
export default reminderScheduler;
