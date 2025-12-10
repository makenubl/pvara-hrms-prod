import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { KPIGoal, KPIReview } from '../models/KPI.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

dotenv.config();

const createManagerKPIData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin');
    console.log('✅ Connected to MongoDB');

    // Find company
    const company = await Company.findOne();
    if (!company) {
      console.log('❌ No company found.');
      process.exit(1);
    }

    // Find manager
    const manager = await User.findOne({ email: 'manager@pvara.com' });
    if (!manager) {
      console.log('❌ Manager not found. Run create-manager.js first.');
      process.exit(1);
    }

    // Find employees reporting to this manager
    const employees = await User.find({ reportsTo: manager._id });
    
    if (employees.length === 0) {
      console.log('❌ No employees reporting to manager.');
      process.exit(1);
    }

    console.log(`📋 Manager: ${manager.firstName} ${manager.lastName}`);
    console.log(`👥 Team Members: ${employees.length}`);
    employees.forEach(emp => {
      console.log(`   - ${emp.firstName} ${emp.lastName} (${emp.email})`);
    });

    // Clear existing KPI data created by this manager
    await KPIGoal.deleteMany({ supervisor: manager._id });
    await KPIReview.deleteMany({ supervisor: manager._id });
    console.log('\n🗑️  Cleared existing manager KPI data');

    // Create KPI Goals for each employee
    const goalsToCreate = [];
    
    for (const employee of employees) {
      // Create 5 goals per employee
      const employeeGoals = [
        {
          employee: employee._id,
          supervisor: manager._id,
          company: company._id,
          title: 'Complete Project Deliverables',
          description: 'Successfully deliver all assigned project tasks on time with high quality',
          category: 'Productivity',
          targetValue: 20,
          unit: 'tasks',
          weightage: 25,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-06-30'),
          status: 'active'
        },
        {
          employee: employee._id,
          supervisor: manager._id,
          company: company._id,
          title: 'Code Quality Score',
          description: 'Maintain high code quality with minimal bugs and good test coverage',
          category: 'Quality',
          targetValue: 90,
          unit: '%',
          weightage: 20,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-06-30'),
          status: 'active'
        },
        {
          employee: employee._id,
          supervisor: manager._id,
          company: company._id,
          title: 'Team Collaboration',
          description: 'Active participation in team meetings and code reviews',
          category: 'Teamwork',
          targetValue: 85,
          unit: '%',
          weightage: 20,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-06-30'),
          status: 'active'
        },
        {
          employee: employee._id,
          supervisor: manager._id,
          company: company._id,
          title: 'Customer Satisfaction',
          description: 'Achieve high customer satisfaction ratings from stakeholders',
          category: 'Customer Service',
          targetValue: 4.5,
          unit: 'stars',
          weightage: 15,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-06-30'),
          status: 'active'
        },
        {
          employee: employee._id,
          supervisor: manager._id,
          company: company._id,
          title: 'Innovation & Learning',
          description: 'Learn new technologies and propose innovative solutions',
          category: 'Innovation',
          targetValue: 3,
          unit: 'initiatives',
          weightage: 20,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-06-30'),
          status: 'active'
        }
      ];
      
      goalsToCreate.push(...employeeGoals);
    }

    const createdGoals = await KPIGoal.insertMany(goalsToCreate);
    console.log(`✅ Created ${createdGoals.length} KPI goals (${createdGoals.length / employees.length} per employee)`);

    // Create Performance Reviews for the previous period
    const reviewsToCreate = [];

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      
      // Create sample goals for the review
      const reviewGoals = [
        {
          title: 'Complete Sprint Tasks',
          category: 'Productivity',
          targetValue: 15,
          actualValue: i === 0 ? 18 : 14, // First employee exceeded
          unit: 'tasks',
          weightage: 25,
          achievement: i === 0 ? 100 : 93,
          supervisorComments: i === 0 
            ? 'Excellent performance! Exceeded targets consistently.' 
            : 'Good performance, slightly below target in last sprint.'
        },
        {
          title: 'Code Quality',
          category: 'Quality',
          targetValue: 85,
          actualValue: i === 0 ? 92 : 87,
          unit: '%',
          weightage: 20,
          achievement: i === 0 ? 100 : 100,
          supervisorComments: i === 0
            ? 'Outstanding code quality with comprehensive tests.'
            : 'Maintained good code quality standards.'
        },
        {
          title: 'Team Collaboration',
          category: 'Teamwork',
          targetValue: 80,
          actualValue: i === 0 ? 88 : 75,
          unit: '%',
          weightage: 20,
          achievement: i === 0 ? 100 : 94,
          supervisorComments: i === 0
            ? 'Very active in team discussions and code reviews.'
            : 'Good collaboration, could be more proactive in meetings.'
        },
        {
          title: 'Client Feedback',
          category: 'Customer Service',
          targetValue: 4.0,
          actualValue: i === 0 ? 4.6 : 4.2,
          unit: 'stars',
          weightage: 15,
          achievement: i === 0 ? 100 : 100,
          supervisorComments: i === 0
            ? 'Consistently received excellent client feedback.'
            : 'Positive client interactions and responsiveness.'
        },
        {
          title: 'Innovation',
          category: 'Innovation',
          targetValue: 2,
          actualValue: i === 0 ? 3 : 2,
          unit: 'proposals',
          weightage: 20,
          achievement: i === 0 ? 100 : 100,
          supervisorComments: i === 0
            ? 'Proposed multiple innovative solutions that were implemented.'
            : 'Good ideas for process improvements.'
        }
      ];

      const overallScore = reviewGoals.reduce((sum, g) => {
        return sum + (g.achievement * g.weightage / 100);
      }, 0);

      const review = {
        employee: employee._id,
        supervisor: manager._id,
        company: company._id,
        reviewPeriod: {
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-12-31')
        },
        goals: reviewGoals,
        overallScore: Math.round(overallScore),
        rating: i === 0 ? 'Exceeds Expectations' : 'Meets Expectations',
        strengths: i === 0 ? [
          'Exceptional technical skills and problem-solving ability',
          'Strong leadership in team discussions',
          'Consistent delivery of high-quality work',
          'Excellent communication with stakeholders'
        ] : [
          'Reliable and consistent performer',
          'Good technical knowledge',
          'Team player with positive attitude'
        ],
        areasForImprovement: i === 0 ? [
          'Could take on more mentoring responsibilities',
          'Explore opportunities to lead small projects'
        ] : [
          'Increase participation in team meetings',
          'Work on improving task completion speed',
          'Enhance documentation practices'
        ],
        supervisorComments: i === 0
          ? `${employee.firstName} has demonstrated exceptional performance during this review period. Consistently exceeded expectations across all KPI areas. Technical skills are outstanding and the quality of work is exemplary. Strong collaboration with team members and positive influence on team dynamics. Ready for increased responsibilities and leadership opportunities.`
          : `${employee.firstName} has shown good performance during the review period. Met expectations in most areas with consistent delivery. There is potential for improvement in proactive communication and taking initiative. Recommend focusing on enhancing technical skills in emerging technologies and participating more actively in team activities.`,
        actionPlan: i === 0
          ? 'Assign as technical lead for next major project. Pair with junior developers for mentoring. Enroll in advanced architecture training. Set up monthly one-on-ones to discuss career progression.'
          : 'Schedule bi-weekly check-ins to discuss progress and challenges. Provide training on time management and productivity tools. Encourage participation in team brainstorming sessions. Set goal to lead one small feature in next quarter.',
        status: 'submitted',
        submittedDate: new Date('2025-01-05')
      };

      reviewsToCreate.push(review);
    }

    const createdReviews = await KPIReview.insertMany(reviewsToCreate);
    console.log(`✅ Created ${createdReviews.length} performance reviews`);

    // Create some completed goals from previous period
    const completedGoals = [];
    for (const employee of employees) {
      completedGoals.push({
        employee: employee._id,
        supervisor: manager._id,
        company: company._id,
        title: 'Q4 2024 Project Completion',
        description: 'Complete all Q4 assigned projects',
        category: 'Productivity',
        targetValue: 12,
        unit: 'projects',
        weightage: 30,
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-12-31'),
        status: 'completed'
      });
    }

    await KPIGoal.insertMany(completedGoals);
    console.log(`✅ Created ${completedGoals.length} completed goals`);

    console.log('\n📊 Manager KPI Data Summary:');
    console.log(`   - ${createdGoals.length} active KPI goals (current period)`);
    console.log(`   - ${completedGoals.length} completed goals (previous period)`);
    console.log(`   - ${createdReviews.length} submitted reviews (pending acknowledgment)`);
    console.log(`   - Goals per employee: ${createdGoals.length / employees.length}`);
    
    console.log('\n✨ Data created successfully!');
    console.log('\n🎯 Manager can now:');
    console.log('   • View all created goals in Team Performance → KPI Goals');
    console.log('   • View submitted reviews in Team Performance → Performance Reviews');
    console.log('   • Create new goals and reviews for team members');
    console.log('\n👤 Employees can:');
    console.log('   • View their goals in My Performance → KPI Goals');
    console.log('   • View and respond to reviews in My Performance → Performance Reviews');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

createManagerKPIData();
