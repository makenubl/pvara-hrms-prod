import mongoose from 'mongoose';

const approvalFlowSchema = new mongoose.Schema(
  {
    requestType: {
      type: String,
      enum: ['leave', 'expense', 'equipment', 'promotion', 'transfer', 'attendance'],
      required: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvers: [
      {
        approver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        level: {
          type: Number,
          default: 1,
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        comment: String,
        approvedAt: Date,
      },
    ],
    currentLevel: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('ApprovalFlow', approvalFlowSchema);
