import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const debugAuth = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected\n');

    // Find the employee user
    const user = await User.findOne({ email: 'employee@pvara.com' });
    
    if (!user) {
      console.log('❌ Employee user not found in database');
    } else {
      console.log('✅ Employee user found:');
      console.log('  MongoDB _id:', user._id);
      console.log('  MongoDB _id type:', typeof user._id);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Name:', user.firstName, user.lastName);
      
      // Generate token like the login does
      const token = jwt.sign(
        {
          _id: user._id,
          email: user.email,
          role: user.role,
          company: user.company,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      console.log('\n✅ Generated JWT token');
      
      // Decode the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('\n✅ Decoded JWT payload:');
      console.log('  _id:', decoded._id);
      console.log('  _id type:', typeof decoded._id);
      console.log('  email:', decoded.email);
      console.log('  role:', decoded.role);
      
      // Test finding user with decoded._id
      console.log('\n🔍 Testing User.findById with decoded._id...');
      const foundUser = await User.findById(decoded._id);
      if (foundUser) {
        console.log('✅ User found successfully!');
        console.log('  Name:', foundUser.firstName, foundUser.lastName);
      } else {
        console.log('❌ User NOT found with decoded._id');
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

debugAuth();
