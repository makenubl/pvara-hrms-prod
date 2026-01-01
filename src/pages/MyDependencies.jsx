import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import { DependencyList } from '../components/DependencyManager';
import { useAuthStore } from '../store/authStore';
import taskService from '../services/taskService';
import employeeService from '../services/employeeService';
import {
  Link2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { id: 'all', label: 'All', icon: Link2 },
  { id: 'pending', label: 'Pending', icon: Clock, color: 'yellow' },
  { id: 'acknowledged', label: 'Acknowledged', icon: CheckCircle, color: 'cyan' },
  { id: 'in-progress', label: 'In Progress', icon: Clock, color: 'blue' },
  { id: 'escalated', label: 'Escalated', icon: AlertTriangle, color: 'purple' },
  { id: 'fulfilled', label: 'Fulfilled', icon: CheckCircle, color: 'green' },
  { id: 'declined', label: 'Declined', icon: XCircle, color: 'red' },
];

const MyDependencies = () => {
  const { user, role } = useAuthStore();
  const [dependencies, setDependencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'requester', 'responder'
  const [refreshKey, setRefreshKey] = useState(0);

  const isManager = ['admin', 'chairman', 'manager', 'hr', 'director', 'executive', 'hod', 'teamlead'].includes(role);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [depsRes, empsRes] = await Promise.all([
        taskService.getMyDependencies(),
        employeeService.getAll(),
      ]);
      setDependencies(depsRes || []);
      setEmployees(empsRes || []);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      toast.error('Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  // Filter dependencies
  const filteredDependencies = dependencies.filter(dep => {
    // Status filter
    if (activeTab !== 'all' && dep.status !== activeTab) return false;
    
    // Role filter
    if (roleFilter === 'requester' && dep.myRole !== 'requester') return false;
    if (roleFilter === 'responder' && dep.myRole !== 'responder') return false;
    
    return true;
  });

  // Calculate stats
  const stats = {
    total: dependencies.length,
    pending: dependencies.filter(d => d.status === 'pending').length,
    acknowledged: dependencies.filter(d => d.status === 'acknowledged').length,
    inProgress: dependencies.filter(d => d.status === 'in-progress').length,
    escalated: dependencies.filter(d => d.status === 'escalated').length,
    fulfilled: dependencies.filter(d => d.status === 'fulfilled').length,
    declined: dependencies.filter(d => d.status === 'declined').length,
    awaiting: dependencies.filter(d => d.myRole === 'responder' && ['pending', 'acknowledged'].includes(d.status)).length,
    requested: dependencies.filter(d => d.myRole === 'requester' && !['fulfilled', 'declined'].includes(d.status)).length,
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              My Dependencies
            </h1>
            <p className="text-slate-400 mt-2">
              Track and manage dependencies on others for your tasks
            </p>
          </div>
          <Button variant="secondary" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <ArrowUpFromLine className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.requested}</p>
                <p className="text-sm text-slate-400">I Requested</p>
              </div>
            </div>
          </Card>
          
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <ArrowDownToLine className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.awaiting}</p>
                <p className="text-sm text-slate-400">Awaiting My Response</p>
              </div>
            </div>
          </Card>

          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-sm text-slate-400">Pending</p>
              </div>
            </div>
          </Card>

          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.escalated}</p>
                <p className="text-sm text-slate-400">Escalated</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">My Role:</span>
              <div className="flex gap-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'requester', label: 'Requester', icon: ArrowUpFromLine },
                  { id: 'responder', label: 'Responder', icon: ArrowDownToLine },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setRoleFilter(option.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-all ${
                      roleFilter === option.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-slate-800/50 text-slate-400 border border-transparent hover:border-white/20'
                    }`}
                  >
                    {option.icon && <option.icon className="w-4 h-4" />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-slate-400">Status:</span>
              <div className="flex gap-1 flex-wrap">
                {STATUS_TABS.map(tab => {
                  const count = tab.id === 'all' 
                    ? dependencies.length 
                    : dependencies.filter(d => d.status === tab.id).length;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-all ${
                        activeTab === tab.id
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                          : 'bg-slate-800/50 text-slate-400 border border-transparent hover:border-white/20'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? 'bg-cyan-500/30' : 'bg-slate-700'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Dependencies List */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : filteredDependencies.length > 0 ? (
            <div className="space-y-4">
              {/* Section: Awaiting My Response */}
              {roleFilter !== 'requester' && filteredDependencies.filter(d => d.myRole === 'responder' && d.status === 'pending').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                    <ArrowDownToLine className="w-5 h-5 text-purple-400" />
                    Awaiting My Response
                    <Badge variant="purple">
                      {filteredDependencies.filter(d => d.myRole === 'responder' && d.status === 'pending').length}
                    </Badge>
                  </h3>
                  <DependencyList
                    dependencies={filteredDependencies.filter(d => d.myRole === 'responder' && d.status === 'pending')}
                    onUpdate={handleRefresh}
                    employees={employees}
                  />
                </div>
              )}

              {/* Section: My Requests */}
              {roleFilter !== 'responder' && filteredDependencies.filter(d => d.myRole === 'requester').length > 0 && (
                <div className={roleFilter !== 'requester' && filteredDependencies.filter(d => d.myRole === 'responder' && d.status === 'pending').length > 0 ? 'pt-4 border-t border-white/10' : ''}>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                    <ArrowUpFromLine className="w-5 h-5 text-cyan-400" />
                    Dependencies I Requested
                    <Badge variant="blue">
                      {filteredDependencies.filter(d => d.myRole === 'requester').length}
                    </Badge>
                  </h3>
                  <DependencyList
                    dependencies={filteredDependencies.filter(d => d.myRole === 'requester')}
                    onUpdate={handleRefresh}
                    employees={employees}
                  />
                </div>
              )}

              {/* Section: Dependencies I'm Responding To (excluding pending) */}
              {roleFilter !== 'requester' && filteredDependencies.filter(d => d.myRole === 'responder' && d.status !== 'pending').length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                    <ArrowDownToLine className="w-5 h-5 text-purple-400" />
                    Dependencies I'm Handling
                    <Badge variant="gray">
                      {filteredDependencies.filter(d => d.myRole === 'responder' && d.status !== 'pending').length}
                    </Badge>
                  </h3>
                  <DependencyList
                    dependencies={filteredDependencies.filter(d => d.myRole === 'responder' && d.status !== 'pending')}
                    onUpdate={handleRefresh}
                    employees={employees}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Link2 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-semibold text-white mb-2">No Dependencies Found</h3>
              <p className="text-slate-400">
                {activeTab !== 'all' || roleFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'You have no dependencies yet. Mark dependencies on tasks to track blockers.'}
              </p>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default MyDependencies;
