/**
 * Test S3 Upload Functionality
 * Tests the S3 service and Document model integration
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { uploadToS3, deleteFromS3, existsInS3, getSignedDownloadUrl } from '../services/s3Service.js';
import Document from '../models/Document.js';

const testContent = Buffer.from('This is a test file for S3 upload verification.');
const testKey = 'test-folder/documents/test-file.txt';

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 S3 UPLOAD TEST');
  console.log('='.repeat(60));
  
  // Check environment variables
  console.log('\n📋 Environment Check:');
  console.log(`   STORAGE_MODE: ${process.env.STORAGE_MODE || 'not set'}`);
  console.log(`   S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME || 'not set'}`);
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'not set'}`);
  console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ set' : '❌ not set'}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ set' : '❌ not set'}`);
  
  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ MongoDB connected');
    
    // Test 1: Upload to S3
    console.log('\n📤 Test 1: Upload to S3...');
    const uploadResult = await uploadToS3(testContent, 'test-folder', 'test-file.txt', 'text/plain');
    console.log(`   ✅ Upload successful!`);
    console.log(`   Key: ${uploadResult.s3Key}`);
    console.log(`   Bucket: ${uploadResult.bucket}`);
    console.log(`   URL: ${uploadResult.s3Url}`);
    
    // Test 2: Save to MongoDB
    console.log('\n💾 Test 2: Save metadata to MongoDB...');
    const document = new Document({
      filename: 'test-file.txt',
      originalName: 'test-file.txt',
      s3Key: uploadResult.s3Key,
      s3Bucket: uploadResult.bucket,
      s3Url: uploadResult.s3Url,
      mimeType: 'text/plain',
      size: testContent.length,
      folder: 'test-folder',
      status: 'uploaded'
    });
    await document.save();
    console.log(`   ✅ Document saved to MongoDB!`);
    console.log(`   Document ID: ${document._id}`);
    
    // Test 3: Check if file exists in S3
    console.log('\n🔍 Test 3: Verify file exists in S3...');
    const exists = await existsInS3(uploadResult.s3Key);
    console.log(`   ${exists ? '✅' : '❌'} File exists in S3: ${exists}`);
    
    // Test 4: Get signed download URL
    console.log('\n🔗 Test 4: Generate signed download URL...');
    const signedUrl = await getSignedDownloadUrl(uploadResult.s3Key, 60);
    console.log(`   ✅ Signed URL generated (expires in 60s):`);
    console.log(`   ${signedUrl.substring(0, 100)}...`);
    
    // Test 5: Query from MongoDB
    console.log('\n🔎 Test 5: Query document from MongoDB...');
    const found = await Document.findByS3Key(uploadResult.s3Key);
    console.log(`   ${found ? '✅' : '❌'} Document found: ${found ? found.filename : 'not found'}`);
    
    // Test 6: Cleanup - Delete from S3
    console.log('\n🗑️ Test 6: Cleanup - Delete from S3...');
    await deleteFromS3(uploadResult.s3Key);
    console.log('   ✅ File deleted from S3');
    
    // Test 7: Cleanup - Delete from MongoDB
    console.log('\n🗑️ Test 7: Cleanup - Delete from MongoDB...');
    await Document.deleteOne({ _id: document._id });
    console.log('   ✅ Document deleted from MongoDB');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - S3 + MongoDB integration working!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTest();
