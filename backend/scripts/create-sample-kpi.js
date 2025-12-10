import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { KPIGoal, KPIReview } from '../models/KPI.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

dotenv.config();

const createSampleKPIData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/pvara-hrms?authSource=admin');
    console.log('✅ Connected to MongoDB');

    // Find company
    const company = await Company.findOne();
    if (!company) {
      console.log('❌ No company found. Please create a company first.');
      process.exit(1);
    }

    // Find employee and supervisor
    const employee = await User.findOne({ email: 'employee@pvara.com' });
    const supervisor = await User.findOne({ role: { $in: ['admin', 'manager', 'hr'] } });

    if (!employee) {
      console.log('❌ Employee not found. Please create employee@pvara.com first.');
      process.exit(1);
    }

    if (!supervisor) {
      console.log('❌ No supervisor found. Please create an admin/manager/hr user first.');
      process.exit(1);
    }

    console.log(`📋 Employee: ${employee.firstName} ${employee.lastName} (${employee.email})`);
    console.log(`👔 Supervisor: ${supervisor.firstName} ${supervisor.lastName} (${supervisor.email})`);

    // Clear existing KPI data for this employee
    await KPIGoal.deleteMany({ employee: employee._id });
    await KPIReview.deleteMany({ employee: employee._id });
    console.log('🗑️  Cleared existing KPI data');

    // Create KPI Goals
    const goals = [
      {
        employee: employee._id,
        supervisor: supervisor._id,
        company: company._id,
        title: 'Complete 10 Client Projects',
        description: 'Successfully deliver 10 client projects within budget and timeline',
        category: 'Productivity',
        targetValue: 10,
        unit: 'projects',
        weightage: 25,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        status: 'active'
      },
      {
        employee: employee._id,
        supervisor: supervisor._id,
        company: company._id,
        title: 'Achieve 95% Code Quality Score',
        description: 'Maintain code quality standards with minimal bugs and high test coverage',
        category: 'Quality',
        targetValue: 95,
        unit: '%',
        weightage: 20,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        status: 'active'
      },
      {
        employee: employee._id,
        supervisor: supervisor._id,
        company: company._id,
        title: 'Reduce Task Completion Time',
        description: 'Improve efficiency by reducing average task completion time',
        category: 'Efficiency',
        targetValue: 20,
        unit: '%',
        weightage: 15,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        status: 'active'
      },
      {
        employee: employee._id,
        supervisor: supervisor._id,
        company: company._id,
        title: 'Customer Satisfaction Rating',
        description: 'Achieve excellent customer feedback scores',
        category: 'Customer Service',
        targetValue: 4.5,
        unit: 'stars',
        weightage: 20,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        status: 'active'
      },
      {
        employee: employee._id,
        supervisor: supervisor._id,
        company: company._id,
        title: 'Team Collaboration Score',
        description: 'Foster teamwork and positive collaboration with peers',
        category: 'Teamwork',
        targetValue: 90,
        unit: '%',
        weightage: 20,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        status: 'active'
      }
    ];

    const createdGoals = await KPIGoal.insertMany(goals);
    console.log(`✅ Created ${createdGoals.length} KPI goals`);

    // Create a Performance Review with KPI results
    const review = {
      employee: employee._id,
      supervisor: supervisor._id,
      company: company._id,
      reviewPeriod: {
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-12-31')
      },
      goals: [
        {
          goalId: null,
          title: 'Complete 12 Client Projects',
          category: 'Productivity',
          targetValue: 12,
          actualValue: 14,
          unit: 'projects',
          weightage: 25,
          achievement: 100, // Exceeded target
          supervisorComments: 'Outstanding performance! Completed 14 projects, exceeding the target by 2.'
        },
        {
          goalId: null,
          title: 'Achieve 90% Code Quality Score',
          category: 'Quality',
          targetValue: 90,
          actualValue: 92,
          unit: '%',
          weightage: 20,
          achievement: 100,
          supervisorComments: 'Excellent code quality with minimal bugs and high test coverage.'
        },
        {
          goalId: null,
          title: 'Reduce Task Completion Time',
          category: 'Efficiency',
          targetValue: 15,
          actualValue: 18,
          unit: '%',
          weightage: 15,
          achievement: 100,
          supervisorComments: 'Great improvement in efficiency. Tasks completed 18% faster on average.'
        },
        {
          goalId: null,
          title: 'Customer Satisfaction Rating',
          category: 'Customer Service',
          targetValue: 4.0,
          actualValue: 4.3,
          unit: 'stars',
          weightage: 20,
          achievement: 100,
          supervisorComments: 'Received excellent feedback from clients consistently.'
        },
        {
          goalId: null,
          title: 'Team Collaboration Score',
          category: 'Teamwork',
          targetValue: 85,
          actualValue: 78,
          unit: '%',
          weightage: 20,
          achievement: 92,
          supervisorComments: 'Good collaboration, but there is room for more proactive communication.'
        }
      ],
      overallScore: 98,
      rating: 'Exceeds Expectations',
      strengths: [
        'Exceptional project delivery with consistent quality',
        'Strong technical skills and problem-solving abilities',
        'Excellent time management and efficiency',
        'High customer satisfaction ratings'
      ],
      areasForImprovement: [
        'Enhance proactive communication with team members',
        'Take more initiative in knowledge sharing sessions',
        'Participate more actively in team meetings'
      ],
      supervisorComments: `${employee.firstName} has demonstrated exceptional performance this review period. Successfully delivered 14 projects while maintaining high quality standards. The improvement in efficiency is particularly noteworthy. Focus on enhancing team collaboration through more proactive communication will help reach outstanding performance levels.`,
      actionPlan: 'Schedule weekly one-on-one meetings to discuss progress and challenges. Participate in at least 2 knowledge sharing sessions per month. Lead one team project in the next quarter.',
      status: 'submitted',
      submittedDate: new Date('2025-01-05')
    };

    const createdReview = await KPIReview.create(review);
    console.log(`✅ Created performance review with ID: ${createdReview._id}`);

    // Create another review (acknowledged)
    const review2 = {
      employee: employee._id,
      supervisor: supervisor._id,
      company: company._id,
      reviewPeriod: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30')
      },
      goals: [
        {
          title: 'Complete Training Modules',
          category: 'Learning',
          targetValue: 8,
          actualValue: 10,
          unit: 'modules',
          weightage: 30,
          achievement: 100,
          supervisorComments: 'Completed all required training modules ahead of schedule.'
        },
        {
          title: 'Bug Fix Rate',
          category: 'Quality',
          targetValue: 95,
          actualValue: 97,
          unit: '%',
          weightage: 35,
          achievement: 100,
          supervisorComments: 'Excellent bug resolution rate with thorough testing.'
        },
        {
          title: 'Peer Review Participation',
          category: 'Teamwork',
          targetValue: 20,
          actualValue: 18,
          unit: 'reviews',
          weightage: 35,
          achievement: 90,
          supervisorComments: 'Good participation in code reviews, slightly below target.'
        }
      ],
      overallScore: 96,
      rating: 'Exceeds Expectations',
      strengths: [
        'Quick learner with strong initiative',
        'High quality bug fixes',
        'Attention to detail'
      ],
      areasForImprovement: [
        'Increase participation in peer code reviews'
      ],
      supervisorComments: 'Great performance in the first half of 2024. Keep up the excellent work!',
      employeeComments: 'Thank you for the feedback. I will focus on participating more in code reviews and sharing my knowledge with the team.',
      actionPlan: 'Set goal to complete 25 code reviews in the next period.',
      status: 'acknowledged',
      submittedDate: new Date('2024-07-05'),
      acknowledgedDate: new Date('2024-07-10')
    };

    const createdReview2 = await KPIReview.create(review2);
    console.log(`✅ Created acknowledged review with ID: ${createdReview2._id}`);

    console.log('\n📊 Sample KPI Data Summary:');
    console.log(`   - ${createdGoals.length} active KPI goals for current period`);
    console.log(`   - 1 submitted review (pending acknowledgment)`);
    console.log(`   - 1 acknowledged review from previous period`);
    console.log('\n🎯 Employee can now view their performance reviews!');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

createSampleKPIData();
