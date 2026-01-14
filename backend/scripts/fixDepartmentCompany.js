
import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Company from '../models/Company.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
const PVARA_COMPANY_ID = '6941a96204ad309188334040';

async function fixDepartmentCompany() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get PVARA company by ID
    const pvaraHQ = await Company.findById(PVARA_COMPANY_ID);
    if (!pvaraHQ) {
      console.error('PVARA company not found');
      process.exit(1);
    }

    console.log('Target company: PVARA HQ (ID: ' + pvaraHQ._id + ')');

    // Update all departments to PVARA HQ
    const result = await Department.updateMany({}, { company: pvaraHQ._id });
    console.log('Updated ' + result.modifiedCount + ' departments to PVARA HQ');

    // Verify
    const deptCount = await Department.countDocuments({ company: pvaraHQ._id });
    console.log('Total departments in PVARA HQ: ' + deptCount);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDepartmentCompany();
