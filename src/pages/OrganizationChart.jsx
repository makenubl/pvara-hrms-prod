import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronRight, Building2, Mail, Phone } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Badge } from '../components/UI';
import employeeService from '../services/employeeService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const OrganizationChart = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const { user } = useAuthStore();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeService.getAll();
      setEmployees(data || []);
      // Auto-expand first level
      const topLevelIds = data.filter(emp => !emp.reportsTo).map(emp => emp._id);
      setExpandedNodes(new Set(topLevelIds));
    } catch (error) {
      toast.error('Failed to load organization structure');
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Build hierarchy: find all employees reporting to a given supervisor
  const getSubordinates = (supervisorId) => {
    return employees.filter(emp => {
      const reportsToId = emp.reportsTo?._id || emp.reportsTo;
      return reportsToId === supervisorId;
    });
  };

  // Get top-level employees (those who don't report to anyone)
  const getTopLevelEmployees = () => {
    return employees.filter(emp => !emp.reportsTo);
  };

  const roleColors = {
    admin: 'purple',
    hr: 'blue',
    manager: 'cyan',
    employee: 'green',
  };

  const renderEmployeeNode = (employee, level = 0) => {
    const subordinates = getSubordinates(employee._id);
    const hasSubordinates = subordinates.length > 0;
    const isExpanded = expandedNodes.has(employee._id);
    const isCurrentUser = employee._id === user._id;

    return (
      <div key={employee._id} className="mb-2">
        <div
          className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
            isCurrentUser
              ? 'bg-cyan-500/20 border-cyan-500/50 ring-2 ring-cyan-500/30'
              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
          style={{ marginLeft: `${level * 40}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasSubordinates ? (
            <button
              onClick={() => toggleExpand(employee._id)}
              className="flex-shrink-0 p-1 hover:bg-cyan-500/20 rounded transition-all"
            >
              {isExpanded ? (
                <ChevronDown size={20} className="text-cyan-400" />
              ) : (
                <ChevronRight size={20} className="text-cyan-400" />
              )}
            </button>
          ) : (
            <div className="w-7" />
          )}

          {/* Employee Avatar */}
          <img
            src={employee.avatar || `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=0D8ABC&color=fff`}
            alt={`${employee.firstName} ${employee.lastName}`}
            className="w-12 h-12 rounded-full border-2 border-white/20"
          />

          {/* Employee Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white">
                {employee.firstName} {employee.lastName}
                {isCurrentUser && <span className="text-cyan-400 ml-2">(You)</span>}
              </h3>
              <Badge variant={roleColors[employee.role] || 'gray'}>
                {employee.role}
              </Badge>
            </div>

            <p className="text-sm text-slate-400 mb-2">
              {employee.position?.title || 'No Position'} • {employee.department || 'No Department'}
            </p>

            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Mail size={12} />
                {employee.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} />
                  {employee.phone}
                </span>
              )}
              {hasSubordinates && (
                <span className="flex items-center gap-1 text-cyan-400">
                  <Users size={12} />
                  {subordinates.length} direct report{subordinates.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Show supervisor info for current user */}
            {isCurrentUser && employee.reportsTo && (
              <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                <p className="text-xs text-purple-300">
                  Reports to: {employee.reportsTo.firstName} {employee.reportsTo.lastName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Render subordinates */}
        {isExpanded && hasSubordinates && (
          <div className="mt-1">
            {subordinates.map(subordinate => renderEmployeeNode(subordinate, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const topLevelEmployees = getTopLevelEmployees();
  const totalEmployees = employees.length;
  const managersCount = employees.filter(emp => emp.role === 'manager' || emp.role === 'admin').length;

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Organization Structure
            </h1>
            <p className="text-slate-400 mt-2">View the company's reporting hierarchy</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Employees</p>
                <p className="text-2xl font-bold text-white">{totalEmployees}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Building2 className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Leaders</p>
                <p className="text-2xl font-bold text-white">{managersCount}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-cyan-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <Users className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Top Level</p>
                <p className="text-2xl font-bold text-white">{topLevelEmployees.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Organization Tree */}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-2">Reporting Hierarchy</h2>
            <p className="text-sm text-slate-400">
              Click on nodes with subordinates to expand or collapse the tree
              {user?.role === 'employee' && ' • Your position is highlighted in cyan'}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="mx-auto mb-4 animate-pulse" size={48} />
              <p>Loading organization structure...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Building2 className="mx-auto mb-4" size={48} />
              <p>No employees found</p>
            </div>
          ) : topLevelEmployees.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Building2 className="mx-auto mb-4" size={48} />
              <p>No top-level employees found. All employees report to someone.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topLevelEmployees.map(employee => renderEmployeeNode(employee, 0))}
            </div>
          )}
        </Card>

        {/* Legend */}
        <Card className="bg-slate-800/50">
          <h3 className="text-sm font-semibold text-white mb-3">Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="purple">Admin</Badge>
              <span className="text-slate-400">System Administrator</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="blue">HR</Badge>
              <span className="text-slate-400">Human Resources</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="cyan">Manager</Badge>
              <span className="text-slate-400">Team Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="green">Employee</Badge>
              <span className="text-slate-400">Staff Member</span>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default OrganizationChart;
