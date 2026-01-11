import mongoose from 'mongoose';

/**
 * Cost Center Schema
 * For budget allocation and expense tracking by organizational unit
 */

const costCenterSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    // Hierarchy
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
      default: null,
    },
    level: {
      type: Number,
      default: 1,
    },
    // Link to department
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    // Responsible person
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Budget control
    hasBudget: {
      type: Boolean,
      default: true,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

costCenterSchema.index({ company: 1, code: 1 }, { unique: true });
costCenterSchema.index({ company: 1, department: 1 });

export default mongoose.model('CostCenter', costCenterSchema);
