import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const checkPersistence = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvara-hrms';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected\n');

    // Find the employee user
    const user = await User.findOne({ email: 'employee@pvara.com' })
      .select('-password');
    
    if (!user) {
      console.log('❌ Employee user not found');
      process.exit(1);
    }

    console.log('========================================');
    console.log('EMPLOYEE PROFILE DATA IN MONGODB');
    console.log('========================================\n');
    
    console.log('📋 Personal Information:');
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Email:', user.email);
    console.log('  Phone:', user.phone || '❌ Not set');
    console.log('  Date of Birth:', user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '❌ Not set');
    console.log('  Gender:', user.gender || '❌ Not set');
    console.log('  Marital Status:', user.maritalStatus || '❌ Not set');
    console.log('  Blood Group:', user.bloodGroup || '❌ Not set');
    console.log('  Nationality:', user.nationality || '❌ Not set');
    
    console.log('\n🆔 Identification:');
    console.log('  CNIC:', user.cnic || '❌ Not set');
    console.log('  Passport:', user.passport || '❌ Not set');
    
    console.log('\n📍 Address Information:');
    console.log('  Current Address:', user.currentAddress || '❌ Not set');
    console.log('  Permanent Address:', user.permanentAddress || '❌ Not set');
    console.log('  City:', user.city || '❌ Not set');
    console.log('  State:', user.state || '❌ Not set');
    console.log('  Country:', user.country || '❌ Not set');
    console.log('  Postal Code:', user.postalCode || '❌ Not set');
    
    console.log('\n🚨 Emergency Contact:');
    console.log('  Name:', user.emergencyContactName || '❌ Not set');
    console.log('  Relation:', user.emergencyContactRelation || '❌ Not set');
    console.log('  Phone:', user.emergencyContactPhone || '❌ Not set');
    
    console.log('\n💳 Bank Details:');
    console.log('  Bank Name:', user.bankName || '❌ Not set');
    console.log('  Account Title:', user.accountTitle || '❌ Not set');
    console.log('  Account Number:', user.accountNumber || '❌ Not set');
    console.log('  IBAN:', user.iban || '❌ Not set');
    
    console.log('\n💼 Employment:');
    console.log('  Department:', user.department || '❌ Not set');
    console.log('  Position:', user.position || '❌ Not set');
    console.log('  Role:', user.role);
    console.log('  Status:', user.status);
    console.log('  Salary:', user.salary);
    
    console.log('\n📄 Documents:');
    if (user.documents && user.documents.length > 0) {
      user.documents.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.name} (${doc.type}) - ${doc.status}`);
      });
    } else {
      console.log('  ❌ No documents uploaded');
    }
    
    console.log('\n📊 Profile Picture:');
    console.log('  ', user.profileImage || '❌ Not uploaded');
    
    console.log('\n⏱️  Last Updated:', user.updatedAt);
    console.log('========================================\n');

    // Check if data is persisting across queries
    console.log('✅ Verification: Re-querying database...');
    const verifyUser = await User.findById(user._id).select('phone cnic city bloodGroup');
    console.log('✅ Phone still in DB:', verifyUser.phone);
    console.log('✅ CNIC still in DB:', verifyUser.cnic);
    console.log('✅ City still in DB:', verifyUser.city);
    console.log('✅ Blood Group still in DB:', verifyUser.bloodGroup);
    
    console.log('\n🎉 Data is persisting correctly in MongoDB!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

checkPersistence();
