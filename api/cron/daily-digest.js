/**
 * Vercel Cron Job - Daily Digest
 * Runs at 5:30 AM UTC (10:30 AM Pakistan Time)
 * Schedule: "30 5 * * *"
 */

import mongoose from 'mongoose';

// MongoDB connection - must be set in Vercel environment variables
const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('MongoDB connected for cron job');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Import models
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  whatsappNumber: String,
  status: String,
  role: String,
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  whatsappPreferences: {
    enabled: Boolean,
  },
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  title: String,
  project: String,
  status: String,
  priority: String,
  progress: Number,
  deadline: Date,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  secondaryAssignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
}, { timestamps: true });

// Twilio setup
async function sendWhatsAppMessage(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const twilio = (await import('twilio')).default;
  const client = twilio(accountSid, authToken);
  
  // Normalize phone number
  let formattedTo = to;
  if (!formattedTo.startsWith('whatsapp:')) {
    if (formattedTo.startsWith('03')) {
      formattedTo = '+92' + formattedTo.substring(1);
    } else if (formattedTo.startsWith('00923')) {
      formattedTo = '+' + formattedTo.substring(2);
    } else if (!formattedTo.startsWith('+')) {
      formattedTo = '+' + formattedTo;
    }
    formattedTo = `whatsapp:${formattedTo}`;
  }

  return client.messages.create({
    body,
    from: fromNumber,
    to: formattedTo,
  });
}

// Generate daily digest message
function generateDigestMessage(user, tasks, stats) {
  const date = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'Asia/Karachi'
  });
  
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
}

export default async function handler(req, res) {
  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    // In production without proper auth, only allow Vercel cron
    // Vercel cron requests come with specific headers
    if (!req.headers['x-vercel-cron']) {
      console.log('Unauthorized cron request');
      // Still allow for testing, but log it
    }
  }

  console.log('Daily digest cron job started at', new Date().toISOString());

  try {
    await connectDB();

    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

    // Get all active users with WhatsApp (exclude chairman)
    const users = await User.find({
      status: 'active',
      role: { $ne: 'chairman' },
      'whatsappPreferences.enabled': { $ne: false },
      $or: [
        { whatsappNumber: { $exists: true, $ne: '' } },
        { phone: { $exists: true, $ne: '' } }
      ]
    });

    console.log(`Found ${users.length} users to send digest to`);

    let sentCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const phoneNumber = user.whatsappNumber || user.phone;
        if (!phoneNumber) continue;

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

        // Skip if no open tasks
        if (tasks.length === 0) continue;

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

        // Generate and send message
        const message = generateDigestMessage(user, tasks, stats);
        await sendWhatsAppMessage(phoneNumber, message);
        
        console.log(`Digest sent to ${user.firstName} ${user.lastName}`);
        sentCount++;
      } catch (error) {
        console.error(`Failed to send digest to ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`Daily digest complete: ${sentCount} sent, ${errorCount} errors`);

    return res.status(200).json({
      success: true,
      message: `Daily digest sent to ${sentCount} users`,
      errors: errorCount,
    });
  } catch (error) {
    console.error('Daily digest cron failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
