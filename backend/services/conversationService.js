/**
 * Conversation Service
 * Manages multi-turn WhatsApp conversations with context persistence
 */

import ConversationState from '../models/ConversationState.js';
import logger from '../config/logger.js';

class ConversationService {
  /**
   * Get pending conversation state for a phone number
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<object|null>} - Pending state or null
   */
  async getPendingState(phoneNumber) {
    try {
      const state = await ConversationState.findOne({ 
        phoneNumber,
        pendingAction: { $ne: null }
      });
      return state;
    } catch (error) {
      logger.error('Error getting conversation state:', error);
      return null;
    }
  }

  /**
   * Set pending action that needs more info
   * @param {string} phoneNumber - User's phone number
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {object} partialData - Data collected so far
   * @param {array} missingFields - Fields that are still needed
   * @param {string} prompt - Prompt sent to user
   */
  async setPendingState(phoneNumber, userId, action, partialData, missingFields, prompt) {
    try {
      await ConversationState.findOneAndUpdate(
        { phoneNumber },
        {
          phoneNumber,
          user: userId,
          pendingAction: action,
          pendingData: partialData,
          missingFields,
          lastPrompt: prompt,
        },
        { upsert: true, new: true }
      );
      logger.info('Conversation state saved', { phoneNumber, action, missingFields });
    } catch (error) {
      logger.error('Error saving conversation state:', error);
    }
  }

  /**
   * Clear pending state (conversation completed or cancelled)
   * @param {string} phoneNumber - User's phone number
   */
  async clearPendingState(phoneNumber) {
    try {
      await ConversationState.findOneAndUpdate(
        { phoneNumber },
        { 
          pendingAction: null, 
          pendingData: {},
          missingFields: [],
          lastPrompt: null
        }
      );
    } catch (error) {
      logger.error('Error clearing conversation state:', error);
    }
  }

  /**
   * Check what fields are missing for an action
   * @param {string} action - Action type
   * @param {object} data - Current data
   * @returns {object} - { isComplete, missingFields, prompt }
   */
  checkRequiredFields(action, data) {
    const requirements = {
      createTask: {
        required: ['title'],
        optional: ['description', 'priority', 'deadline'],
        prompts: {
          title: 'What should the task be called?\n\nExample: "Review Q1 budget report"',
        }
      },
      setReminder: {
        required: ['reminderTime'],
        optional: ['reminderTitle', 'reminderMessage'],
        prompts: {
          reminderTime: 'When should I remind you?\n\nExamples:\n• "at 3pm today"\n• "tomorrow at 10am"\n• "in 30 minutes"',
          reminderTitle: 'What should I remind you about?',
        }
      },
      scheduleMeeting: {
        required: ['reminderTime'],
        optional: ['meetingSubject', 'meetingWith', 'meetingLocation'],
        prompts: {
          reminderTime: 'When is the meeting?\n\nExamples:\n• "at 3pm today"\n• "tomorrow at 2:30pm"',
          meetingSubject: 'What is the meeting about?',
        }
      },
      updateTaskStatus: {
        required: ['taskId', 'status'],
        optional: ['progress'],
        prompts: {
          taskId: 'Which task? Please provide the task ID (e.g., TASK-2026-0001)',
          status: 'What is the new status?\n\nOptions: pending, in-progress, completed, blocked',
        }
      },
      assignTask: {
        required: ['title', 'assigneeName'],
        optional: ['description', 'priority', 'deadline'],
        prompts: {
          title: 'What is the task?',
          assigneeName: 'Who should I assign this to?\n\nProvide their name or email.',
        }
      }
    };

    const config = requirements[action];
    if (!config) {
      return { isComplete: true, missingFields: [], prompt: null };
    }

    const missingFields = config.required.filter(field => !data[field]);
    
    if (missingFields.length === 0) {
      return { isComplete: true, missingFields: [], prompt: null };
    }

    // Get prompt for first missing field
    const firstMissing = missingFields[0];
    const prompt = config.prompts[firstMissing] || `Please provide: ${firstMissing}`;

    return {
      isComplete: false,
      missingFields,
      prompt: `PVARA HRMS - More Info Needed\n\n${prompt}\n\n(Reply "cancel" to cancel this action)`
    };
  }

  /**
   * Try to merge user reply with pending state
   * @param {string} action - Pending action
   * @param {object} pendingData - Data collected so far
   * @param {array} missingFields - Fields still needed
   * @param {string} userReply - User's new message
   * @returns {object} - Updated data with inferred field
   */
  mergeUserReply(action, pendingData, missingFields, userReply) {
    const merged = { ...pendingData };
    
    // If only one field is missing, assume the reply is for that field
    if (missingFields.length === 1) {
      const field = missingFields[0];
      merged[field] = userReply;
      return merged;
    }

    // Try to infer what field the user is providing
    const lowerReply = userReply.toLowerCase();
    
    // Time-related patterns
    if (missingFields.includes('reminderTime') && 
        (lowerReply.includes('am') || lowerReply.includes('pm') || 
         lowerReply.includes('today') || lowerReply.includes('tomorrow') ||
         lowerReply.match(/\d{1,2}:\d{2}/) || lowerReply.includes('in ') ||
         lowerReply.includes('at '))) {
      merged.reminderTime = userReply;
      return merged;
    }

    // Status patterns
    if (missingFields.includes('status') &&
        ['pending', 'in-progress', 'completed', 'blocked', 'done', 'working', 'finished'].some(s => lowerReply.includes(s))) {
      merged.status = userReply;
      return merged;
    }

    // Task ID patterns
    if (missingFields.includes('taskId') && 
        (lowerReply.match(/task-?\d{4}-?\d+/i) || lowerReply.match(/^\d{4}-\d+$/))) {
      merged.taskId = userReply;
      return merged;
    }

    // Default: assume it's the first missing field
    merged[missingFields[0]] = userReply;
    return merged;
  }
}

const conversationService = new ConversationService();
export default conversationService;
