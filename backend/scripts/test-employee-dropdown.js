const BASE_URL = 'http://localhost:5000/api';

async function testEmployeeDropdownAndHierarchy() {
  console.log('🧪 Testing Employee Dropdown & Organization Structure\n');
  
  try {
    // Test 1: Manager Login and Team Members
    console.log('1️⃣  Testing Manager - Employee Dropdown');
    console.log('━'.repeat(50));
    
    const managerLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@pvara.com', password: 'manager123' })
    });
    const { token: managerToken, user: manager } = await managerLogin.json();
    console.log(`✅ Logged in as: ${manager.firstName} ${manager.lastName}`);
    console.log(`   Manager ID: ${manager._id}`);
    
    // Get all employees
    const empRes = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const allEmployees = await empRes.json();
    console.log(`\n📊 Total Employees: ${allEmployees.length}`);
    
    // Filter team members
    const teamMembers = allEmployees.filter(emp => {
      if (!emp.reportsTo) return false;
      const reportsToId = typeof emp.reportsTo === 'object' ? emp.reportsTo._id : emp.reportsTo;
      return reportsToId === manager._id;
    });
    
    console.log(`\n👥 Team Members (reportsTo manager): ${teamMembers.length}`);
    if (teamMembers.length > 0) {
      console.log('   Team:');
      teamMembers.forEach(emp => {
        const supervisor = emp.reportsTo;
        console.log(`   ✅ ${emp.firstName} ${emp.lastName}`);
        console.log(`      Email: ${emp.email}`);
        console.log(`      Reports To: ${supervisor.firstName} ${supervisor.lastName} (${supervisor._id})`);
      });
    } else {
      console.log('   ❌ No team members found!');
      console.log('\n   Checking all employees:');
      allEmployees.forEach(emp => {
        console.log(`   - ${emp.firstName} ${emp.lastName}`);
        console.log(`     reportsTo: ${emp.reportsTo ? (emp.reportsTo._id || emp.reportsTo) : 'null'}`);
        console.log(`     type: ${emp.reportsTo ? typeof emp.reportsTo : 'null'}`);
      });
    }
    
    // Test 2: Organization Hierarchy
    console.log('\n\n2️⃣  Testing Organization Structure');
    console.log('━'.repeat(50));
    
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pvara.com', password: 'admin123' })
    });
    const { token: adminToken, user: admin } = await adminLogin.json();
    console.log(`✅ Logged in as: ${admin.firstName} ${admin.lastName}`);
    
    const hierarchyRes = await fetch(`${BASE_URL}/positions/hierarchy`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const hierarchy = await hierarchyRes.json();
    
    console.log(`\n📋 Total Positions: ${hierarchy.length}`);
    
    if (hierarchy.length === 0) {
      console.log('   ⚠️  No positions found. Organization structure is empty.');
    } else {
      const rootPositions = hierarchy.filter(p => !p.reportsTo);
      const childPositions = hierarchy.filter(p => p.reportsTo);
      
      console.log(`   Root Positions: ${rootPositions.length}`);
      console.log(`   Child Positions: ${childPositions.length}`);
      
      console.log('\n   Position Details:');
      hierarchy.forEach(pos => {
        const indent = pos.reportsTo ? '   ' : '';
        console.log(`${indent}📍 ${pos.title} (${pos.department})`);
        console.log(`${indent}   Level: ${pos.level || 'mid'}`);
        console.log(`${indent}   Employees: ${pos.employees || 0}`);
        console.log(`${indent}   Subordinates: ${pos.subordinates?.length || 0}`);
        if (pos.reportsTo) {
          console.log(`${indent}   Reports To: ${pos.reportsTo.title}`);
        }
      });
      
      // Show hierarchy tree
      console.log('\n   Organization Tree:');
      const printTree = (pos, level = 0) => {
        const indent = '  '.repeat(level);
        const icon = level === 0 ? '🏢' : '└─';
        console.log(`${indent}${icon} ${pos.title} (${pos.employees || 0} employees)`);
        
        if (pos.subordinates && pos.subordinates.length > 0) {
          pos.subordinates.forEach(subId => {
            const sub = hierarchy.find(p => p._id === subId);
            if (sub) printTree(sub, level + 1);
          });
        }
      };
      
      rootPositions.forEach(pos => printTree(pos));
    }
    
    // Test 3: Verify Employee Dropdown Data
    console.log('\n\n3️⃣  Employee Dropdown Test Results');
    console.log('━'.repeat(50));
    
    if (teamMembers.length > 0) {
      console.log('✅ Employee dropdown will be populated');
      console.log(`✅ Manager can assign goals to ${teamMembers.length} team member(s)`);
      console.log('\nDropdown Options:');
      teamMembers.forEach((emp, i) => {
        console.log(`   ${i + 1}. ${emp.firstName} ${emp.lastName} (${emp.employeeId || emp._id})`);
      });
    } else {
      console.log('❌ Employee dropdown will be EMPTY');
      console.log('❌ Manager cannot create goals - no team members assigned');
      console.log('\n💡 Solution: Run this command to assign employees:');
      console.log('   cd backend && node scripts/create-manager.js');
    }
    
    // Summary
    console.log('\n\n📊 Test Summary');
    console.log('━'.repeat(50));
    console.log(`Manager Account: ${teamMembers.length > 0 ? '✅' : '❌'} Team members assigned`);
    console.log(`Organization Structure: ${hierarchy.length > 0 ? '✅' : '❌'} Positions configured`);
    console.log(`Employee Filtering: ${teamMembers.length > 0 ? '✅' : '❌'} Working correctly`);
    
    if (teamMembers.length > 0 && hierarchy.length > 0) {
      console.log('\n🎉 All tests PASSED! Both features are working.');
    } else {
      console.log('\n⚠️  Some issues found. See details above.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

testEmployeeDropdownAndHierarchy();
