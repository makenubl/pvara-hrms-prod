import mongoose from 'mongoose';

const worklogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  project: {
    type: String,
    required: true,
    trim: true
  },
  task: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  hoursWorked: {
    type: Number,
    required: true,
    min: 0.5,
    max: 24
  },
  status: {
    type: String,
    enum: ['completed', 'in-progress', 'pending'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Index for efficient queries
worklogSchema.index({ user: 1, date: -1 });
worklogSchema.index({ date: -1 });

export default mongoose.model('Worklog', worklogSchema);
