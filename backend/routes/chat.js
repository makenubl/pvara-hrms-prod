import express from 'express';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Chairman/executive roles for special styling
const EXECUTIVE_ROLES = ['chairman', 'executive', 'director', 'admin'];

// Get or create company chat
router.get('/company', authenticate, async (req, res) => {
  try {
    let chat = await Chat.findOne({
      company: req.user.company,
      isGroupChat: true,
    });

    if (!chat) {
      chat = new Chat({
        company: req.user.company,
        isGroupChat: true,
        name: 'Company Chat',
        messages: [],
      });
      await chat.save();
    }

    // Populate messages with sender info
    await chat.populate('messages.sender', 'firstName lastName email role designation profilePicture');
    await chat.populate('messages.mentions', 'firstName lastName email');

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages (paginated)
router.get('/company/messages', authenticate, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    let chat = await Chat.findOne({
      company: req.user.company,
      isGroupChat: true,
    });

    if (!chat) {
      return res.json({ messages: [], hasMore: false });
    }

    let messages = chat.messages;
    
    // Filter by date if 'before' is provided
    if (before) {
      messages = messages.filter(m => new Date(m.createdAt) < new Date(before));
    }

    // Sort by newest first, then take limit
    messages = messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    // Populate sender info
    await chat.populate('messages.sender', 'firstName lastName email role designation profilePicture');
    await chat.populate('messages.mentions', 'firstName lastName email');

    // Get the filtered messages with populated data
    const messageIds = messages.map(m => m._id.toString());
    const populatedMessages = chat.messages
      .filter(m => messageIds.includes(m._id.toString()))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Return in chronological order

    res.json({
      messages: populatedMessages,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send message
router.post('/company/messages', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    let chat = await Chat.findOne({
      company: req.user.company,
      isGroupChat: true,
    });

    if (!chat) {
      chat = new Chat({
        company: req.user.company,
        isGroupChat: true,
        name: 'Company Chat',
        messages: [],
      });
    }

    // Parse mentions
    const mentionAll = content.includes('@all');
    const mentionMatches = content.match(/@(\w+\.\w+@[\w.]+)/g) || [];
    
    // Find mentioned users by email
    const mentionedEmails = mentionMatches.map(m => m.substring(1));
    const mentionedUsers = await User.find({
      company: req.user.company,
      email: { $in: mentionedEmails },
    });

    const message = {
      sender: req.user._id,
      content: content.trim(),
      mentions: mentionedUsers.map(u => u._id),
      mentionAll,
      readBy: [{ user: req.user._id, readAt: new Date() }],
    };

    chat.messages.push(message);
    await chat.save();

    // Get the newly added message with populated data
    await chat.populate('messages.sender', 'firstName lastName email role designation profilePicture');
    await chat.populate('messages.mentions', 'firstName lastName email');

    const newMessage = chat.messages[chat.messages.length - 1];

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.post('/company/read', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      company: req.user.company,
      isGroupChat: true,
    });

    if (!chat) {
      return res.json({ success: true });
    }

    // Mark all messages as read by this user
    let updated = false;
    chat.messages.forEach(message => {
      const alreadyRead = message.readBy.some(
        r => r.user.toString() === req.user._id.toString()
      );
      if (!alreadyRead) {
        message.readBy.push({ user: req.user._id, readAt: new Date() });
        updated = true;
      }
    });

    if (updated) {
      await chat.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread count
router.get('/company/unread', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      company: req.user.company,
      isGroupChat: true,
    });

    if (!chat) {
      return res.json({ count: 0 });
    }

    const unreadCount = chat.messages.filter(message => {
      const isRead = message.readBy.some(
        r => r.user.toString() === req.user._id.toString()
      );
      return !isRead;
    }).length;

    res.json({ count: unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users for mentions
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await User.find(
      { company: req.user.company, status: 'active' },
      'firstName lastName email role designation profilePicture'
    ).sort({ firstName: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
