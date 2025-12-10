import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Company from '../models/Company.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const createManagerAndAssignEmployees = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin');
    console.log('✅ Connected to MongoDB');

    // Find company
    const company = await Company.findOne();
    if (!company) {
      console.log('❌ No company found. Please create a company first.');
      process.exit(1);
    }

    // Check if manager already exists
    let manager = await User.findOne({ email: 'manager@pvara.com' });
    
    if (!manager) {
      // Create manager user
      const hashedPassword = await bcrypt.hash('manager123', 10);
      manager = await User.create({
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'manager@pvara.com',
        password: hashedPassword,
        role: 'manager',
        department: 'Engineering',
        employeeId: 'EMP-MGR-001',
        company: company._id,
        status: 'active',
        phone: '+92-321-1234567',
        joinDate: new Date('2023-01-15'),
        position: null,
        reportsTo: null // Manager reports to admin or no one
      });
      console.log('✅ Created manager user: manager@pvara.com / manager123');
    } else {
      console.log('ℹ️  Manager already exists: manager@pvara.com');
    }

    // Find all employees (not admin, hr, or managers)
    const employees = await User.find({
      company: company._id,
      role: 'employee',
      email: { $ne: 'manager@pvara.com' }
    });

    if (employees.length === 0) {
      console.log('⚠️  No employees found to assign to manager.');
    } else {
      // Assign employees to the manager
      const updateResult = await User.updateMany(
        {
          _id: { $in: employees.map(emp => emp._id) }
        },
        {
          $set: { reportsTo: manager._id }
        }
      );

      console.log(`✅ Assigned ${updateResult.modifiedCount} employees to manager`);
      
      // List assigned employees
      console.log('\n📋 Employees reporting to manager:');
      employees.forEach(emp => {
        console.log(`   - ${emp.firstName} ${emp.lastName} (${emp.email})`);
      });
    }

    console.log('\n✨ Manager Setup Complete!');
    console.log('\n📝 Login Details:');
    console.log('   Email: manager@pvara.com');
    console.log('   Password: manager123');
    console.log('   Role: Manager');
    console.log(`   Team Size: ${employees.length} employees`);
    console.log('\n🎯 Manager can now:');
    console.log('   • Create KPI goals for team members');
    console.log('   • Submit performance reviews');
    console.log('   • View team performance data');
    console.log('   • Access Team Performance menu');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

createManagerAndAssignEmployees();
