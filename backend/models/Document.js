import mongoose from 'mongoose';

/**
 * Document Model
 * Stores metadata for files uploaded to S3 storage
 */
const documentSchema = new mongoose.Schema({
  // File identification
  filename: {
    type: String,
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true
  },
  
  // S3 storage information
  s3Key: {
    type: String,
    required: true,
    unique: true
  },
  s3Bucket: {
    type: String,
    required: true
  },
  s3Url: {
    type: String,
    required: true
  },
  
  // File metadata
  mimeType: {
    type: String,
    default: 'application/octet-stream'
  },
  size: {
    type: Number,
    required: true
  },
  
  // Organization
  folder: {
    type: String,
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  
  // Upload information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedByEmail: {
    type: String
  },
  
  // Document processing status
  status: {
    type: String,
    enum: ['active', 'uploaded', 'processing', 'processed', 'error', 'deleted'],
    default: 'uploaded'
  },
  
  // Text extraction (for PDFs/docs)
  extractedText: {
    type: String,
    select: false // Don't include by default in queries
  },
  textExtractedAt: {
    type: Date
  },
  
  // AI recommendations
  hasRecommendations: {
    type: Boolean,
    default: false
  },
  recommendationsGeneratedAt: {
    type: Date
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
documentSchema.index({ folder: 1, isDeleted: 1 });
documentSchema.index({ company: 1, folder: 1, isDeleted: 1 });
documentSchema.index({ uploadedBy: 1, createdAt: -1 });

// Static method to find documents by folder
documentSchema.statics.findByFolder = function(folder, includeDeleted = false) {
  const query = { folder };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find by S3 key
documentSchema.statics.findByS3Key = function(s3Key) {
  return this.findOne({ s3Key, isDeleted: false });
};

// Instance method to soft delete
documentSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Virtual for signed URL (to be populated by service)
documentSchema.virtual('signedUrl');

const Document = mongoose.model('Document', documentSchema);

export default Document;
