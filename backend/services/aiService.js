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
    // Fast-path: Only handle trivial commands without spending OpenAI tokens
    const lowerMessage = message.toLowerCase().trim();
    
    // Trivial commands - don't need AI
    if (['help', 'commands', '?', 'menu'].includes(lowerMessage)) {
      return { action: 'help' };
    }
    if (['hi', 'hello', 'start', 'hey'].includes(lowerMessage)) {
      return { action: 'welcome' };
    }
    if (['status', 'summary', 'dashboard'].includes(lowerMessage)) {
      return { action: 'status' };
    }

    // For everything else, use AI (preferred) or fallback to rule-based
    if (this.initialize() && this.openaiApiKey) {
      try {
        logger.info('Using GPT-5.2 for WhatsApp message parsing', {
          userId: user?._id?.toString?.() || undefined,
          role: user?.role,
          messageLength: message?.length,
        });
        const aiResult = await this.aiParse(message, user);
        if (aiResult?.action && aiResult.action !== 'unknown') {
          return aiResult;
        }
        // If AI returned unknown, still return it with original message for feedback
        return { action: 'unknown', originalMessage: message };
      } catch (error) {
        logger.error('AI parsing failed, falling back to rule-based:', error);
      }
    } else {
      logger.warn('OpenAI not available, using rule-based parsing', {
        initialized: this.initialize(),
        hasApiKey: !!this.openaiApiKey,
      });
    }

    // Fallback to rule-based patterns only if AI is not available
    return this.ruleBasedParse(message, user);
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

    // Delete/Cancel task patterns
    const deletePatterns = [
      /^(?:delete|remove|cancel)\s+(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)/i,
      /^(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:delete|remove|cancel)(?:\s+(?:this\s+)?task)?/i,
      /^([A-Z]{2,4}-\d{4}-\d+)\s+delete\s+(?:this\s+)?task/i,
    ];

    for (const pattern of deletePatterns) {
      const deleteMatch = message.match(pattern);
      if (deleteMatch) {
        return {
          action: 'cancelTask',
          taskId: deleteMatch[1].toUpperCase()
        };
      }
    }

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

    // Update task progress - check before status patterns as "50%" is progress, not status
    const progressPatterns = [
      /^(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:progress\s+)?(\d+)\s*%?/i,
      /^(?:update|set)\s+(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:progress\s+(?:to\s+)?)?(\d+)\s*%?/i,
      /^progress\s+(?:of\s+)?(?:task\s+)?([A-Z]{2,4}-\d{4}-\d+)\s+(?:is\s+|to\s+)?(\d+)\s*%?/i,
      // "update the status of task 0044 to 50%" - user says "status" but means progress
      /update\s+(?:the\s+)?(?:status|progress)\s+(?:of\s+)?(?:the\s+)?(?:task\s+)?(\d{4}-\d+|[A-Z]{2,4}-\d{4}-\d+)\s+(?:to\s+)?(\d+)\s*%/i,
    ];

    for (const pattern of progressPatterns) {
      const progressMatch = message.match(pattern);
      if (progressMatch) {
        const progress = Math.min(100, Math.max(0, parseInt(progressMatch[2])));
        // Normalize taskId - add TASK- prefix if just numbers like "0044"
        let taskId = progressMatch[1].toUpperCase();
        if (/^\d{4}-\d+$/.test(taskId)) {
          taskId = `TASK-${taskId}`;
        }
        return {
          action: 'updateTaskProgress',
          taskId: taskId,
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
    const today = new Date();
    
    // Convert to Pakistan time (UTC+5) for display to AI
    const pktOffset = 5 * 60 * 60 * 1000; // 5 hours in ms
    const pktTime = new Date(today.getTime() + pktOffset);
    const pktISOString = pktTime.toISOString().slice(0, 19); // Without Z suffix
    
    const currentDate = pktISOString.split('T')[0]; // YYYY-MM-DD in PKT
    const currentDateFormatted = today.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    });

    const systemPrompt = `You are a professional task management assistant for PVARA HRMS. Parse the user's WhatsApp message and extract the intended action.

CURRENT DATE: ${currentDateFormatted} (${currentDate})

AVAILABLE ACTIONS:
- createTask: User wants to create a new task
- assignTask: User wants to assign a task to someone else (managers only)
- updateTaskStatus: User wants to change task status
- updateTaskProgress: User wants to update task progress percentage
- updateTaskStatusAndProgress: User wants to update both status and progress
- addTaskUpdate: User wants to add a comment/update to a task
- viewTask: User wants to see task details
- listTasks: User wants to see their tasks
- listDeadlines: User wants to see upcoming deadlines
- cancelTask: User wants to cancel/delete a task
- reportBlocker: User wants to report a blocker on a task
- status: User wants to see their task summary/dashboard
- setReminder: User wants to set a personal reminder (e.g., "remind me about call at 5pm tomorrow")
- scheduleMeeting: User wants to schedule a meeting (e.g., "schedule meeting with Ahmed about budget at 3pm", "meeting with team at 2pm tomorrow")
- listReminders: User wants to see their upcoming reminders
- listMeetings: User wants to see their scheduled meetings for today or a specific period
- cancelReminder: User wants to cancel/delete a reminder
- cancelMeeting: User wants to cancel a meeting
- help: User wants help with commands
- welcome: User is greeting (hi, hello, start)
- unknown: Cannot determine intent

RESPOND WITH JSON ONLY:
{
  "action": "<action from list above>",
  "taskId": "TASK-YYYY-NNNN or similar format if mentioned",
  "title": "task title if creating",
  "description": "task description if provided",
  "priority": "low|medium|high|critical",
  "deadline": "YYYY-MM-DD format, calculate from relative dates like 'tomorrow', 'next Friday', '8th Jan 2026'",
  "status": "pending|in-progress|completed|blocked|cancelled",
  "progress": 0-100 as number,
  "assigneeName": "name or email if assigning",
  "message": "update/comment text",
  "blocker": "blocker description",
  "reminderTitle": "short title for reminder",
  "meetingSubject": "meeting subject/topic",
  "meetingWith": "attendee names if mentioned (e.g., 'Ahmed', 'Waqas and Hira')",
  "meetingLocation": "location or meeting link if mentioned",
  "reminderMessage": "full reminder message/description",
  "reminderTime": "YYYY-MM-DDTHH:mm:ss format for reminder datetime",
  "reminderId": "reminder ID if cancelling",
  "filters": { "status": "...", "priority": "..." } for listTasks
}

CONTEXT:
- Current DateTime (PKT): ${currentDateFormatted} at ${pktISOString.split('T')[1]}
- Current DateTime ISO (PKT): ${pktISOString}
- Timezone: Pakistan Time (PKT, UTC+5) - ALL times should be calculated in PKT
- User Role: ${user?.role || 'employee'}
- User Name: ${user?.firstName || 'User'} ${user?.lastName || ''}
- Only include fields relevant to the action
- For dates: Convert to YYYY-MM-DD format. "tomorrow" = ${new Date(pktTime.getTime() + 24*60*60*1000).toISOString().slice(0,10)}, "today" = ${currentDate}
- For times: Use 24-hour format. "2:30 PM" = "14:30:00", "5pm" = "17:00:00"
- For RELATIVE times: "in 2 minutes" / "after 5 mins" = add minutes to current PKT time. Example: if now is ${pktISOString} (PKT), "in 2 minutes" = ${new Date(pktTime.getTime() + 2*60*1000).toISOString().slice(0,19)}
- For reminderTime: Always output as YYYY-MM-DDTHH:mm:ss in PKT. Calculate from current PKT time for relative expressions.
- Task IDs are typically in format: TASK-2026-0001, TASK-2026-0042, etc.
- Be flexible with task ID formats (user might say "2026-0038" meaning "TASK-2026-0038")
- For reminders: Extract both the reminder subject and the datetime. If no subject given, use "Reminder"
- For meetings: Use "scheduleMeeting" action. Extract meetingSubject, meetingWith (attendees), meetingLocation, and reminderTime
- "what are my meetings today" or "my meetings" = listMeetings action
- IMPORTANT: Current time in PKT is ${pktISOString}. If user says "in 10 mins", add 10 mins to THIS time.
- For listMeetings: Include filter for date range if specified (today, tomorrow, this week)`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.2',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.2,
          max_completion_tokens: 500,
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
        
        // Normalize task ID if partial
        if (parsed.taskId && !parsed.taskId.startsWith('TASK-')) {
          parsed.taskId = `TASK-${parsed.taskId}`;
        }
        
        // If model produced both status and progress for a task, handle as a combined update
        if (parsed?.taskId && parsed?.status && typeof parsed?.progress === 'number') {
          parsed.action = 'updateTaskStatusAndProgress';
          parsed.status = this.normalizeStatus(parsed.status);
          parsed.progress = Math.min(100, Math.max(0, parsed.progress));
        }
        
        // Convert deadline string to Date if present
        if (parsed.deadline && typeof parsed.deadline === 'string') {
          const deadlineDate = new Date(parsed.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            parsed.deadline = deadlineDate;
          }
        }

        logger.info('AI parsed message:', { action: parsed.action, taskId: parsed.taskId });
        return parsed;
      }

      logger.warn('AI response did not contain valid JSON:', { content });
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

    // Extract deadline - multiple patterns
    const deadlinePatterns = [
      // "deadline 8th Jan 2026" or "deadline 8th Jan,2026"
      { pattern: /(?:due|by|deadline)[:\s,]*\s*(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,\s]*(\d{4})/i, type: 'dmy-text' },
      // "8th Jan 2026" or "8 January 2026" anywhere in text
      { pattern: /(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,\s]*(\d{4})/i, type: 'dmy-text' },
      // "Jan 8, 2026" or "January 8th, 2026"
      { pattern: /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]*(\d{4})/i, type: 'mdy-text' },
      // "due 08/01/2026" or "by 8-1-2026"
      { pattern: /(?:due|by|deadline)[:\s]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i, type: 'date' },
      // Relative: today, tomorrow, next week
      { pattern: /(?:due|by|deadline)[:\s]?\s*(today|tomorrow|next week|next month)/i, type: 'relative' },
      // Day names: by Friday
      { pattern: /(?:due|by|deadline)[:\s]?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, type: 'day' },
      { pattern: /(?:by|due)\s+(today|tomorrow)/i, type: 'relative' },
    ];

    for (const { pattern, type } of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (type === 'dmy-text') {
          // Parse "8th Jan 2026" format - match[1]=day, match[2]=month, match[3]=year
          result.deadline = this.parseTextDate(match[1], match[2], match[3]);
        } else if (type === 'mdy-text') {
          // Parse "Jan 8, 2026" format - match[1]=month, match[2]=day, match[3]=year
          result.deadline = this.parseTextDate(match[2], match[1], match[3]);
        } else {
          result.deadline = this.parseDeadline(match[1], type);
        }
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
   * Parse text-based date like "8th Jan 2026"
   * @param {string} day - Day number (e.g., "8" or "8th")
   * @param {string} month - Month name (e.g., "Jan" or "January")
   * @param {string} year - Year (e.g., "2026")
   * @returns {Date|null} - Parsed date
   */
  parseTextDate(day, month, year) {
    const monthMap = {
      'jan': 0, 'january': 0,
      'feb': 1, 'february': 1,
      'mar': 2, 'march': 2,
      'apr': 3, 'april': 3,
      'may': 4,
      'jun': 5, 'june': 5,
      'jul': 6, 'july': 6,
      'aug': 7, 'august': 7,
      'sep': 8, 'september': 8,
      'oct': 9, 'october': 9,
      'nov': 10, 'november': 10,
      'dec': 11, 'december': 11,
    };

    const dayNum = parseInt(day.replace(/\D/g, ''), 10);
    const monthNum = monthMap[month.toLowerCase()];
    const yearNum = parseInt(year, 10);

    if (isNaN(dayNum) || monthNum === undefined || isNaN(yearNum)) {
      return null;
    }

    const date = new Date(yearNum, monthNum, dayNum, 23, 59, 59);
    return isNaN(date.getTime()) ? null : date;
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
