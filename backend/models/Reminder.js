import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    reminderId: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
    },
    description: {
      type: String,
    },
    reminderTime: {
      type: Date,
      required: true,
    },
    // How many minutes before to send reminder (0 = at exact time)
    reminderBefore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'completed', 'cancelled'],
      default: 'pending',
    },
    // Track if reminder was sent
    sent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
    // Source of reminder creation
    source: {
      type: String,
      enum: ['whatsapp', 'web', 'api'],
      default: 'whatsapp',
    },
    // Recurrence settings (optional)
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    // Recurring settings (object form for more control)
    recurring: {
      recurType: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly'],
        default: 'none',
      },
      interval: {
        type: Number,
        default: 1,
      },
      endDate: Date,
    },
    // Link to related task (optional)
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of pending reminders
reminderSchema.index({ reminderTime: 1, status: 1 });
reminderSchema.index({ user: 1, status: 1 });
reminderSchema.index({ reminderId: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder;
