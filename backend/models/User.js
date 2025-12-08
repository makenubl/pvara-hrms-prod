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
    phone: {
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
      enum: ['admin', 'hr', 'manager', 'employee'],
      default: 'employee',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_leave', 'suspended'],
      default: 'active',
    },
    joiningDate: {
      type: Date,
    },
    salary: {
      type: Number,
    },
    avatar: {
      type: String,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
