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

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://pvara-hrms-prod.vercel.app',
  'https://pvara-hrms-prod-git-main-makenubls-projects.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or ends with vercel.app
    if (allowedOrigins.includes(origin) || origin.endsWith('vercel.app')) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Connect to database
connectDB();

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'PVARA HRMS API',
    status: 'running',
    version: '1.0.0'
  });
});

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
