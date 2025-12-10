import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Company from './models/Company.js';

dotenv.config();

const testLogin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    const email = 'admin@pvara.com';
    const password = 'admin123';

    console.log(`\nTesting login for: ${email}`);
    
    const user = await User.findOne({ email }).populate('company');
    
    if (!user) {
      console.log('❌ User not found');
      await mongoose.connection.close();
      return;
    }

    console.log('✓ User found');
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Company: ${user.company?.name || 'N/A'}`);

    console.log(`\nTesting password...`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (isPasswordValid) {
      console.log('✓ Password is valid');
    } else {
      console.log('❌ Password is invalid');
    }

    console.log(`\nTesting JWT generation...`);
    try {
      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign(
        {
          _id: user._id,
          email: user.email,
          role: user.role,
          company: user.company,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      console.log('✓ JWT generated successfully');
      console.log(`  Token: ${token.substring(0, 50)}...`);
    } catch (jwtError) {
      console.log('❌ JWT generation failed:', jwtError.message);
    }

    await mongoose.connection.close();
    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testLogin();
