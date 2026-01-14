import mongoose from 'mongoose';

const dailyWorklogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  
  // Working Schedule
  startTime: {
    type: String,  // Format: "HH:mm"
    required: true
  },
  endTime: {
    type: String,  // Format: "HH:mm"
    required: true
  },
  totalHours: {
    type: Number,
    default: 0
  },
  
  // Daily Standup Content
  workedOnToday: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  planToWorkOn: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  
  // Showstoppers/Roadblocks
  showstopper: {
    hasShowstopper: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'critical'],
      default: 'medium'
    }
  },
  
  // Submission metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  lastEditedAt: {
    type: Date
  },
  
  // Status for tracking
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'flagged'],
    default: 'submitted'
  },
  
  // Admin review notes (optional)
  adminNotes: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound unique index to ensure one entry per user per day
dailyWorklogSchema.index(
  { user: 1, date: 1 },
  { unique: true }
);

// Index for efficient queries
dailyWorklogSchema.index({ company: 1, date: -1 });
dailyWorklogSchema.index({ user: 1, date: -1 });
dailyWorklogSchema.index({ date: -1 });
dailyWorklogSchema.index({ 'showstopper.hasShowstopper': 1 });

// Pre-save hook to calculate total hours
dailyWorklogSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);
    
    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    this.totalHours = parseFloat(((endMinutes - startMinutes) / 60).toFixed(2));
  }
  
  // Update lastEditedAt
  if (!this.isNew) {
    this.lastEditedAt = new Date();
  }
  
  next();
});

// Static method to check if user can still edit today's log
dailyWorklogSchema.statics.canEditToday = function(date) {
  const now = new Date();
  const logDate = new Date(date);
  
  // Set both dates to start of day for comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const logDayStart = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
  
  // Can only edit if it's the same day
  return todayStart.getTime() === logDayStart.getTime();
};

// Static method to get submission status for a team
dailyWorklogSchema.statics.getTeamSubmissionStatus = async function(companyId, date) {
  const User = mongoose.model('User');
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Get all active users in the company
  const allUsers = await User.find({ 
    company: companyId, 
    status: 'active' 
  }).select('_id firstName lastName email');
  
  // Get all submissions for the day
  const submissions = await this.find({
    company: companyId,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).populate('user', 'firstName lastName email');
  
  const submittedUserIds = new Set(submissions.map(s => s.user._id.toString()));
  
  const submitted = [];
  const notSubmitted = [];
  
  allUsers.forEach(user => {
    if (submittedUserIds.has(user._id.toString())) {
      submitted.push(user);
    } else {
      notSubmitted.push(user);
    }
  });
  
  return {
    submitted,
    notSubmitted,
    totalUsers: allUsers.length,
    submittedCount: submitted.length,
    notSubmittedCount: notSubmitted.length,
    submissionRate: allUsers.length > 0 
      ? Math.round((submitted.length / allUsers.length) * 100) 
      : 0
  };
};

export default mongoose.model('DailyWorklog', dailyWorklogSchema);
