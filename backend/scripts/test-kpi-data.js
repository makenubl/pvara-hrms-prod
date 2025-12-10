const BASE_URL = 'http://localhost:5000/api';

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  return { token: data.token, user: data.user };
}

async function testManagerKPI() {
  console.log('🔐 Testing Manager Account...\n');
  
  // Login as manager
  const { token, user } = await login('manager@pvara.com', 'manager123');
  console.log(`✅ Logged in as: ${user.firstName} ${user.lastName} (${user.role})`);
  
  // Get supervisor goals
  const goalsRes = await fetch(`${BASE_URL}/kpi/supervisor/goals`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const goals = await goalsRes.json();
  console.log(`\n📋 Supervisor Goals: ${goals.length} total`);
  
  if (goals.length > 0) {
    console.log('\nSample Goals:');
    goals.slice(0, 3).forEach(g => {
      console.log(`   • ${g.title} (${g.category})`);
      console.log(`     Employee: ${g.employee.firstName} ${g.employee.lastName}`);
      console.log(`     Target: ${g.targetValue} ${g.unit}, Weightage: ${g.weightage}%`);
    });
  }
  
  // Get supervisor reviews
  const reviewsRes = await fetch(`${BASE_URL}/kpi/supervisor/reviews`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const reviews = await reviewsRes.json();
  console.log(`\n📊 Performance Reviews: ${reviews.length} total`);
  
  if (reviews.length > 0) {
    console.log('\nReviews Summary:');
    reviews.forEach(r => {
      console.log(`   • ${r.employee.firstName} ${r.employee.lastName}`);
      console.log(`     Rating: ${r.rating}, Score: ${r.overallScore}%`);
      console.log(`     Status: ${r.status}, Goals: ${r.goals.length}`);
    });
  }
}

async function testEmployeeKPI() {
  console.log('\n\n🔐 Testing Employee Account...\n');
  
  // Login as employee
  const { token, user } = await login('employee@pvara.com', 'employee123');
  console.log(`✅ Logged in as: ${user.firstName} ${user.lastName} (${user.role})`);
  
  // Get employee goals
  const goalsRes = await fetch(`${BASE_URL}/kpi/goals`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const goals = await goalsRes.json();
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  
  console.log(`\n📋 My KPI Goals:`);
  console.log(`   Active: ${activeGoals.length}, Completed: ${completedGoals.length}, Total: ${goals.length}`);
  
  if (activeGoals.length > 0) {
    console.log('\nActive Goals:');
    activeGoals.slice(0, 3).forEach(g => {
      console.log(`   • ${g.title} (${g.category})`);
      console.log(`     Target: ${g.targetValue} ${g.unit}, Weightage: ${g.weightage}%`);
      console.log(`     Supervisor: ${g.supervisor.firstName} ${g.supervisor.lastName}`);
    });
  }
  
  // Get employee reviews
  const reviewsRes = await fetch(`${BASE_URL}/kpi/reviews`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const reviews = await reviewsRes.json();
  console.log(`\n📊 My Performance Reviews: ${reviews.length} total`);
  
  if (reviews.length > 0) {
    console.log('\nReviews:');
    reviews.forEach(r => {
      const period = `${r.reviewPeriod.startDate.substring(0,10)} to ${r.reviewPeriod.endDate.substring(0,10)}`;
      console.log(`   • Period: ${period}`);
      console.log(`     Supervisor: ${r.supervisor.firstName} ${r.supervisor.lastName}`);
      console.log(`     Rating: ${r.rating}, Score: ${r.overallScore}%`);
      console.log(`     Status: ${r.status}, Goals Reviewed: ${r.goals.length}`);
    });
  }
}

async function runTests() {
  try {
    await testManagerKPI();
    await testEmployeeKPI();
    
    console.log('\n\n✅ All tests completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Login as manager (manager@pvara.com / manager123)');
    console.log('   2. Go to Team Performance page');
    console.log('   3. View KPI Goals and Performance Reviews tabs');
    console.log('   4. Login as employee (employee@pvara.com / employee123)');
    console.log('   5. Go to My Performance page');
    console.log('   6. View your goals and reviews from manager');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runTests();
