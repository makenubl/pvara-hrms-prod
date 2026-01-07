/**
 * Quick script to associate WhatsApp number with admin user
 * Run with: node scripts/setup-whatsapp-user.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TEST_PHONE_NUMBER = '+923345224359';

// User Schema (simplified for this script)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  role: String,
  phone: String,
  whatsappNumber: String,
  whatsappPreferences: {
    enabled: Boolean,
    taskAssigned: Boolean,
    taskUpdates: Boolean,
    reminders: Boolean,
    reminderIntervals: [Number],
  },
  company: mongoose.Schema.Types.ObjectId,
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    console.log('URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Find admin or any user
    let user = await User.findOne({ role: { $in: ['admin', 'chairman', 'manager'] } });
    
    if (!user) {
      user = await User.findOne({});
    }
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`\nFound user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`Current role: ${user.role}`);
    
    // Update with WhatsApp number
    user.whatsappNumber = TEST_PHONE_NUMBER;
    user.phone = TEST_PHONE_NUMBER;
    user.whatsappPreferences = {
      enabled: true,
      taskAssigned: true,
      taskUpdates: true,
      reminders: true,
      reminderIntervals: [1440, 240, 60, 30],
    };
    
    await user.save();
    
    console.log(`\n✅ WhatsApp number ${TEST_PHONE_NUMBER} associated with:`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
