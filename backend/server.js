import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables BEFORE importing other modules
dotenv.config();

import mongoose from 'mongoose';
import morgan from 'morgan';
import connectDB from './config/db.js';
import logger from './config/logger.js';

// Routes
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import positionRoutes from './routes/positions.js';
import approvalRoutes from './routes/approvals.js';
import payrollRoutes from './routes/payrolls.js';
import profileRoutes from './routes/profile.js';
import kpiRoutes from './routes/kpi.js';
import taskRoutes from './routes/tasks.js';
import departmentRoutes from './routes/departments.js';
import projectRoutes from './routes/projects.js';
import worklogRoutes from './routes/worklogs.js';
import highlightRoutes from './routes/highlights.js';
import chatRoutes from './routes/chat.js';
import whatsappRoutes from './routes/whatsapp.js';

// Services
import reminderScheduler from './services/reminderScheduler.js';

const app = express();

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://pvara.team',
  'https://www.pvara.team',
  'https://pvara-hrms-prod.vercel.app',
  'https://pvara-hrms-prod-frontend.vercel.app',
  'https://pvara-hrms-prod-git-main-makenubls-projects.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or ends with vercel.app or pvara.team
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.vercel.app') || 
        origin.endsWith('.pvara.team') ||
        origin === 'https://pvara.team' ||
        origin === 'https://www.pvara.team') {
      callback(null, origin); // Return the actual origin
    } else {
      logger.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Twilio webhook (form-urlencoded)
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Connect to database
connectDB();

logger.info('Starting PVARA HRMS Backend Server...');

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
app.use('/api/tasks', taskRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/worklogs', worklogRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/whatsapp', whatsappRoutes);

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
  logger.error(`Server Error: ${err.message}`, { stack: err.stack, url: req.url, method: req.method });
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`📝 Logs directory: ./logs`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start WhatsApp reminder scheduler
  const twilioSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH;
  if (twilioSid && twilioAuth) {
    reminderScheduler.start();
    logger.info('📱 WhatsApp reminder scheduler started');
  } else {
    logger.warn('📱 WhatsApp not configured - reminder scheduler disabled');
  }
});
