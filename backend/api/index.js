// Vercel serverless entry point
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('../config/db');

dotenv.config();

const authRoutes = require('../routes/auth');
const employeeRoutes = require('../routes/employees');
const positionRoutes = require('../routes/positions');
const approvalRoutes = require('../routes/approvals');
const payrollRoutes = require('../routes/payrolls');
const kpiRoutes = require('../routes/kpi');
const profileRoutes = require('../routes/profile');

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

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/profile', profileRoutes);

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

module.exports = app;
