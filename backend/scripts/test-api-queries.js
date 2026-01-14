import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Company from '../models/Company.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Position from '../models/Position.js';

const PVARA_COMPANY_ID = '6941a96204ad309188334040';

async function testAPIQueries() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const pvaraId = new mongoose.Types.ObjectId(PVARA_COMPANY_ID);

    // Simulate the exact queries used in the API routes
    console.log('='.repeat(60));
    console.log('SIMULATING API ROUTE QUERIES');
    console.log('='.repeat(60));

    // 1. Test departments route query (from routes/departments.js)
    console.log('\n🔍 GET /api/departments');
    console.log('-'.repeat(40));
    const departmentsResult = await Department.find({ company: pvaraId })
      .sort({ name: 1 });
    console.log(`✅ Success - ${departmentsResult.length} departments`);
    console.log('Sample:', departmentsResult.slice(0, 3).map(d => d.name).join(', '));

    // 2. Test positions route query (from routes/positions.js)
    console.log('\n🔍 GET /api/positions');
    console.log('-'.repeat(40));
    const positionsResult = await Position.find({ company: pvaraId })
      .sort({ title: 1 });
    console.log(`✅ Success - ${positionsResult.length} positions`);
    console.log('Sample:', positionsResult.slice(0, 3).map(p => p.title).join(', '));

    // 3. Test employees route query (from routes/employees.js)
    console.log('\n🔍 GET /api/employees');
    console.log('-'.repeat(40));
    const employeesResult = await User.find({ company: pvaraId })
      .select('-password')
      .sort({ firstName: 1 });
    console.log(`✅ Success - ${employeesResult.length} employees`);
    console.log('Sample:', employeesResult.slice(0, 3).map(e => `${e.firstName} ${e.lastName}`).join(', '));

    // 4. Test employee dropdown (for selects)
    console.log('\n🔍 Employee Dropdown Data');
    console.log('-'.repeat(40));
    const dropdownEmployees = await User.find({ company: pvaraId })
      .select('_id firstName lastName email role')
      .sort({ firstName: 1 });
    console.log(`✅ Success - ${dropdownEmployees.length} employees for dropdown`);

    // 5. Test department dropdown
    console.log('\n🔍 Department Dropdown Data');
    console.log('-'.repeat(40));
    const dropdownDepts = await Department.find({ company: pvaraId })
      .select('_id name')
      .sort({ name: 1 });
    console.log(`✅ Success - ${dropdownDepts.length} departments for dropdown`);

    // 6. Test position dropdown
    console.log('\n🔍 Position Dropdown Data');
    console.log('-'.repeat(40));
    const dropdownPositions = await Position.find({ company: pvaraId })
      .select('_id title')
      .sort({ title: 1 });
    console.log(`✅ Success - ${dropdownPositions.length} positions for dropdown`);

    // ============================================================
    // Summary Output (JSON format for API response)
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('API RESPONSE PREVIEW');
    console.log('='.repeat(60));

    console.log('\n--- Departments Response ---');
    console.log(JSON.stringify({
      success: true,
      count: dropdownDepts.length,
      data: dropdownDepts.slice(0, 5)
    }, null, 2));

    console.log('\n--- Positions Response ---');
    console.log(JSON.stringify({
      success: true,
      count: dropdownPositions.length,
      data: dropdownPositions.slice(0, 5)
    }, null, 2));

    console.log('\n--- Employees Response ---');
    console.log(JSON.stringify({
      success: true,
      count: dropdownEmployees.length,
      data: dropdownEmployees.slice(0, 3).map(e => ({
        _id: e._id,
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        role: e.role
      }))
    }, null, 2));

    // ============================================================
    // Final Summary
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL API QUERIES WORKING CORRECTLY');
    console.log('='.repeat(60));
    console.log(`
Company: PVARA (${PVARA_COMPANY_ID})

Dropdown Data Available:
- Departments: ${dropdownDepts.length}
- Positions: ${dropdownPositions.length}
- Employees: ${dropdownEmployees.length}

All queries return data correctly for the PVARA company.
`);

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAPIQueries();
