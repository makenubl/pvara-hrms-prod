// Debug script to check task state in database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

import Task from '../models/Task.js';
import User from '../models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin';
const TASK_ID = process.argv[2] || 'TASK-2026-0050';

async function checkTask() {
  console.log('='.repeat(60));
  console.log('TASK DATABASE CHECK');
  console.log('='.repeat(60));
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB\n');
  
  const task = await Task.findOne({ project: TASK_ID })
    .populate('assignedTo', 'firstName lastName')
    .lean();
  
  if (!task) {
    console.log(`Task ${TASK_ID} NOT FOUND`);
    process.exit(1);
  }
  
  console.log('Title:', task.title);
  console.log('Reference:', task.project);
  console.log('Progress:', task.progress, '%');
  console.log('Status:', task.status);
  console.log('Assigned To:', task.assignedTo?.firstName, task.assignedTo?.lastName);
  console.log('Priority:', task.priority);
  console.log('Deadline:', task.deadline ? new Date(task.deadline).toLocaleString() : 'Not set');
  
  console.log('\n--- Recent Updates ---');
  const updates = task.updates || [];
  updates.slice(-5).forEach((u, i) => {
    console.log(`${i + 1}. ${new Date(u.addedAt).toLocaleString()}`);
    console.log(`   ${u.message}`);
    if (u.progress !== undefined) console.log(`   Progress: ${u.progress}%`);
    if (u.status) console.log(`   Status: ${u.status}`);
  });
  
  await mongoose.disconnect();
  process.exit(0);
}

checkTask().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
