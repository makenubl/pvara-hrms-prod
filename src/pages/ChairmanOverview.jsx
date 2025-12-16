import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import employeeService from '../services/employeeService';
import projectService from '../services/projectService';
import taskService from '../services/taskService';
import { format } from 'date-fns';
import {
  Building2,
  Users,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ChairmanOverview = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [date, setDate] = useState(new Date());
  const [projectFilter, setProjectFilter] = useState('all');
  const [projectSort, setProjectSort] = useState('progress');
  const [selectedProject, setSelectedProject] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all');
  const [taskSort, setTaskSort] = useState('deadline');
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    department: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    budget: { allocated: 0, spent: 0, currency: 'PKR' }
  });

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, projs, tsks] = await Promise.all([
        employeeService.getAll(),
        projectService.getAll().catch(() => []),
        taskService.getAll().catch(() => []),
      ]);
      setEmployees(emps || []);
      setProjects(projs || []);
      setTasks(tsks || []);
    } catch (err) {
      console.error('ChairmanOverview: data load error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await projectService.create(newProject);
      toast.success('Project created successfully!');
      setShowAddProject(false);
      setNewProject({
        name: '',
        description: '',
        department: '',
        startDate: '',
        endDate: '',
        priority: 'medium',
        budget: { allocated: 0, spent: 0, currency: 'PKR' }
      });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to create project');
    }
  };

  // ===== CALCULATIONS =====
  const projectHealth = {
    total: projects.length,
    onTrack: projects.filter(p => p.status === 'on-track').length,
    atRisk: projects.filter(p => p.status === 'at-risk' || p.status === 'delayed').length,
    completed: projects.filter(p => p.status === 'completed').length,
    planning: projects.filter(p => p.status === 'planning').length,
  };
  
  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
    : 0;
  
  const totalBudgetAllocated = projects.reduce((sum, p) => sum + (p.budget?.allocated || 0), 0);
  const totalBudgetSpent = projects.reduce((sum, p) => sum + (p.budget?.spent || 0), 0);
  const budgetUtilization = totalBudgetAllocated > 0 
    ? Math.round((totalBudgetSpent / totalBudgetAllocated) * 100)
    : 0;

  // Task calculations
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length,
  };

  // ===== FILTER & SORT =====
  const filteredProjects = projects.filter(p => {
    if (projectFilter === 'all') return true;
    if (projectFilter === 'on-track') return p.status === 'on-track';
    if (projectFilter === 'at-risk') return p.status === 'at-risk' || p.status === 'delayed';
    if (projectFilter === 'completed') return p.status === 'completed';
    return true;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (projectSort === 'progress') return (b.progress || 0) - (a.progress || 0);
    if (projectSort === 'deadline') return new Date(a.endDate) - new Date(b.endDate);
    return 0;
  });

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'all') return true;
    return t.status === taskFilter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (taskSort === 'deadline') return new Date(a.deadline) - new Date(b.deadline);
    if (taskSort === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    }
    return 0;
  });

  // ===== EMPLOYEE-LEVEL DATA =====
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  const deptSummary = departments.map(dept => {
    const deptEmps = employees.filter(e => e.department === dept);
    const active = deptEmps.filter(e => e.status === 'active').length;
    const onLeave = deptEmps.filter(e => e.status === 'on_leave').length;
    const suspended = deptEmps.filter(e => e.status === 'suspended').length;
    const healthScore = deptEmps.length > 0 ? Math.round((active / deptEmps.length) * 100) : 0;
    return {
      dept,
      employees: deptEmps.length,
      active,
      onLeave,
      suspended,
      healthScore,
      healthStatus: healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : 'warning',
    };
  }).sort((a, b) => b.employees - a.employees);

  const getStatusColor = (status) => {
    switch(status) {
      case 'on-track': return 'success';
      case 'at-risk': case 'delayed': return 'warning';
      case 'completed': return 'default';
      case 'blocked': return 'danger';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'default';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 pb-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Executive Dashboard
            </h1>
            <p className="text-slate-400 mt-2">{format(date, 'EEEE, MMMM d, yyyy • h:mm:ss a')}</p>
          </div>
          <Button 
            onClick={() => setShowAddProject(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            <Plus className="mr-2" size={18} />
            New Project
          </Button>
        </div>

        {/* ===== LEVEL 1: PROJECTS & MILESTONES ===== */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Rocket size={28} className="text-cyan-400" /> Projects & Milestones
          </h2>

          {/* Project Health KPIs */}
          <Card className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Total Projects</p>
                <p className="text-3xl font-black text-cyan-300 mt-1">{projectHealth.total}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">On Track</p>
                <p className="text-3xl font-bold text-emerald-300 mt-1">{projectHealth.onTrack}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">At Risk</p>
                <p className="text-3xl font-bold text-amber-300 mt-1">{projectHealth.atRisk}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Avg Progress</p>
                <p className="text-3xl font-bold text-blue-300 mt-1">{avgProgress}%</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Budget Utilization</p>
                <p className="text-3xl font-bold text-purple-300 mt-1">{budgetUtilization}%</p>
              </div>
            </div>
          </Card>

          {projects.length === 0 ? (
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10 p-8 text-center">
              <Rocket size={48} className="text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-400 mb-2">No Projects Yet</h3>
              <p className="text-slate-500 mb-4">Create your first project to start tracking progress</p>
              <Button onClick={() => setShowAddProject(true)}>
                <Plus className="mr-2" size={18} />
                Create Project
              </Button>
            </Card>
          ) : (
            <>
              {/* Project Filters */}
              <div className="flex flex-col md:flex-row gap-3 mb-6 items-start md:items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setProjectFilter('all')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      projectFilter === 'all'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    All ({projects.length})
                  </button>
                  <button
                    onClick={() => setProjectFilter('on-track')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      projectFilter === 'on-track'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    On Track ({projectHealth.onTrack})
                  </button>
                  <button
                    onClick={() => setProjectFilter('at-risk')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      projectFilter === 'at-risk'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    At Risk ({projectHealth.atRisk})
                  </button>
                </div>
                <select
                  value={projectSort}
                  onChange={(e) => setProjectSort(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-700/50 text-slate-300 text-sm border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="progress">Sort by Progress</option>
                  <option value="deadline">Sort by Deadline</option>
                </select>
              </div>

              {/* Project Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {sortedProjects.map((p) => (
                  <Card
                    key={p._id}
                    className={`backdrop-blur-xl border cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                      p.status === 'on-track'
                        ? 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40'
                        : p.status === 'completed'
                        ? 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40'
                        : 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'
                    }`}
                    onClick={() => setSelectedProject(p)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">{p.name}</h3>
                        <p className="text-slate-400 text-xs mt-1">{p.department || 'No Department'}</p>
                        <p className="text-slate-500 text-sm mt-2 line-clamp-2">{p.description || 'No description'}</p>
                      </div>
                      <Badge variant={getStatusColor(p.status)}>
                        {p.status === 'on-track' ? '✓ On Track' : p.status === 'completed' ? '✓ Done' : '⚠ ' + p.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3 text-center text-xs">
                      <div>
                        <p className="text-slate-400">Progress</p>
                        <p className="text-cyan-300 font-bold">{p.progress || 0}%</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Team</p>
                        <p className="text-blue-300 font-bold">{p.team?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Budget</p>
                        <p className="text-purple-300 font-bold">
                          {p.budget?.allocated > 0 ? Math.round((p.budget.spent / p.budget.allocated) * 100) : 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Blockers</p>
                        <p className={`font-bold ${(p.blockers || 0) > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                          {p.blockers || 0}
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all ${
                          p.status === 'on-track' || p.status === 'completed'
                            ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                            : 'bg-gradient-to-r from-amber-400 to-orange-400'
                        }`}
                        style={{ width: `${p.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-slate-400 text-xs">
                      📅 {p.startDate ? format(new Date(p.startDate), 'MMM dd') : 'TBD'} → {p.endDate ? format(new Date(p.endDate), 'MMM dd, yyyy') : 'TBD'}
                    </p>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ===== TASKS SECTION ===== */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 size={28} className="text-emerald-400" /> Team Tasks
          </h2>

          {/* Task Stats */}
          <Card className="backdrop-blur-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Total Tasks</p>
                <p className="text-3xl font-bold text-cyan-300 mt-1">{taskStats.total}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Pending</p>
                <p className="text-3xl font-bold text-slate-300 mt-1">{taskStats.pending}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">In Progress</p>
                <p className="text-3xl font-bold text-blue-300 mt-1">{taskStats.inProgress}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Completed</p>
                <p className="text-3xl font-bold text-emerald-300 mt-1">{taskStats.completed}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Blocked</p>
                <p className="text-3xl font-bold text-red-300 mt-1">{taskStats.blocked}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Overdue</p>
                <p className="text-3xl font-bold text-amber-300 mt-1">{taskStats.overdue}</p>
              </div>
            </div>
          </Card>

          {tasks.length === 0 ? (
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10 p-8 text-center">
              <Clock size={48} className="text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-400 mb-2">No Tasks Assigned</h3>
              <p className="text-slate-500">Tasks will appear here when assigned to team members</p>
            </Card>
          ) : (
            <>
              {/* Task Filters */}
              <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {['all', 'pending', 'in-progress', 'completed', 'blocked'].map(status => (
                    <button
                      key={status}
                      onClick={() => setTaskFilter(status)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        taskFilter === status
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                      }`}
                    >
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
                <select
                  value={taskSort}
                  onChange={(e) => setTaskSort(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-700/50 text-slate-300 text-sm border border-slate-600/50"
                >
                  <option value="deadline">Sort by Deadline</option>
                  <option value="priority">Sort by Priority</option>
                </select>
              </div>

              {/* Task List */}
              <div className="space-y-3">
                {sortedTasks.slice(0, 10).map((t) => (
                  <Card
                    key={t._id}
                    className={`backdrop-blur-xl border ${
                      t.status === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : t.status === 'blocked'
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-blue-500/10 border-blue-500/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="text-white font-bold">{t.title}</p>
                          <Badge variant={getPriorityColor(t.priority)}>
                            {(t.priority || 'medium').toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(t.status)}>
                            {t.status === 'in-progress' ? '⏳ In Progress' : 
                             t.status === 'blocked' ? '🚫 Blocked' : 
                             t.status === 'completed' ? '✅ Completed' : '📋 Pending'}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm mb-2">
                          Assigned to: {t.assignedTo?.firstName} {t.assignedTo?.lastName} • {t.assignedTo?.department || 'No Dept'}
                        </p>
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span>📅 Due: {t.deadline ? format(new Date(t.deadline), 'MMM dd, yyyy') : 'No deadline'}</span>
                          <span>📊 Progress: {t.progress || 0}%</span>
                        </div>
                      </div>
                      <div className="w-24">
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full ${t.status === 'completed' ? 'bg-emerald-400' : 'bg-blue-400'}`}
                            style={{ width: `${t.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ===== DEPARTMENT PERFORMANCE ===== */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Building2 size={28} className="text-blue-400" /> Department Performance
          </h2>
          {deptSummary.length === 0 ? (
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10 p-8 text-center">
              <Building2 size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No departments found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deptSummary.map((d, idx) => (
                <Card key={idx} className="backdrop-blur-xl bg-slate-900/50 border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-bold">{d.dept || 'Unassigned'}</h3>
                      <p className="text-slate-400 text-sm">{d.employees} employees</p>
                    </div>
                    <Badge variant={d.healthStatus === 'excellent' ? 'success' : d.healthStatus === 'good' ? 'default' : 'warning'}>
                      {d.healthScore}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
                    <div>
                      <p className="text-slate-400">Active</p>
                      <p className="text-emerald-300 font-bold">{d.active}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">On Leave</p>
                      <p className="text-amber-300 font-bold">{d.onLeave}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Suspended</p>
                      <p className="text-red-300 font-bold">{d.suspended}</p>
                    </div>
                  </div>

                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        d.healthStatus === 'excellent'
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                          : d.healthStatus === 'good'
                          ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                          : 'bg-gradient-to-r from-amber-400 to-orange-400'
                      }`}
                      style={{ width: `${d.healthScore}%` }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* PROJECT DETAIL MODAL */}
        {selectedProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-cyan-500/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{selectedProject.name}</h2>
                  <p className="text-slate-400 text-sm mt-1">{selectedProject.department}</p>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-slate-300 mb-4">{selectedProject.description || 'No description'}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-white/10">
                <div>
                  <p className="text-slate-400 text-xs">Progress</p>
                  <p className="text-2xl font-bold text-cyan-300">{selectedProject.progress || 0}%</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Team Size</p>
                  <p className="text-2xl font-bold text-blue-300">{selectedProject.team?.length || 0}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Budget Used</p>
                  <p className="text-2xl font-bold text-purple-300">
                    {selectedProject.budget?.allocated > 0 
                      ? Math.round((selectedProject.budget.spent / selectedProject.budget.allocated) * 100)
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Blockers</p>
                  <p className={`text-2xl font-bold ${(selectedProject.blockers || 0) > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                    {selectedProject.blockers || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Timeline</p>
                  <p className="text-white">
                    {selectedProject.startDate ? format(new Date(selectedProject.startDate), 'MMM dd, yyyy') : 'TBD'} → 
                    {selectedProject.endDate ? format(new Date(selectedProject.endDate), 'MMM dd, yyyy') : 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Budget</p>
                  <p className="text-white">
                    {selectedProject.budget?.currency || 'PKR'} {((selectedProject.budget?.spent || 0) / 1000).toFixed(0)}K of {((selectedProject.budget?.allocated || 0) / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Status</p>
                  <Badge variant={getStatusColor(selectedProject.status)}>
                    {selectedProject.status || 'planning'}
                  </Badge>
                </div>
              </div>

              <Button onClick={() => setSelectedProject(null)} variant="secondary" className="w-full">
                Close
              </Button>
            </Card>
          </div>
        )}

        {/* ADD PROJECT MODAL */}
        {showAddProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg bg-slate-950 border-cyan-500/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Create New Project</h2>
                <button onClick={() => setShowAddProject(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm block mb-1">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    rows={3}
                    placeholder="Project description"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm block mb-1">Department</label>
                  <select
                    value={newProject.department}
                    onChange={(e) => setNewProject({...newProject, department: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-sm block mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm block mb-1">End Date *</label>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-sm block mb-1">Priority</label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm block mb-1">Budget (PKR)</label>
                    <input
                      type="number"
                      value={newProject.budget.allocated}
                      onChange={(e) => setNewProject({
                        ...newProject, 
                        budget: {...newProject.budget, allocated: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">Create Project</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowAddProject(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ChairmanOverview;
