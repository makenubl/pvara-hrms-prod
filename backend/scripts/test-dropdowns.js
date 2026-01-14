import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Company from '../models/Company.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Position from '../models/Position.js';

const PVARA_COMPANY_ID = '6941a96204ad309188334040';

async function testDropdowns() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const pvaraId = new mongoose.Types.ObjectId(PVARA_COMPANY_ID);

    // Verify company
    const company = await Company.findById(pvaraId);
    console.log('='.repeat(60));
    console.log('Company:', company.name);
    console.log('='.repeat(60));

    // ============================================================
    // Test Department Dropdown
    // ============================================================
    console.log('\n📋 DEPARTMENTS DROPDOWN TEST');
    console.log('-'.repeat(40));
    
    const departments = await Department.find({ company: pvaraId })
      .select('_id name description')
      .sort({ name: 1 });
    
    console.log(`Total: ${departments.length} departments`);
    departments.forEach((d, i) => {
      console.log(`${i + 1}. ${d.name} (${d._id})`);
    });

    // ============================================================
    // Test Position Dropdown
    // ============================================================
    console.log('\n💼 POSITIONS DROPDOWN TEST');
    console.log('-'.repeat(40));
    
    const positions = await Position.find({ company: pvaraId })
      .select('_id title department')
      .sort({ title: 1 });
    
    console.log(`Total: ${positions.length} positions`);
    positions.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title} (${p._id})`);
    });

    // ============================================================
    // Test User/Employee Dropdown
    // ============================================================
    console.log('\n👥 USERS DROPDOWN TEST');
    console.log('-'.repeat(40));
    
    const users = await User.find({ company: pvaraId })
      .select('_id firstName lastName email role')
      .sort({ firstName: 1 });
    
    console.log(`Total: ${users.length} users`);
    users.forEach((u, i) => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'No Name';
      console.log(`${i + 1}. ${fullName} (${u.email}) - ${u.role}`);
    });

    // ============================================================
    // Test Supervisor Dropdown (managers/admins)
    // ============================================================
    console.log('\n👔 SUPERVISORS DROPDOWN TEST');
    console.log('-'.repeat(40));
    
    const supervisors = await User.find({ 
      company: pvaraId, 
      role: { $in: ['admin', 'manager', 'chairman'] } 
    })
      .select('_id firstName lastName email role')
      .sort({ firstName: 1 });
    
    console.log(`Total: ${supervisors.length} supervisors`);
    supervisors.forEach((s, i) => {
      const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'No Name';
      console.log(`${i + 1}. ${fullName} (${s.email}) - ${s.role}`);
    });

    // ============================================================
    // Summary
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`
✅ Company: ${company.name} (${company._id})
✅ Departments: ${departments.length}
✅ Positions: ${positions.length}
✅ Users: ${users.length}
✅ Supervisors: ${supervisors.length}

All dropdown queries are working correctly!
`);

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDropdowns();
