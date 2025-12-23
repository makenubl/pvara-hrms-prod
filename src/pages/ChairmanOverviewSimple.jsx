import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import html2canvas from 'html2canvas';
import taskService from '../services/taskService';
import employeeService from '../services/employeeService';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Image,
  User,
  Calendar,
  Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ChairmanOverviewSimple = () => {
  useAuthStore(); // Using store for authentication
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState(new Date());
  const [exporting, setExporting] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const dashboardRef = useRef(null);

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
      const [tsks, emps] = await Promise.all([
        taskService.getAll({ all: true }).catch(() => []),
        employeeService.getAll().catch(() => []),
      ]);
      setTasks(tsks || []);
      setEmployees(emps || []);
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sort helper - latest first (by createdAt or deadline)
  const sortByLatest = (taskList) => {
    return [...taskList].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.deadline || 0);
      const dateB = new Date(b.createdAt || b.deadline || 0);
      return dateB - dateA; // Descending - latest first
    });
  };

  // Task categorization (sorted by latest)
  const completedTasks = sortByLatest(tasks.filter(t => t.status === 'completed'));
  const pendingTasks = sortByLatest(tasks.filter(t => t.status === 'pending' || t.status === 'in-progress'));
  const bottleneckTasks = sortByLatest(tasks.filter(t => 
    t.status === 'blocked' || 
    (new Date(t.deadline) < new Date() && t.status !== 'completed')
  ));

  // Get employee name helper
  const getEmployeeName = (task) => {
    if (task.assignedTo?.firstName) {
      return `${task.assignedTo.firstName} ${task.assignedTo.lastName || ''}`.trim();
    }
    const emp = employees.find(e => e._id === task.assignedTo);
    return emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Unassigned';
  };

  // Priority color helper
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  // Export dashboard as image
  const exportDashboard = async (imageFormat = 'png') => {
    if (!dashboardRef.current) return;
    
    setExporting(true);
    toast.loading(`Generating ${imageFormat.toUpperCase()} image...`, { id: 'export' });
    
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const mimeType = imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const extension = imageFormat === 'jpeg' ? 'jpg' : 'png';
      
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
      const link = document.createElement('a');
      link.download = `Chairman-Overview-${timestamp}.${extension}`;
      link.href = canvas.toDataURL(mimeType, imageFormat === 'jpeg' ? 0.95 : undefined);
      link.click();
      
      toast.success(`Dashboard exported as ${imageFormat.toUpperCase()}!`, { id: 'export' });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export dashboard', { id: 'export' });
    } finally {
      setExporting(false);
    }
  };

  const _toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Task card component
  const TaskCard = ({ task }) => (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm truncate">{task.title}</h4>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <User size={12} />
              {getEmployeeName(task)}
            </span>
            {task.deadline && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar size={12} />
                {format(new Date(task.deadline), 'MMM d')}
              </span>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
          {task.priority || 'medium'}
        </span>
      </div>
      {task.blocker && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300">
          <strong>Blocker:</strong> {task.blocker}
        </div>
      )}
      {task.progress !== undefined && task.progress > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

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
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Task Overview
            </h1>
            <p className="text-slate-400 mt-1 text-sm">{format(date, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => exportDashboard('png')}
              variant="outline"
              disabled={exporting}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="mr-1" size={16} />
              Export
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div ref={dashboardRef} className="space-y-6 bg-slate-900 p-2">
          
          {/* Stats Summary Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <CheckCircle2 className="text-emerald-400 mx-auto mb-2" size={28} />
              <p className="text-3xl font-bold text-white">{completedTasks.length}</p>
              <p className="text-emerald-400 text-sm">Completed</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
              <Clock className="text-amber-400 mx-auto mb-2" size={28} />
              <p className="text-3xl font-bold text-white">{pendingTasks.length}</p>
              <p className="text-amber-400 text-sm">Pending</p>
            </div>
            <div className={`bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/30 rounded-xl p-4 text-center ${bottleneckTasks.length > 0 ? 'animate-pulse' : ''}`}>
              <AlertTriangle className="text-red-400 mx-auto mb-2" size={28} />
              <p className="text-3xl font-bold text-white">{bottleneckTasks.length}</p>
              <p className="text-red-400 text-sm">Bottleneck</p>
            </div>
          </div>

          {/* Three Column Task Lists - All Visible by Default */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Completed Column */}
            <Card className="bg-slate-800/50 border-emerald-500/30">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
                <CheckCircle2 className="text-emerald-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Completed</h3>
                <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">
                  {completedTasks.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {completedTasks.length > 0 ? (
                  completedTasks.map(task => <TaskCard key={task._id} task={task} />)
                ) : (
                  <p className="text-slate-500 text-center py-8">No completed tasks</p>
                )}
              </div>
            </Card>

            {/* Pending Column */}
            <Card className="bg-slate-800/50 border-amber-500/30">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
                <Clock className="text-amber-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Pending</h3>
                <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded-full">
                  {pendingTasks.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {pendingTasks.length > 0 ? (
                  pendingTasks.map(task => <TaskCard key={task._id} task={task} />)
                ) : (
                  <p className="text-slate-500 text-center py-8">No pending tasks</p>
                )}
              </div>
            </Card>

            {/* Bottleneck Column */}
            <Card className="bg-slate-800/50 border-red-500/30">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
                <AlertTriangle className="text-red-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Bottleneck</h3>
                <span className="ml-auto bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-full">
                  {bottleneckTasks.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {bottleneckTasks.length > 0 ? (
                  bottleneckTasks.map(task => <TaskCard key={task._id} task={task} />)
                ) : (
                  <p className="text-slate-500 text-center py-8 text-emerald-400">✓ No bottlenecks!</p>
                )}
              </div>
            </Card>
          </div>

          {/* Summary Footer */}
          <div className="text-center text-slate-500 text-sm pt-4 border-t border-slate-800">
            Total Tasks: {tasks.length} | 
            Completion Rate: {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ChairmanOverviewSimple;
