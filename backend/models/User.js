import mongoose from 'mongoose';

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
    
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
