import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all employees for a company
router.get('/', authenticate, async (req, res) => {
  try {
    const employees = await User.find({ company: req.user.company })
      .populate('position', 'title department')
      .populate('reportsTo', 'firstName lastName');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employee by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .populate('position', 'title department')
      .populate('reportsTo', 'firstName lastName');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new employee (HR/Admin only)
router.post('/', authenticate, authorize(['hr', 'admin']), async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    department,
    position,
    reportsTo,
    role,
    joiningDate,
    salary,
    avatar,
  } = req.body;

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      department,
      position,
      reportsTo: reportsTo || null,
      role: role || 'employee',
      joiningDate,
      salary,
      avatar,
      company: req.user.company,
    });

    const savedEmployee = await employee.save();
    const populatedEmployee = await savedEmployee.populate([
      { path: 'position', select: 'title department' },
      { path: 'reportsTo', select: 'firstName lastName' },
    ]);

    res.status(201).json(populatedEmployee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update employee
router.put('/:id', authenticate, authorize(['hr', 'admin']), async (req, res) => {
  try {
    // Prevent password updates through this endpoint
    delete req.body.password;

    const employee = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate([
      { path: 'position', select: 'title department' },
      { path: 'reportsTo', select: 'firstName lastName' },
    ]);

    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get direct reports for a manager
router.get('/:id/reports', authenticate, async (req, res) => {
  try {
    const directReports = await User.find({
      reportsTo: req.params.id,
      company: req.user.company,
    })
      .populate('position', 'title department')
      .populate('reportsTo', 'firstName lastName');

    res.json(directReports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete employee (soft delete - mark as inactive)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee deactivated', employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
