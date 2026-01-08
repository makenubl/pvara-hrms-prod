/**
 * Conversation State Model
 * Stores pending conversation context for multi-turn WhatsApp interactions
 */

import mongoose from 'mongoose';

const conversationStateSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Pending action that needs more info
    pendingAction: {
      type: String,
      enum: [
        'createTask',
        'setReminder', 
        'scheduleMeeting',
        'updateTaskStatus',
        'assignTask',
        null
      ],
      default: null,
    },
    // Partial data collected so far
    pendingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // What info is missing
    missingFields: [{
      type: String,
    }],
    // Last prompt sent to user
    lastPrompt: {
      type: String,
    },
    // Expiry - conversations expire after 5 minutes of inactivity
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000),
      index: { expires: 0 }, // TTL index - auto-delete expired docs
    },
  },
  {
    timestamps: true,
  }
);

// Update expiry on each save
conversationStateSchema.pre('save', function(next) {
  this.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  next();
});

const ConversationState = mongoose.model('ConversationState', conversationStateSchema);

export default ConversationState;
