/**
 * WhatsApp Configuration via Twilio
 * 
 * Setup Instructions:
 * 1. Create a Twilio account at https://www.twilio.com
 * 2. Get your Account SID and Auth Token from the dashboard
 * 3. Set up a WhatsApp sandbox or get a production WhatsApp number
 * 4. Configure the webhook URL in Twilio console to: https://your-domain.com/api/whatsapp/webhook
 */

// Use getters to ensure environment variables are read after dotenv.config() runs
const whatsappConfig = {
  // Twilio credentials - support both naming conventions (use getters for lazy evaluation)
  get accountSid() {
    return process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
  },
  get authToken() {
    return process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH;
  },
  
  // WhatsApp number (Twilio sandbox or production)
  get whatsappNumber() {
    return process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_NUMBER || 'whatsapp:+14155238886';
  },
  
  // Webhook verification token (for security)
  get webhookToken() {
    return process.env.WHATSAPP_WEBHOOK_TOKEN || 'pvara-hrms-whatsapp-token';
  },
  
  // OpenAI for AI parsing (optional, can use rule-based parsing)
  get openaiApiKey() {
    return process.env.OPENAI_API_KEY;
  },
  
  // Message templates - Professional formatting
  templates: {
    welcome: `PVARA HRMS - WhatsApp Integration

Your account is now connected. You can manage tasks using simple commands:

CREATE TASK:
"Create task: Review budget report by Friday"
"New task: Prepare presentation, high priority, due tomorrow"

UPDATE TASK:
"Update task TASK-2026-0001: progress 50%"
"Task TASK-2026-0001 is completed"

VIEW TASKS:
"Show my tasks"
"List pending tasks"

VOICE NOTES:
Send a voice note describing your task update.

Type "help" for the complete command list.`,

    help: `PVARA HRMS - Command Reference

TASK MANAGEMENT:
- "Create task: [title]" - Create a new task
- "Create task: [title], priority [low/medium/high/critical], due [date]"
- "Update task [ID]: [status/progress]"
- "Show my tasks" - List your tasks
- "Show task [ID]" - View task details

FOR MANAGERS:
- "Assign task: [title] to [name/email]"
- "Create task for [name]: [title]"

STATUS UPDATES:
- "Task [ID] progress 50%"
- "Task [ID] is completed"
- "Task [ID] blocked: [reason]"

VOICE NOTES:
Send a voice message and it will be processed as a task update.

OTHER:
- "help" - Show this reference
- "status" - View your task summary`,

    taskCreated: (task) => `PVARA HRMS - Task Created

Title: ${task.title}
Reference: ${task.project}
Priority: ${task.priority?.toUpperCase() || 'MEDIUM'}
Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not specified'}
Assigned to: ${task.assignedTo?.firstName || 'You'} ${task.assignedTo?.lastName || ''}

You will receive reminders before the deadline.`,

    taskAssigned: (task, assignee) => `PVARA HRMS - New Task Assignment

Title: ${task.title}
Reference: ${task.project}
Priority: ${task.priority?.toUpperCase() || 'MEDIUM'}
Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not specified'}
Assigned by: ${task.assignedBy?.firstName || 'Management'} ${task.assignedBy?.lastName || ''}
${task.description ? `\nDescription:\n${task.description}` : ''}

Please acknowledge receipt and provide updates as you progress.`,

    taskUpdated: (task, updateType) => `PVARA HRMS - Task Updated

Title: ${task.title}
Reference: ${task.project}
Status: ${task.status?.toUpperCase()}
Progress: ${task.progress}%
${updateType === 'status' ? `\nStatus changed to: ${task.status}` : ''}
${updateType === 'progress' ? `\nProgress updated to: ${task.progress}%` : ''}`,

    taskReminder: (task, timeLeft) => `PVARA HRMS - Deadline Reminder

Title: ${task.title}
Reference: ${task.project}
Deadline: ${new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date(task.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
Time Remaining: ${timeLeft}

Current Status: ${task.status}
Progress: ${task.progress}%

Please update your progress or contact your supervisor if assistance is required.`,

    taskList: (tasks) => {
      if (!tasks || tasks.length === 0) {
        return `PVARA HRMS - Your Tasks\n\nNo open tasks at this time.`;
      }
      
      let message = `PVARA HRMS - Your Tasks (${tasks.length})\n\n`;
      tasks.slice(0, 10).forEach((task, index) => {
        const status = task.status?.toUpperCase() || 'PENDING';
        const priority = task.priority?.toUpperCase() || 'MEDIUM';
        
        message += `${index + 1}. ${task.title}\n`;
        message += `   Ref: ${task.project} | Priority: ${priority}\n`;
        message += `   Status: ${status} | Progress: ${task.progress}%\n`;
        message += `   Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}\n\n`;
      });
      
      if (tasks.length > 10) {
        message += `...and ${tasks.length - 10} additional tasks. Log in to view all.`;
      }
      
      return message;
    },

    dailyDigest: (user, tasks, stats) => {
      const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      
      let message = `PVARA HRMS - Daily Task Summary\n${date}\n\nGood morning, ${user.firstName}.\n\n`;
      
      message += `TASK OVERVIEW:\n`;
      message += `- Open Tasks: ${stats.open}\n`;
      message += `- In Progress: ${stats.inProgress}\n`;
      message += `- Due Today: ${stats.dueToday}\n`;
      message += `- Overdue: ${stats.overdue}\n\n`;
      
      if (stats.dueToday > 0 || stats.overdue > 0) {
        message += `PRIORITY ITEMS:\n`;
        const priorityTasks = tasks.filter(t => {
          const deadline = t.deadline ? new Date(t.deadline) : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return deadline && deadline < tomorrow;
        }).slice(0, 5);
        
        priorityTasks.forEach((task, i) => {
          const isOverdue = new Date(task.deadline) < new Date();
          message += `${i + 1}. ${task.title}\n`;
          message += `   Ref: ${task.project} | ${isOverdue ? 'OVERDUE' : 'Due Today'}\n`;
        });
        message += '\n';
      }
      
      if (stats.open === 0 && stats.overdue === 0) {
        message += `All tasks are up to date. Have a productive day.`;
      } else {
        message += `Log in to the HRMS portal for complete details.`;
      }
      
      return message;
    },

    error: (message) => `PVARA HRMS - Error\n\n${message}\n\nType "help" for available commands.`,
    
    notRegistered: `PVARA HRMS - Registration Required

Your WhatsApp number is not linked to an HRMS account.

Please update your profile in the PVARA HRMS system with your WhatsApp number to use this service.`,

    processing: `Processing your request...`,
    
    taskOverdue: (task) => `PVARA HRMS - Overdue Task Notice

Title: ${task.title}
Reference: ${task.project}
Original Deadline: ${new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}

Current Status: ${task.status}
Progress: ${task.progress}%

This task requires immediate attention. Please update your progress or escalate to your supervisor.`,
  },
  
  // Reminder intervals (in minutes before deadline)
  reminderIntervals: [
    { minutes: 60 * 24 * 1, label: '1 day' },      // 1 day before
    { minutes: 60 * 4, label: '4 hours' },          // 4 hours before
    { minutes: 60, label: '1 hour' },               // 1 hour before
    { minutes: 30, label: '30 minutes' },           // 30 minutes before
  ],
  
  // Daily digest settings
  dailyDigest: {
    enabled: true,
    time: '10:30', // 24-hour format, Pakistan time (PKT)
    timezone: 'Asia/Karachi',
  },
};

export default whatsappConfig;