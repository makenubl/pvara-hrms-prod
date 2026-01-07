import mongoose from 'mongoose';

function normalizeWhatsAppNumber(value) {
  if (typeof value !== 'string') return value;
  let normalized = value.trim().replace(/[\s-]/g, ''); // Remove spaces and dashes
  if (normalized.length === 0) return normalized;

  // Strip whatsapp: prefix if present
  if (normalized.toLowerCase().startsWith('whatsapp:')) {
    normalized = normalized.slice('whatsapp:'.length);
  }

  // Convert international dial prefix (00 → +)
  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }

  // Handle Pakistan local format: 03xx → +923xx
  if (normalized.startsWith('03') && normalized.length === 11) {
    normalized = `+92${normalized.slice(1)}`; // 03001234567 → +923001234567
  }

  // Ensure leading + for E.164 format
  if (!normalized.startsWith('+')) {
    if (/^\d+$/.test(normalized)) {
      normalized = `+${normalized}`;
    }
  }

  return normalized;
}

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    
    // Contact Information
    phone: {
      type: String,
      set: normalizeWhatsAppNumber, // Normalize phone for WhatsApp matching
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
    },
    
    // Identification
    cnic: {
      type: String,
      unique: true,
      sparse: true,
    },
    passport: {
      type: String,
    },
    nationality: {
      type: String,
      default: 'Pakistani',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    },
    
    // Address Information
    currentAddress: {
      type: String,
    },
    permanentAddress: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
      default: 'Pakistan',
    },
    postalCode: {
      type: String,
    },
    
    // Emergency Contact
    emergencyContactName: {
      type: String,
    },
    emergencyContactRelation: {
      type: String,
    },
    emergencyContactPhone: {
      type: String,
    },
    
    // Bank Details
    bankName: {
      type: String,
    },
    accountTitle: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    iban: {
      type: String,
    },
    
    // Employment Details
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    designation: {
      type: String,
    },
    department: {
      type: String,
    },
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Position',
    },
    reportsTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'hr', 'manager', 'employee', 'chairman'],
      default: 'employee',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_leave', 'suspended'],
      default: 'active',
    },
    salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    joinDate: {
      type: Date,
    },
    requirePasswordChange: {
      type: Boolean,
      default: false,
    },
    
    // Media
    profileImage: {
      type: String,
    },
    
    // Documents
    documents: [{
      name: String,
      type: {
        type: String,
        enum: ['CNIC', 'Passport', 'Education', 'Experience', 'Medical', 'Other'],
      },
      url: String,
      uploadDate: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
      },
      size: String,
    }],
    
    // WhatsApp Integration
    whatsappNumber: {
      type: String,
      unique: true,
      sparse: true,
      set: normalizeWhatsAppNumber,
    },
    whatsappPreferences: {
      enabled: {
        type: Boolean,
        default: true,
      },
      // Notification preferences
      taskAssigned: {
        type: Boolean,
        default: true,
      },
      taskUpdates: {
        type: Boolean,
        default: true,
      },
      reminders: {
        type: Boolean,
        default: true,
      },
      // Custom reminder intervals (in minutes before deadline)
      reminderIntervals: {
        type: [Number],
        default: [1440, 240, 60, 30], // 1 day, 4 hours, 1 hour, 30 min
      },
    },
    
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a real unique index exists in MongoDB (sparse allows multiple nulls)
userSchema.index({ whatsappNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);
