import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Company from '../models/Company.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@pvara.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Create company
    const company = new Company({
      name: 'PVARA HQ',
      email: 'company@pvara.com',
      subscription_plan: 'enterprise',
    });
    const savedCompany = await company.save();
    console.log('✓ Company created');

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const admin = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@pvara.com',
      password: hashedPassword,
      role: 'admin',
      company: savedCompany._id,
      employeeId: 'EMP001',
      department: 'Administration',
      status: 'active',
    });

    await admin.save();
    console.log('✓ Admin user created');

    // Update company with admin
    savedCompany.admin = admin._id;
    await savedCompany.save();

    console.log('\n========================================');
    console.log('✅ Seed completed successfully!');
    console.log('========================================');
    console.log('Admin Login Credentials:');
    console.log('  Email:    admin@pvara.com');
    console.log('  Password: admin123');
    console.log('========================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedAdmin();
