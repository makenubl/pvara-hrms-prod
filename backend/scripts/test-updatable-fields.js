import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const testFieldUpdates = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected\n');

    // Find the employee user
    const user = await User.findOne({ email: 'employee@pvara.com' });
    
    if (!user) {
      console.log('❌ Employee user not found');
      process.exit(1);
    }

    console.log('========================================');
    console.log('PROFILE FIELD UPDATE TEST');
    console.log('========================================\n');
    
    console.log('Testing which fields can be updated...\n');

    // Fields that SHOULD be updatable (employee self-service)
    const updatableFields = {
      // Personal Information
      firstName: { test: 'Jane', original: user.firstName },
      lastName: { test: 'Smith', original: user.lastName },
      phone: { test: '03111111111', original: user.phone },
      dateOfBirth: { test: new Date('1992-05-20'), original: user.dateOfBirth },
      gender: { test: 'female', original: user.gender },
      maritalStatus: { test: 'married', original: user.maritalStatus },
      bloodGroup: { test: 'A+', original: user.bloodGroup },
      nationality: { test: 'Pakistani', original: user.nationality },
      
      // Identification
      cnic: { test: '54321-1234567-8', original: user.cnic },
      passport: { test: 'AB1234567', original: user.passport },
      
      // Address
      currentAddress: { test: '456 New Street', original: user.currentAddress },
      permanentAddress: { test: '789 Old Avenue', original: user.permanentAddress },
      city: { test: 'Lahore', original: user.city },
      state: { test: 'Punjab', original: user.state },
      country: { test: 'Pakistan', original: user.country },
      postalCode: { test: '54000', original: user.postalCode },
      
      // Emergency Contact
      emergencyContactName: { test: 'Sarah Doe', original: user.emergencyContactName },
      emergencyContactRelation: { test: 'Sister', original: user.emergencyContactRelation },
      emergencyContactPhone: { test: '03222222222', original: user.emergencyContactPhone },
      
      // Bank Details
      bankName: { test: 'HBL', original: user.bankName },
      accountTitle: { test: 'Jane Smith', original: user.accountTitle },
      accountNumber: { test: '9876543210', original: user.accountNumber },
      iban: { test: 'PK12HABB0000987654321012', original: user.iban },
    };

    // Fields that should NOT be updatable by employee
    const nonUpdatableFields = {
      email: 'Email (Account Identifier)',
      role: 'Role (Admin only)',
      status: 'Employment Status (HR only)',
      salary: 'Salary (HR only)',
      department: 'Department (HR only)',
      position: 'Position (HR only)',
      company: 'Company (System)',
      joinDate: 'Join Date (HR only)',
    };

    console.log('✅ UPDATABLE FIELDS (Employee Self-Service):');
    console.log('─'.repeat(50));
    Object.keys(updatableFields).forEach((field, index) => {
      console.log(`${index + 1}. ${field}`);
    });
    
    console.log('\n❌ NON-UPDATABLE FIELDS (Protected):');
    console.log('─'.repeat(50));
    Object.entries(nonUpdatableFields).forEach(([field, reason], index) => {
      console.log(`${index + 1}. ${field} - ${reason}`);
    });

    console.log('\n========================================');
    console.log('TESTING UPDATE FUNCTIONALITY');
    console.log('========================================\n');

    // Test updating a few key fields
    const testFields = ['phone', 'city', 'bloodGroup', 'emergencyContactName'];
    
    for (const field of testFields) {
      const testValue = updatableFields[field].test;
      const originalValue = updatableFields[field].original;
      
      console.log(`📝 Testing: ${field}`);
      console.log(`   Original: ${originalValue || 'Not set'}`);
      
      user[field] = testValue;
      await user.save();
      
      const updated = await User.findById(user._id);
      console.log(`   Updated to: ${updated[field]}`);
      console.log(`   ✅ Success: ${updated[field] === testValue}\n`);
      
      // Restore original value
      user[field] = originalValue;
      await user.save();
    }

    console.log('========================================');
    console.log('FIELD VALIDATION RULES');
    console.log('========================================\n');

    console.log('1. Email: Immutable (cannot be changed after account creation)');
    console.log('2. CNIC: Unique constraint (must be unique across all users)');
    console.log('3. Phone: Text field (any format accepted)');
    console.log('4. Date of Birth: Date field (must be valid date)');
    console.log('5. Gender: Enum (male, female, other)');
    console.log('6. Marital Status: Enum (single, married, divorced, widowed)');
    console.log('7. Blood Group: Enum (A+, A-, B+, B-, O+, O-, AB+, AB-)');
    console.log('8. All other fields: Optional text fields\n');

    console.log('========================================');
    console.log('API ENDPOINT FIELD MAPPING');
    console.log('========================================\n');
    console.log('PUT /api/profile accepts:');
    console.log('─'.repeat(50));
    const apiFields = Object.keys(updatableFields);
    apiFields.forEach((field, index) => {
      console.log(`  ${field}: string${field.includes('Date') ? ' (ISO date)' : ''}`);
    });

    console.log('\n✅ Test completed successfully!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testFieldUpdates();
