// This script adds toast import to pages that need it
// eslint-disable-next-line no-undef
const fs = require('fs');
// eslint-disable-next-line no-undef
const path = require('path');

const pagesDir = '/Users/ubl/pvara-hrms/src/pages';
const pagesToUpdate = [
  'Dashboard.jsx',
  'Employees.jsx', 
  'Analytics.jsx',
  'LeaveManagement.jsx',
  'Recruitment.jsx',
  'Learning.jsx',
  'Payroll.jsx',
  'Performance.jsx',
  'Compliance.jsx',
  'Attendance.jsx'
];

pagesToUpdate.forEach(page => {
  const filePath = path.join(pagesDir, page);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if toast is already imported
  if (!content.includes("import toast from 'react-hot-toast'")) {
    // Add toast import after React import
    content = content.replace(
      /(import React[^;]+;)/,
      "$1\nimport toast from 'react-hot-toast';"
    );
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${page}`);
  }
});

console.log('All pages updated with toast import!');
