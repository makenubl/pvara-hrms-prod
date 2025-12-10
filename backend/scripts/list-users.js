import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const listUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected\n');

    const users = await User.find().select('firstName lastName email role employeeId');
    
    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      console.log('========================================');
      console.log('Users in Database:');
      console.log('========================================');
      users.forEach(user => {
        console.log(`\nName:     ${user.firstName} ${user.lastName}`);
        console.log(`Email:    ${user.email}`);
        console.log(`Role:     ${user.role}`);
        console.log(`ID:       ${user.employeeId || 'N/A'}`);
        console.log('----------------------------------------');
      });
      console.log('\nDefault password for seeded users: admin123');
      console.log('========================================\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

listUsers();
