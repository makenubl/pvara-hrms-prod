import express from 'express';
import Position from '../models/Position.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all positions for a company
router.get('/', authenticate, async (req, res) => {
  try {
      if (!req.user.company) {
        return res.status(400).json({ message: 'Company not found in token' });
      }
    
    const positions = await Position.find({ company: req.user.company })
      .populate('reportsTo', 'title department')
      .sort({ createdAt: -1 });
    res.json(positions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get position hierarchy/organizational structure
router.get('/hierarchy', authenticate, async (req, res) => {
  try {
    const positions = await Position.find({ company: req.user.company }).populate('reportsTo');
    
    // Get all users to count employees per position
    const User = (await import('../models/User.js')).default;
    const users = await User.find({ company: req.user.company, status: 'active' });
    
    // Count employees per position
    const employeeCountByPosition = {};
    users.forEach(user => {
      if (user.position) {
        const posId = user.position.toString();
        employeeCountByPosition[posId] = (employeeCountByPosition[posId] || 0) + 1;
      }
    });
    
    // Build hierarchy
    const hierarchy = {};
    positions.forEach((pos) => {
      const posId = pos._id.toString();
      hierarchy[posId] = {
        ...pos.toObject(),
        subordinates: [],
        employees: employeeCountByPosition[posId] || 0
      };
    });

    positions.forEach((pos) => {
      if (pos.reportsTo) {
        const reportsToId = pos.reportsTo._id.toString();
        if (hierarchy[reportsToId]) {
          hierarchy[reportsToId].subordinates.push(pos._id.toString());
        }
      }
    });

    res.json(Object.values(hierarchy));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single position
router.get('/:id', authenticate, async (req, res) => {
  try {
    const position = await Position.findById(req.params.id)
      .populate('reportsTo', 'title department');
    if (!position) return res.status(404).json({ message: 'Position not found' });
    res.json(position);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create position (HR/Admin only)
router.post('/', authenticate, authorize(['hr', 'admin']), async (req, res) => {
  const { title, department, description, reportsTo, level, salary_range_min, salary_range_max } = req.body;

  try {
      if (!req.user.company) {
        return res.status(400).json({ message: 'Company not found in token. Please login again.' });
      }

    const position = new Position({
      title,
      department,
      description,
      reportsTo: reportsTo || null,
      level,
      salary_range_min,
      salary_range_max,
      company: req.user.company,
    });

    const savedPosition = await position.save();
    await savedPosition.populate('reportsTo', 'title department');
    res.status(201).json(savedPosition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update position
router.put('/:id', authenticate, authorize(['hr', 'admin']), async (req, res) => {
  try {
    const position = await Position.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('reportsTo', 'title department');

    if (!position) return res.status(404).json({ message: 'Position not found' });
    res.json(position);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete position
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const position = await Position.findByIdAndDelete(req.params.id);
    if (!position) return res.status(404).json({ message: 'Position not found' });
    res.json({ message: 'Position deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
