import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
      company: user.company,
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Register company and admin
router.post('/register', async (req, res) => {
  const { companyName, companyEmail, adminFirstName, adminLastName, adminEmail, password } = req.body;

  try {
    // Check if company already exists
    const existingCompany = await Company.findOne({ email: companyEmail });
    if (existingCompany) {
      return res.status(400).json({ message: 'Company already registered' });
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create company
    const company = new Company({
      name: companyName,
      email: companyEmail,
      subscription_plan: 'free',
    });

    const savedCompany = await company.save();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = new User({
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      company: savedCompany._id,
    });

    const savedAdmin = await admin.save();

    // Update company with admin
    savedCompany.admin = savedAdmin._id;
    await savedCompany.save();

    // Generate token
    const token = generateToken(savedAdmin);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        _id: savedAdmin._id,
        firstName: savedAdmin.firstName,
        lastName: savedAdmin.lastName,
        email: savedAdmin.email,
        role: savedAdmin.role,
        company: savedCompany._id,
      },
      company: savedCompany,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt for:', email);
    const user = await User.findOne({ email }).populate('company');
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    console.log('Login successful for:', email);
    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        designation: user.designation,
        department: user.department,
        company: user.company,
        requirePasswordChange: user.requirePasswordChange,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.requirePasswordChange = false;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company')
      .populate('position', 'title department')
      .populate('reportsTo', 'firstName lastName');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Temporary: Reset all passwords for company (admin only)
router.post('/reset-all-passwords', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    
    const newPassword = req.body.password || '123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await User.updateMany(
      { company: req.user.company._id || req.user.company },
      { $set: { password: hashedPassword, requirePasswordChange: true } }
    );
    
    res.json({ message: `Reset passwords for ${result.modifiedCount} users to "${newPassword}"` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
