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
    category: {
      type: String,
      enum: ['task', 'meeting'],
      default: 'task',
    },
    // Meeting-specific fields
    meetingDateTime: {
      type: Date,
    },
    meetingEndTime: {
      type: Date,
    },
    meetingLocation: {
      type: String,
    },
    attendees: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      email: String,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'tentative'],
        default: 'pending',
      },
      notifiedAt: Date,
      respondedAt: Date,
    }],
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
    // Boost/Expedite feature - when chairperson energizes a task
    boosts: [{
      boostedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      boostedAt: {
        type: Date,
        default: Date.now,
      },
      message: String, // Optional message from chairperson
      acknowledged: {
        type: Boolean,
        default: false,
      },
      acknowledgedAt: Date,
      response: String, // Assignee's response to the boost
      respondedAt: Date,
    }],
    // Bottlenecks - Support requests from assignee to chairperson
    bottlenecks: [{
      issue: {
        type: String,
        required: true,
      },
      description: String, // Detailed description of the bottleneck
      category: {
        type: String,
        enum: ['resource', 'dependency', 'approval', 'technical', 'external', 'other'],
        default: 'other',
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      raisedAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['open', 'acknowledged', 'in-progress', 'resolved'],
        default: 'open',
      },
      // Chairperson response
      chairpersonResponse: String,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      respondedAt: Date,
      resolvedAt: Date,
      resolution: String, // How it was resolved
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
