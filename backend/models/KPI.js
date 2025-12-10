import mongoose from 'mongoose';

const kpiGoalSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      enum: ['Quality', 'Productivity', 'Efficiency', 'Innovation', 'Teamwork', 'Leadership', 'Customer Service', 'Other'],
      default: 'Other',
    },
    targetValue: {
      type: Number,
    },
    unit: {
      type: String, // e.g., '%', 'count', 'hours', 'days'
    },
    weightage: {
      type: Number,
      min: 0,
      max: 100,
      default: 10,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'active',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

const kpiReviewSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewPeriod: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    goals: [{
      goalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KPIGoal',
      },
      title: String,
      category: String,
      targetValue: Number,
      actualValue: Number,
      unit: String,
      weightage: Number,
      achievement: Number, // Percentage 0-100
      supervisorComments: String,
    }],
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    rating: {
      type: String,
      enum: ['Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory'],
    },
    strengths: [String],
    areasForImprovement: [String],
    supervisorComments: {
      type: String,
    },
    employeeComments: {
      type: String,
    },
    actionPlan: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'acknowledged', 'disputed'],
      default: 'draft',
    },
    submittedDate: {
      type: Date,
    },
    acknowledgedDate: {
      type: Date,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
kpiGoalSchema.index({ employee: 1, status: 1 });
kpiGoalSchema.index({ supervisor: 1, status: 1 });
kpiReviewSchema.index({ employee: 1, status: 1 });
kpiReviewSchema.index({ supervisor: 1, status: 1 });

export const KPIGoal = mongoose.model('KPIGoal', kpiGoalSchema);
export const KPIReview = mongoose.model('KPIReview', kpiReviewSchema);
