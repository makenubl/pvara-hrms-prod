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
import worklogRoutes from '../routes/worklogs.js';
import highlightRoutes from '../routes/highlights.js';
import chatRoutes from '../routes/chat.js';
import whatsappRoutes from '../routes/whatsapp.js';

// Finance/ERP Routes
import bankPaymentRoutes from '../routes/bankPayments.js';
import budgetRoutes from '../routes/budgets.js';
import journalEntryRoutes from '../routes/journalEntries.js';
import financialReportRoutes from '../routes/financialReports.js';
import chartOfAccountRoutes from '../routes/chartOfAccounts.js';
import vendorRoutes from '../routes/vendors.js';
import fixedAssetRoutes from '../routes/fixedAssets.js';
import costCenterRoutes from '../routes/costCenters.js';
import auditTrailRoutes from '../routes/auditTrail.js';
import cashFlowRoutes from '../routes/cashFlowStatement.js';
import monthlyClosingRoutes from '../routes/monthlyClosing.js';
import multiCurrencyRoutes from '../routes/multiCurrency.js';
import taxFilingRoutes from '../routes/taxFiling.js';
import yearEndClosingRoutes from '../routes/yearEndClosing.js';
import purchaseOrderRoutes from '../routes/purchaseOrders.js';
import documentSequenceRoutes from '../routes/documentSequence.js';
import storageRoutes from '../routes/storage.js';

const app = express();

// CORS configuration - MUST be first middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://pvara.team',
      'https://www.pvara.team',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000'
    ];
    
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.vercel.app') || 
        origin.endsWith('.pvara.team')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now to debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Apply CORS before ANY other middleware
app.use(cors(corsOptions));

// Handle preflight explicitly
app.options('*', cors(corsOptions));

// Ensure DB connection before handling requests
const dbMiddleware = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    // CORS headers already set by cors middleware above
    res.status(503).json({ message: 'Database connection failed', error: error.message });
  }
};

// Helper to check if origin is allowed (kept for error handler)
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return (
    origin === 'https://pvara.team' ||
    origin === 'https://www.pvara.team' ||
    origin === 'http://localhost:5173' ||
    origin === 'http://localhost:5174' ||
    origin === 'http://localhost:5175' ||
    origin === 'http://localhost:3000' ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.pvara.team')
  );
};

// HTTP request logging
app.use(morgan('combined'));

// Twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
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
app.use('/api/worklogs', worklogRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Finance/ERP Routes
app.use('/api/bank-payments', bankPaymentRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/journal-entries', journalEntryRoutes);
app.use('/api/financial-reports', financialReportRoutes);
app.use('/api/chart-of-accounts', chartOfAccountRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/fixed-assets', fixedAssetRoutes);
app.use('/api/cost-centers', costCenterRoutes);
app.use('/api/audit-trail', auditTrailRoutes);
app.use('/api/cash-flow', cashFlowRoutes);
app.use('/api/monthly-closing', monthlyClosingRoutes);
app.use('/api/multi-currency', multiCurrencyRoutes);
app.use('/api/tax-filing', taxFilingRoutes);
app.use('/api/year-end-closing', yearEndClosingRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/document-sequence', documentSequenceRoutes);
app.use('/api/storage', storageRoutes);

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

// Error handling - ensure CORS headers are set even on errors
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Set CORS headers on error responses
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
