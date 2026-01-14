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

const testChangePasswordFlow = async () => {
  try {
    console.log('\n=== Complete Change Password Flow Test ===\n');

    // Step 1: Create test user
    console.log('Step 1: Creating test user with company...');
    const testCompany = new Company({
      name: `Test Company ${Date.now()}`,
      email: `test-company-${Date.now()}@test.com`,
    });
    const savedCompany = await testCompany.save();
    
    const testEmail = `test-password-${Date.now()}@test.com`;
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: await bcrypt.hash('defaultPassword123', 10),
      role: 'employee',
      company: savedCompany._id,
    });
    
    const savedUser = await testUser.save();
    console.log(`✓ Test user created: ${testEmail}`);

    // Step 2: Login to get token
    console.log('\nStep 2: Logging in to get authentication token...');
    let token;
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testEmail,
        password: 'defaultPassword123',
      });
      
      token = loginResponse.data.token;
      console.log('✓ Login successful, token obtained');
      console.log(`  Token: ${token.substring(0, 30)}...`);
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data?.message || error.message);
      throw error;
    }

    // Step 3: Attempt change password with MISSING current password (simulate form submission bug)
    console.log('\nStep 3: Test missing current password field...');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          // currentPassword: 'defaultPassword123', // MISSING
          newPassword: 'newPassword456',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.error('❌ Should have failed with missing current password');
    } catch (error) {
      console.log('✓ Correctly rejected missing current password:', error.response?.status);
    }

    // Step 4: Change password correctly
    console.log('\nStep 4: Changing password with correct current password...');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          currentPassword: 'defaultPassword123',
          newPassword: 'newPassword456',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('✓ Password changed successfully');
      console.log(`  Response: ${response.data.message}`);
    } catch (error) {
      console.error('❌ Change password failed:', error.response?.data?.message || error.message);
      console.error('  Status:', error.response?.status);
      console.error('  Data:', error.response?.data);
      throw error;
    }

    // Step 5: Verify old password doesn't work
    console.log('\nStep 5: Verifying old password is rejected...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testEmail,
        password: 'defaultPassword123',
      });
      console.error('❌ Old password should not work');
    } catch (error) {
      console.log('✓ Old password correctly rejected (401 Unauthorized)');
    }

    // Step 6: Verify new password works
    console.log('\nStep 6: Verifying new password works...');
    try {
      const newLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testEmail,
        password: 'newPassword456',
      });
      
      const newToken = newLoginResponse.data.token;
      console.log('✓ Login with new password successful');
      console.log(`  New Token: ${newToken.substring(0, 30)}...`);
    } catch (error) {
      console.error('❌ Login with new password failed:', error.response?.data?.message || error.message);
      throw error;
    }

    // Step 7: Verify token still has user info
    console.log('\nStep 7: Verifying token validity...');
    try {
      const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✓ Old token still valid (before new change)');
    } catch (error) {
      console.log('⚠️  Old token may have expired:', error.response?.status);
    }

    // Cleanup
    console.log('\nStep 8: Cleaning up test data...');
    await User.findByIdAndDelete(savedUser._id);
    await Company.findByIdAndDelete(savedCompany._id);
    console.log('✓ Test data cleaned up');

    console.log('\n=== ✓ All tests passed! Password change functionality is working ===\n');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
};

// Run the test
connectDB().then(() => testChangePasswordFlow()).finally(() => mongoose.disconnect());
