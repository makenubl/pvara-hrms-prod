// Vercel serverless entry point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

dotenv.config();

import authRoutes from '../routes/auth.js';
import employeeRoutes from '../routes/employees.js';
import positionRoutes from '../routes/positions.js';
import approvalRoutes from '../routes/approvals.js';
import payrollRoutes from '../routes/payrolls.js';
import kpiRoutes from '../routes/kpi.js';
import profileRoutes from '../routes/profile.js';
import departmentRoutes from '../routes/departments.js';
import taskRoutes from '../routes/tasks.js';
import projectRoutes from '../routes/projects.js';

const app = express();

// Ensure DB connection before handling requests
const dbMiddleware = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({ message: 'Database connection failed', error: error.message });
  }
};

// CORS configuration for production - handle all pvara.team variants
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Define allowed patterns
    const isAllowed = 
      origin === 'https://pvara.team' ||
      origin === 'https://www.pvara.team' ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:5174' ||
      origin === 'http://localhost:5175' ||
      origin === 'http://localhost:3000' ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.pvara.team');
    
    if (isAllowed) {
      // Return the exact origin that made the request
      callback(null, origin);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP request logging
app.use(morgan('combined'));

app.use(express.json());

// Apply database middleware to API routes
app.use('/api', dbMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'PVARA HRMS API',
    status: 'running',
    version: '1.0.0'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    database: dbStatus
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
