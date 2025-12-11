// Vercel serverless entry point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import connectDB from '../config/db.js';

dotenv.config();

import authRoutes from '../routes/auth.js';
import employeeRoutes from '../routes/employees.js';
import positionRoutes from '../routes/positions.js';
import approvalRoutes from '../routes/approvals.js';
import payrollRoutes from '../routes/payrolls.js';
import kpiRoutes from '../routes/kpi.js';
import profileRoutes from '../routes/profile.js';

const app = express();

// Connect to DB
connectDB();

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
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
        origin.endsWith('vercel.app') || 
        origin.endsWith('pvara.team')) {
      console.log(`✅ CORS allowed for origin: ${origin}`);
      callback(null, true);
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/profile', profileRoutes);

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
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
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
