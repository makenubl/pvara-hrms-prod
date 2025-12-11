import mongoose from 'mongoose';
import logger from './logger.js';

// Cache the database connection for serverless reuse
let cachedConnection = null;

const connectDB = async () => {
  try {
    // Return cached connection if available
    if (cachedConnection && mongoose.connection.readyState === 1) {
      logger.info('✅ Using cached MongoDB connection');
      return cachedConnection;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    
    // Optimize connection for Vercel serverless
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
    };

    cachedConnection = await mongoose.connect(mongoUri, options);
    logger.info('✅ MongoDB connected successfully');
    return cachedConnection;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // Don't exit, allow server to run and retry connection
    logger.warn('⚠️  Server will continue running, but database operations will fail until MongoDB is connected');
  }
};

export default connectDB;
