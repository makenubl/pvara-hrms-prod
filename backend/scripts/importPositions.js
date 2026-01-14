import mongoose from 'mongoose';
import Position from '../models/Position.js';
import Company from '../models/Company.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin';
const PVARA_COMPANY_ID = '6941a96204ad309188334040';

async function importPositions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get PVARA company by ID
    const company = await Company.findById(PVARA_COMPANY_ID);
    if (!company) {
      console.error('❌ PVARA company not found');
      process.exit(1);
    }

    console.log('✅ Target company: ' + company.name + ' (ID: ' + company._id + ')');

    // Clear existing positions
    await Position.deleteMany({ company: company._id });
    console.log('🗑️  Cleared existing positions\n');

    // Positions data from the JSON file (only PVARA relevant ones)
    const positionsData = [
      { title: 'Chairman', department: 'Chairperson Office', description: 'Head of PVARA', level: 'executive' },
      { title: 'Member', department: 'Overall Supervision', description: 'Authority Member', level: 'executive' },
      { title: 'Deputy Secretary', department: 'Team Law, Rules, Interagency Coordination', level: 'senior' },
      { title: 'Deputy Secretary', department: 'Team Licensing and Regulation', level: 'senior' },
      { title: 'Section Officer', department: 'Team Law, Rules, Interagency Coordination', level: 'mid' },
      { title: 'Section Officer', department: 'Team Licensing and Regulation', level: 'mid' },
      { title: 'Section Officer', department: 'Procurement and Accounts', level: 'mid' },
      { title: 'Assistant', department: 'Chairperson Office', level: 'junior' },
      { title: 'Assistant', department: 'Admin & HR', level: 'junior' },
      { title: 'Stenographer', department: 'Chairperson Office', level: 'junior' },
      { title: 'Accountant', department: 'Procurement and Accounts', level: 'junior' },
      { title: 'Data Entry Operator', department: 'IT and Software Functions', level: 'junior' },
      { title: 'Driver', department: 'Admin & HR', level: 'junior' },
      { title: 'Naib Qasid', department: 'Admin & HR', level: 'junior' },
      { title: 'Head of IT', department: 'Information Technology', level: 'senior' },
      { title: 'IT Officer', department: 'Information Technology', level: 'mid' },
      { title: 'Finance Officer', department: 'Finance & Accounts', level: 'mid' },
      { title: 'Legal Advisor', department: 'Legal & Compliance', level: 'senior' },
      { title: 'Compliance Officer', department: 'Legal & Compliance', level: 'mid' },
      { title: 'Admin Officer', department: 'Administration', level: 'mid' },
    ];

    const createdPositions = [];

    for (const pos of positionsData) {
      const position = new Position({
        title: pos.title,
        department: pos.department,
        description: pos.description || `${pos.title} position`,
        level: pos.level,
        company: company._id,
        status: 'active',
      });

      await position.save();
      createdPositions.push(position);
      console.log(`✅ Created: ${pos.title} - ${pos.department} (${pos.level})`);
    }

    console.log('\n=== SUMMARY ===');
    console.log('Total Positions Created: ' + createdPositions.length);
    console.log('  Executive: ' + createdPositions.filter(p => p.level === 'executive').length);
    console.log('  Senior: ' + createdPositions.filter(p => p.level === 'senior').length);
    console.log('  Mid: ' + createdPositions.filter(p => p.level === 'mid').length);
    console.log('  Junior: ' + createdPositions.filter(p => p.level === 'junior').length);
    console.log('\nCompany ID: ' + company._id);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

importPositions();
