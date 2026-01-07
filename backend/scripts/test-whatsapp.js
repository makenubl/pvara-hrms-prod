/**
 * WhatsApp Chatbot Test Script
 * 
 * This script:
 * 1. Associates a phone number with an admin user
 * 2. Tests WhatsApp message parsing and task operations
 * 
 * Usage: node scripts/test-whatsapp.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Task from '../models/Task.js';
import aiService from '../services/aiService.js';
import whatsappConfig from '../config/whatsapp.js';

dotenv.config();

const TEST_PHONE_NUMBER = '+923345224359';

// Test messages to simulate WhatsApp interactions
const TEST_MESSAGES = {
  // Basic commands
  welcome: ['hi', 'hello', 'hey', 'start'],
  help: ['help', 'commands', '?', 'menu'],
  status: ['status', 'summary', 'dashboard'],
  
  // List tasks
  listTasks: [
    'show my tasks',
    'list my tasks',
    'my tasks',
    'tasks',
    'pending tasks',
    'what are my tasks',
  ],
  
  // Create task (for self)
  createTask: [
    'create task: Review monthly budget report',
    'new task: Prepare presentation for board meeting, high priority, due tomorrow',
    'task: Complete project documentation by Friday',
    'create task: Call vendor for quotation, priority high',
    'add task: Update employee records, due next week',
  ],
  
  // Assign task (admin only)
  assignTask: [
    'assign task: Review code changes to Ahmad',
    'create task for Ahmed: Prepare financial summary',
    'assign task: Update documentation to ahmad.raza@pvara.gov.pk',
  ],
  
  // Update task status
  updateStatus: [
    'TASK-2026-0001 is completed',
    'mark TASK-2026-0001 as in-progress',
    'TASK-2026-0001 done',
    'complete TASK-2026-0001',
    'start TASK-2026-0002',
    'TASK-2026-0001 blocked',
  ],
  
  // Update progress
  updateProgress: [
    'TASK-2026-0001 progress 50%',
    'update TASK-2026-0001 progress 75',
    'TASK-2026-0001 50%',
    'progress of TASK-2026-0001 is 80%',
  ],
  
  // Add update/comment
  addUpdate: [
    'TASK-2026-0001: Completed the first draft',
    'update TASK-2026-0001: Waiting for client feedback',
    'add comment to TASK-2026-0001: Meeting scheduled for tomorrow',
  ],
  
  // Report blocker
  reportBlocker: [
    'TASK-2026-0001 blocked: Waiting for approval from finance',
    'blocker for TASK-2026-0001: Missing access credentials',
  ],
  
  // View task
  viewTask: [
    'show TASK-2026-0001',
    'view task TASK-2026-0001',
    'details of TASK-2026-0001',
  ],
  
  // Deadlines
  deadlines: [
    'deadlines',
    'my deadlines',
    'what are my deadlines',
    'upcoming deadlines',
  ],
};

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
}

async function setupTestUser() {
  console.log('\n📱 Setting up test user with WhatsApp number...\n');
  
  // Find an admin user
  let adminUser = await User.findOne({ role: 'admin' });
  
  if (!adminUser) {
    // Try chairman
    adminUser = await User.findOne({ role: 'chairman' });
  }
  
  if (!adminUser) {
    // Get any user and make them admin for testing
    adminUser = await User.findOne({});
  }
  
  if (!adminUser) {
    console.log('❌ No users found in database. Please seed the database first.');
    return null;
  }
  
  // Update user with WhatsApp number
  adminUser.whatsappNumber = TEST_PHONE_NUMBER;
  adminUser.phone = TEST_PHONE_NUMBER;
  adminUser.whatsappPreferences = {
    enabled: true,
    taskAssigned: true,
    taskUpdates: true,
    reminders: true,
    reminderIntervals: [1440, 240, 60, 30], // 1 day, 4 hours, 1 hour, 30 min
  };
  
  // Make sure they're admin for full testing
  if (adminUser.role === 'employee') {
    adminUser.role = 'admin';
  }
  
  await adminUser.save();
  
  console.log('✅ Test user configured:');
  console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Role: ${adminUser.role}`);
  console.log(`   WhatsApp: ${adminUser.whatsappNumber}`);
  console.log(`   Company: ${adminUser.company}`);
  
  return adminUser;
}

async function testMessageParsing() {
  console.log('\n🧪 Testing Message Parsing...\n');
  console.log('=' .repeat(60));
  
  const mockUser = {
    _id: 'test-user-id',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
  };
  
  let passed = 0;
  let failed = 0;
  
  for (const [category, messages] of Object.entries(TEST_MESSAGES)) {
    console.log(`\n📝 Category: ${category.toUpperCase()}`);
    console.log('-'.repeat(40));
    
    for (const message of messages) {
      try {
        const result = await aiService.parseMessage(message, mockUser);
        const success = result.action !== 'unknown' || category === 'unknown';
        
        if (success) {
          console.log(`  ✅ "${message}"`);
          console.log(`     → Action: ${result.action}`);
          if (result.taskId) console.log(`     → Task ID: ${result.taskId}`);
          if (result.title) console.log(`     → Title: ${result.title}`);
          if (result.status) console.log(`     → Status: ${result.status}`);
          if (result.progress !== undefined) console.log(`     → Progress: ${result.progress}%`);
          if (result.priority) console.log(`     → Priority: ${result.priority}`);
          if (result.assigneeName) console.log(`     → Assignee: ${result.assigneeName}`);
          passed++;
        } else {
          console.log(`  ❌ "${message}" - Parsed as: ${result.action}`);
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ "${message}" - Error: ${error.message}`);
        failed++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  return { passed, failed };
}

async function createTestTasks(user) {
  console.log('\n📋 Creating test tasks...\n');
  
  const testTasks = [
    {
      title: 'Review Q4 Budget Report',
      description: 'Review and approve the quarterly budget report for Q4 2025',
      priority: 'high',
      status: 'pending',
      progress: 0,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
    {
      title: 'Prepare Board Presentation',
      description: 'Create presentation slides for the upcoming board meeting',
      priority: 'critical',
      status: 'in-progress',
      progress: 40,
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
    },
    {
      title: 'Update Employee Handbook',
      description: 'Update the employee handbook with new policies',
      priority: 'medium',
      status: 'pending',
      progress: 0,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    {
      title: 'Complete Training Module',
      description: 'Complete the mandatory compliance training',
      priority: 'low',
      status: 'completed',
      progress: 100,
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday (completed)
    },
    {
      title: 'Vendor Contract Review',
      description: 'Review and finalize vendor contracts for 2026',
      priority: 'high',
      status: 'blocked',
      progress: 60,
      blocker: 'Waiting for legal department approval',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    },
  ];
  
  const createdTasks = [];
  const taskCount = await Task.countDocuments({ company: user.company });
  const year = new Date().getFullYear();
  
  for (let i = 0; i < testTasks.length; i++) {
    const taskData = testTasks[i];
    const taskId = `TASK-${year}-${String(taskCount + i + 1).padStart(4, '0')}`;
    
    // Check if task already exists
    let task = await Task.findOne({ project: taskId, company: user.company });
    
    if (!task) {
      task = new Task({
        ...taskData,
        project: taskId,
        assignedTo: user._id,
        assignedBy: user._id,
        department: user.department || 'General',
        company: user.company,
      });
      await task.save();
      console.log(`  ✅ Created: ${taskId} - ${taskData.title}`);
    } else {
      console.log(`  ⏭️  Exists: ${taskId} - ${taskData.title}`);
    }
    
    createdTasks.push(task);
  }
  
  return createdTasks;
}

function printTestGuide(user, tasks) {
  console.log('\n');
  console.log('='.repeat(70));
  console.log('📱 WHATSAPP CHATBOT TEST GUIDE');
  console.log('='.repeat(70));
  
  console.log('\n🔧 SETUP COMPLETE:');
  console.log(`   Your phone number (${TEST_PHONE_NUMBER}) is now linked to:`);
  console.log(`   • User: ${user.firstName} ${user.lastName}`);
  console.log(`   • Email: ${user.email}`);
  console.log(`   • Role: ${user.role} (can assign tasks to others)`);
  
  console.log('\n📋 TEST TASKS CREATED:');
  tasks.forEach(task => {
    console.log(`   • ${task.project}: ${task.title} [${task.status}]`);
  });
  
  console.log('\n' + '-'.repeat(70));
  console.log('📲 TEST MESSAGES TO SEND VIA WHATSAPP:');
  console.log('-'.repeat(70));
  
  console.log('\n1️⃣  BASIC COMMANDS:');
  console.log('   • "hi" or "hello" - Get welcome message');
  console.log('   • "help" - See all available commands');
  console.log('   • "status" - View your task summary');
  
  console.log('\n2️⃣  VIEW TASKS:');
  console.log('   • "show my tasks" - List all your tasks');
  console.log('   • "pending tasks" - List pending tasks only');
  console.log('   • "deadlines" - View upcoming deadlines');
  console.log(`   • "show ${tasks[0]?.project || 'TASK-2026-0001'}" - View specific task details`);
  
  console.log('\n3️⃣  CREATE TASKS (for yourself):');
  console.log('   • "create task: Write weekly report"');
  console.log('   • "new task: Call client, high priority, due tomorrow"');
  console.log('   • "task: Review documents by Friday"');
  
  console.log('\n4️⃣  ASSIGN TASKS (admin feature):');
  console.log('   • "assign task: Review code to Ahmad"');
  console.log('   • "create task for Ahmed: Prepare summary"');
  
  console.log('\n5️⃣  UPDATE TASK STATUS:');
  console.log(`   • "${tasks[0]?.project || 'TASK-2026-0001'} is completed"`);
  console.log(`   • "mark ${tasks[0]?.project || 'TASK-2026-0001'} as in-progress"`);
  console.log(`   • "start ${tasks[1]?.project || 'TASK-2026-0002'}"`);
  
  console.log('\n6️⃣  UPDATE PROGRESS:');
  console.log(`   • "${tasks[0]?.project || 'TASK-2026-0001'} progress 50%"`);
  console.log(`   • "update ${tasks[1]?.project || 'TASK-2026-0002'} progress 75"`);
  
  console.log('\n7️⃣  ADD COMMENTS:');
  console.log(`   • "${tasks[0]?.project || 'TASK-2026-0001'}: Completed first draft"`);
  console.log(`   • "update ${tasks[1]?.project || 'TASK-2026-0002'}: Meeting scheduled"`);
  
  console.log('\n8️⃣  REPORT BLOCKERS:');
  console.log(`   • "${tasks[0]?.project || 'TASK-2026-0001'} blocked: Waiting for approval"`);
  
  console.log('\n9️⃣  VOICE NOTES:');
  console.log('   • Send a voice message describing your task update');
  console.log('   • Example: "Update task TASK-2026-0001 progress to 60 percent"');
  
  console.log('\n' + '-'.repeat(70));
  console.log('⚠️  IMPORTANT SETUP STEPS:');
  console.log('-'.repeat(70));
  console.log('\n1. Add Twilio credentials to backend/.env:');
  console.log('   TWILIO_ACCOUNT_SID=your-account-sid');
  console.log('   TWILIO_AUTH_TOKEN=your-auth-token');
  console.log('   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886');
  
  console.log('\n2. For Twilio Sandbox (testing):');
  console.log('   • Go to https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
  console.log('   • Send "join <sandbox-code>" to +1 415 523 8886 on WhatsApp');
  console.log('   • Configure webhook URL: https://your-domain/api/whatsapp/webhook');
  
  console.log('\n3. Start the backend server:');
  console.log('   cd backend && npm install && npm run dev');
  
  console.log('\n4. For local testing, use ngrok:');
  console.log('   ngrok http 5000');
  console.log('   Then use the ngrok URL as your webhook');
  
  console.log('\n' + '='.repeat(70));
}

async function main() {
  try {
    await connectDB();
    
    // Setup test user with WhatsApp number
    const user = await setupTestUser();
    if (!user) {
      process.exit(1);
    }
    
    // Test message parsing
    await testMessageParsing();
    
    // Create test tasks
    const tasks = await createTestTasks(user);
    
    // Print test guide
    printTestGuide(user, tasks);
    
    console.log('\n✅ Test setup complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
