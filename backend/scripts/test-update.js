import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const testUpdate = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected\n');

    // Find the employee user
    const user = await User.findOne({ email: 'employee@pvara.com' });
    
    if (!user) {
      console.log('❌ Employee user not found');
      process.exit(1);
    }

    console.log('✅ Found user:', user.firstName, user.lastName);
    console.log('Current data:');
    console.log('  Phone:', user.phone || 'Not set');
    console.log('  CNIC:', user.cnic || 'Not set');
    console.log('  City:', user.city || 'Not set');
    console.log('  Blood Group:', user.bloodGroup || 'Not set');
    
    // Update the user
    console.log('\n📝 Updating user...');
    user.phone = '03001234567';
    user.cnic = '12345-6789012-3';
    user.city = 'Karachi';
    user.bloodGroup = 'O+';
    user.currentAddress = '123 Main Street';
    user.dateOfBirth = new Date('1990-01-15');
    user.gender = 'male';
    
    await user.save();
    console.log('✅ User updated successfully!');
    
    // Verify the update
    const updatedUser = await User.findOne({ email: 'employee@pvara.com' });
    console.log('\n✅ Verified updated data:');
    console.log('  Phone:', updatedUser.phone);
    console.log('  CNIC:', updatedUser.cnic);
    console.log('  City:', updatedUser.city);
    console.log('  Blood Group:', updatedUser.bloodGroup);
    console.log('  Address:', updatedUser.currentAddress);
    console.log('  DOB:', updatedUser.dateOfBirth);
    console.log('  Gender:', updatedUser.gender);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testUpdate();
