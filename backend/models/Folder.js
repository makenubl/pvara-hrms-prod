import mongoose from 'mongoose';

/**
 * Folder Model
 * Stores folder metadata with user ownership for document organization
 */
const folderSchema = new mongoose.Schema({
  // Folder name (unique per user)
  name: {
    type: String,
    required: true,
    index: true
  },
  
  // Safe name for filesystem/S3 compatibility
  safeName: {
    type: String,
    required: true,
    index: true
  },
  
  // Owner information - the user who created this folder
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ownerEmail: {
    type: String,
    required: true,
    index: true
  },
  
  // Company association (optional, for company-wide folders)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  
  // Folder metadata
  description: {
    type: String,
    default: ''
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
folderSchema.index({ owner: 1, isDeleted: 1 });
folderSchema.index({ safeName: 1, owner: 1 }, { unique: true }); // Unique folder name per user
folderSchema.index({ company: 1, isDeleted: 1 });

// Static method to find folders by owner
folderSchema.statics.findByOwner = function(ownerId, includeDeleted = false) {
  const query = { owner: ownerId };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find a specific folder by name and owner
folderSchema.statics.findByNameAndOwner = function(safeName, ownerId) {
  return this.findOne({ 
    safeName, 
    owner: ownerId, 
    isDeleted: false 
  });
};

// Instance method to soft delete
folderSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

const Folder = mongoose.model('Folder', folderSchema);

export default Folder;
