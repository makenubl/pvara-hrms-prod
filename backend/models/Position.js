import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    reportsTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Position',
      default: null,
    },
    level: {
      type: String,
      enum: ['executive', 'senior', 'mid', 'junior'],
      default: 'mid',
    },
    salary_range_min: {
      type: Number,
    },
    salary_range_max: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
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

export default mongoose.model('Position', positionSchema);
