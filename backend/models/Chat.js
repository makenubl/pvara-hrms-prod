import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    mentionAll: {
      type: Boolean,
      default: false,
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // For company-wide chat, this is null. For direct messages, it contains participant IDs
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    isGroupChat: {
      type: Boolean,
      default: true,
    },
    name: {
      type: String,
      default: 'Company Chat',
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

// Index for faster queries
chatSchema.index({ company: 1, isGroupChat: 1 });
chatSchema.index({ 'messages.createdAt': -1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
