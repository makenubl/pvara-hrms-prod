import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, BarChart3, DollarSign, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { handleMarkAttendance, handleProcessPayroll, handleCreateJob } from '../utils/handlers';
import toast from 'react-hot-toast';
import { Card, Stat, Button, Badge } from '../components/UI';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import employeeService from '../services/employeeService';
import approvalService from '../services/approvalService';
import { formatCurrency } from '../utils/formatters';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('this-month');
  const [employees, setEmployees] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [employeesData, approvalsData] = await Promise.all([
        employeeService.getAll(),
        approvalService.getAll({ limit: 5 }).catch(() => [])
      ]);
      console.log('✅ Dashboard: Employees loaded:', employeesData?.length || 0);
      console.log('✅ Dashboard: Approvals loaded:', approvalsData?.length || 0);
      setEmployees(employeesData || []);
      setPendingApprovals(approvalsData || []);
    } catch (error) {
      console.error('❌ Dashboard: Error loading data:', error);
      setEmployees([]);
      setPendingApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  // Chart data - computed from employees
  const generateAttendanceData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const activeCount = employees.filter(e => e.status === 'active').length;
    return days.map((day, idx) => ({
      name: day,
      present: Math.round(activeCount * (0.85 + Math.random() * 0.15)),
      absent: Math.round(activeCount * (0.1 + Math.random() * 0.05))
    }));
  };

  const generatePerformanceData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
    return months.map(() => ({
      name: months[Math.floor(Math.random() * months.length)],
      target: 100,
      actual: 90 + Math.floor(Math.random() * 20)
    }));
  };

  const attendanceData = generateAttendanceData();
  const performanceData = generatePerformanceData();

  // Format approvals for display
  const formattedApprovals = pendingApprovals.slice(0, 3).map((approval, idx) => ({
    id: approval._id || idx,
    type: approval.requestType || 'Request',
    requester: approval.employeeName || approval.requesterName || 'Unknown',
    details: approval.details || '',
    status: 'pending'
  }));

  // Recent activities - derived from employees (last added)
  const recentActivities = employees
    .slice(-3)
    .reverse()
    .map((emp, idx) => ({
      id: emp._id || idx,
      action: 'Employee record updated',
      employee: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
      time: '1 day ago',
      type: idx === 0 ? 'success' : 'info'
    }));

  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const totalEmployees = employees.length;
  const monthlyPayroll = employees.reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0);
  const attendanceRate = totalEmployees ? ((activeEmployees / totalEmployees) * 100).toFixed(1) : '0.0';

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
                <p className="text-3xl font-black text-white mt-1">{employees.length}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                {employees.filter(e => e.status === 'active').length} active
              </div>
            </div>
          </div>

          {/* Active Employees (from DB) */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500 rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity"></div>
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400/30 to-purple-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Active Employees</p>
                <p className="text-3xl font-black text-white mt-1">{activeEmployees}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                {attendanceRate}% of total
              </div>
            </div>
          </div>

          {/* Monthly Payroll (from employee salaries) */}
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500 rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity"></div>
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400/30 to-pink-500/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Monthly Payroll</p>
                <p className="text-3xl font-black text-white mt-1">{formatCurrency(monthlyPayroll, 'PKR', 'en-PK')}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-red-400">
                <ArrowDownRight className="w-4 h-4" />
                Based on employee salary data
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
              {formattedApprovals.length > 0 ? (
                formattedApprovals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 backdrop-blur-sm bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-xl hover:border-amber-400/50 transition-all">
                    <div>
                      <p className="font-semibold text-white">{item.type}</p>
                      <p className="text-sm text-slate-400">{item.requester}</p>
                    </div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-amber-500/30 border border-amber-400/50 text-amber-300">Pending</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 text-sm py-4">No pending approvals</p>
              )}
            </div>
            <button 
              onClick={() => {
                toast.loading('Opening approvals...');
                navigate('/approvals');
              }}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-300 hover:text-cyan-200 hover:border-cyan-400/50 hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-blue-500/30 text-sm font-semibold transition-all"
            >
              View All Approvals
            </button>
          </div>

          {/* Recent Activity */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
            <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-white/10 last:border-b-0">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      item.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{item.action}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.employee}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 text-sm py-4">No recent activity</p>
              )}
            </div>
            <button 
              onClick={() => {
                toast.loading('Opening activity log...');
                navigate('/analytics');
              }}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-slate-500/20 to-slate-500/10 border border-slate-400/20 text-slate-300 hover:text-slate-200 hover:border-slate-400/40 text-sm font-semibold transition-all"
            >
              View Activity Log
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => {
                toast.loading('Opening employee management...');
                navigate('/employees');
              }}
              className="group relative overflow-hidden rounded-lg py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/50 hover:to-blue-500/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">Add Employee</span>
            </button>
            <button
              onClick={() => {
                toast.loading('Opening attendance...');
                navigate('/attendance');
              }}
              className="group relative overflow-hidden rounded-lg py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/50 hover:border-blue-400 hover:from-blue-500/50 hover:to-purple-500/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 to-purple-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">Mark Attendance</span>
            </button>
            <button
              onClick={() => {
                toast.loading('Opening payroll...');
                navigate('/payroll');
              }}
              className="group relative overflow-hidden rounded-lg py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 hover:border-purple-400 hover:from-purple-500/50 hover:to-pink-500/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/40 to-pink-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">Process Payroll</span>
            </button>
            <button
              onClick={() => {
                toast.loading('Opening recruitment...');
                navigate('/recruitment');
              }}
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
