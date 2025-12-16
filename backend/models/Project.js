import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'delayed'],
    default: 'pending'
  },
  completedAt: Date,
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department: String,
  
  // Timeline
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  // Status & Progress
  status: { 
    type: String, 
    enum: ['planning', 'on-track', 'at-risk', 'delayed', 'completed', 'on-hold'],
    default: 'planning'
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  
  // Budget
  budget: {
    allocated: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'PKR' }
  },
  
  // Team
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Priority & Visibility
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Blockers count (calculated or manual)
  blockers: { type: Number, default: 0 },
  
  // Milestones
  milestones: [milestoneSchema],
  
  // Updates/Notes
  updates: [{
    message: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Company reference
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Virtual for budget utilization percentage
projectSchema.virtual('budgetUtilization').get(function() {
  if (!this.budget.allocated || this.budget.allocated === 0) return 0;
  return Math.round((this.budget.spent / this.budget.allocated) * 100);
});

// Virtual for days remaining
projectSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const end = new Date(this.endDate);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff;
});

projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

export default mongoose.model('Project', projectSchema);
