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
    // Secondary assignees - can view and update task same as primary
    secondaryAssignees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
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
    // Task Dependencies - for inter-employee collaboration
    dependencies: [{
      // Unique identifier for this dependency
      dependencyId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString(),
      },
      // Who is requesting the dependency (usually task assignee)
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      // Who needs to fulfill the dependency
      dependsOn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      // Description of what is needed
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      // Category of dependency
      category: {
        type: String,
        enum: ['information', 'document', 'approval', 'review', 'resource', 'action', 'other'],
        default: 'information',
      },
      // Priority level
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      // Expected deadline for the dependency
      dueDate: {
        type: Date,
      },
      // Current status
      status: {
        type: String,
        enum: ['pending', 'acknowledged', 'in-progress', 'fulfilled', 'declined', 'escalated'],
        default: 'pending',
      },
      // Response from the dependent person
      response: {
        type: String,
      },
      respondedAt: Date,
      fulfilledAt: Date,
      // Decline reason if declined
      declineReason: String,
      // Comment thread for discussion
      comments: [{
        message: {
          type: String,
          required: true,
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        // Track if chairperson/manager made this comment
        isManagerComment: {
          type: Boolean,
          default: false,
        },
      }],
      // Attachments for this dependency
      attachments: [{
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      // Tracking
      createdAt: {
        type: Date,
        default: Date.now,
      },
      // Notification tracking
      notifiedAt: Date,
      remindersSent: {
        type: Number,
        default: 0,
      },
      lastReminderAt: Date,
      // Escalation tracking
      escalatedAt: Date,
      escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      escalationReason: String,
    }],
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // WhatsApp reminder tracking - stores which reminders have been sent
    reminders: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for faster queries
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ secondaryAssignees: 1, status: 1 });
taskSchema.index({ company: 1, status: 1 });
taskSchema.index({ deadline: 1 });
// Index for dependency queries
taskSchema.index({ 'dependencies.requestedBy': 1, 'dependencies.status': 1 });
taskSchema.index({ 'dependencies.dependsOn': 1, 'dependencies.status': 1 });

export default mongoose.model('Task', taskSchema);
