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
  
  // Message templates
  templates: {
    welcome: `🎉 Welcome to PVARA HRMS WhatsApp Bot!

You can manage your tasks using natural language. Here are some examples:

📝 *Create Task:*
"Create task: Review budget report by Friday"
"New task: Prepare presentation, high priority, due tomorrow"

✏️ *Update Task:*
"Update task TASK-2026-0001: progress 50%"
"Task TASK-2026-0001 is completed"
"Mark TASK-2026-0001 as in-progress"

📋 *View Tasks:*
"Show my tasks"
"List pending tasks"
"What are my deadlines?"

🎤 *Voice Notes:*
Send a voice note describing your task update!

Type *help* for more commands.`,

    help: `📚 *PVARA HRMS WhatsApp Commands*

*Task Management:*
• "Create task: [title]" - Create a new task
• "Create task: [title], priority [low/medium/high/critical], due [date]"
• "Update task [ID]: [status/progress]"
• "Show my tasks" - List your tasks
• "Show task [ID]" - View task details

*For Admins/Managers:*
• "Assign task: [title] to [name/email]"
• "Create task for [name]: [title]"

*Status Updates:*
• "Task [ID] progress 50%"
• "Task [ID] is completed"
• "Task [ID] blocked: [reason]"

*Voice Notes:*
Send a voice message and I'll process it as a task update!

*Other:*
• "help" - Show this help
• "status" - Check your task summary`,

    taskCreated: (task) => `✅ *Task Created Successfully!*

📋 *${task.title}*
🆔 ID: ${task.project}
📊 Priority: ${task.priority}
📅 Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Not set'}
👤 Assigned to: ${task.assignedTo?.firstName || 'You'} ${task.assignedTo?.lastName || ''}

You'll receive reminders before the deadline.`,

    taskAssigned: (task, assignee) => `📋 *New Task Assigned to You!*

📝 *${task.title}*
🆔 ID: ${task.project}
📊 Priority: ${task.priority}
📅 Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Not set'}
👤 Assigned by: ${task.assignedBy?.firstName || 'Admin'} ${task.assignedBy?.lastName || ''}

${task.description ? `📄 Description: ${task.description}` : ''}

Reply with updates anytime!`,

    taskUpdated: (task, updateType) => `✅ *Task Updated!*

📋 *${task.title}*
🆔 ID: ${task.project}
📊 Status: ${task.status}
📈 Progress: ${task.progress}%

${updateType === 'status' ? `Status changed to: ${task.status}` : ''}
${updateType === 'progress' ? `Progress updated to: ${task.progress}%` : ''}`,

    taskReminder: (task, timeLeft) => `⏰ *Task Deadline Reminder!*

📋 *${task.title}*
🆔 ID: ${task.project}
📅 Deadline: ${new Date(task.deadline).toLocaleDateString()} at ${new Date(task.deadline).toLocaleTimeString()}
⏳ Time left: ${timeLeft}

📊 Current Progress: ${task.progress}%
📌 Status: ${task.status}

Reply with an update or type "help" for commands.`,

    taskList: (tasks) => {
      if (!tasks || tasks.length === 0) {
        return `📋 *Your Tasks*\n\nNo tasks found! 🎉`;
      }
      
      let message = `📋 *Your Tasks (${tasks.length})*\n\n`;
      tasks.slice(0, 10).forEach((task, index) => {
        const statusEmoji = {
          'pending': '⏸️',
          'in-progress': '🔄',
          'completed': '✅',
          'blocked': '🚫',
          'cancelled': '❌'
        }[task.status] || '📌';
        
        const priorityEmoji = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡',
          'low': '🟢'
        }[task.priority] || '⚪';
        
        message += `${index + 1}. ${statusEmoji} *${task.title}*\n`;
        message += `   🆔 ${task.project} | ${priorityEmoji} ${task.priority}\n`;
        message += `   📈 ${task.progress}% | 📅 ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}\n\n`;
      });
      
      if (tasks.length > 10) {
        message += `_...and ${tasks.length - 10} more tasks_`;
      }
      
      return message;
    },

    error: (message) => `❌ *Error*\n\n${message}\n\nType *help* for available commands.`,
    
    notRegistered: `❌ *Phone Number Not Registered*

Your WhatsApp number is not linked to any PVARA HRMS account.

Please update your profile in the HRMS system with your WhatsApp number to use this feature.`,

    processing: `⏳ Processing your request...`,
  },
  
  // Reminder intervals (in minutes before deadline)
  reminderIntervals: [
    { minutes: 60 * 24 * 1, label: '1 day' },      // 1 day before
    { minutes: 60 * 4, label: '4 hours' },          // 4 hours before
    { minutes: 60, label: '1 hour' },               // 1 hour before
    { minutes: 30, label: '30 minutes' },           // 30 minutes before
  ],
};

export default whatsappConfig;
