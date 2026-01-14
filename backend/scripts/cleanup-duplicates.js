import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Company from '../models/Company.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Position from '../models/Position.js';

const PVARA_COMPANY_ID = '6941a96204ad309188334040';

async function cleanupDuplicates() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const pvaraId = new mongoose.Types.ObjectId(PVARA_COMPANY_ID);

    // ============================================================
    // STEP 1: Clean up duplicate departments
    // ============================================================
    console.log('='.repeat(60));
    console.log('STEP 1: Clean up duplicate departments');
    console.log('='.repeat(60));

    const departments = await Department.find({ company: pvaraId });
    const deptMap = new Map();
    const deptDuplicates = [];

    for (const dept of departments) {
      const normalizedName = dept.name.toLowerCase().trim();
      if (deptMap.has(normalizedName)) {
        deptDuplicates.push(dept._id);
        console.log(`  Duplicate: ${dept.name} (${dept._id})`);
      } else {
        deptMap.set(normalizedName, dept);
      }
    }

    if (deptDuplicates.length > 0) {
      await Department.deleteMany({ _id: { $in: deptDuplicates } });
      console.log(`✅ Removed ${deptDuplicates.length} duplicate departments`);
    } else {
      console.log('✅ No duplicate departments found');
    }

    // ============================================================
    // STEP 2: Clean up duplicate positions
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: Clean up duplicate positions');
    console.log('='.repeat(60));

    const positions = await Position.find({ company: pvaraId });
    const posMap = new Map();
    const posDuplicates = [];

    for (const pos of positions) {
      const normalizedTitle = pos.title.toLowerCase().trim();
      if (posMap.has(normalizedTitle)) {
        posDuplicates.push(pos._id);
        console.log(`  Duplicate: ${pos.title} (${pos._id})`);
      } else {
        posMap.set(normalizedTitle, pos);
      }
    }

    if (posDuplicates.length > 0) {
      await Position.deleteMany({ _id: { $in: posDuplicates } });
      console.log(`✅ Removed ${posDuplicates.length} duplicate positions`);
    } else {
      console.log('✅ No duplicate positions found');
    }

    // ============================================================
    // STEP 3: Fix users with undefined names
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: Check users with undefined names');
    console.log('='.repeat(60));

    const usersWithNoName = await User.find({ 
      company: pvaraId,
      $or: [
        { name: { $exists: false } },
        { name: null },
        { name: '' }
      ]
    });

    console.log(`Found ${usersWithNoName.length} users with undefined/empty names`);
    
    // Try to set name from firstName + lastName or email
    for (const user of usersWithNoName) {
      let newName = '';
      if (user.firstName && user.lastName) {
        newName = `${user.firstName} ${user.lastName}`;
      } else if (user.firstName) {
        newName = user.firstName;
      } else if (user.email) {
        // Extract name from email (before @)
        const emailPart = user.email.split('@')[0];
        newName = emailPart.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      }
      
      if (newName) {
        await User.updateOne({ _id: user._id }, { $set: { name: newName } });
        console.log(`  Fixed: ${user.email} -> ${newName}`);
      }
    }

    // ============================================================
    // STEP 4: Verify final state
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('FINAL STATE - Dropdown Data');
    console.log('='.repeat(60));

    // Departments
    const finalDepts = await Department.find({ company: pvaraId }).sort({ name: 1 });
    console.log(`\n📋 Departments (${finalDepts.length}):`);
    finalDepts.forEach(d => console.log(`  - ${d.name}`));

    // Positions
    const finalPositions = await Position.find({ company: pvaraId }).sort({ title: 1 });
    console.log(`\n💼 Positions (${finalPositions.length}):`);
    finalPositions.forEach(p => console.log(`  - ${p.title}`));

    // Users
    const finalUsers = await User.find({ company: pvaraId }).select('name email role').sort({ name: 1 });
    console.log(`\n👥 Users (${finalUsers.length}):`);
    finalUsers.slice(0, 15).forEach(u => console.log(`  - ${u.name || 'NO NAME'} (${u.email}) - ${u.role}`));
    if (finalUsers.length > 15) console.log(`  ... and ${finalUsers.length - 15} more`);

    // ============================================================
    // STEP 5: Test API-style queries
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('API Query Tests');
    console.log('='.repeat(60));

    // Test department dropdown query
    const deptDropdown = await Department.find({ company: pvaraId })
      .select('_id name')
      .sort({ name: 1 });
    console.log(`\n✅ Department dropdown query works: ${deptDropdown.length} items`);

    // Test position dropdown query
    const posDropdown = await Position.find({ company: pvaraId })
      .select('_id title')
      .sort({ title: 1 });
    console.log(`✅ Position dropdown query works: ${posDropdown.length} items`);

    // Test employee dropdown query
    const employeeDropdown = await User.find({ company: pvaraId, role: 'employee' })
      .select('_id name email')
      .sort({ name: 1 });
    console.log(`✅ Employee dropdown query works: ${employeeDropdown.length} items`);

    // Test manager dropdown query
    const managerDropdown = await User.find({ company: pvaraId, role: { $in: ['admin', 'manager'] } })
      .select('_id name email')
      .sort({ name: 1 });
    console.log(`✅ Manager dropdown query works: ${managerDropdown.length} items`);

    console.log('\n✅ All dropdown queries working correctly!');

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupDuplicates();
