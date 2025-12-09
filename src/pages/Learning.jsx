import React, { useState } from 'react';
import { BookOpen, Star, Users, Clock, Plus, Filter } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table } from '../components/UI';

const Learning = () => {
  const [activeTab, setActiveTab] = useState('courses');

  const [courses] = useState([
    {
      id: 1,
      title: 'React Fundamentals',
      instructor: 'Sarah Chen',
      category: 'Technology',
      enrollees: 45,
      rating: 4.8,
      status: 'active',
    },
    {
      id: 2,
      title: 'Leadership Skills',
      instructor: 'Mark Thompson',
      category: 'Management',
      enrollees: 32,
      rating: 4.6,
      status: 'active',
    },
    {
      id: 3,
      title: 'Project Management Basics',
      instructor: 'Emily Rodriguez',
      category: 'Management',
      enrollees: 28,
      rating: 4.5,
      status: 'upcoming',
    },
  ]);

  const [enrollments] = useState([
    {
      id: 1,
      employeeName: 'John Doe',
      courseName: 'React Fundamentals',
      enrolledDate: '2025-11-15',
      progress: 75,
      status: 'in-progress',
    },
    {
      id: 2,
      employeeName: 'Jane Smith',
      courseName: 'Leadership Skills',
      enrolledDate: '2025-10-20',
      progress: 100,
      status: 'completed',
    },
    {
      id: 3,
      employeeName: 'Mike Johnson',
      courseName: 'React Fundamentals',
      enrolledDate: '2025-12-01',
      progress: 30,
      status: 'in-progress',
    },
  ]);

  const courseColumns = [
    {
      key: 'title',
      label: 'Course Name',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-white">{value}</p>
          <p className="text-xs text-slate-400">{row.category}</p>
        </div>
      ),
    },
    {
      key: 'instructor',
      label: 'Instructor',
      render: (value) => <span className="text-slate-200">{value}</span>,
    },
    {
      key: 'enrollees',
      label: 'Enrollees',
      render: (value) => <span className="text-white font-bold">{value}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (value) => (
        <div className="flex items-center gap-1">
          <Star size={14} className="text-amber-400" />
          <span className="text-white">{value}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge variant={value === 'active' ? 'green' : 'blue'}>{value}</Badge>,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Learning & Development
            </h1>
            <p className="text-slate-400 mt-2">Manage training programs and employee growth</p>
          </div>
          <Button onClick={() => alert('Launching course...')} className="flex items-center gap-2">
            <Plus size={20} />
            New Course
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Active Courses</p>
                <p className="text-2xl font-black text-white mt-1">
                  {courses.filter((c) => c.status === 'active').length}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Enrollments</p>
                <p className="text-2xl font-black text-blue-300 mt-1">
                  {enrollments.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Completed</p>
                <p className="text-2xl font-black text-emerald-300 mt-1">
                  {enrollments.filter((e) => e.status === 'completed').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-emerald-400" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['courses', 'enrollments'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm transition-all ${
                activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Available Courses</h3>
              <Filter size={18} className="text-slate-400" />
            </div>
            <Table columns={courseColumns} data={courses} />
          </Card>
        )}

        {/* Enrollments Tab */}
        {activeTab === 'enrollments' && (
          <Card>
            <h3 className="font-semibold text-white mb-4">Active Enrollments</h3>
            <div className="space-y-3">
              {enrollments.map((enroll) => (
                <div key={enroll.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-white">{enroll.employeeName}</p>
                      <p className="text-sm text-slate-300">{enroll.courseName}</p>
                      <p className="text-xs text-slate-400 mt-1">Enrolled: {enroll.enrolledDate}</p>
                    </div>
                    <Badge
                      variant={enroll.status === 'completed' ? 'green' : 'blue'}
                    >
                      {enroll.status}
                    </Badge>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-blue-400 h-full transition-all"
                      style={{ width: `${enroll.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-300 mt-2">{enroll.progress}% Complete</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Learning;
