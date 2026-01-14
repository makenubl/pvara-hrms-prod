import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Import all models
import Company from '../models/Company.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Position from '../models/Position.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { KPIGoal, KPIReview } from '../models/KPI.js';
import DailyWorklog from '../models/DailyWorklog.js';
import ApprovalFlow from '../models/ApprovalFlow.js';
import Chat from '../models/Chat.js';

// Target PVARA company
const PVARA_COMPANY = {
  _id: '6941a96204ad309188334040',
  name: 'PVARA',
  email: 'info@pvara.gov.pk'
};

async function consolidateToPVARA() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Check if PVARA company exists, create if not
    console.log('='.repeat(60));
    console.log('STEP 1: Ensure PVARA company exists');
    console.log('='.repeat(60));
    
    let pvaraCompany = await Company.findById(PVARA_COMPANY._id);
    
    if (!pvaraCompany) {
      console.log('PVARA company not found, creating...');
      pvaraCompany = await Company.create({
        _id: new mongoose.Types.ObjectId(PVARA_COMPANY._id),
        name: PVARA_COMPANY.name,
        email: PVARA_COMPANY.email,
        industry: 'Government',
        size: '100-500',
        status: 'active',
        settings: {
          timezone: 'Asia/Karachi',
          dateFormat: 'DD/MM/YYYY',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHours: { start: '09:00', end: '17:00' }
        }
      });
      console.log('✅ Created PVARA company');
    } else {
      console.log('✅ PVARA company already exists:', pvaraCompany.name);
    }

    // Step 2: Get all other companies
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: Find all other companies');
    console.log('='.repeat(60));
    
    const otherCompanies = await Company.find({ _id: { $ne: PVARA_COMPANY._id } });
    console.log(`Found ${otherCompanies.length} other companies to consolidate:`);
    otherCompanies.forEach(c => console.log(`  - ${c.name} (${c._id})`));

    const otherCompanyIds = otherCompanies.map(c => c._id);

    // Step 3: Update all collections to point to PVARA
    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: Update all data to PVARA company');
    console.log('='.repeat(60));

    const pvaraId = new mongoose.Types.ObjectId(PVARA_COMPANY._id);

    // Users
    const userResult = await User.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Users updated: ${userResult.modifiedCount}`);

    // Departments
    const deptResult = await Department.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Departments updated: ${deptResult.modifiedCount}`);

    // Positions
    const posResult = await Position.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Positions updated: ${posResult.modifiedCount}`);

    // Leaves
    const leaveResult = await Leave.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Leaves updated: ${leaveResult.modifiedCount}`);

    // Payrolls
    const payrollResult = await Payroll.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Payrolls updated: ${payrollResult.modifiedCount}`);

    // Projects
    const projectResult = await Project.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Projects updated: ${projectResult.modifiedCount}`);

    // Tasks
    const taskResult = await Task.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Tasks updated: ${taskResult.modifiedCount}`);

    // KPIs (both Goal and Review)
    const kpiGoalResult = await KPIGoal.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ KPI Goals updated: ${kpiGoalResult.modifiedCount}`);

    const kpiReviewResult = await KPIReview.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ KPI Reviews updated: ${kpiReviewResult.modifiedCount}`);

    // Daily Worklogs
    const worklogResult = await DailyWorklog.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Daily Worklogs updated: ${worklogResult.modifiedCount}`);

    // Approval Flows
    const approvalResult = await ApprovalFlow.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Approval Flows updated: ${approvalResult.modifiedCount}`);

    // Chats
    const chatResult = await Chat.updateMany(
      { company: { $in: otherCompanyIds } },
      { $set: { company: pvaraId } }
    );
    console.log(`✅ Chats updated: ${chatResult.modifiedCount}`);

    // Step 4: Delete other companies
    console.log('\n' + '='.repeat(60));
    console.log('STEP 4: Delete other companies');
    console.log('='.repeat(60));

    const deleteResult = await Company.deleteMany({ _id: { $in: otherCompanyIds } });
    console.log(`✅ Deleted ${deleteResult.deletedCount} companies`);

    // Step 5: Verify final state
    console.log('\n' + '='.repeat(60));
    console.log('STEP 5: Verify final state');
    console.log('='.repeat(60));

    const remainingCompanies = await Company.find({});
    console.log(`\nCompanies remaining: ${remainingCompanies.length}`);
    remainingCompanies.forEach(c => console.log(`  ✅ ${c.name} (${c._id})`));

    // Step 6: Test queries
    console.log('\n' + '='.repeat(60));
    console.log('STEP 6: Test dropdown queries');
    console.log('='.repeat(60));

    // Test departments query
    const departments = await Department.find({ company: pvaraId });
    console.log(`\n📋 Departments (${departments.length}):`);
    departments.forEach(d => console.log(`  - ${d.name}`));

    // Test positions query
    const positions = await Position.find({ company: pvaraId });
    console.log(`\n💼 Positions (${positions.length}):`);
    positions.forEach(p => console.log(`  - ${p.title}`));

    // Test users query
    const users = await User.find({ company: pvaraId }).select('name email role');
    console.log(`\n👥 Users (${users.length}):`);
    users.slice(0, 10).forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));
    if (users.length > 10) console.log(`  ... and ${users.length - 10} more`);

    // Test projects query
    const projects = await Project.find({ company: pvaraId });
    console.log(`\n📁 Projects (${projects.length}):`);
    projects.forEach(p => console.log(`  - ${p.name}`));

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`
✅ All data consolidated to PVARA company
   Company ID: ${PVARA_COMPANY._id}
   Company Name: ${PVARA_COMPANY.name}
   
📊 Data counts:
   - Users: ${users.length}
   - Departments: ${departments.length}
   - Positions: ${positions.length}
   - Projects: ${projects.length}
`);

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

consolidateToPVARA();
