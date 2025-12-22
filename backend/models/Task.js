import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project: {
      type: String,
      required: true,
    },
    department: {
      type: String,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'blocked', 'completed', 'cancelled'],
      default: 'pending',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    capacity: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      comment: 'Percentage of employee capacity allocated to this task',
    },
    deadline: {
      type: Date,
      required: true,
    },
    blocker: {
      type: String,
    },
    updates: [{
      message: String,
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
      progress: Number,
      status: String,
    }],
    // Chairman comments
    chairmanComments: [{
      comment: {
        type: String,
        required: true,
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Activity timeline (task journey through departments)
    activities: [{
      action: {
        type: String,
        required: true,
        // e.g., 'initiated', 'sent_to_department', 'response_received', 'pending_response', 'escalated', 'resolved'
      },
      department: String,
      poc: String, // Point of Contact
      pocEmail: String,
      sentAt: Date,
      responseReceivedAt: Date,
      status: {
        type: String,
        enum: ['sent', 'pending', 'received', 'completed', 'escalated'],
        default: 'sent',
      },
      notes: String,
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Attachments
    attachments: [{
      name: String,
      url: String,
      type: String, // file type/mime
      size: Number, // in bytes
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ company: 1, status: 1 });
taskSchema.index({ deadline: 1 });

export default mongoose.model('Task', taskSchema);
