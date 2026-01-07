/**
 * AI Service - Natural Language Processing for Task Commands
 * Parses user messages to extract task-related actions
 */

import logger from '../config/logger.js';
import whatsappConfig from '../config/whatsapp.js';

class AIService {
  constructor() {
    this.openaiApiKey = null;
  }

  /**
   * Initialize with OpenAI API key
   */
  initialize() {
    this.openaiApiKey = whatsappConfig.openaiApiKey;
    return !!this.openaiApiKey;
  }

  /**
   * Parse a natural language message to extract task action
   * @param {string} message - User's message
   * @param {object} user - User object for context
   * @returns {Promise<object>} - Parsed action object
   */
  async parseMessage(message, user) {
    // Fast-path trivial commands without spending OpenAI tokens
    const quickRuleBased = this.ruleBasedParse(message, user);
    if (['help', 'welcome', 'status'].includes(quickRuleBased.action)) {
      return quickRuleBased;
    }

    // Prefer OpenAI for more robust parsing when available
    if (this.initialize() && this.openaiApiKey) {
      try {
        logger.info('🧠 Using OpenAI for WhatsApp message parsing', {
          userId: user?._id?.toString?.() || undefined,
          role: user?.role,
          messageLength: message?.length,
        });
        const aiResult = await this.aiParse(message, user);
        if (aiResult?.action && aiResult.action !== 'unknown') {
          return aiResult;
        }
      } catch (error) {
        logger.error('AI parsing failed, falling back to rule-based:', error);
      }
    }

    // Fallback to rule-based patterns
    return quickRuleBased;
  }

  /**
   * Rule-based parsing for common command patterns
   * @param {string} message - User's message
   * @param {object} user - User object
   * @returns {object} - Parsed action
   */
  ruleBasedParse(message, user) {
    const lowerMessage = message.toLowerCase().trim();

    // Combined status + progress in one message
    // Examples:
    // "update this TASK-2026-0041 completed 50%"
    // "TASK-2026-0041 in-progress 50"
    const taskIdMatch = message.match(/([A-Z]{2,10}-\d{4}-\d+)/i);
    if (taskIdMatch) {
      const progressMatch = message.match(/(\d{1,3})\s*%/);
      const statusKeywordMatch = message.match(/\b(completed|done|finished|in[- ]?progress|started|blocked|pending|cancelled)\b/i);

      if (progressMatch && statusKeywordMatch) {
        const rawStatus = statusKeywordMatch[1];
        const normalizedStatus = this.normalizeStatus(rawStatus);
        const progress = Math.min(100, Math.max(0, parseInt(progressMatch[1], 10)));
        return {
          action: 'updateTaskStatusAndProgress',
          taskId: taskIdMatch[1].toUpperCase(),
          status: normalizedStatus,
          progress,
        };
      }
    }

    // Help command
    if (['help', 'commands', '?', 'menu'].includes(lowerMessage)) {
      return { action: 'help' };
    }

    // Welcome/Start
    if (['hi', 'hello', 'start', 'hey'].includes(lowerMessage)) {
      return { action: 'welcome' };
    }

    // Status summary
    if (['status', 'summary', 'dashboard'].includes(lowerMessage)) {
      return { action: 'status' };
    }

    // Show tasks
    if (this.matchesPattern(lowerMessage, [
      'show my tasks', 'list my tasks', 'my tasks', 'show tasks', 
      'list tasks', 'view tasks', 'tasks', 'pending tasks',
      'what are my tasks', 'what tasks do i have'
    ])) {
      return { 
        action: 'listTasks',
        filters: this.extractTaskFilters(lowerMessage)
      };
    }

    // Show deadlines
    if (this.matchesPattern(lowerMessage, [
      'deadlines', 'my deadlines', 'what are my deadlines',
      'upcoming deadlines', 'due dates'
    ])) {
      return { action: 'listDeadlines' };
    }

    // Show specific task
    const showTaskMatch = lowerMessage.match(/(?:show|view|get|details?(?:\s+of)?)\s+(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)/i);
    if (showTaskMatch) {
      return {
        action: 'viewTask',
        taskId: showTaskMatch[1].toUpperCase()
      };
    }

    // Create task - Multiple patterns
    const createPatterns = [
      /^(?:create|new|add)\s+task[:\s]+(.+)/i,
      /^task[:\s]+(.+)/i,
      /^(?:create|new|add)\s+(?:a\s+)?task\s+(?:called|named|titled)[:\s]+(.+)/i,
    ];

    for (const pattern of createPatterns) {
      const createMatch = message.match(pattern);
      if (createMatch) {
        return {
          action: 'createTask',
          ...this.parseTaskDetails(createMatch[1], user)
        };
      }
    }

    // Assign task (admin/manager only)
    const assignPatterns = [
      /^(?:assign|create)\s+task[:\s]+(.+?)\s+to\s+(.+)/i,
      /^(?:create|new)\s+task\s+for\s+(.+?)[:\s]+(.+)/i,
    ];

    for (const pattern of assignPatterns) {
      const assignMatch = message.match(pattern);
      if (assignMatch) {
        // Check if it's "assign task to person" or "create task for person"
        if (pattern.toString().includes('for')) {
          return {
            action: 'assignTask',
            assigneeName: assignMatch[1].trim(),
            ...this.parseTaskDetails(assignMatch[2], user)
          };
        } else {
          return {
            action: 'assignTask',
            assigneeName: assignMatch[2].trim(),
            ...this.parseTaskDetails(assignMatch[1], user)
          };
        }
      }
    }

    // Update task status
    const statusPatterns = [
      /^(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:is\s+)?(?:now\s+)?(completed|done|finished|in[- ]?progress|started|blocked|pending|cancelled)/i,
      /^(?:mark|set|update)\s+(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:as\s+|to\s+)?(completed|done|finished|in[- ]?progress|started|blocked|pending|cancelled)/i,
      /^(?:complete|finish|start|block)\s+(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)/i,
    ];

    for (const pattern of statusPatterns) {
      const statusMatch = message.match(pattern);
      if (statusMatch) {
        let status = statusMatch[2]?.toLowerCase() || this.getStatusFromVerb(message);
        status = this.normalizeStatus(status);
        
        return {
          action: 'updateTaskStatus',
          taskId: statusMatch[1].toUpperCase(),
          status: status
        };
      }
    }

    // Update task progress
    const progressPatterns = [
      /^(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:progress\s+)?(\d+)\s*%?/i,
      /^(?:update|set)\s+(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:progress\s+(?:to\s+)?)?(\d+)\s*%?/i,
      /^progress\s+(?:of\s+)?(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:is\s+|to\s+)?(\d+)\s*%?/i,
    ];

    for (const pattern of progressPatterns) {
      const progressMatch = message.match(pattern);
      if (progressMatch) {
        const progress = Math.min(100, Math.max(0, parseInt(progressMatch[2])));
        return {
          action: 'updateTaskProgress',
          taskId: progressMatch[1].toUpperCase(),
          progress: progress
        };
      }
    }

    // Add task update/comment
    const updatePatterns = [
      /^(?:update\s+)?(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)[:\s]+(.+)/i,
      /^(?:add\s+)?(?:update|comment|note)\s+(?:to\s+)?(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)[:\s]+(.+)/i,
    ];

    for (const pattern of updatePatterns) {
      const updateMatch = message.match(pattern);
      if (updateMatch) {
        // Check if it's a status or progress update we already handled
        const updateText = updateMatch[2].toLowerCase();
        if (updateText.match(/^\d+\s*%?$/) || 
            ['completed', 'done', 'in-progress', 'blocked', 'pending'].some(s => updateText.includes(s))) {
          continue;
        }
        
        return {
          action: 'addTaskUpdate',
          taskId: updateMatch[1].toUpperCase(),
          message: updateMatch[2].trim()
        };
      }
    }

    // Report blocker
    const blockerPatterns = [
      /^(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+blocked[:\s]+(.+)/i,
      /^blocker\s+(?:for\s+)?(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)[:\s]+(.+)/i,
    ];

    for (const pattern of blockerPatterns) {
      const blockerMatch = message.match(pattern);
      if (blockerMatch) {
        return {
          action: 'reportBlocker',
          taskId: blockerMatch[1].toUpperCase(),
          blocker: blockerMatch[2].trim()
        };
      }
    }

    return { action: 'unknown', originalMessage: message };
  }

  /**
   * AI-powered parsing using OpenAI
   * @param {string} message - User's message
   * @param {object} user - User object
   * @returns {Promise<object>} - Parsed action
   */
  async aiParse(message, user) {
    const systemPrompt = `You are a task management assistant. Parse the user's message and extract the intended action.

Return a JSON object with the following structure:
{
  "action": "createTask" | "assignTask" | "updateTaskStatus" | "updateTaskProgress" | "addTaskUpdate" | "listTasks" | "viewTask" | "help" | "welcome" | "unknown",
  "taskId": "TASK-2026-XXXX" (if updating existing task),
  "title": "task title" (if creating task),
  "description": "task description" (if provided),
  "priority": "low" | "medium" | "high" | "critical",
  "deadline": "ISO date string or null",
  "status": "pending" | "in-progress" | "completed" | "blocked",
  "progress": 0-100 (number),
  "assigneeName": "name or email" (if assigning to someone),
  "message": "update message" (if adding an update),
  "blocker": "blocker description" (if reporting blocker)
}

User's role: ${user?.role || 'employee'}
User's name: ${user?.firstName || 'User'} ${user?.lastName || ''}

Only include fields that are relevant to the action.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // If model produced both status and progress for a task, handle as a combined update
        if (parsed?.taskId && parsed?.status && typeof parsed?.progress === 'number') {
          parsed.action = 'updateTaskStatusAndProgress';
          parsed.status = this.normalizeStatus(parsed.status);
          parsed.progress = Math.min(100, Math.max(0, parsed.progress));
        }

        logger.info('AI parsed message:', { action: parsed.action });
        return parsed;
      }

      return { action: 'unknown', originalMessage: message };
    } catch (error) {
      logger.error('AI parsing error:', error);
      throw error;
    }
  }

  /**
   * Parse task details from a string
   * @param {string} text - Task description text
   * @param {object} user - User object
   * @returns {object} - Parsed task details
   */
  parseTaskDetails(text, user) {
    const result = {
      title: text.trim(),
      priority: 'medium',
      deadline: null,
      description: null,
    };

    // Extract priority
    const priorityMatch = text.match(/(?:priority\s*[:\s]?\s*)(low|medium|high|critical)/i) ||
                          text.match(/\b(low|high|critical)\s+priority\b/i);
    if (priorityMatch) {
      result.priority = priorityMatch[1].toLowerCase();
      result.title = result.title.replace(priorityMatch[0], '').trim();
    }

    // Extract deadline
    const deadlinePatterns = [
      { pattern: /(?:due|by|deadline)[:\s]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i, type: 'date' },
      { pattern: /(?:due|by|deadline)[:\s]?\s*(today|tomorrow|next week|next month)/i, type: 'relative' },
      { pattern: /(?:due|by|deadline)[:\s]?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, type: 'day' },
      { pattern: /(?:by|due)\s+(today|tomorrow)/i, type: 'relative' },
    ];

    for (const { pattern, type } of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.deadline = this.parseDeadline(match[1], type);
        result.title = result.title.replace(match[0], '').trim();
        break;
      }
    }

    // Clean up title - remove trailing commas and extra spaces
    result.title = result.title.replace(/,\s*$/, '').replace(/\s+/g, ' ').trim();

    // If title has a comma, split into title and description
    const commaIndex = result.title.indexOf(',');
    if (commaIndex > 10) { // Only if there's substantial text before comma
      const afterComma = result.title.substring(commaIndex + 1).trim();
      if (afterComma.length > 20) {
        result.description = afterComma;
        result.title = result.title.substring(0, commaIndex).trim();
      }
    }

    return result;
  }

  /**
   * Parse deadline from various formats
   * @param {string} value - Deadline value
   * @param {string} type - Type of deadline (date, relative, day)
   * @returns {Date|null} - Parsed date
   */
  parseDeadline(value, type) {
    const now = new Date();
    
    if (type === 'relative') {
      switch (value.toLowerCase()) {
        case 'today':
          return new Date(now.setHours(23, 59, 59, 999));
        case 'tomorrow':
          return new Date(now.setDate(now.getDate() + 1));
        case 'next week':
          return new Date(now.setDate(now.getDate() + 7));
        case 'next month':
          return new Date(now.setMonth(now.getMonth() + 1));
        default:
          return null;
      }
    }

    if (type === 'day') {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(value.toLowerCase());
      if (targetDay === -1) return null;
      
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      
      return new Date(now.setDate(now.getDate() + daysUntil));
    }

    if (type === 'date') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  /**
   * Extract task filters from message
   * @param {string} message - Message text
   * @returns {object} - Filter object
   */
  extractTaskFilters(message) {
    const filters = {};

    if (message.includes('pending')) filters.status = 'pending';
    if (message.includes('in-progress') || message.includes('in progress')) filters.status = 'in-progress';
    if (message.includes('completed') || message.includes('done')) filters.status = 'completed';
    if (message.includes('blocked')) filters.status = 'blocked';
    if (message.includes('high priority')) filters.priority = 'high';
    if (message.includes('critical')) filters.priority = 'critical';
    if (message.includes('overdue')) filters.overdue = true;

    return filters;
  }

  /**
   * Normalize status string
   * @param {string} status - Status string
   * @returns {string} - Normalized status
   */
  normalizeStatus(status) {
    const statusMap = {
      'done': 'completed',
      'finished': 'completed',
      'complete': 'completed',
      'started': 'in-progress',
      'inprogress': 'in-progress',
      'in progress': 'in-progress',
      'cancel': 'cancelled',
      'canceled': 'cancelled',
    };

    return statusMap[status?.toLowerCase()] || status?.toLowerCase() || 'pending';
  }

  /**
   * Get status from verb in message
   * @param {string} message - Message text
   * @returns {string} - Inferred status
   */
  getStatusFromVerb(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('complete') || lowerMessage.includes('finish')) return 'completed';
    if (lowerMessage.includes('start')) return 'in-progress';
    if (lowerMessage.includes('block')) return 'blocked';
    if (lowerMessage.includes('cancel')) return 'cancelled';
    return 'pending';
  }

  /**
   * Check if message matches any of the patterns
   * @param {string} message - Message to check
   * @param {array} patterns - Array of patterns to match
   * @returns {boolean}
   */
  matchesPattern(message, patterns) {
    return patterns.some(p => message.includes(p) || message === p);
  }

  /**
   * Generate natural language response for action result
   * @param {string} action - Action performed
   * @param {boolean} success - Whether action succeeded
   * @param {object} data - Additional data
   * @returns {string} - Response message
   */
  generateResponse(action, success, data = {}) {
    if (!success) {
      return whatsappConfig.templates.error(data.error || 'Something went wrong');
    }

    switch (action) {
      case 'createTask':
        return whatsappConfig.templates.taskCreated(data.task);
      case 'updateTaskStatus':
      case 'updateTaskProgress':
        return whatsappConfig.templates.taskUpdated(data.task, action.replace('updateTask', '').toLowerCase());
      case 'listTasks':
        return whatsappConfig.templates.taskList(data.tasks);
      case 'help':
        return whatsappConfig.templates.help;
      case 'welcome':
        return whatsappConfig.templates.welcome;
      default:
        return `Action completed: ${action}`;
    }
  }
}

// Export singleton
const aiService = new AIService();
export default aiService;
