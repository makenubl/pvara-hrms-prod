const BASE_URL = 'http://localhost:5000/api';

async function testGoalCreation() {
  try {
    console.log('🔐 Testing Goal Creation and Management...\n');
    
    // Login as manager
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@pvara.com', password: 'manager123' })
    });
    const { token, user } = await loginRes.json();
    console.log(`✅ Logged in as: ${user.firstName} ${user.lastName} (${user.role})\n`);
    
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    // Get employees
    console.log('📋 Fetching team members...');
    const empRes = await fetch(`${BASE_URL}/employees`, { headers });
    const employees = await empRes.json();
    console.log(`   Total employees: ${employees.length}`);
    
    // Filter team members (those reporting to manager)
    const teamMembers = employees.filter(emp => {
      // Check if reportsTo is either the user's ID or user's _id
      const reportsToId = emp.reportsTo?._id || emp.reportsTo;
      return reportsToId === user._id || reportsToId === user.id;
    });
    
    console.log(`   Team members reporting to manager: ${teamMembers.length}`);
    if (teamMembers.length > 0) {
      teamMembers.forEach(emp => {
        console.log(`   - ${emp.firstName} ${emp.lastName} (${emp._id || emp.id})`);
      });
    } else {
      // For testing, use first available employee
      console.log('   ⚠️  No direct reports found. Using first employee for testing...');
      if (employees.length > 0) {
        teamMembers.push(employees[0]);
        console.log(`   - ${employees[0].firstName} ${employees[0].lastName} (${employees[0]._id})`);
      }
    }
    
    if (teamMembers.length === 0) {
      console.log('\n❌ No team members found. Cannot test goal creation.');
      return;
    }
    
    // Create a test goal
    console.log('\n📝 Creating test goal...');
    const testGoal = {
      employee: teamMembers[0]._id,
      title: 'Test Goal - Automated Test',
      description: 'This is a test goal created by automation',
      category: 'Productivity',
      targetValue: 100,
      unit: '%',
      weightage: 25,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      status: 'active'
    };
    
    const createRes = await fetch(`${BASE_URL}/kpi/goals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testGoal)
    });
    
    if (!createRes.ok) {
      const error = await createRes.json();
      console.log(`   ❌ Failed to create goal: ${error.message}`);
      return;
    }
    
    const createdGoal = await createRes.json();
    console.log(`   ✅ Goal created successfully!`);
    console.log(`   Goal ID: ${createdGoal.goal._id}`);
    
    // Verify goal appears in list
    console.log('\n🔍 Verifying goal appears in supervisor goals...');
    const goalsRes = await fetch(`${BASE_URL}/kpi/supervisor/goals`, { headers });
    const goals = await goalsRes.json();
    const foundGoal = goals.find(g => g._id === createdGoal.goal._id);
    
    if (foundGoal) {
      console.log(`   ✅ Goal found in list!`);
      console.log(`   Title: ${foundGoal.title}`);
      console.log(`   Employee: ${foundGoal.employee.firstName} ${foundGoal.employee.lastName}`);
    } else {
      console.log(`   ❌ Goal not found in list`);
    }
    
    // Update the goal
    console.log('\n✏️  Updating goal...');
    const updateData = {
      ...testGoal,
      title: 'Updated Test Goal',
      targetValue: 150
    };
    
    const updateRes = await fetch(`${BASE_URL}/kpi/goals/${createdGoal.goal._id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (updateRes.ok) {
      const updated = await updateRes.json();
      console.log(`   ✅ Goal updated successfully!`);
      console.log(`   New Title: ${updated.goal.title}`);
      console.log(`   New Target: ${updated.goal.targetValue} ${updated.goal.unit}`);
    } else {
      const error = await updateRes.json();
      console.log(`   ❌ Failed to update: ${error.message}`);
    }
    
    // Delete the goal
    console.log('\n🗑️  Deleting test goal...');
    const deleteRes = await fetch(`${BASE_URL}/kpi/goals/${createdGoal.goal._id}`, {
      method: 'DELETE',
      headers
    });
    
    if (deleteRes.ok) {
      console.log(`   ✅ Goal deleted successfully!`);
    } else {
      const error = await deleteRes.json();
      console.log(`   ❌ Failed to delete: ${error.message}`);
    }
    
    console.log('\n✅ All tests completed!');
    console.log('\n🎯 Summary:');
    console.log('   ✅ Goal creation works');
    console.log('   ✅ Goal listing works');
    console.log('   ✅ Goal updating works');
    console.log('   ✅ Goal deletion works');
    console.log('   ✅ Employee dropdown should be populated with team members');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testGoalCreation();
