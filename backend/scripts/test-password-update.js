import axios from 'axios';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import bcrypt from 'bcryptjs';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin');
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const API_BASE_URL = 'http://localhost:5000/api';

const testPasswordUpdate = async () => {
  try {
    console.log('\n=== Password Update Functionality Test ===\n');

    // Step 1: Create a test company and user
    console.log('Step 1: Creating test company and user...');
    const testCompany = new Company({
      name: `Test Company ${Date.now()}`,
      email: `test-company-${Date.now()}@test.com`,
    });
    const savedCompany = await testCompany.save();
    
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: `test-password-${Date.now()}@test.com`,
      password: await bcrypt.hash('oldPassword123', 10),
      role: 'employee',
      company: savedCompany._id,
    });
    
    const savedUser = await testUser.save();
    console.log(`✓ Test user created: ${savedUser.email}`);

    // Step 2: Login with current password
    console.log('\nStep 2: Testing login with current password...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: savedUser.email,
        password: 'oldPassword123',
      });
      
      if (!loginResponse.data.token) {
        throw new Error('No token received');
      }
      console.log('✓ Login successful, token received');
      var token = loginResponse.data.token;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data?.message || error.message);
      throw error;
    }

    // Step 3: Change password via API
    console.log('\nStep 3: Attempting to change password...');
    try {
      const changeResponse = await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('✓ Password change successful:', changeResponse.data.message);
    } catch (error) {
      console.error('❌ Password change failed:', error.response?.data?.message || error.message);
      throw error;
    }

    // Step 4: Try login with new password
    console.log('\nStep 4: Testing login with new password...');
    try {
      const newLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: savedUser.email,
        password: 'newPassword456',
      });
      
      if (!newLoginResponse.data.token) {
        throw new Error('No token received');
      }
      console.log('✓ Login with new password successful');
    } catch (error) {
      console.error('❌ Login with new password failed:', error.response?.data?.message || error.message);
      throw error;
    }

    // Step 5: Try login with old password (should fail)
    console.log('\nStep 5: Verifying old password is invalid...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: savedUser.email,
        password: 'oldPassword123',
      });
      console.error('❌ Old password should not work!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✓ Old password correctly rejected');
      } else {
        throw error;
      }
    }

    // Step 6: Test incorrect current password
    console.log('\nStep 6: Testing change password with wrong current password...');
    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          currentPassword: 'wrongPassword789',
          newPassword: 'anotherPassword000',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.error('❌ Should have rejected wrong current password');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✓ Wrong current password correctly rejected:', error.response?.data?.message);
      } else {
        throw error;
      }
    }

    // Cleanup
    console.log('\nStep 7: Cleaning up test user and company...');
    await User.findByIdAndDelete(savedUser._id);
    await Company.findByIdAndDelete(savedCompany._id);
    console.log('✓ Test user and company deleted');

    console.log('\n=== ✓ All password update tests passed! ===\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Run the test
connectDB().then(() => testPasswordUpdate()).finally(() => mongoose.disconnect());
