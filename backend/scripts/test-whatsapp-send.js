/**
 * Test WhatsApp Sandbox Message Sending
 * Run: node scripts/test-whatsapp-send.js +923001234567
 * 
 * Troubleshooting Twilio WhatsApp Sandbox:
 * 1. Recipient must have joined sandbox: Send "join <sandbox-code>" to +14155238886
 * 2. Sandbox sessions expire after 24 hours of inactivity
 * 3. Only pre-approved message templates work outside 24-hour window
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

import twilio from 'twilio';

console.log('='.repeat(60));
console.log('TWILIO WHATSAPP SANDBOX DIAGNOSTIC TEST');
console.log('='.repeat(60));

// Check environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_NUMBER || '+14155238886';

console.log('\n📋 Configuration Check:');
console.log(`  Account SID: ${accountSid ? accountSid.substring(0, 10) + '...' : '❌ MISSING'}`);
console.log(`  Auth Token: ${authToken ? '****' + authToken.slice(-4) : '❌ MISSING'}`);
console.log(`  Twilio Number: ${twilioNumber}`);

if (!accountSid || !authToken) {
  console.error('\n❌ Missing Twilio credentials. Set TWILIO_SID and TWILIO_AUTH in .env');
  process.exit(1);
}

// Get recipient from command line
const recipient = process.argv[2];
if (!recipient) {
  console.error('\n❌ Usage: node scripts/test-whatsapp-send.js +923001234567');
  console.error('   Provide the recipient phone number with country code');
  process.exit(1);
}

// Initialize Twilio client
const client = twilio(accountSid, authToken);

async function testSandbox() {
  console.log('\n🔄 Testing Twilio API connection...');
  
  try {
    // First, verify account
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`✅ Account verified: ${account.friendlyName}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Type: ${account.type}`);
  } catch (error) {
    console.error('❌ Failed to verify account:', error.message);
    if (error.code === 20003) {
      console.error('   → Invalid credentials. Check TWILIO_SID and TWILIO_AUTH');
    }
    process.exit(1);
  }

  // Format numbers for WhatsApp
  const from = twilioNumber.startsWith('whatsapp:') ? twilioNumber : `whatsapp:${twilioNumber}`;
  const to = recipient.startsWith('whatsapp:') ? recipient : `whatsapp:${recipient}`;

  console.log('\n📤 Attempting to send test message...');
  console.log(`   From: ${from}`);
  console.log(`   To: ${to}`);

  try {
    const message = await client.messages.create({
      body: `🧪 PVARA HRMS Test Message\n\nThis is a test from the WhatsApp Sandbox.\nTimestamp: ${new Date().toISOString()}`,
      from: from,
      to: to,
    });

    console.log('\n✅ Message sent successfully!');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Direction: ${message.direction}`);
    console.log(`   Date Created: ${message.dateCreated}`);

    // Wait and check status
    console.log('\n⏳ Waiting 5 seconds to check delivery status...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const updatedMessage = await client.messages(message.sid).fetch();
    console.log(`\n📊 Updated Status: ${updatedMessage.status}`);
    
    if (updatedMessage.errorCode) {
      console.error(`   ❌ Error Code: ${updatedMessage.errorCode}`);
      console.error(`   Error Message: ${updatedMessage.errorMessage}`);
      
      // Common error explanations
      if (updatedMessage.errorCode === 63007) {
        console.log('\n💡 Error 63007: Recipient has not joined the sandbox');
        console.log(`   → Ask recipient to send "join <sandbox-code>" to ${twilioNumber}`);
        console.log('   → Find your sandbox code in Twilio Console > Messaging > Try it out > WhatsApp');
      } else if (updatedMessage.errorCode === 63016) {
        console.log('\n💡 Error 63016: Message failed outside 24-hour session window');
        console.log('   → Recipient must send a message first to start a 24-hour session');
      }
    } else {
      console.log('   ✅ No errors reported');
    }

  } catch (error) {
    console.error('\n❌ Failed to send message:', error.message);
    console.error(`   Error Code: ${error.code}`);
    
    // Provide troubleshooting tips based on error
    if (error.code === 21608) {
      console.log('\n💡 Error 21608: The "From" number is not a valid WhatsApp sender');
      console.log('   → Make sure you are using the sandbox number: whatsapp:+14155238886');
      console.log('   → Or configure a production WhatsApp number in Twilio');
    } else if (error.code === 21211) {
      console.log('\n💡 Error 21211: Invalid "To" phone number');
      console.log('   → Make sure the phone number includes country code (e.g., +923001234567)');
    } else if (error.code === 63007) {
      console.log('\n💡 Error 63007: The recipient has not opted into your sandbox');
      console.log(`   → Recipient must send "join <sandbox-code>" to ${twilioNumber} first`);
      console.log('   → Find your sandbox join code in Twilio Console');
    }
  }

  // List recent messages to/from this number
  console.log('\n📜 Recent WhatsApp messages (last 5):');
  try {
    const messages = await client.messages.list({
      limit: 5,
      to: to
    });

    if (messages.length === 0) {
      console.log('   No recent outbound messages to this number');
    } else {
      messages.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.dateSent || msg.dateCreated} | ${msg.status} | ${msg.body?.substring(0, 40)}...`);
        if (msg.errorCode) {
          console.log(`      ⚠️ Error: ${msg.errorCode} - ${msg.errorMessage}`);
        }
      });
    }
  } catch (error) {
    console.log('   Could not fetch message history:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SANDBOX REQUIREMENTS REMINDER:');
  console.log('='.repeat(60));
  console.log('1. Recipient must join sandbox by sending "join <code>" to +14155238886');
  console.log('2. Find your sandbox code at: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
  console.log('3. Sessions expire after 24 hours - recipient must message again');
  console.log('4. Only freeform messages work WITHIN the 24-hour window');
  console.log('5. Outside 24-hour window, only pre-approved templates work');
}

testSandbox().catch(console.error);
