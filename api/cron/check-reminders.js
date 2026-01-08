/**
 * Vercel Cron Job - Check Personal Reminders
 * Runs every minute to send due reminders
 * Schedule: "* * * * *"
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
    console.log('MongoDB connected for reminder check');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Reminder schema
const reminderSchema = new mongoose.Schema({
  reminderId: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  title: String,
  message: String,
  description: String,
  reminderTime: Date,
  status: { type: String, enum: ['pending', 'sent', 'completed', 'cancelled'], default: 'pending' },
  sent: { type: Boolean, default: false },
  sentAt: Date,
  source: String,
  recurrence: String,
  recurring: {
    recurType: String,
    interval: Number,
    endDate: Date,
  },
  relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
}, { timestamps: true });

// User schema (minimal for population)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  whatsappNumber: String,
  role: String,
  whatsappPreferences: {
    enabled: Boolean,
  },
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

export default async function handler(req, res) {
  console.log('Reminder check cron started at', new Date().toISOString());

  try {
    await connectDB();

    const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    const now = new Date();
    // Find reminders due within the last 2 minutes (to account for cron timing)
    const windowStart = new Date(now.getTime() - 2 * 60 * 1000);
    const windowEnd = now;

    const dueReminders = await Reminder.find({
      status: 'pending',
      sent: false,
      reminderTime: { $gte: windowStart, $lte: windowEnd }
    }).populate('user', 'firstName lastName phone whatsappNumber whatsappPreferences');

    console.log(`Found ${dueReminders.length} due reminders`);

    let sentCount = 0;
    let errorCount = 0;

    for (const reminder of dueReminders) {
      try {
        const user = reminder.user;
        if (!user) {
          console.warn(`Reminder ${reminder.reminderId} has no user`);
          continue;
        }

        const phoneNumber = user.whatsappNumber || user.phone;
        if (!phoneNumber) {
          console.warn(`User ${user._id} has no phone number`);
          continue;
        }

        // Check if user has WhatsApp enabled
        if (user.whatsappPreferences?.enabled === false) {
          console.log(`Skipping reminder for ${user._id} - WhatsApp disabled`);
          continue;
        }

        // Build message
        const message = `PVARA HRMS - Reminder

${reminder.title}

${reminder.message && reminder.message !== reminder.title ? reminder.message : ''}

Reference: ${reminder.reminderId}
Time: ${reminder.reminderTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })}`.trim();

        await sendWhatsAppMessage(phoneNumber, message);

        // Mark reminder as sent
        reminder.sent = true;
        reminder.sentAt = new Date();
        reminder.status = 'completed';
        await reminder.save();

        console.log(`Reminder sent: ${reminder.reminderId} to ${user.firstName}`);
        sentCount++;

        // Handle recurring reminders
        if (reminder.recurring?.recurType && reminder.recurring.recurType !== 'none') {
          await createNextRecurringReminder(Reminder, reminder);
        }
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.reminderId}:`, error.message);
        errorCount++;
      }
    }

    console.log(`Reminder check complete: ${sentCount} sent, ${errorCount} errors`);

    return res.status(200).json({
      success: true,
      checked: dueReminders.length,
      sent: sentCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error('Reminder check cron failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Create the next occurrence for a recurring reminder
 */
async function createNextRecurringReminder(Reminder, reminder) {
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
      console.log(`Recurring reminder ${reminder.reminderId} ended`);
      return;
    }

    // Generate new reminder ID
    const count = await Reminder.countDocuments({ user: reminder.user._id });
    const newReminderId = `REM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create next reminder
    const nextReminder = new Reminder({
      reminderId: newReminderId,
      user: reminder.user._id,
      company: reminder.company,
      title: reminder.title,
      message: reminder.message,
      reminderTime: nextTime,
      recurring: reminder.recurring,
      status: 'pending',
      source: reminder.source,
      relatedTask: reminder.relatedTask,
    });

    await nextReminder.save();
    console.log(`Created next recurring reminder: ${newReminderId}`);
  } catch (error) {
    console.error('Failed to create recurring reminder:', error);
  }
}
