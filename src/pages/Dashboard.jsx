import React, { useState } from 'react';
import { Users, Calendar, BarChart3, DollarSign, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { handleAddEmployee, handleMarkAttendance, handleProcessPayroll, handleCreateJob } from '../utils/handlers';
import { Card, Stat, Button, Badge } from '../components/UI';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [dateRange, setDateRange] = useState('this-month');

  // Mock data
  const attendanceData = [
    { name: 'Mon', present: 85, absent: 15 },
    { name: 'Tue', present: 88, absent: 12 },
    { name: 'Wed', present: 90, absent: 10 },
    { name: 'Thu', present: 87, absent: 13 },
    { name: 'Fri', present: 92, absent: 8 },
  ];

  const performanceData = [
    { name: 'Jan', target: 100, actual: 95 },
    { name: 'Feb', target: 100, actual: 98 },
    { name: 'Mar', target: 100, actual: 102 },
    { name: 'Apr', target: 100, actual: 99 },
    { name: 'May', target: 100, actual: 105 },
  ];

  const pendingApprovals = [
    { id: 1, type: 'Leave Request', requester: 'John Doe', days: 3, status: 'pending' },
    { id: 2, type: 'Overtime', requester: 'Jane Smith', hours: 8, status: 'pending' },
    { id: 3, type: 'Expense Claim', requester: 'Bob Johnson', amount: '$450', status: 'pending' },
  ];

  const recentActivities = [
    { id: 1, action: 'New employee onboarded', employee: 'Sarah Williams', time: '2 hours ago', type: 'success' },
    { id: 2, action: 'Payroll processed', amount: '$125,000', time: '4 hours ago', type: 'success' },
    { id: 3, action: 'Performance review completed', employee: 'Michael Brown', time: '1 day ago', type: 'info' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header with gradient text */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Real-time HR metrics and activities</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 hover:border-white/30 transition-all"
          >
            <option value="this-week" className="bg-slate-900">This Week</option>
            <option value="this-month" className="bg-slate-900">This Month</option>
            <option value="this-quarter" className="bg-slate-900">This Quarter</option>
            <option value="this-year" className="bg-slate-900">This Year</option>
          </select>
        </div>

        {/* Key Metrics - Premium Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500 rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity"></div>
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400/30 to-blue-500/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-black text-white mt-1">324</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                12 this month
              </div>
            </div>
          </div>

          {/* Present Today */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500 rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity"></div>
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400/30 to-purple-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Present Today</p>
                <p className="text-3xl font-black text-white mt-1">298</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                91.9% attendance
              </div>
            </div>
          </div>

          {/* Monthly Payroll */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500 rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity"></div>
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400/30 to-pink-500/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Monthly Payroll</p>
                <p className="text-3xl font-black text-white mt-1">$125K</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-red-400">
                <ArrowDownRight className="w-4 h-4" />
                2% vs last month
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500 rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity"></div>
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400/30 to-orange-500/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Pending Approvals</p>
                <p className="text-3xl font-black text-white mt-1">7</p>
              </div>
              <p className="text-xs text-slate-300">3 leaves, 2 expenses</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Chart */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
            <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent mb-6">Weekly Attendance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(148,163,184,0.6)" />
                <YAxis stroke="rgba(148,163,184,0.6)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#e0f2fe' }}
                />
                <Legend />
                <Bar dataKey="present" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Trend */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
            <h3 className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent mb-6">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(148,163,184,0.6)" />
                <YAxis stroke="rgba(148,163,184,0.6)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#e0f2fe' }}
                />
                <Legend />
                <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                <Line type="monotone" dataKey="actual" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Approvals and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Pending Approvals</h3>
              <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/50 text-red-300 text-xs font-bold">
                {pendingApprovals.length}
              </span>
            </div>
            <div className="space-y-3">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 backdrop-blur-sm bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-xl hover:border-amber-400/50 transition-all">
                  <div>
                    <p className="font-semibold text-white">{item.type}</p>
                    <p className="text-sm text-slate-400">{item.requester}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{item.days || item.hours || item.amount}</p>
                    <span className="inline-block px-2 py-1 mt-1 text-xs font-semibold rounded bg-amber-500/30 border border-amber-400/50 text-amber-300">Pending</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-300 hover:text-cyan-200 hover:border-cyan-400/50 hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-blue-500/30 text-sm font-semibold transition-all">
              View All Approvals
            </button>
          </div>

          {/* Recent Activity */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
            <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.map((item) => (
                <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-white/10 last:border-b-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    item.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{item.action}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.employee || item.amount}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-slate-500/20 to-slate-500/10 border border-slate-400/20 text-slate-300 hover:text-slate-200 hover:border-slate-400/40 text-sm font-semibold transition-all">
              View Activity Log
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={handleAddEmployee}
              className="group relative overflow-hidden rounded-lg py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/50 hover:to-blue-500/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">Add Employee</span>
            </button>
            <button
              onClick={handleMarkAttendance}
              className="group relative overflow-hidden rounded-lg py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/50 hover:border-blue-400 hover:from-blue-500/50 hover:to-purple-500/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 to-purple-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">Mark Attendance</span>
            </button>
            <button
              onClick={handleProcessPayroll}
              className="group relative overflow-hidden rounded-lg py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 hover:border-purple-400 hover:from-purple-500/50 hover:to-pink-500/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/40 to-pink-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">Process Payroll</span>
            </button>
            <button
              onClick={handleCreateJob}
              className="group relative overflow-hidden rounded-lg py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-pink-500/30 to-red-500/30 border border-pink-400/50 hover:border-pink-400 hover:from-pink-500/50 hover:to-red-500/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/40 to-red-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">Create Job</span>
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
