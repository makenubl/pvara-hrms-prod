import express from 'express';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

function normalizeWhatsAppNumber(value) {
  if (typeof value !== 'string') return value;
  let normalized = value.trim();
  if (normalized.length === 0) return '';

  if (normalized.toLowerCase().startsWith('whatsapp:')) {
    normalized = normalized.slice('whatsapp:'.length);
  }

  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (!normalized.startsWith('+')) {
    if (/^\d+$/.test(normalized)) {
      normalized = `+${normalized}`;
    }
  }

  return normalized;
}

// Configure multer for profile photo uploads (memory storage for serverless)
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for photos (Base64 doubles size)
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png)/.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, and .png images are allowed for profile photos!'));
    }
  }
});

// Configure multer for document uploads
const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
  fileFilter: function (req, file, cb) {
    const allowedExtensions = /pdf|doc|docx|jpg|jpeg|png/;
    const allowedMimetypes = /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|image\/(jpeg|jpg|png)/;
    
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .pdf, .doc, .docx, .jpg, .jpeg, and .png files are allowed for documents!'));
    }
  }
});

// @route   GET /api/profile
// @desc    Get current user's profile
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('position', 'title')
      .populate('reportsTo', 'firstName lastName email')
      .populate('company', 'name');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/profile
// @desc    Update current user's profile
// @access  Private
router.put('/', authenticate, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      whatsappNumber,
      whatsappPreferences,
      dateOfBirth,
      gender,
      maritalStatus,
      cnic,
      passport,
      nationality,
      bloodGroup,
      currentAddress,
      permanentAddress,
      city,
      state,
      country,
      postalCode,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      bankName,
      accountTitle,
      accountNumber,
      iban,
    } = req.body;
    
    // Validation
    const errors = [];
    
    // Required fields
    if (firstName !== undefined && (!firstName || !firstName.trim())) {
      errors.push('First name cannot be empty');
    }
    if (lastName !== undefined && (!lastName || !lastName.trim())) {
      errors.push('Last name cannot be empty');
    }
    
    // CNIC format validation (Pakistan)
    if (cnic && !/^[0-9]{5}-?[0-9]{7}-?[0-9]$/.test(cnic)) {
      errors.push('CNIC must be in format: 12345-1234567-1');
    }
    
    // Phone validation
    if (phone && !/^\+?[0-9\s-]{10,20}$/.test(phone)) {
      errors.push('Invalid phone number format');
    }

    // WhatsApp number validation
    if (whatsappNumber !== undefined) {
      const normalized = normalizeWhatsAppNumber(whatsappNumber);
      if (normalized && !/^\+?[0-9]{10,15}$/.test(normalized.replace(/[\s-]/g, ''))) {
        errors.push('Invalid WhatsApp number format');
      }
    }
    
    // Date validation
    if (dateOfBirth && new Date(dateOfBirth) > new Date()) {
      errors.push('Date of birth cannot be in the future');
    }
    
    // Enum validations
    const validGenders = ['male', 'female', 'other'];
    if (gender && !validGenders.includes(gender)) {
      errors.push('Gender must be: male, female, or other');
    }
    
    const validMaritalStatuses = ['single', 'married', 'divorced', 'widowed'];
    if (maritalStatus && !validMaritalStatuses.includes(maritalStatus)) {
      errors.push('Invalid marital status');
    }
    
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    if (bloodGroup && !validBloodGroups.includes(bloodGroup)) {
      errors.push('Invalid blood group');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(', '), errors });
    }
    
    // Build update object
    const updateFields = {};
    const unsetFields = {};
    
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (phone) updateFields.phone = phone;
    if (whatsappNumber !== undefined) {
      const normalized = normalizeWhatsAppNumber(whatsappNumber);
      if (!normalized) {
        unsetFields.whatsappNumber = 1;
      } else {
        updateFields.whatsappNumber = normalized;
      }
    }
    if (whatsappPreferences !== undefined && whatsappPreferences && typeof whatsappPreferences === 'object') {
      // Only allow specific subfields to be updated
      const allowedKeys = ['enabled', 'taskAssigned', 'taskUpdates', 'reminders', 'reminderIntervals'];
      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(whatsappPreferences, key)) {
          updateFields[`whatsappPreferences.${key}`] = whatsappPreferences[key];
        }
      }
    }
    if (dateOfBirth) updateFields.dateOfBirth = dateOfBirth;
    if (gender) updateFields.gender = gender;
    if (maritalStatus) updateFields.maritalStatus = maritalStatus;
    if (cnic) updateFields.cnic = cnic;
    if (passport) updateFields.passport = passport;
    if (nationality) updateFields.nationality = nationality;
    if (bloodGroup) updateFields.bloodGroup = bloodGroup;
    if (currentAddress) updateFields.currentAddress = currentAddress;
    if (permanentAddress) updateFields.permanentAddress = permanentAddress;
    if (city) updateFields.city = city;
    if (state) updateFields.state = state;
    if (country) updateFields.country = country;
    if (postalCode) updateFields.postalCode = postalCode;
    if (emergencyContactName) updateFields.emergencyContactName = emergencyContactName;
    if (emergencyContactRelation) updateFields.emergencyContactRelation = emergencyContactRelation;
    if (emergencyContactPhone) updateFields.emergencyContactPhone = emergencyContactPhone;
    if (bankName) updateFields.bankName = bankName;
    if (accountTitle) updateFields.accountTitle = accountTitle;
    if (accountNumber) updateFields.accountNumber = accountNumber;
    if (iban) updateFields.iban = iban;
    
    const updateOp = {};
    if (Object.keys(updateFields).length > 0) updateOp.$set = updateFields;
    if (Object.keys(unsetFields).length > 0) updateOp.$unset = unsetFields;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateOp,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle duplicate CNIC error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.cnic) {
      return res.status(400).json({ message: 'CNIC already exists' });
    }

    // Handle duplicate WhatsApp number error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.whatsappNumber) {
      return res.status(400).json({ message: 'WhatsApp number already exists' });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/profile/photo
// @desc    Upload profile photo
// @access  Private
router.post('/photo', authenticate, photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }
    
    // Convert buffer to Base64 data URL for serverless compatibility
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    // Update user with new photo (Base64 stored directly in DB)
    const user = await User.findById(req.user._id);
    user.profileImage = base64Image;
    await user.save();
    
    res.json({ 
      message: 'Profile photo uploaded successfully', 
      photoUrl: base64Image 
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/profile/documents
// @desc    Upload document
// @access  Private
router.post('/documents', authenticate, documentUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }
    
    const { type } = req.body;
    
    // Validate document type
    const validTypes = ['CNIC', 'Passport', 'Education', 'Experience', 'Medical', 'Other'];
    if (!type) {
      return res.status(400).json({ message: 'Document type is required' });
    }
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: `Invalid document type. Must be one of: ${validTypes.join(', ')}` 
      });
    }
    
    const documentUrl = `/uploads/documents/${req.file.filename}`;
    const documentSize = (req.file.size / 1024).toFixed(2) + ' KB';
    
    const document = {
      name: req.file.originalname,
      type: type,
      url: documentUrl,
      size: documentSize,
      uploadDate: new Date(),
      status: 'pending'
    };
    
    const user = await User.findById(req.user._id);
    user.documents.push(document);
    await user.save();
    
    res.json({ 
      message: 'Document uploaded successfully', 
      document: user.documents[user.documents.length - 1]
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/profile/documents/:id
// @desc    Delete document
// @access  Private
router.delete('/documents/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const document = user.documents.id(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', document.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Remove from database
    document.deleteOne();
    await user.save();
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/profile/documents/:id/download
// @desc    Download document
// @access  Private
router.get('/documents/:id/download', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const document = user.documents.id(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const filePath = path.join(__dirname, '..', document.url);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.download(filePath, document.name);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
