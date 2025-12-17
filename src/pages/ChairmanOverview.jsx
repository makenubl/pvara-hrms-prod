import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import employeeService from '../services/employeeService';
import projectService from '../services/projectService';
import taskService from '../services/taskService';
import api from '../services/api';
import { format, startOfWeek, endOfWeek, isWithinInterval, differenceInDays } from 'date-fns';
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
  Target,
  AlertCircle,
  Calendar,
  Flag,
  ChevronRight,
  Star,
  Zap,
  Shield,
  ArrowRight,
  Edit2,
  Trash2,
  Eye,
  MessageSquare,
  Award,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ChairmanOverview = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [date, setDate] = useState(new Date());
  
  // Modal states
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddHighlight, setShowAddHighlight] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');
  
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    department: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    status: 'planning',
    budget: { allocated: 0, spent: 0, currency: 'PKR' },
    milestones: []
  });

  const [newHighlight, setNewHighlight] = useState({
    type: 'achievement',
    title: '',
    description: '',
    department: '',
    priority: 'medium',
    dueDate: '',
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
      
      // Load highlights from API or use mock data
      try {
        const highlightsRes = await api.get('/api/highlights');
        setHighlights(highlightsRes.data || []);
      } catch {
        // Mock highlights for demo
        setHighlights([
          {
            _id: '1',
            type: 'achievement',
            title: 'VASP Licensing Framework Approved',
            description: 'Successfully completed the regulatory framework for Virtual Asset Service Providers licensing',
            department: 'Team Licensing & Regulation',
            date: new Date().toISOString(),
          },
          {
            _id: '2',
            type: 'showstopper',
            title: 'Budget Approval Pending for IT Infrastructure',
            description: 'Requires Chairperson approval for PKR 15M IT infrastructure upgrade',
            department: 'IT & Software Functions',
            priority: 'critical',
            date: new Date().toISOString(),
          },
          {
            _id: '3',
            type: 'milestone',
            title: 'International Coordination Meeting - Dec 25',
            description: 'FATF compliance review meeting scheduled with international partners',
            department: 'International Coordination',
            dueDate: '2025-12-25',
            date: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('ChairmanOverview: data load error', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== WEEK CALCULATIONS =====
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());

  const weekAchievements = highlights.filter(h => 
    h.type === 'achievement' && 
    isWithinInterval(new Date(h.date), { start: weekStart, end: weekEnd })
  );

  const upcomingMilestones = projects
    .flatMap(p => (p.milestones || []).map(m => ({ ...m, projectName: p.name, projectId: p._id })))
    .filter(m => !m.completed && new Date(m.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Add milestone type highlights
  const milestoneHighlights = highlights.filter(h => h.type === 'milestone' && h.dueDate);
  const allMilestones = [
    ...upcomingMilestones,
    ...milestoneHighlights.map(h => ({ name: h.title, dueDate: h.dueDate, projectName: h.department }))
  ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);

  const showstoppers = highlights.filter(h => h.type === 'showstopper' || h.priority === 'critical');
  const supportNeeded = highlights.filter(h => h.type === 'support-needed');

  // ===== DEPARTMENT CALCULATIONS =====
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  
  const deptData = departments.map(dept => {
    const deptEmps = employees.filter(e => e.department === dept);
    const deptProjects = projects.filter(p => p.department === dept);
    const deptTasks = tasks.filter(t => deptEmps.some(e => e._id === t.assignedTo));
    const deptHighlights = highlights.filter(h => h.department === dept);
    
    const completedTasks = deptTasks.filter(t => t.status === 'completed').length;
    const totalTasks = deptTasks.length;
    const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const blockedTasks = deptTasks.filter(t => t.status === 'blocked').length;
    const overdueTasks = deptTasks.filter(t => 
      new Date(t.deadline) < new Date() && t.status !== 'completed'
    ).length;
    
    const needsSupport = deptHighlights.filter(h => 
      h.type === 'showstopper' || h.type === 'support-needed'
    );
    
    return {
      name: dept,
      employees: deptEmps.length,
      projects: deptProjects.length,
      tasks: totalTasks,
      completedTasks,
      productivity,
      blockedTasks,
      overdueTasks,
      needsSupport,
      status: blockedTasks > 0 || overdueTasks > 2 ? 'needs-attention' : 
              productivity < 50 ? 'warning' : 'healthy',
    };
  }).sort((a, b) => b.needsSupport.length - a.needsSupport.length || b.employees - a.employees);

  // Filter departments that need support
  const deptsNeedingSupport = deptData.filter(d => d.needsSupport.length > 0 || d.status === 'needs-attention');

  // ===== PROJECT CALCULATIONS =====
  const projectStats = {
    total: projects.length,
    onTrack: projects.filter(p => p.status === 'on-track').length,
    atRisk: projects.filter(p => p.status === 'at-risk' || p.status === 'delayed').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  // ===== TASK CALCULATIONS =====
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length,
  };

  // ===== HANDLERS =====
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await projectService.create(newProject);
      toast.success('Project created successfully!');
      setShowAddProject(false);
      setNewProject({
        name: '', description: '', department: '', startDate: '', endDate: '',
        priority: 'medium', status: 'planning',
        budget: { allocated: 0, spent: 0, currency: 'PKR' }, milestones: []
      });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to create project');
    }
  };

  const handleCreateHighlight = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/highlights', newHighlight);
      toast.success('Highlight added!');
      setShowAddHighlight(false);
      setNewHighlight({ type: 'achievement', title: '', description: '', department: '', priority: 'medium', dueDate: '' });
      loadData();
    } catch {
      // Add to local state as fallback
      setHighlights([...highlights, { ...newHighlight, _id: Date.now().toString(), date: new Date().toISOString() }]);
      toast.success('Highlight added!');
      setShowAddHighlight(false);
      setNewHighlight({ type: 'achievement', title: '', description: '', department: '', priority: 'medium', dueDate: '' });
    }
  };

  const deleteHighlight = (id) => {
    setHighlights(highlights.filter(h => h._id !== id));
    toast.success('Highlight removed');
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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
        {/* ===== HEADER ===== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Chairman's Dashboard
            </h1>
            <p className="text-slate-400 mt-2">{format(date, 'EEEE, MMMM d, yyyy • h:mm:ss a')}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowAddHighlight(true)}
              variant="outline"
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
            >
              <Star className="mr-2" size={18} />
              Add Highlight
            </Button>
            <Button 
              onClick={() => setShowAddProject(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              <Plus className="mr-2" size={18} />
              New Project
            </Button>
          </div>
        </div>

        {/* ===== LEVEL 1: EXECUTIVE SUMMARY (Top Priority) ===== */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="text-amber-400" size={24} />
            Executive Summary - This Week
          </h2>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Achievements This Week */}
            <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-400" size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Achievements</h3>
                  <p className="text-emerald-400 text-sm">This Week</p>
                </div>
                <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">
                  {weekAchievements.length}
                </span>
              </div>
              <div className="space-y-3 max-h-52 overflow-y-auto">
                {weekAchievements.length > 0 ? weekAchievements.map((a, i) => (
                  <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-emerald-500/20 group relative">
                    <button 
                      onClick={() => deleteHighlight(a._id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    >
                      <X size={14} className="text-red-400" />
                    </button>
                    <p className="text-white font-medium text-sm pr-6">{a.title}</p>
                    <p className="text-slate-400 text-xs mt-1">{a.department}</p>
                  </div>
                )) : (
                  <div className="p-4 text-center">
                    <p className="text-slate-500 text-sm mb-2">No achievements logged this week</p>
                    <button 
                      onClick={() => { setNewHighlight({ ...newHighlight, type: 'achievement' }); setShowAddHighlight(true); }}
                      className="text-emerald-400 text-xs hover:underline"
                    >
                      + Add Achievement
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Upcoming Milestones */}
            <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border-blue-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                  <Target className="text-blue-400" size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Next Milestones</h3>
                  <p className="text-blue-400 text-sm">Upcoming Deadlines</p>
                </div>
              </div>
              <div className="space-y-3 max-h-52 overflow-y-auto">
                {allMilestones.length > 0 ? allMilestones.map((m, i) => (
                  <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-blue-500/20">
                    <div className="flex justify-between items-start">
                      <p className="text-white font-medium text-sm">{m.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        differenceInDays(new Date(m.dueDate), new Date()) <= 3 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {differenceInDays(new Date(m.dueDate), new Date())}d
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{m.projectName}</p>
                    <p className="text-slate-500 text-xs">{format(new Date(m.dueDate), 'MMM d, yyyy')}</p>
                  </div>
                )) : (
                  <div className="p-4 text-center">
                    <p className="text-slate-500 text-sm mb-2">No upcoming milestones</p>
                    <button 
                      onClick={() => { setNewHighlight({ ...newHighlight, type: 'milestone' }); setShowAddHighlight(true); }}
                      className="text-blue-400 text-xs hover:underline"
                    >
                      + Add Milestone
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Showstoppers - Need Chairperson Support */}
            <Card className="bg-gradient-to-br from-red-500/20 to-rose-500/10 border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 bg-red-500/30 rounded-xl flex items-center justify-center ${showstoppers.length > 0 ? 'animate-pulse' : ''}`}>
                  <AlertTriangle className="text-red-400" size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Showstoppers</h3>
                  <p className="text-red-400 text-sm">Needs Your Support</p>
                </div>
                {showstoppers.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    {showstoppers.length}
                  </span>
                )}
              </div>
              <div className="space-y-3 max-h-52 overflow-y-auto">
                {showstoppers.length > 0 ? showstoppers.map((s, i) => (
                  <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-red-500/30 group relative">
                    <button 
                      onClick={() => deleteHighlight(s._id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    >
                      <X size={14} className="text-red-400" />
                    </button>
                    <p className="text-white font-medium text-sm pr-6">{s.title}</p>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{s.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-red-400 text-xs">{s.department}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(s.priority)}`}>
                        {s.priority || 'high'}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="p-4 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
                    <p className="text-emerald-400 text-sm">All clear! No showstoppers</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </section>

        {/* ===== LEVEL 2: DEPARTMENT-WISE SUPPORT REQUIRED ===== */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Building2 className="text-cyan-400" size={24} />
            Department-wise Support Required
          </h2>

          {deptsNeedingSupport.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {deptsNeedingSupport.map((dept, idx) => (
                <Card 
                  key={idx}
                  className="bg-gradient-to-br from-amber-500/10 to-slate-900/50 border-amber-500/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <Shield className="text-amber-400" size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{dept.name}</h3>
                        <p className="text-slate-400 text-xs">{dept.employees} employees</p>
                      </div>
                    </div>
                    {dept.status === 'needs-attention' && (
                      <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded border border-red-500/30">
                        Urgent
                      </span>
                    )}
                  </div>

                  {/* Support items */}
                  <div className="space-y-2">
                    {dept.needsSupport.map((item, i) => (
                      <div key={i} className="p-2 bg-slate-900/50 rounded-lg border border-amber-500/20">
                        <p className="text-white text-xs font-medium">{item.title}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1">{item.description}</p>
                      </div>
                    ))}
                    {dept.blockedTasks > 0 && (
                      <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-red-400 text-xs">⚠️ {dept.blockedTasks} blocked task(s)</p>
                      </div>
                    )}
                    {dept.overdueTasks > 0 && (
                      <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <p className="text-amber-400 text-xs">⏰ {dept.overdueTasks} overdue task(s)</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-900/30 border-slate-700/50 p-6 text-center mb-6">
              <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={40} />
              <p className="text-emerald-400 font-medium">All Departments Operating Smoothly</p>
              <p className="text-slate-500 text-sm mt-1">No departments currently require support</p>
            </Card>
          )}

          {/* All Departments Overview */}
          <h3 className="text-lg font-semibold text-slate-300 mb-3">All Departments Status</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {deptData.map((dept, idx) => (
              <Card 
                key={idx}
                className={`transition-all hover:scale-[1.02] ${
                  dept.status === 'needs-attention' 
                    ? 'bg-red-500/5 border-red-500/20' 
                    : dept.status === 'warning'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-slate-900/30 border-slate-700/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white text-sm truncate">{dept.name}</h4>
                  <span className={`w-2 h-2 rounded-full ${
                    dept.status === 'healthy' ? 'bg-emerald-500' :
                    dept.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{dept.employees} staff</span>
                  <span className="text-slate-400">{dept.projects} projects</span>
                  <span className={`font-medium ${
                    dept.productivity >= 70 ? 'text-emerald-400' :
                    dept.productivity >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>{dept.productivity}%</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ===== LEVEL 3: DETAILED VIEW (Projects, Tasks, Team) ===== */}
        <section>
          {/* Tab Navigation */}
          <div className="flex items-center gap-4 mb-4 border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('projects')}
              className={`pb-3 px-1 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'projects'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <Rocket className="inline mr-2" size={16} />
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 px-1 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'tasks'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <CheckCircle2 className="inline mr-2" size={16} />
              All Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`pb-3 px-1 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'team'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <Users className="inline mr-2" size={16} />
              Team ({employees.length})
            </button>
          </div>

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-3xl font-black text-cyan-400">{projectStats.total}</p>
                  <p className="text-slate-400 text-sm">Total Projects</p>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-3xl font-black text-emerald-400">{projectStats.onTrack}</p>
                  <p className="text-slate-400 text-sm">On Track</p>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-3xl font-black text-amber-400">{projectStats.atRisk}</p>
                  <p className="text-slate-400 text-sm">At Risk</p>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-3xl font-black text-purple-400">{projectStats.completed}</p>
                  <p className="text-slate-400 text-sm">Completed</p>
                </Card>
              </div>

              {/* Project List */}
              <div className="bg-slate-900/30 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50">
                      <tr className="text-left text-xs text-slate-400 uppercase">
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Progress</th>
                        <th className="px-4 py-3">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {projects.map((project) => (
                        <tr key={project._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">{project.name}</p>
                            <p className="text-slate-500 text-xs">{project.description?.substring(0, 40)}...</p>
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{project.department}</td>
                          <td className="px-4 py-3">
                            <Badge variant={
                              project.status === 'on-track' ? 'success' :
                              project.status === 'at-risk' || project.status === 'delayed' ? 'warning' :
                              project.status === 'completed' ? 'default' : 'default'
                            }>
                              {project.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-cyan-500 rounded-full"
                                  style={{ width: `${project.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-slate-400 text-xs">{project.progress || 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            {project.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {projects.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No projects yet. Click "New Project" to create one.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Task Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-2xl font-black text-cyan-400">{taskStats.total}</p>
                  <p className="text-slate-400 text-sm">Total</p>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-2xl font-black text-emerald-400">{taskStats.completed}</p>
                  <p className="text-slate-400 text-sm">Completed</p>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-2xl font-black text-blue-400">{taskStats.inProgress}</p>
                  <p className="text-slate-400 text-sm">In Progress</p>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-2xl font-black text-red-400">{taskStats.blocked}</p>
                  <p className="text-slate-400 text-sm">Blocked</p>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/50 p-4">
                  <p className="text-2xl font-black text-amber-400">{taskStats.overdue}</p>
                  <p className="text-slate-400 text-sm">Overdue</p>
                </Card>
              </div>

              {/* Task List */}
              <div className="bg-slate-900/30 rounded-xl border border-slate-700/50 divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
                {tasks.slice(0, 20).map((task) => {
                  const assignee = employees.find(e => e._id === task.assignedTo);
                  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
                  return (
                    <div key={task._id} className={`p-4 hover:bg-slate-800/30 transition-colors ${isOverdue ? 'bg-red-500/5' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{task.title}</p>
                            {isOverdue && <span className="text-red-400 text-xs">⏰ Overdue</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned'}</span>
                            <span>•</span>
                            <span>{task.deadline ? format(new Date(task.deadline), 'MMM d') : 'No deadline'}</span>
                          </div>
                        </div>
                        <Badge variant={
                          task.status === 'completed' ? 'success' :
                          task.status === 'in-progress' ? 'default' :
                          task.status === 'blocked' ? 'danger' : 'warning'
                        }>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No tasks found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {employees.slice(0, 16).map((emp) => {
                  const empTasks = tasks.filter(t => t.assignedTo === emp._id);
                  const completed = empTasks.filter(t => t.status === 'completed').length;
                  const blocked = empTasks.filter(t => t.status === 'blocked').length;
                  return (
                    <Card key={emp._id} className={`bg-slate-900/50 border-slate-700/50 ${blocked > 0 ? 'border-red-500/30' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-slate-400 text-xs truncate">{emp.department}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-400">{empTasks.length} tasks</span>
                        <span className="text-emerald-400">{completed} done</span>
                        {blocked > 0 && <span className="text-red-400">{blocked} blocked</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ===== ADD PROJECT MODAL ===== */}
        {showAddProject && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900">
                <h2 className="text-xl font-bold text-white">Create New Project</h2>
                <button onClick={() => setShowAddProject(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g., VASP Licensing Portal"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none focus:ring-2 focus:ring-cyan-500"
                    rows={3}
                    placeholder="Brief description of the project objectives..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Department *</label>
                    <select
                      value={newProject.department}
                      onChange={(e) => setNewProject({ ...newProject, department: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddProject(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600">
                    Create Project
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== ADD HIGHLIGHT MODAL ===== */}
        {showAddHighlight && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add Highlight for Chairman</h2>
                <button onClick={() => setShowAddHighlight(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateHighlight} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Highlight Type</label>
                  <select
                    value={newHighlight.type}
                    onChange={(e) => setNewHighlight({ ...newHighlight, type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="achievement">✅ Achievement (What we accomplished)</option>
                    <option value="milestone">🎯 Upcoming Milestone (Key deadline)</option>
                    <option value="showstopper">🚨 Showstopper (Needs Chairman's support)</option>
                    <option value="support-needed">🛡️ Support Needed (Department request)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                  <input
                    type="text"
                    value={newHighlight.title}
                    onChange={(e) => setNewHighlight({ ...newHighlight, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder={
                      newHighlight.type === 'achievement' ? 'e.g., VASP Framework Completed' :
                      newHighlight.type === 'milestone' ? 'e.g., FATF Review Meeting' :
                      newHighlight.type === 'showstopper' ? 'e.g., Budget Approval Pending' :
                      'e.g., Additional Manpower Required'
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    value={newHighlight.description}
                    onChange={(e) => setNewHighlight({ ...newHighlight, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                    rows={3}
                    placeholder="Provide more details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
                    <select
                      value={newHighlight.department}
                      onChange={(e) => setNewHighlight({ ...newHighlight, department: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                    <select
                      value={newHighlight.priority}
                      onChange={(e) => setNewHighlight({ ...newHighlight, priority: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical - Urgent</option>
                    </select>
                  </div>
                </div>
                {(newHighlight.type === 'milestone') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newHighlight.dueDate}
                      onChange={(e) => setNewHighlight({ ...newHighlight, dueDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddHighlight(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600">
                    Add Highlight
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ChairmanOverview;
