import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';

// Routes
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import positionRoutes from './routes/positions.js';
import approvalRoutes from './routes/approvals.js';
import payrollRoutes from './routes/payrolls.js';
import profileRoutes from './routes/profile.js';
import kpiRoutes from './routes/kpi.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/kpi', kpiRoutes);

// Debug endpoint (remove in production)
import { authenticate } from './middleware/auth.js';
app.get('/api/debug/auth', authenticate, (req, res) => {
  res.json({
    message: 'Authentication working',
    user: {
      _id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      company: req.user.company,
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
