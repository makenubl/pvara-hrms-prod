import mongoose from 'mongoose';

const highlightSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['achievement', 'milestone', 'showstopper', 'support-needed'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
highlightSchema.index({ type: 1, resolved: 1 });
highlightSchema.index({ department: 1 });
highlightSchema.index({ createdAt: -1 });

export default mongoose.model('Highlight', highlightSchema);
