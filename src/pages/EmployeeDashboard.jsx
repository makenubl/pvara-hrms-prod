import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, DollarSign, TrendingUp, Award, BookOpen, 
  FileText, User, Bell, CheckCircle2, XCircle, AlertCircle,
  ArrowRight, Download
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock data - replace with API calls
  const employeeData = {
    name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Employee',
    employeeId: user?.employeeId || 'EMP-001',
    department: user?.department || 'Engineering',
    position: user?.position || 'Software Developer',
    email: user?.email || '',
    joinDate: user?.joinDate || '2024-01-15',
    manager: 'Sarah Johnson',
    workHours: '9:00 AM - 6:00 PM',
  };

  const stats = {
    leaveBalance: 15,
    attendance: 96.5,
    pendingRequests: 2,
    completedTasks: 24,
  };

  const todaySchedule = [
    { time: '9:00 AM', title: 'Team Stand-up', type: 'meeting', status: 'upcoming' },
    { time: '10:30 AM', title: 'Code Review', type: 'task', status: 'upcoming' },
    { time: '2:00 PM', title: 'Client Presentation', type: 'meeting', status: 'upcoming' },
    { time: '4:00 PM', title: 'Sprint Planning', type: 'meeting', status: 'upcoming' },
  ];

  const recentLeaves = [
    { id: 1, type: 'Sick Leave', dates: 'Dec 15-16, 2025', status: 'approved', days: 2 },
    { id: 2, type: 'Casual Leave', dates: 'Dec 20, 2025', status: 'pending', days: 1 },
  ];

  const payrollInfo = {
    currentMonth: 'December 2025',
    grossSalary: 75000,
    deductions: 8500,
    netSalary: 66500,
    nextPayday: '2025-12-25',
  };

  const learningProgress = [
    { course: 'Advanced React Patterns', progress: 75, dueDate: 'Dec 20' },
    { course: 'System Design Fundamentals', progress: 45, dueDate: 'Dec 30' },
    { course: 'Team Leadership Skills', progress: 90, dueDate: 'Dec 15' },
  ];

  const announcements = [
    { id: 1, title: 'Year-End Party', date: 'Dec 22, 2025', type: 'event' },
    { id: 2, title: 'Q4 Performance Reviews', date: 'Dec 28, 2025', type: 'important' },
    { id: 3, title: 'New Health Benefits', date: 'Jan 1, 2026', type: 'info' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Welcome Back, {employeeData.name.split(' ')[0]}!
            </h1>
            <p className="text-slate-400 mt-2">
              {format(currentTime, 'EEEE, MMMM d, yyyy • h:mm:ss a')}
            </p>
          </div>
          <Button
            onClick={() => {/* Mark attendance */}}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Clock className="mr-2" size={18} />
            Clock In
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
          <Card className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Leave Balance</p>
                <p className="text-3xl font-black text-white mt-1">{stats.leaveBalance}</p>
                <p className="text-cyan-400 text-xs mt-1">days remaining</p>
              </div>
              <Calendar className="text-cyan-400" size={40} />
            </div>
          </Card>

          <Card className="backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Attendance</p>
                <p className="text-3xl font-black text-white mt-1">{stats.attendance}%</p>
                <p className="text-green-400 text-xs mt-1">this month</p>
              </div>
              <CheckCircle2 className="text-green-400" size={40} />
            </div>
          </Card>

          <Card className="backdrop-blur-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending Requests</p>
                <p className="text-3xl font-black text-white mt-1">{stats.pendingRequests}</p>
                <p className="text-orange-400 text-xs mt-1">awaiting approval</p>
              </div>
              <AlertCircle className="text-orange-400" size={40} />
            </div>
          </Card>

          <Card className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Tasks Completed</p>
                <p className="text-3xl font-black text-white mt-1">{stats.completedTasks}</p>
                <p className="text-purple-400 text-xs mt-1">this week</p>
              </div>
              <Award className="text-purple-400" size={40} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Today's Schedule & Leaves */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Schedule */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Today's Schedule</h2>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
              <div className="space-y-3">
                {todaySchedule.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                  >
                    <div className="text-cyan-400 font-semibold min-w-[80px]">
                      {item.time}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.title}</p>
                      <p className="text-slate-400 text-sm capitalize">{item.type}</p>
                    </div>
                    <Badge variant={item.status === 'completed' ? 'success' : 'default'}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Leave Requests */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Leave Requests</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/leaves')}
                >
                  Apply Leave
                </Button>
              </div>
              <div className="space-y-3">
                {recentLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{leave.type}</p>
                      <p className="text-slate-400 text-sm">{leave.dates}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-sm">{leave.days} day{leave.days > 1 ? 's' : ''}</span>
                      <Badge
                        variant={
                          leave.status === 'approved'
                            ? 'success'
                            : leave.status === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {leave.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Payroll Info */}
            <Card className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <DollarSign size={24} className="text-blue-400" />
                  Payroll Summary
                </h2>
                <Button variant="ghost" size="sm">
                  <Download size={16} className="mr-2" />
                  Download Slip
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Gross Salary</span>
                  <span className="text-white font-bold">{formatCurrency(payrollInfo.grossSalary)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Deductions</span>
                  <span className="text-red-400 font-bold">-{formatCurrency(payrollInfo.deductions)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                  <span className="text-white font-semibold">Net Salary</span>
                  <span className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {formatCurrency(payrollInfo.netSalary)}
                  </span>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-blue-400 text-sm">
                    Next payday: <span className="font-semibold">{format(new Date(payrollInfo.nextPayday), 'MMM dd, yyyy')}</span>
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Profile, Learning, Announcements */}
          <div className="space-y-6">
            {/* Employee Profile Card */}
            <Card className="backdrop-blur-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-white/10">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-2xl font-bold mb-4">
                  {employeeData.name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold text-white">{employeeData.name}</h3>
                <p className="text-cyan-400 text-sm">{employeeData.position}</p>
                <p className="text-slate-400 text-xs mt-1">{employeeData.employeeId}</p>
              </div>
              <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Department</span>
                  <span className="text-white">{employeeData.department}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Manager</span>
                  <span className="text-white">{employeeData.manager}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Work Hours</span>
                  <span className="text-white">{employeeData.workHours}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Join Date</span>
                  <span className="text-white">{format(new Date(employeeData.joinDate), 'MMM dd, yyyy')}</span>
                </div>
              </div>
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="w-full mt-4"
              >
                <User size={16} className="mr-2" />
                Edit Profile
              </Button>
            </Card>

            {/* Learning Progress */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen size={20} className="text-purple-400" />
                  Learning Progress
                </h2>
              </div>
              <div className="space-y-4">
                {learningProgress.map((course, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white font-medium">{course.course}</span>
                      <span className="text-slate-400">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Due: {course.dueDate}</p>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => navigate('/learning')}
                variant="ghost"
                className="w-full mt-4"
              >
                View All Courses
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Card>

            {/* Announcements */}
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell size={20} className="text-yellow-400" />
                  Announcements
                </h2>
              </div>
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                  >
                    <p className="text-white font-medium text-sm">{announcement.title}</p>
                    <p className="text-slate-400 text-xs mt-1">{announcement.date}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeDashboard;
