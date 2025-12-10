import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Company from '../models/Company.js';

dotenv.config();

const createEmployeeUser = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    // Get the existing company
    const company = await Company.findOne({ email: 'company@pvara.com' });
    if (!company) {
      console.log('❌ Company not found. Please run seed.js first.');
      await mongoose.connection.close();
      return;
    }

    // Check if employee already exists
    const existingEmployee = await User.findOne({ email: 'employee@pvara.com' });
    if (existingEmployee) {
      console.log('Employee user already exists');
      await mongoose.connection.close();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('employee123', 10);

    // Create employee user
    const employee = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'employee@pvara.com',
      password: hashedPassword,
      role: 'employee',
      company: company._id,
      employeeId: 'EMP002',
      department: 'Engineering',
      status: 'active',
      joinDate: new Date('2024-06-01'),
      salary: 75000,
    });

    await employee.save();
    console.log('✓ Employee user created');

    console.log('\n========================================');
    console.log('✅ Employee user created successfully!');
    console.log('========================================');
    console.log('Employee Login Credentials:');
    console.log('  Email:    employee@pvara.com');
    console.log('  Password: employee123');
    console.log('  Role:     employee');
    console.log('========================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating employee user:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createEmployeeUser();
