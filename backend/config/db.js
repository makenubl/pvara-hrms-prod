import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't exit, allow server to run and retry connection
    console.log('Server will continue running, but database operations will fail until MongoDB is connected');
  }
};

export default connectDB;
