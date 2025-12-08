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

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/approvals', approvalRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
