import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import html2canvas from 'html2canvas';
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
  Download,
  Image,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ChairmanOverview = () => {
  const { user: _user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [date, setDate] = useState(new Date());
  
  // Modal states
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddHighlight, setShowAddHighlight] = useState(false);
  const [showEditHighlight, setShowEditHighlight] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState(null);
  const [_selectedProject, _setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [chairmanComment, setChairmanComment] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', message: '', priority: 'medium' });
  const [_announcements, _setAnnouncements] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [exporting, setExporting] = useState(false);
  
  // Ref for dashboard export
  const dashboardRef = useRef(null);

  // Export dashboard as image
  const exportDashboard = async (imageFormat = 'png') => {
    if (!dashboardRef.current) return;
    
    setExporting(true);
    toast.loading(`Generating ${imageFormat.toUpperCase()} image...`, { id: 'export' });
    
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#0f172a', // slate-900
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight,
      });
      
      const mimeType = imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const extension = imageFormat === 'jpeg' ? 'jpg' : 'png';
      const quality = imageFormat === 'jpeg' ? 0.95 : undefined;
      
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
      const link = document.createElement('a');
      link.download = `Chairman-Dashboard-${timestamp}.${extension}`;
      link.href = canvas.toDataURL(mimeType, quality);
      link.click();
      
      toast.success(`Dashboard exported as ${imageFormat.toUpperCase()}!`, { id: 'export' });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export dashboard', { id: 'export' });
    } finally {
      setExporting(false);
    }
  };
  
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
        taskService.getAll({ all: true }).catch(() => []),
      ]);
      setEmployees(emps || []);
      setProjects(projs || []);
      setTasks(tsks || []);
      
      // Load highlights from API or use mock data
      try {
        const highlightsRes = await api.get('/highlights');
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

  // Filter achievements - use createdAt (from mongoose timestamps) or date field
  const weekAchievements = highlights.filter(h => {
    if (h.type !== 'achievement') return false;
    const highlightDate = new Date(h.createdAt || h.date || new Date());
    return isWithinInterval(highlightDate, { start: weekStart, end: weekEnd });
  });

  const upcomingMilestones = projects
    .flatMap(p => (p.milestones || []).map(m => ({ ...m, projectName: p.name, projectId: p._id })))
    .filter(m => !m.completed && new Date(m.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Add milestone type highlights (include all milestones, with or without dueDate)
  const milestoneHighlights = highlights.filter(h => h.type === 'milestone');
  const allMilestones = [
    ...upcomingMilestones,
    ...milestoneHighlights.map(h => ({ 
      name: h.title, 
      dueDate: h.dueDate || h.createdAt, 
      projectName: h.department || 'General',
      isHighlight: true
    }))
  ].sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)).slice(0, 5);

  const showstoppers = highlights.filter(h => h.type === 'showstopper' || h.priority === 'critical');
  const _supportNeeded = highlights.filter(h => h.type === 'support-needed');

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
      // Status logic: prioritize blocked/overdue, then productivity (only if tasks exist)
      status: blockedTasks > 0 || overdueTasks > 2 ? 'needs-attention' : 
              needsSupport.length > 0 ? 'needs-attention' :
              totalTasks > 0 && productivity < 50 ? 'warning' : 
              'healthy',
    };
  }).sort((a, b) => b.needsSupport.length - a.needsSupport.length || b.employees - a.employees);

  // Filter departments that need support
  const _deptsNeedingSupport = deptData.filter(d => d.needsSupport.length > 0 || d.status === 'needs-attention');

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
    
    // Validate required fields
    if (!newProject.name || !newProject.startDate || !newProject.endDate) {
      toast.error('Please fill in project name, start date, and end date');
      return;
    }
    
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
      await api.post('/highlights', newHighlight);
      toast.success('Highlight saved to database!');
      setShowAddHighlight(false);
      setNewHighlight({ type: 'achievement', title: '', description: '', department: '', priority: 'medium', dueDate: '' });
      loadData();
    } catch (error) {
      console.error('Failed to save highlight:', error);
      const message = error.response?.data?.message || error.message || 'Failed to save';
      toast.error(`Error: ${message}`);
    }
  };

  const deleteHighlight = async (id) => {
    try {
      await api.delete(`/highlights/${id}`);
      toast.success('Highlight deleted');
      loadData();
    } catch (error) {
      console.error('Failed to delete highlight:', error);
      toast.error('Failed to delete highlight');
    }
  };

  const openEditHighlight = (highlight) => {
    setEditingHighlight({
      _id: highlight._id,
      type: highlight.type,
      title: highlight.title,
      description: highlight.description || '',
      department: highlight.department || '',
      priority: highlight.priority || 'medium',
      dueDate: highlight.dueDate ? format(new Date(highlight.dueDate), 'yyyy-MM-dd') : '',
    });
    setShowEditHighlight(true);
  };

  const handleUpdateHighlight = async (e) => {
    e.preventDefault();
    if (!editingHighlight?._id) return;
    
    try {
      await api.put(`/highlights/${editingHighlight._id}`, editingHighlight);
      toast.success('Highlight updated!');
      setShowEditHighlight(false);
      setEditingHighlight(null);
      loadData();
    } catch (error) {
      console.error('Failed to update highlight:', error);
      toast.error('Failed to update highlight');
    }
  };

  // Open task detail modal
  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setChairmanComment('');
    setShowTaskDetail(true);
  };

  // Add chairman comment to task
  const handleAddChairmanComment = async () => {
    if (!selectedTask || !chairmanComment.trim()) return;
    
    try {
      await api.post(`/tasks/${selectedTask._id}/updates`, {
        message: `[Chairman] ${chairmanComment}`,
        status: selectedTask.status,
      });
      toast.success('Comment added!');
      setChairmanComment('');
      loadData();
      // Refresh selected task
      const updatedTask = await api.get(`/tasks/${selectedTask._id}`);
      setSelectedTask(updatedTask.data);
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  };

  // Create announcement (stored as a special highlight type)
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcement.title || !announcement.message) {
      toast.error('Please fill in title and message');
      return;
    }
    
    try {
      await api.post('/highlights', {
        type: 'announcement',
        title: announcement.title,
        description: announcement.message,
        priority: announcement.priority,
        department: 'All',
      });
      toast.success('Announcement posted!');
      setShowAnnouncement(false);
      setAnnouncement({ title: '', message: '', priority: 'medium' });
      loadData();
    } catch (error) {
      console.error('Failed to post announcement:', error);
      toast.error('Failed to post announcement');
    }
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
          <div className="flex gap-3 flex-wrap">
            {/* Export Buttons */}
            <div className="flex gap-1">
              <Button 
                onClick={() => exportDashboard('png')}
                variant="outline"
                disabled={exporting}
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                title="Export as PNG"
              >
                <Download className="mr-1" size={16} />
                PNG
              </Button>
              <Button 
                onClick={() => exportDashboard('jpeg')}
                variant="outline"
                disabled={exporting}
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                title="Export as JPEG"
              >
                <Image className="mr-1" size={16} />
                JPEG
              </Button>
            </div>
          </div>
        </div>

        {/* ===== EXPORTABLE CONTENT STARTS HERE ===== */}
        <div ref={dashboardRef} className="space-y-8 bg-slate-900 p-1">
        
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
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                      <button 
                        onClick={() => openEditHighlight(a)}
                        className="p-1 hover:bg-blue-500/20 rounded"
                        title="Edit"
                      >
                        <Edit2 size={12} className="text-blue-400" />
                      </button>
                      <button 
                        onClick={() => deleteHighlight(a._id)}
                        className="p-1 hover:bg-red-500/20 rounded"
                        title="Delete"
                      >
                        <X size={14} className="text-red-400" />
                      </button>
                    </div>
                    <p className="text-white font-medium text-sm pr-12">{a.title}</p>
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
                  <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-blue-500/20 group relative">
                    {m._id && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                        <button 
                          onClick={() => openEditHighlight(m)}
                          className="p-1 hover:bg-blue-500/20 rounded"
                          title="Edit"
                        >
                          <Edit2 size={12} className="text-blue-400" />
                        </button>
                        <button 
                          onClick={() => deleteHighlight(m._id)}
                          className="p-1 hover:bg-red-500/20 rounded"
                          title="Delete"
                        >
                          <X size={14} className="text-red-400" />
                        </button>
                      </div>
                    )}
                    <div className="flex justify-between items-start pr-12">
                      <p className="text-white font-medium text-sm">{m.name || m.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        differenceInDays(new Date(m.dueDate), new Date()) <= 3 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {differenceInDays(new Date(m.dueDate), new Date())}d
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{m.projectName || m.department}</p>
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
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                      <button 
                        onClick={() => openEditHighlight(s)}
                        className="p-1 hover:bg-blue-500/20 rounded"
                        title="Edit"
                      >
                        <Edit2 size={12} className="text-blue-400" />
                      </button>
                      <button 
                        onClick={() => deleteHighlight(s._id)}
                        className="p-1 hover:bg-red-500/20 rounded"
                        title="Delete"
                      >
                        <X size={14} className="text-red-400" />
                      </button>
                    </div>
                    <p className="text-white font-medium text-sm pr-12">{s.title}</p>
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

        {/* ===== LEVEL 2: TEAM & WORK STATUS ===== */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="text-cyan-400" size={24} />
            Team Overview ({employees.length} members)
          </h2>

          {/* Tab Navigation */}
          <div className="flex items-center gap-4 mb-4 border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('team')}
              className={`pb-3 px-1 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'team'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <Users className="inline mr-2" size={16} />
              All Staff ({employees.length})
            </button>
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
              onClick={() => setActiveTab('departments')}
              className={`pb-3 px-1 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'departments'
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <Building2 className="inline mr-2" size={16} />
              Departments ({departments.length})
            </button>
          </div>

          {/* Team Tab - Default View (Row Format) */}
          {activeTab === 'team' && (
            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 text-xs font-medium text-slate-400 uppercase tracking-wider">
                <div className="col-span-3">Employee</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-5">Details / Current Work</div>
                <div className="col-span-2 text-center">Status</div>
              </div>
              
              {/* Table Body */}
              <div className="divide-y divide-slate-700/30">
                {employees.map((emp, idx) => {
                  const empTasks = tasks.filter(t => t.assignedTo === emp._id);
                  const completedTasks = empTasks.filter(t => t.status === 'completed').length;
                  const inProgressTasks = empTasks.filter(t => t.status === 'in-progress').length;
                  const blockedTasks = empTasks.filter(t => t.status === 'blocked').length;
                  const overdueTasks = empTasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length;
                  
                  // Get current/recent task names
                  const currentTasks = empTasks.filter(t => t.status === 'in-progress');
                  const recentCompleted = empTasks.filter(t => t.status === 'completed').slice(-2);
                  const blockedTasksList = empTasks.filter(t => t.status === 'blocked');
                  
                  // Build details text
                  let detailsText = '';
                  if (blockedTasksList.length > 0) {
                    detailsText = `⚠️ Blocked: ${blockedTasksList.map(t => t.title || t.name).join(', ')}`;
                  } else if (currentTasks.length > 0) {
                    detailsText = `Working on: ${currentTasks.map(t => t.title || t.name).join(', ')}`;
                  } else if (recentCompleted.length > 0) {
                    detailsText = `Completed: ${recentCompleted.map(t => t.title || t.name).join(', ')}`;
                  } else if (emp.notes || emp.currentWork) {
                    detailsText = emp.notes || emp.currentWork;
                  } else {
                    detailsText = emp.designation || emp.position || 'No current tasks assigned';
                  }
                  
                  const workStatus = blockedTasks > 0 ? 'blocked' : 
                                     overdueTasks > 0 ? 'overdue' :
                                     inProgressTasks > 0 ? 'working' : 
                                     completedTasks > 0 ? 'completed' : 'idle';
                  
                  const statusConfig = {
                    blocked: { label: 'Blocked', color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500' },
                    overdue: { label: 'Overdue', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
                    working: { label: 'Working', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-500 animate-pulse' },
                    completed: { label: 'Done', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
                    idle: { label: 'Available', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-500' },
                  };
                  
                  const status = statusConfig[workStatus];
                  
                  return (
                    <div 
                      key={idx}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-800/30 transition-colors ${
                        workStatus === 'blocked' ? 'bg-red-500/5' :
                        workStatus === 'overdue' ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Employee */}
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                        </div>
                      </div>
                      
                      {/* Department */}
                      <div className="col-span-2">
                        <p className="text-slate-300 text-sm truncate">{emp.department || 'Unassigned'}</p>
                      </div>
                      
                      {/* Details / Current Work */}
                      <div className="col-span-5">
                        <p className={`text-sm truncate ${
                          workStatus === 'blocked' ? 'text-red-400' :
                          workStatus === 'overdue' ? 'text-amber-400' :
                          workStatus === 'working' ? 'text-blue-300' :
                          'text-slate-400'
                        }`}>
                          {detailsText}
                        </p>
                      </div>
                      
                      {/* Status */}
                      <div className="col-span-2 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {employees.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No employees found
                </div>
              )}
            </div>
          )}

          {/* Departments Tab */}
          {activeTab === 'departments' && (
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
                  {dept.needsSupport.length > 0 && (
                    <div className="mt-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                      <p className="text-amber-400 text-[10px]">⚠️ {dept.needsSupport.length} issue(s) need attention</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

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

          {/* Tasks Tab - Full Task View with Deadline Status */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Task Stats - Compact Row */}
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 border border-slate-700/50">
                  <span className="font-bold text-cyan-400">{taskStats.total}</span>
                  <span className="text-slate-400 text-xs">Total</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 border border-slate-700/50">
                  <span className="font-bold text-emerald-400">{taskStats.completed}</span>
                  <span className="text-slate-400 text-xs">Completed</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 border border-slate-700/50">
                  <span className="font-bold text-blue-400">{taskStats.inProgress}</span>
                  <span className="text-slate-400 text-xs">In Progress</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 border border-slate-700/50">
                  <span className="font-bold text-amber-400">{taskStats.overdue}</span>
                  <span className="text-slate-400 text-xs">Overdue</span>
                </div>
              </div>

              {/* Task Table with Deadline Status */}
              <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <div className="col-span-1">ID</div>
                  <div className="col-span-3">Task</div>
                  <div className="col-span-2">Assigned To</div>
                  <div className="col-span-2">Deadline</div>
                  <div className="col-span-2 text-center">Progress</div>
                  <div className="col-span-2 text-center">Status</div>
                </div>

                {/* Task Rows */}
                <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
                  {tasks.map((task, idx) => {
                    const assignee = typeof task.assignedTo === 'object' 
                      ? task.assignedTo 
                      : employees.find(e => e._id === task.assignedTo);
                    const deadline = task.deadline ? new Date(task.deadline) : null;
                    const now = new Date();
                    const daysUntilDeadline = deadline ? differenceInDays(deadline, now) : null;
                    
                    // Deadline status logic:
                    // Green: Completed OR deadline is > 3 days away
                    // Yellow/Amber: Deadline is within 3 days (close)
                    // Red: Deadline passed and not completed
                    let deadlineStatus = 'on-track';
                    let deadlineColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                    let deadlineLabel = 'On Track';
                    
                    if (task.status === 'completed') {
                      deadlineStatus = 'completed';
                      deadlineColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                      deadlineLabel = 'Completed';
                    } else if (deadline && deadline < now) {
                      deadlineStatus = 'overdue';
                      deadlineColor = 'text-red-400 bg-red-500/10 border-red-500/30';
                      deadlineLabel = 'Overdue';
                    } else if (daysUntilDeadline !== null && daysUntilDeadline <= 3) {
                      deadlineStatus = 'close';
                      deadlineColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                      deadlineLabel = daysUntilDeadline === 0 ? 'Due Today' : `${daysUntilDeadline}d Left`;
                    }

                    return (
                      <div 
                        key={task._id || idx}
                        onClick={() => openTaskDetail(task)}
                        className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-800/50 transition-colors cursor-pointer ${
                          deadlineStatus === 'overdue' ? 'bg-red-500/10 border-l-4 border-l-red-500' :
                          deadlineStatus === 'close' ? 'bg-amber-500/10 border-l-4 border-l-amber-500' : 
                          deadlineStatus === 'completed' ? 'border-l-4 border-l-emerald-500' : ''
                        }`}
                      >
                        {/* Task ID */}
                        <div className="col-span-1">
                          <span className="text-slate-500 text-xs font-mono">
                            #{String(idx + 1).padStart(3, '0')}
                          </span>
                        </div>

                        {/* Task Title & Description */}
                        <div className="col-span-3">
                          <p className="text-white text-sm font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{task.description}</p>
                          )}
                          {task.project && (
                            <p className="text-cyan-400/70 text-[10px] mt-0.5">{task.project}</p>
                          )}
                        </div>

                        {/* Assigned To */}
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {assignee?.firstName?.[0]}{assignee?.lastName?.[0]}
                          </div>
                          <span className="text-slate-300 text-sm truncate">
                            {assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned'}
                          </span>
                        </div>

                        {/* Deadline with Status Color */}
                        <div className="col-span-2">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${deadlineColor}`}>
                            <Calendar size={12} />
                            {deadline ? format(deadline, 'MMM d, yyyy') : 'No deadline'}
                          </div>
                          <p className={`text-[10px] mt-0.5 ${
                            deadlineStatus === 'overdue' ? 'text-red-400' :
                            deadlineStatus === 'close' ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {deadlineLabel}
                          </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  task.progress >= 100 ? 'bg-emerald-500' :
                                  task.progress >= 50 ? 'bg-blue-500' :
                                  task.progress >= 25 ? 'bg-amber-500' : 'bg-slate-500'
                                }`}
                                style={{ width: `${task.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-slate-400 text-xs w-8 text-right">{task.progress || 0}%</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="col-span-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                            task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            task.status === 'blocked' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            task.status === 'pending' ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {task.status === 'completed' && <CheckCircle2 size={12} />}
                            {task.status === 'in-progress' && <Activity size={12} />}
                            {task.status === 'blocked' && <AlertCircle size={12} />}
                            {task.status?.replace('-', ' ') || 'pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {tasks.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <CheckCircle2 className="mx-auto text-slate-600 mb-2" size={32} />
                    <p>No tasks found</p>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500/50 border border-emerald-500" />
                  <span>On Track / Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-500/50 border border-amber-500" />
                  <span>Deadline Close (≤3 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-500/50 border border-red-500" />
                  <span>Overdue</span>
                </div>
              </div>
            </div>
          )}
        </section>
        
        </div>
        {/* ===== END EXPORTABLE CONTENT ===== */}

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
                    <label className="block text-sm font-medium text-slate-300 mb-1">Start Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      required
                      value={newProject.startDate}
                      onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">End Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      required
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

        {/* ===== EDIT HIGHLIGHT MODAL ===== */}
        {showEditHighlight && editingHighlight && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit {editingHighlight.type === 'achievement' ? 'Achievement' : editingHighlight.type === 'milestone' ? 'Milestone' : 'Showstopper'}</h2>
                <button onClick={() => { setShowEditHighlight(false); setEditingHighlight(null); }} className="p-2 hover:bg-slate-800 rounded-lg">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleUpdateHighlight} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                  <input
                    type="text"
                    value={editingHighlight.title}
                    onChange={(e) => setEditingHighlight({ ...editingHighlight, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    value={editingHighlight.description}
                    onChange={(e) => setEditingHighlight({ ...editingHighlight, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
                    <select
                      value={editingHighlight.department}
                      onChange={(e) => setEditingHighlight({ ...editingHighlight, department: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">Select Department</option>
                      {Array.from(new Set(employees.map(e => e.department).filter(Boolean))).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                    <select
                      value={editingHighlight.priority}
                      onChange={(e) => setEditingHighlight({ ...editingHighlight, priority: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical - Urgent</option>
                    </select>
                  </div>
                </div>
                {(editingHighlight.type === 'milestone') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editingHighlight.dueDate}
                      onChange={(e) => setEditingHighlight({ ...editingHighlight, dueDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowEditHighlight(false); setEditingHighlight(null); }} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600">
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== TASK DETAIL MODAL ===== */}
        {showTaskDetail && selectedTask && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedTask.title}</h2>
                  <p className="text-slate-400 text-sm">{selectedTask.project || 'No project'}</p>
                </div>
                <button onClick={() => { setShowTaskDetail(false); setSelectedTask(null); }} className="p-2 hover:bg-slate-800 rounded-lg">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Task Details Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Assigned To</p>
                      <p className="text-white">
                        {typeof selectedTask.assignedTo === 'object' 
                          ? `${selectedTask.assignedTo.firstName} ${selectedTask.assignedTo.lastName}`
                          : 'Unassigned'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Deadline</p>
                      <p className={`font-medium ${
                        selectedTask.deadline && new Date(selectedTask.deadline) < new Date() && selectedTask.status !== 'completed'
                          ? 'text-red-400' 
                          : selectedTask.deadline && differenceInDays(new Date(selectedTask.deadline), new Date()) <= 3
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}>
                        {selectedTask.deadline ? format(new Date(selectedTask.deadline), 'MMMM d, yyyy') : 'No deadline'}
                        {selectedTask.deadline && new Date(selectedTask.deadline) < new Date() && selectedTask.status !== 'completed' && (
                          <span className="ml-2 text-xs bg-red-500/20 px-2 py-0.5 rounded">OVERDUE</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Priority</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        selectedTask.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                        selectedTask.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        selectedTask.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {selectedTask.priority || 'Medium'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Status</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        selectedTask.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedTask.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                        selectedTask.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {selectedTask.status?.replace('-', ' ') || 'Pending'}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Progress</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              selectedTask.progress >= 100 ? 'bg-emerald-500' :
                              selectedTask.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${selectedTask.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-white text-sm font-medium">{selectedTask.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Description</p>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedTask.description || 'No description provided.'}</p>
                  </div>
                </div>

                {/* Blocker if any */}
                {selectedTask.blocker && (
                  <div>
                    <p className="text-red-400 text-xs uppercase tracking-wider mb-2">⚠️ Blocker</p>
                    <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                      <p className="text-red-300">{selectedTask.blocker}</p>
                    </div>
                  </div>
                )}

                {/* Updates/Comments History */}
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Updates & Comments ({selectedTask.updates?.length || 0})</p>
                  <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 max-h-48 overflow-y-auto">
                    {selectedTask.updates && selectedTask.updates.length > 0 ? (
                      <div className="divide-y divide-slate-700/50">
                        {selectedTask.updates.slice().reverse().map((update, i) => (
                          <div key={i} className={`p-3 ${update.message?.startsWith('[Chairman]') ? 'bg-purple-500/10' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-medium ${update.message?.startsWith('[Chairman]') ? 'text-purple-400' : 'text-cyan-400'}`}>
                                {update.addedBy?.firstName ? `${update.addedBy.firstName} ${update.addedBy.lastName}` : 'System'}
                              </span>
                              <span className="text-slate-500 text-xs">
                                {update.addedAt ? format(new Date(update.addedAt), 'MMM d, h:mm a') : ''}
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-4 text-slate-500 text-center text-sm">No updates yet</p>
                    )}
                  </div>
                </div>

                {/* Chairman Comment Input */}
                <div>
                  <p className="text-purple-400 text-xs uppercase tracking-wider mb-2">Add Chairman Comment</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chairmanComment}
                      onChange={(e) => setChairmanComment(e.target.value)}
                      placeholder="Add your comment..."
                      className="flex-1 px-4 py-2 bg-slate-800 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <Button 
                      onClick={handleAddChairmanComment}
                      disabled={!chairmanComment.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-600"
                    >
                      <MessageSquare size={16} className="mr-2" />
                      Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ANNOUNCEMENT MODAL ===== */}
        {showAnnouncement && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-purple-500/30 w-full max-w-lg">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div>
                  <h2 className="text-xl font-bold text-white">Post Announcement</h2>
                  <p className="text-purple-400 text-sm">This message will be visible to everyone</p>
                </div>
                <button onClick={() => setShowAnnouncement(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                  <input
                    type="text"
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Important Update"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Message *</label>
                  <textarea
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none focus:ring-2 focus:ring-purple-500"
                    rows={4}
                    placeholder="Your message to the team..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={announcement.priority}
                    onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="low">Low - General Info</option>
                    <option value="medium">Medium - Important</option>
                    <option value="high">High - Urgent</option>
                    <option value="critical">Critical - Immediate Action</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAnnouncement(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600">
                    <MessageSquare size={16} className="mr-2" />
                    Post Announcement
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
