import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, Download, Filter } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import employeeService from '../services/employeeService';

const Analytics = () => {
  const [dateRange, setDateRange] = useState('month');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.getAll();
      console.log('✅ Analytics: Employees loaded:', data?.length || 0);
      setEmployees(data || []);
    } catch (error) {
      console.error('❌ Analytics: Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    { label: 'Total Employees', value: employees.length, change: '+12%', icon: Users, color: 'cyan' },
    { label: 'Active Employees', value: employees.filter(e => e.status === 'active').length, change: '+8%', icon: TrendingUp, color: 'green' },
    { label: 'On Leave', value: employees.filter(e => e.status === 'on_leave').length, change: '+2', icon: Calendar, color: 'amber' },
    { label: 'Inactive', value: employees.filter(e => e.status === 'inactive').length, change: '-1', icon: BarChart3, color: 'red' },
  ];

  const departmentData = Array.from(
    new Set(employees.map(e => e.department))
  ).map(dept => ({
    dept,
    employees: employees.filter(e => e.department === dept).length,
    engagement: 8.2,
    attrition: 2.5,
  }));

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Analytics
            </h1>
            <p className="text-slate-400 mt-2">HR metrics, insights, and trends</p>
          </div>
          <Button onClick={() => alert('Exporting analytics...')} className="flex items-center gap-2">
            <Download size={20} />
            Export Report
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card>
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={18} className="text-slate-400" />
            {['week', 'month', 'quarter', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/50'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => {
            const IconComponent = metric.icon;
            return (
              <Card key={idx}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-300 text-sm">{metric.label}</p>
                    <p className="text-2xl font-black text-white mt-2">{metric.value}</p>
                    <p className="text-xs text-emerald-400 mt-2">{metric.change} vs last {dateRange}</p>
                  </div>
                  <IconComponent className={`w-8 h-8 text-${metric.color}-400`} />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Department Performance */}
        <Card>
          <h3 className="font-semibold text-white mb-4">Department Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-300">Department</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-300">Employees</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-300">Engagement</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-300">Attrition</th>
                </tr>
              </thead>
              <tbody>
                {departmentData.map((dept, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-medium">{dept.dept}</td>
                    <td className="text-right px-4 py-3 text-slate-300">{dept.employees}</td>
                    <td className="text-right px-4 py-3">
                      <span className="text-blue-300 font-semibold">{dept.engagement}</span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <span className="text-amber-300 font-semibold">{dept.attrition}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Trends */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold text-white mb-4">Hiring Trend</h3>
            <div className="space-y-3">
              {[
                { month: 'Jan', hires: 12 },
                { month: 'Feb', hires: 15 },
                { month: 'Mar', hires: 18 },
                { month: 'Apr', hires: 14 },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm w-8">{item.month}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-blue-400 h-full"
                      style={{ width: `${(item.hires / 20) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-bold w-8 text-right">{item.hires}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-white mb-4">Engagement by Level</h3>
            <div className="space-y-3">
              {[
                { level: 'Executive', score: 9.1 },
                { level: 'Senior', score: 8.5 },
                { level: 'Mid-Level', score: 8.0 },
                { level: 'Junior', score: 7.8 },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm min-w-max">{item.level}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full"
                      style={{ width: `${(item.score / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-bold w-8 text-right">{item.score}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Analytics;
