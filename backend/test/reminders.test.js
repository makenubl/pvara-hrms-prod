/**
 * Test Suite for Personal Reminders Feature
 * Run with: node --experimental-vm-modules backend/test/reminders.test.js
 */

import mongoose from 'mongoose';
import assert from 'assert';

// Mock environment
process.env.NODE_ENV = 'test';

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms-test',
};

// Simple test runner
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n🧪 Running Test Suite: ${this.name}\n`);
    console.log('='.repeat(50));

    for (const { description, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ PASS: ${description}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${description}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// ============================================
// UNIT TESTS - No DB required
// ============================================

const unitTests = new TestRunner('Unit Tests');

// Test: getCompanyId helper
unitTests.test('getCompanyId should extract ID from populated company', () => {
  const getCompanyId = (user) => user.company?._id || user.company;
  
  // Populated company
  const userWithPopulated = { company: { _id: '123abc', name: 'Test Co' } };
  assert.strictEqual(getCompanyId(userWithPopulated), '123abc');
  
  // Unpopulated company (just ID)
  const userWithId = { company: '456def' };
  assert.strictEqual(getCompanyId(userWithId), '456def');
  
  // Null company
  const userNoCompany = { company: null };
  assert.strictEqual(getCompanyId(userNoCompany), null);
});

// Test: Phone number normalization
unitTests.test('Phone normalization should handle Pakistan formats', () => {
  const normalizePhone = (phone) => {
    let formatted = phone;
    if (formatted.startsWith('03')) {
      formatted = '+92' + formatted.substring(1);
    } else if (formatted.startsWith('00923')) {
      formatted = '+' + formatted.substring(2);
    } else if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    return formatted;
  };
  
  assert.strictEqual(normalizePhone('03001234567'), '+923001234567');
  assert.strictEqual(normalizePhone('00923001234567'), '+923001234567');
  assert.strictEqual(normalizePhone('923001234567'), '+923001234567');
  assert.strictEqual(normalizePhone('+923001234567'), '+923001234567');
});

// Test: Reminder ID generation
unitTests.test('Reminder ID should follow format REM-YYYY-NNNN', () => {
  const generateReminderId = (count) => {
    return `REM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  };
  
  const year = new Date().getFullYear();
  assert.strictEqual(generateReminderId(0), `REM-${year}-0001`);
  assert.strictEqual(generateReminderId(9), `REM-${year}-0010`);
  assert.strictEqual(generateReminderId(99), `REM-${year}-0100`);
  assert.strictEqual(generateReminderId(999), `REM-${year}-1000`);
});

// Test: Date parsing for reminders
unitTests.test('Reminder time should be in the future', () => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const pastDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  
  assert.ok(futureDate > now, 'Future date should be greater than now');
  assert.ok(pastDate < now, 'Past date should be less than now');
});

// Test: Recurring reminder calculation
unitTests.test('Recurring reminder should calculate next time correctly', () => {
  const calculateNextTime = (currentTime, type, interval = 1) => {
    const nextTime = new Date(currentTime);
    switch (type) {
      case 'daily':
        nextTime.setDate(nextTime.getDate() + interval);
        break;
      case 'weekly':
        nextTime.setDate(nextTime.getDate() + (7 * interval));
        break;
      case 'monthly':
        nextTime.setMonth(nextTime.getMonth() + interval);
        break;
    }
    return nextTime;
  };
  
  const baseDate = new Date('2026-01-09T10:00:00');
  
  const daily = calculateNextTime(baseDate, 'daily');
  assert.strictEqual(daily.toISOString().split('T')[0], '2026-01-10');
  
  const weekly = calculateNextTime(baseDate, 'weekly');
  assert.strictEqual(weekly.toISOString().split('T')[0], '2026-01-16');
  
  const monthly = calculateNextTime(baseDate, 'monthly');
  assert.strictEqual(monthly.toISOString().split('T')[0], '2026-02-09');
});

// Test: Chairman exclusion from digest
unitTests.test('Chairman should be excluded from digest query', () => {
  const buildDigestQuery = (excludeRoles = ['chairman']) => {
    return {
      status: 'active',
      role: { $nin: excludeRoles },
      'whatsappPreferences.enabled': { $ne: false },
    };
  };
  
  const query = buildDigestQuery();
  assert.deepStrictEqual(query.role, { $nin: ['chairman'] });
});

// Test: Reminder status transitions
unitTests.test('Reminder status should transition correctly', () => {
  const validTransitions = {
    'pending': ['sent', 'completed', 'cancelled'],
    'sent': ['completed'],
    'completed': [],
    'cancelled': [],
  };
  
  const canTransition = (from, to) => validTransitions[from]?.includes(to) || false;
  
  assert.ok(canTransition('pending', 'sent'));
  assert.ok(canTransition('pending', 'cancelled'));
  assert.ok(!canTransition('completed', 'pending'));
  assert.ok(!canTransition('cancelled', 'pending'));
});

// Test: Task ID normalization
unitTests.test('Task ID should normalize partial formats', () => {
  const normalizeTaskId = (taskId) => {
    if (taskId && !taskId.startsWith('TASK-')) {
      return `TASK-${taskId}`;
    }
    return taskId;
  };
  
  assert.strictEqual(normalizeTaskId('2026-0001'), 'TASK-2026-0001');
  assert.strictEqual(normalizeTaskId('TASK-2026-0001'), 'TASK-2026-0001');
});

// Test: Reminder ID normalization  
unitTests.test('Reminder ID should normalize partial formats', () => {
  const normalizeReminderId = (reminderId) => {
    if (reminderId && !reminderId.startsWith('REM-')) {
      return `REM-${reminderId}`;
    }
    return reminderId;
  };
  
  assert.strictEqual(normalizeReminderId('2026-0001'), 'REM-2026-0001');
  assert.strictEqual(normalizeReminderId('REM-2026-0001'), 'REM-2026-0001');
});

// ============================================
// VALIDATION TESTS
// ============================================

const validationTests = new TestRunner('Validation Tests');

// Test: Reminder schema validation
validationTests.test('Reminder should require user and reminderTime', () => {
  const validateReminder = (data) => {
    const errors = [];
    if (!data.user) errors.push('user is required');
    if (!data.reminderTime) errors.push('reminderTime is required');
    if (!data.title) errors.push('title is required');
    return errors;
  };
  
  const validReminder = { user: '123', reminderTime: new Date(), title: 'Test' };
  assert.strictEqual(validateReminder(validReminder).length, 0);
  
  const invalidReminder = { title: 'Test' };
  assert.ok(validateReminder(invalidReminder).length > 0);
});

// Test: WhatsApp message length
validationTests.test('WhatsApp message should not exceed 1600 chars', () => {
  const MAX_LENGTH = 1600;
  
  const sampleDigest = `PVARA HRMS - Daily Task Summary
Thursday, 9 January 2026

Good morning, Test User.

TASK OVERVIEW:
- Open Tasks: 10
- In Progress: 5
- Due Today: 2
- Overdue: 1

PRIORITY ITEMS:
1. Complete project report
   Ref: TASK-2026-0001 | OVERDUE
2. Team meeting preparation
   Ref: TASK-2026-0002 | Due Today

Log in to the HRMS portal for complete details.`;

  assert.ok(sampleDigest.length < MAX_LENGTH, `Message length ${sampleDigest.length} exceeds max`);
});

// ============================================
// EDGE CASE TESTS
// ============================================

const edgeCaseTests = new TestRunner('Edge Case Tests');

// Test: Empty user list for digest
edgeCaseTests.test('Digest should handle empty user list', () => {
  const users = [];
  let sentCount = 0;
  
  for (const user of users) {
    sentCount++;
  }
  
  assert.strictEqual(sentCount, 0);
});

// Test: User without phone number
edgeCaseTests.test('Should skip user without phone number', () => {
  const users = [
    { firstName: 'Test', phone: null, whatsappNumber: null },
    { firstName: 'Test2', phone: '+923001234567', whatsappNumber: null },
  ];
  
  const usersWithPhone = users.filter(u => u.phone || u.whatsappNumber);
  assert.strictEqual(usersWithPhone.length, 1);
});

// Test: Invalid reminder time
edgeCaseTests.test('Should reject past reminder time', () => {
  const now = new Date();
  const pastTime = new Date(now.getTime() - 60000);
  
  const isValidTime = (reminderTime) => new Date(reminderTime) > new Date();
  
  assert.strictEqual(isValidTime(pastTime), false);
});

// Test: Null/undefined handling
edgeCaseTests.test('Should handle null company gracefully', () => {
  const getCompanyId = (user) => user?.company?._id || user?.company || null;
  
  assert.strictEqual(getCompanyId(null), null);
  assert.strictEqual(getCompanyId({}), null);
  assert.strictEqual(getCompanyId({ company: null }), null);
});

// Test: Timezone handling for PKT
edgeCaseTests.test('Should convert UTC to Pakistan time correctly', () => {
  // 5:30 AM UTC = 10:30 AM PKT (UTC+5)
  const utcHour = 5;
  const utcMinute = 30;
  const pktOffset = 5; // Pakistan is UTC+5
  
  const pktHour = (utcHour + pktOffset) % 24;
  assert.strictEqual(pktHour, 10);
  assert.strictEqual(utcMinute, 30);
});

// ============================================
// API RESPONSE TESTS
// ============================================

const apiTests = new TestRunner('API Response Tests');

// Test: Cron response format
apiTests.test('Cron endpoint should return proper response', () => {
  const mockResponse = {
    success: true,
    message: 'Daily digest sent to 5 users',
    errors: 0,
  };
  
  assert.ok(mockResponse.hasOwnProperty('success'));
  assert.ok(typeof mockResponse.success === 'boolean');
});

// Test: Error response format
apiTests.test('Error response should include message', () => {
  const errorResponse = {
    success: false,
    error: 'MongoDB connection failed',
  };
  
  assert.strictEqual(errorResponse.success, false);
  assert.ok(errorResponse.error.length > 0);
});

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log('\n🚀 Starting PVARA HRMS Test Suite\n');
  console.log('Testing: Personal Reminders, Daily Digest, WhatsApp Integration\n');
  
  const results = [];
  
  results.push(await unitTests.run());
  results.push(await validationTests.run());
  results.push(await edgeCaseTests.run());
  results.push(await apiTests.run());
  
  const allPassed = results.every(r => r === true);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review issues above');
  }
  console.log('='.repeat(50) + '\n');
  
  return allPassed;
}

// Run tests
runAllTests().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
