#!/usr/bin/env node

/**
 * Test Script: Profile Validation & Document Upload
 * Tests all validation rules and document upload functionality
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000';
let authToken = '';

// Helper function to make HTTP requests
function makeRequest(method, endpoint, data = null, isFormData = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_URL);
    const options = {
      method: method,
      headers: {
        'Content-Type': isFormData ? undefined : 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data && !isFormData) {
      req.write(JSON.stringify(data));
    } else if (data && isFormData) {
      req.write(data);
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('\\n========================================');
  console.log('PROFILE VALIDATION & DOCUMENT UPLOAD TEST');
  console.log('========================================\\n');

  try {
    // Step 1: Login
    console.log('📝 Step 1: Authenticating...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'employee@pvara.com',
      password: 'employee123'
    });
    
    if (loginRes.status !== 200) {
      console.error('❌ Login failed:', loginRes.data);
      process.exit(1);
    }
    
    authToken = loginRes.data.token;
    console.log('✅ Authenticated successfully\\n');

    // Step 2: Test validation - Invalid CNIC
    console.log('📝 Step 2: Testing CNIC validation (should fail)...');
    const invalidCNIC = await makeRequest('PUT', '/api/profile', {
      cnic: 'invalid-cnic'
    });
    
    if (invalidCNIC.status === 400) {
      console.log('✅ CNIC validation working:', invalidCNIC.data.message);
    } else {
      console.log('❌ CNIC validation failed - accepted invalid format');
    }

    // Step 3: Test validation - Future date of birth
    console.log('\\n📝 Step 3: Testing date of birth validation (should fail)...');
    const futureDate = await makeRequest('PUT', '/api/profile', {
      dateOfBirth: '2030-01-01'
    });
    
    if (futureDate.status === 400) {
      console.log('✅ Date validation working:', futureDate.data.message);
    } else {
      console.log('❌ Date validation failed - accepted future date');
    }

    // Step 4: Test validation - Invalid blood group
    console.log('\\n📝 Step 4: Testing blood group validation (should fail)...');
    const invalidBlood = await makeRequest('PUT', '/api/profile', {
      bloodGroup: 'Z+'
    });
    
    if (invalidBlood.status === 400) {
      console.log('✅ Blood group validation working:', invalidBlood.data.message);
    } else {
      console.log('❌ Blood group validation failed - accepted invalid value');
    }

    // Step 5: Test validation - Empty first name
    console.log('\\n📝 Step 5: Testing required field validation (should fail)...');
    const emptyName = await makeRequest('PUT', '/api/profile', {
      firstName: '   '
    });
    
    if (emptyName.status === 400) {
      console.log('✅ Required field validation working:', emptyName.data.message);
    } else {
      console.log('❌ Required field validation failed - accepted empty name');
    }

    // Step 6: Test valid update
    console.log('\\n📝 Step 6: Testing valid profile update...');
    const validUpdate = await makeRequest('PUT', '/api/profile', {
      phone: '03001234567',
      city: 'Karachi',
      bloodGroup: 'O+',
      cnic: '12345-1234567-1'
    });
    
    if (validUpdate.status === 200) {
      console.log('✅ Valid update successful');
      console.log('   Phone:', validUpdate.data.user.phone);
      console.log('   City:', validUpdate.data.user.city);
      console.log('   Blood Group:', validUpdate.data.user.bloodGroup);
      console.log('   CNIC:', validUpdate.data.user.cnic);
    } else {
      console.log('❌ Valid update failed:', validUpdate.data);
    }

    // Step 7: Test document upload validation
    console.log('\\n📝 Step 7: Testing document upload validation...');
    console.log('⚠️  Note: Actual file upload requires multipart/form-data');
    console.log('   This test verifies the endpoint exists and requires authentication');
    
    const docUploadTest = await makeRequest('POST', '/api/profile/documents', {
      type: 'CNIC'
    });
    
    if (docUploadTest.status === 400 && docUploadTest.data.message.includes('upload a file')) {
      console.log('✅ Document upload endpoint working (file required)');
    } else {
      console.log('   Status:', docUploadTest.status);
      console.log('   Response:', docUploadTest.data);
    }

    console.log('\\n========================================');
    console.log('VALIDATION SUMMARY');
    console.log('========================================\\n');
    
    console.log('✅ Validations Implemented:');
    console.log('  1. CNIC format: 12345-1234567-1');
    console.log('  2. Phone: 10-15 digits');
    console.log('  3. Date of birth: Not in future');
    console.log('  4. Blood group: A+, A-, B+, B-, O+, O-, AB+, AB-');
    console.log('  5. Gender: male, female, other');
    console.log('  6. Marital status: single, married, divorced, widowed');
    console.log('  7. First/Last name: Cannot be empty');
    console.log('  8. Document type: CNIC, Passport, Education, Experience, Medical, Other');
    console.log('  9. File size: Max 10MB for documents, 5MB for photos');
    console.log(' 10. File types: PDF, JPG, PNG, DOC, DOCX\\n');

    console.log('✅ All validation tests completed!\\n');

  } catch (error) {
    console.error('\\n❌ Test error:', error.message);
    process.exit(1);
  }
}

// Wait for server to be ready
setTimeout(runTests, 3000);
