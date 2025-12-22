import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Tooltip } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import taskService from '../services/taskService';
import employeeService from '../services/employeeService';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  User,
  Calendar,
  Filter,
  List,
  ArrowLeft,
  MessageSquare,
  FileText,
  Target,
  ChevronRight,
  Send,
  Building2,
  Mail,
  Paperclip,
  Link,
  Activity,
  CheckCircle,
  Clock3,
  ArrowRightCircle,
  Zap,
  Hash,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TasksABTesting = () => {
  const { user, role } = useAuthStore();
  
  // Role-based access control - only admin and chairman can perform actions
  // Use top-level role from authStore (set during login) for consistency
  const canPerformActions = ['admin', 'chairman', 'manager', 'hr'].includes(role);
  
  // Debug: Log user role
  console.log('TasksABTesting - role:', role, 'user.role:', user?.role, 'canPerformActions:', canPerformActions);
  
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending', 'bottleneck'
  const [selectedTask, setSelectedTask] = useState(null);
  const [boostModal, setBoostModal] = useState({ show: false, task: null });
  const [boostMessage, setBoostMessage] = useState('');
  const [boosting, setBoosting] = useState(false);
  
  // Bottleneck response state
  const [bottleneckResponseModal, setBottleneckResponseModal] = useState({ show: false, task: null, bottleneck: null });
  const [bottleneckResponse, setBottleneckResponse] = useState('');
  const [bottleneckStatus, setBottleneckStatus] = useState('acknowledged');
  const [bottleneckResolution, setBottleneckResolution] = useState('');
  const [respondingToBottleneck, setRespondingToBottleneck] = useState(false);

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
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Handle boost task
  const handleBoostTask = async () => {
    if (!boostModal.task) return;
    
    setBoosting(true);
    try {
      const updatedTask = await taskService.boostTask(
        boostModal.task._id, 
        boostMessage || 'Task has been expedited - please provide an update.'
      );
      setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
      if (selectedTask?._id === updatedTask._id) {
        setSelectedTask(updatedTask);
      }
      toast.success('Task boosted! Assignee will be notified.');
      setBoostModal({ show: false, task: null });
      setBoostMessage('');
    } catch (error) {
      toast.error(error.message || 'Failed to boost task');
    } finally {
      setBoosting(false);
    }
  };

  // Handle respond to bottleneck
  const handleRespondToBottleneck = async () => {
    if (!bottleneckResponseModal.task || !bottleneckResponseModal.bottleneck) return;
    
    if (!bottleneckResponse.trim() && bottleneckStatus !== 'resolved') {
      toast.error('Please enter a response');
      return;
    }

    setRespondingToBottleneck(true);
    try {
      const updatedTask = await taskService.respondToBottleneck(
        bottleneckResponseModal.task._id,
        bottleneckResponseModal.bottleneck._id,
        {
          chairpersonResponse: bottleneckResponse.trim(),
          status: bottleneckStatus,
          resolution: bottleneckStatus === 'resolved' ? bottleneckResolution.trim() : undefined,
        }
      );
      
      setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
      if (selectedTask?._id === updatedTask._id) {
        setSelectedTask(updatedTask);
      }
      
      toast.success('Response sent to assignee');
      setBottleneckResponseModal({ show: false, task: null, bottleneck: null });
      setBottleneckResponse('');
      setBottleneckStatus('acknowledged');
      setBottleneckResolution('');
    } catch (error) {
      toast.error(error.message || 'Failed to respond to bottleneck');
    } finally {
      setRespondingToBottleneck(false);
    }
  };

  // Get open bottlenecks for a task
  const getOpenBottlenecks = (task) => {
    return task.bottlenecks?.filter(b => b.status !== 'resolved') || [];
  };

  // Count total open bottlenecks
  const totalOpenBottlenecks = tasks.reduce((count, task) => {
    return count + getOpenBottlenecks(task).length;
  }, 0);

  // Get short task ID
  const getTaskId = (task) => {
    if (task.project?.startsWith('TASK-')) {
      return task.project;
    }
    // Fallback: use first 8 chars of MongoDB _id
    return `#${task._id?.slice(-6)?.toUpperCase() || '------'}`;
  };

  // Check if task has pending (unacknowledged) boosts
  const hasPendingBoost = (task) => {
    return task.boosts?.some(b => !b.acknowledged) || false;
  };

  // Get latest boost info
  const getLatestBoost = (task) => {
    if (!task.boosts?.length) return null;
    return task.boosts[task.boosts.length - 1];
  };

  // Sort by latest first
  const sortByLatest = (taskList) => {
    return [...taskList].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.deadline || 0);
      const dateB = new Date(b.createdAt || b.deadline || 0);
      return dateB - dateA;
    });
  };

  // Task categorization
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
  // Bottleneck tasks - tasks that have open bottlenecks (support requests)
  const bottleneckTasks = tasks.filter(t => 
    getOpenBottlenecks(t).length > 0
  );

  // Get filtered tasks based on selection
  const getFilteredTasks = () => {
    let filtered;
    switch (filter) {
      case 'completed':
        filtered = completedTasks;
        break;
      case 'pending':
        filtered = pendingTasks;
        break;
      case 'bottleneck':
        filtered = bottleneckTasks;
        break;
      default:
        filtered = tasks;
    }
    return sortByLatest(filtered);
  };

  // Get employee name helper
  const getEmployeeName = (task) => {
    if (task.assignedTo?.firstName) {
      return `${task.assignedTo.firstName} ${task.assignedTo.lastName || ''}`.trim();
    }
    const emp = employees.find(e => e._id === task.assignedTo);
    return emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Unassigned';
  };

  // Get employee email
  const getEmployeeEmail = (task) => {
    if (task.assignedTo?.email) {
      return task.assignedTo.email;
    }
    const emp = employees.find(e => e._id === task.assignedTo);
    return emp?.email || '';
  };

  // Priority color helper
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  // Status color helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'in-progress': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'pending': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'blocked': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  // Status icon helper
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'in-progress': return <Clock size={16} className="text-blue-400" />;
      case 'pending': return <Clock size={16} className="text-amber-400" />;
      case 'blocked': return <AlertTriangle size={16} className="text-red-400" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  // Filter buttons config
  const filterButtons = [
    { key: 'all', label: 'All Tasks', count: tasks.length, color: 'from-cyan-500 to-blue-500' },
    { key: 'completed', label: 'Completed', count: completedTasks.length, color: 'from-emerald-500 to-teal-500' },
    { key: 'pending', label: 'Pending', count: pendingTasks.length, color: 'from-amber-500 to-yellow-500' },
    { key: 'bottleneck', label: 'Bottlenecks', count: bottleneckTasks.length, color: 'from-red-500 to-rose-500' },
  ];

  // Task Detail Modal/Panel
  const TaskDetailPanel = ({ task, onClose, onTaskUpdate, defaultTab = 'details', canPerformActions = true }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [newComment, setNewComment] = useState('');
    const [addingComment, setAddingComment] = useState(false);

    if (!task) return null;

    const handleAddComment = async () => {
      if (!newComment.trim()) return;
      
      setAddingComment(true);
      try {
        const updatedTask = await taskService.addComment(task._id, newComment.trim());
        onTaskUpdate(updatedTask);
        setNewComment('');
        toast.success('Comment added');
      } catch (error) {
        toast.error(error.message || 'Failed to add comment');
      } finally {
        setAddingComment(false);
      }
    };

    const handleUpdateActivityStatus = async (activityId, newStatus) => {
      try {
        const updateData = { status: newStatus };
        if (newStatus === 'received' || newStatus === 'completed') {
          updateData.responseReceivedAt = new Date().toISOString();
        }
        const updatedTask = await taskService.updateActivity(task._id, activityId, updateData);
        onTaskUpdate(updatedTask);
        toast.success('Activity updated');
      } catch (error) {
        toast.error(error.message || 'Failed to update activity');
      }
    };

    const getActivityStatusIcon = (status) => {
      switch (status) {
        case 'completed': return <CheckCircle size={14} className="text-emerald-400" />;
        case 'received': return <CheckCircle2 size={14} className="text-blue-400" />;
        case 'pending': return <Clock3 size={14} className="text-amber-400" />;
        case 'escalated': return <AlertTriangle size={14} className="text-red-400" />;
        default: return <ArrowRightCircle size={14} className="text-cyan-400" />;
      }
    };

    const getActivityStatusColor = (status) => {
      switch (status) {
        case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'received': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'escalated': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      }
    };

    const tabs = [
      { key: 'details', label: 'Details', icon: FileText, tooltip: 'View task details including description, assignee, deadline and progress' },
      { key: 'boosts', label: 'Boosts', icon: Zap, count: task.boosts?.length || 0, tooltip: 'View and manage boost/expedite requests - Track responses from assignees' },
      { key: 'bottlenecks', label: 'Bottlenecks', icon: HelpCircle, count: task.bottlenecks?.length || 0, tooltip: 'View and respond to bottlenecks raised by assignees' },
      { key: 'activities', label: 'Activities', icon: Activity, count: task.activities?.length || 0, tooltip: 'View task journey/timeline - Track actions across departments' },
      { key: 'comments', label: 'Comments', icon: MessageSquare, count: task.chairmanComments?.length || 0, tooltip: 'View and add chairperson comments on this task' },
      { key: 'attachments', label: 'Attachments', icon: Paperclip, count: task.attachments?.length || 0, tooltip: 'View documents and files attached to this task' },
    ];

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(task.status)}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                    {task.status?.toUpperCase() || 'PENDING'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority?.toUpperCase() || 'MEDIUM'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{task.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <Tooltip key={tab.key} content={tab.tooltip} position="bottom">
                    <button
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === tab.key
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-slate-700 rounded text-xs">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Description */}
                {task.description && (
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <FileText size={14} />
                      <span>Description</span>
                    </div>
                    <p className="text-white bg-slate-700/50 p-4 rounded-lg">{task.description}</p>
                  </div>
                )}

                {/* Assigned To/By */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <User size={14} />
                      <span>Assigned To</span>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <p className="text-white font-medium">{getEmployeeName(task)}</p>
                      <p className="text-slate-400 text-sm">{getEmployeeEmail(task)}</p>
                    </div>
                  </div>
                  {task.assignedBy && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <User size={14} />
                        <span>Assigned By</span>
                      </div>
                      <div className="bg-slate-700/50 p-3 rounded-lg">
                        <p className="text-white font-medium">
                          {task.assignedBy?.firstName 
                            ? `${task.assignedBy.firstName} ${task.assignedBy.lastName || ''}`.trim()
                            : 'System'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {task.deadline && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <Calendar size={14} />
                        <span>Deadline</span>
                      </div>
                      <div className={`bg-slate-700/50 p-3 rounded-lg ${
                        new Date(task.deadline) < new Date() && task.status !== 'completed' 
                          ? 'border border-red-500/50' 
                          : ''
                      }`}>
                        <p className="text-white font-medium">
                          {format(new Date(task.deadline), 'EEEE, MMM d, yyyy')}
                        </p>
                        {new Date(task.deadline) < new Date() && task.status !== 'completed' && (
                          <p className="text-red-400 text-sm mt-1">⚠️ Overdue</p>
                        )}
                      </div>
                    </div>
                  )}
                  {task.createdAt && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <Calendar size={14} />
                        <span>Created</span>
                      </div>
                      <div className="bg-slate-700/50 p-3 rounded-lg">
                        <p className="text-white font-medium">
                          {format(new Date(task.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress */}
                {task.progress !== undefined && task.progress >= 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Target size={14} />
                      <span>Progress</span>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Completion</span>
                        <span className="text-white font-bold">{task.progress}%</span>
                      </div>
                      <div className="h-3 bg-slate-600 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            task.progress === 100 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Blocker */}
                {task.blocker && (
                  <div>
                    <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                      <AlertTriangle size={14} />
                      <span>Blocker</span>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                      <p className="text-red-300">{task.blocker}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Boosts Tab */}
            {activeTab === 'boosts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap size={18} className="text-orange-400" />
                    Boost History
                  </h3>
                  {canPerformActions && (
                    <button
                      onClick={() => setBoostModal({ show: true, task })}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Zap size={14} />
                      Boost Task
                    </button>
                  )}
                </div>

                {/* Boost Timeline */}
                <div className="space-y-3">
                  {task.boosts && task.boosts.length > 0 ? (
                    [...task.boosts].reverse().map((boost, index) => (
                      <div key={boost._id || index} className={`relative pl-6 pb-4 border-l-2 ${
                        boost.acknowledged ? 'border-emerald-500/50' : 'border-orange-500/50'
                      } last:border-l-0 last:pb-0`}>
                        <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full flex items-center justify-center ${
                          boost.acknowledged ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'
                        }`}>
                          <Zap size={10} className="text-white" />
                        </div>
                        <div className={`rounded-lg p-4 ml-2 ${
                          boost.acknowledged 
                            ? 'bg-emerald-500/10 border border-emerald-500/30' 
                            : 'bg-orange-500/10 border border-orange-500/30'
                        }`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${
                                boost.acknowledged ? 'text-emerald-400' : 'text-orange-400'
                              }`}>
                                {boost.acknowledged ? '✓ Responded' : '⚡ Pending Response'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {boost.boostedAt && format(new Date(boost.boostedAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          
                          {/* Boost message from chairman */}
                          <div className="mb-3 p-2 bg-slate-800/50 rounded">
                            <p className="text-xs text-slate-500 mb-1">Message from {boost.boostedBy?.firstName || 'Chairman'}:</p>
                            <p className="text-white text-sm">{boost.message || 'Task has been expedited.'}</p>
                          </div>

                          {/* Response from assignee */}
                          {boost.response ? (
                            <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                              <p className="text-xs text-emerald-500 mb-1">
                                Response • {boost.respondedAt && format(new Date(boost.respondedAt), 'MMM d, h:mm a')}
                              </p>
                              <p className="text-emerald-300 text-sm">{boost.response}</p>
                            </div>
                          ) : (
                            <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20">
                              <p className="text-xs text-orange-400">⏳ Awaiting response from assignee...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Zap size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No boosts yet</p>
                      <p className="text-sm mt-2">Click "Boost Task" to expedite and request an update</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottlenecks Tab */}
            {activeTab === 'bottlenecks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <HelpCircle size={18} className="text-red-400" />
                    Bottlenecks
                  </h3>
                </div>

                {/* Bottlenecks Timeline */}
                <div className="space-y-3">
                  {task.bottlenecks && task.bottlenecks.length > 0 ? (
                    [...task.bottlenecks].reverse().map((bottleneck, index) => {
                      const isOpen = bottleneck.status === 'open';
                      const isInProgress = bottleneck.status === 'in-progress';
                      return (
                        <div key={bottleneck._id || index} className={`relative pl-6 pb-4 border-l-2 ${
                          isOpen ? 'border-red-500/50' : isInProgress ? 'border-amber-500/50' : 'border-emerald-500/50'
                        } last:border-l-0 last:pb-0`}>
                          <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full flex items-center justify-center ${
                            isOpen ? 'bg-red-500 animate-pulse' : isInProgress ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}>
                            <HelpCircle size={10} className="text-white" />
                          </div>
                          <div className={`rounded-lg p-4 ml-2 ${
                            isOpen 
                              ? 'bg-red-500/10 border border-red-500/30' 
                              : isInProgress 
                              ? 'bg-amber-500/10 border border-amber-500/30'
                              : 'bg-emerald-500/10 border border-emerald-500/30'
                          }`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                  bottleneck.urgency === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                  bottleneck.urgency === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                  bottleneck.urgency === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                  'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                }`}>
                                  {bottleneck.urgency?.toUpperCase() || 'MEDIUM'} URGENCY
                                </span>
                                <span className={`text-sm font-medium ${
                                  isOpen ? 'text-red-400' : isInProgress ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                  {isOpen ? '🔴 Needs Response' : isInProgress ? '🟡 In Progress' : '✓ Resolved'}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {bottleneck.raisedAt && format(new Date(bottleneck.raisedAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            
                            {/* Issue raised by assignee */}
                            <div className="mb-3 p-3 bg-slate-800/50 rounded">
                              <p className="text-xs text-slate-500 mb-1">
                                Raised by {bottleneck.raisedBy?.firstName 
                                  ? `${bottleneck.raisedBy.firstName} ${bottleneck.raisedBy.lastName || ''}`.trim() 
                                  : 'Assignee'}:
                              </p>
                              <p className="text-white text-sm">{bottleneck.issue}</p>
                            </div>

                            {/* Response from chairman */}
                            {bottleneck.chairpersonResponse ? (
                              <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/20">
                                <p className="text-xs text-emerald-500 mb-1">
                                  Your Response • {bottleneck.respondedAt && format(new Date(bottleneck.respondedAt), 'MMM d, h:mm a')}
                                </p>
                                <p className="text-emerald-300 text-sm">{bottleneck.chairpersonResponse}</p>
                              </div>
                            ) : canPerformActions ? (
                              <div className="p-3 bg-red-500/10 rounded border border-red-500/20">
                                <p className="text-xs text-red-400 mb-2">⏳ Awaiting your response...</p>
                                <button
                                  onClick={() => setBottleneckResponseModal({ 
                                    show: true, 
                                    task, 
                                    bottleneck 
                                  })}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                                >
                                  <Send size={14} />
                                  Respond Now
                                </button>
                              </div>
                            ) : (
                              <div className="p-3 bg-red-500/10 rounded border border-red-500/20">
                                <p className="text-xs text-red-400">⏳ Awaiting chairperson response...</p>
                              </div>
                            )}

                            {/* Mark as Resolved button - show if not yet resolved and user can perform actions */}
                            {bottleneck.status !== 'resolved' && canPerformActions && (
                              <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-2">
                                <button
                                  onClick={() => setBottleneckResponseModal({ 
                                    show: true, 
                                    task, 
                                    bottleneck 
                                  })}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-300 text-sm rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                  <Send size={14} />
                                  {bottleneck.chairpersonResponse ? 'Update Response' : 'Respond'}
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const updatedTask = await taskService.respondToBottleneck(
                                        task._id,
                                        bottleneck._id,
                                        { status: 'resolved', chairpersonResponse: bottleneck.chairpersonResponse || 'Resolved' }
                                      );
                                      onTaskUpdate(updatedTask);
                                      toast.success('Bottleneck marked as resolved');
                                    } catch (error) {
                                      toast.error(error.message || 'Failed to resolve bottleneck');
                                    }
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-lg hover:bg-emerald-500/30 transition-colors"
                                >
                                  <CheckCircle size={14} />
                                  Mark as Resolved
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No bottlenecks yet</p>
                      <p className="text-sm mt-2">Assignees can raise bottlenecks when they face challenges</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activities Tab */}
            {activeTab === 'activities' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Activity size={18} className="text-purple-400" />
                    Task Journey / Timeline
                  </h3>
                </div>

                {/* Activities Timeline */}
                <div className="space-y-3">
                  {task.activities && task.activities.length > 0 ? (
                    [...task.activities].reverse().map((activity, index) => (
                      <div key={activity._id || index} className="relative pl-6 pb-4 border-l-2 border-slate-700 last:border-l-0 last:pb-0">
                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-purple-500 flex items-center justify-center">
                          {getActivityStatusIcon(activity.status)}
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-4 ml-2">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-medium">{activity.action}</span>
                              <span className={`px-2 py-0.5 rounded text-xs border ${getActivityStatusColor(activity.status)}`}>
                                {activity.status}
                              </span>
                            </div>
                            {activity.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateActivityStatus(activity._id, 'received')}
                                className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30"
                              >
                                Mark Received
                              </button>
                            )}
                          </div>
                          {activity.department && (
                            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                              <Building2 size={12} />
                              <span>{activity.department}</span>
                            </div>
                          )}
                          {activity.poc && (
                            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                              <User size={12} />
                              <span>{activity.poc}</span>
                              {activity.pocEmail && (
                                <>
                                  <Mail size={12} />
                                  <span>{activity.pocEmail}</span>
                                </>
                              )}
                            </div>
                          )}
                          {activity.notes && (
                            <p className="text-sm text-slate-300 mt-2 italic">"{activity.notes}"</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Sent: {format(new Date(activity.sentAt || activity.addedAt), 'MMM d, yyyy h:mm a')}</span>
                            {activity.responseReceivedAt && (
                              <span className="text-emerald-400">
                                Received: {format(new Date(activity.responseReceivedAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Activity size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No activities recorded yet</p>
                      <p className="text-sm mt-1">Add activities to track this task's journey</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={18} className="text-purple-400" />
                  Chairman Comments
                </h3>

                {/* Add Comment - Only for users who can perform actions */}
                {canPerformActions && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !addingComment && handleAddComment()}
                      placeholder="Add a comment..."
                      className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={addingComment || !newComment.trim()}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Send size={16} />
                    </Button>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-3">
                  {task.chairmanComments && task.chairmanComments.length > 0 ? (
                    [...task.chairmanComments].reverse().map((comment, index) => (
                      <div key={comment._id || index} className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-white">{comment.comment}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <User size={12} />
                          <span>
                            {comment.addedBy?.firstName 
                              ? `${comment.addedBy.firstName} ${comment.addedBy.lastName || ''}`.trim()
                              : 'Chairman'}
                          </span>
                          <span>•</span>
                          <span>{format(new Date(comment.addedAt), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No comments yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Paperclip size={18} className="text-purple-400" />
                    Attachments
                  </h3>
                </div>

                {/* Attachments List */}
                <div className="space-y-2">
                  {task.attachments && task.attachments.length > 0 ? (
                    task.attachments.map((attachment, index) => (
                      <div key={attachment._id || index} className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                        <Paperclip size={16} className="text-purple-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{attachment.name}</p>
                          <p className="text-xs text-slate-500">
                            {attachment.type && `${attachment.type} • `}
                            {attachment.uploadedAt && format(new Date(attachment.uploadedAt), 'MMM d, yyyy')}
                            {attachment.uploadedBy?.firstName && ` • by ${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName || ''}`}
                          </p>
                        </div>
                        <Tooltip content="Open attachment in new tab" position="left">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                          >
                            <Link size={16} className="text-cyan-400" />
                          </a>
                        </Tooltip>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Paperclip size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No attachments yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 bg-slate-800/80 flex-shrink-0">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Task List
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Task Row Component
  const TaskRow = ({ task, onClick, onBoost, canPerformActions }) => {
    const latestBoost = getLatestBoost(task);
    const isPendingBoost = hasPendingBoost(task);
    const hasResponse = latestBoost?.response;
    
    return (
      <div 
        className={`p-3 sm:p-4 bg-slate-800/50 rounded-xl border transition-all cursor-pointer group ${
          isPendingBoost 
            ? 'border-yellow-500/50 bg-yellow-500/5' 
            : 'border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800'
        }`}
        onClick={() => onClick(task)}
      >
        {/* Mobile: Stack layout, Desktop: Row layout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Top row on mobile: Boost + Status + Task ID */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Boost Button - Only show for users who can perform actions */}
            {canPerformActions ? (
              <Tooltip 
                content={isPendingBoost ? '⏳ Boost sent - Awaiting response' : hasResponse ? '✅ Responded' : '⚡ Boost Task'}
                position="top"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBoost(task);
                  }}
                  className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                    isPendingBoost
                      ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                      : hasResponse
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-orange-500/20 hover:text-orange-400'
                  }`}
                >
                  <Zap size={16} className={isPendingBoost ? 'animate-pulse' : ''} />
                </button>
              </Tooltip>
            ) : (
              // View-only indicator for employees
              <Tooltip content={isPendingBoost ? '⏳ Boost pending' : hasResponse ? '✅ Responded' : '📋 View Only'} position="top">
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  isPendingBoost
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : hasResponse
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-700/30 text-slate-500'
                }`}>
                  <Zap size={16} />
                </div>
              </Tooltip>
            )}

            {/* Status Icon - hidden on mobile, shown on desktop */}
            <div className="hidden sm:block flex-shrink-0">
              {getStatusIcon(task.status)}
            </div>

            {/* Task ID */}
            <span 
              className="flex-shrink-0 flex items-center gap-1 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20"
            >
              <Hash size={10} />
              {getTaskId(task).replace('#', '').replace('TASK-', '')}
            </span>

            {/* Priority & Status Badges - Mobile only, inline with task ID */}
            <div className="flex sm:hidden items-center gap-1 ml-auto">
              <span 
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getPriorityColor(task.priority)}`}
              >
                {(task.priority || 'med').slice(0, 3)}
              </span>
              <span 
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(task.status)}`}
              >
                {(task.status || 'pend').slice(0, 4)}
              </span>
            </div>
          </div>

          {/* Task Title + Details */}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors text-sm sm:text-base">
              {task.title}
            </h4>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <User size={11} />
                <span className="truncate max-w-[100px] sm:max-w-none">{getEmployeeName(task)}</span>
              </span>
              {task.deadline && (
                <span 
                  className={`flex items-center gap-1 ${
                    new Date(task.deadline) < new Date() && task.status !== 'completed'
                      ? 'text-red-400'
                      : ''
                  }`}
                >
                  <Calendar size={11} />
                  {format(new Date(task.deadline), 'MMM d')}
                  {new Date(task.deadline) < new Date() && task.status !== 'completed' && (
                    <span className="text-red-400">!</span>
                  )}
                </span>
              )}
              {task.boosts?.length > 0 && (
                <span 
                  className={`flex items-center gap-1 ${
                    isPendingBoost ? 'text-yellow-400' : 'text-emerald-400'
                  }`}
                >
                  <Zap size={10} />
                  {isPendingBoost ? 'Awaiting' : 'Responded'}
                </span>
              )}
              {/* Bottleneck indicator */}
              {getOpenBottlenecks(task).length > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle size={10} />
                  {getOpenBottlenecks(task).length} bottleneck{getOpenBottlenecks(task).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Priority & Status Badges - Desktop only */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <span 
              className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}
            >
              {task.priority || 'medium'}
            </span>
            <span 
              className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}
            >
              {task.status || 'pending'}
            </span>
          </div>

          {/* Arrow - Desktop only */}
          <ChevronRight 
            size={20} 
            className="hidden sm:block text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" 
          />
        </div>

        {/* Blocker indicator */}
        {task.blocker && (
          <div 
            className="mt-2 sm:mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 flex items-center gap-2"
          >
            <AlertTriangle size={12} className="flex-shrink-0" />
            <span className="truncate">{task.blocker}</span>
          </div>
        )}

        {/* Latest boost response preview */}
        {latestBoost?.response && (
          <div 
            className="mt-2 sm:mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-start gap-2"
          >
            <Zap size={12} className="mt-0.5 flex-shrink-0" />
            <span className="truncate">Response: {latestBoost.response}</span>
          </div>
        )}
      </div>
    );
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

  const filteredTasks = getFilteredTasks();

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 pb-6 px-1 sm:px-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Chairperson Tasks
            </h1>
            <p className="text-slate-400 mt-1 text-xs sm:text-sm">
              Monitor tasks, boost priority items, and track progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-slate-400 text-xs sm:text-sm">
              {filteredTasks.length} of {tasks.length} tasks
            </span>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`w-full p-3 sm:p-4 rounded-xl border transition-all text-center ${
                  filter === btn.key
                    ? `bg-gradient-to-br ${btn.color} border-transparent shadow-lg`
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                }`}
            >
              <div className="text-xl sm:text-2xl font-bold text-white">{btn.count}</div>
              <div className={`text-xs sm:text-sm ${filter === btn.key ? 'text-white/80' : 'text-slate-400'}`}>
                {btn.label}
              </div>
            </button>
          ))}
        </div>

        {/* Task List */}
        <Card className="bg-slate-800/30 border-slate-700/50 p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-slate-700">
            <List size={18} className="text-cyan-400" />
            <h3 className="text-base sm:text-lg font-semibold text-white">
              {filter === 'all' ? 'All Tasks' : 
               filter === 'completed' ? 'Completed' :
               filter === 'pending' ? 'Pending' : 'Bottleneck'}
            </h3>
            <span className="ml-auto text-slate-400 text-xs sm:text-sm">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2 sm:space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskRow 
                  key={task._id} 
                  task={task} 
                  onClick={setSelectedTask}
                  onBoost={(task) => setBoostModal({ show: true, task })}
                  canPerformActions={canPerformActions}
                />
              ))
            ) : (
              <div className="text-center py-8 sm:py-12">
                <List size={40} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">No tasks in this category</p>
              </div>
            )}
          </div>
        </Card>

        {/* Summary - Hidden on mobile, shown on larger screens */}
        <div className="hidden sm:block text-center text-slate-500 text-xs sm:text-sm">
          Total: {tasks.length} | 
          Completed: {completedTasks.length} | 
          Pending: {pendingTasks.length} | 
          Bottleneck: {bottleneckTasks.length} |
          Rate: {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
        </div>
      </div>

      {/* Boost Modal */}
      {boostModal.show && boostModal.task && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-orange-500/20 to-yellow-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Zap size={24} className="text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Boost Task</h2>
                  <p className="text-sm text-slate-400">Expedite and request immediate update</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Task:</p>
                <p className="text-white font-medium">{boostModal.task.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Assigned to: {getEmployeeName(boostModal.task)}
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={boostMessage}
                  onChange={(e) => setBoostMessage(e.target.value)}
                  placeholder="Add a message for the assignee... (e.g., 'Need update by EOD')"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setBoostModal({ show: false, task: null });
                    setBoostMessage('');
                  }}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                  disabled={boosting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBoostTask}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                  disabled={boosting}
                >
                  {boosting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span> Boosting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap size={16} /> Boost Task
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottleneck Response Modal */}
      {bottleneckResponseModal.show && bottleneckResponseModal.task && bottleneckResponseModal.bottleneck && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <HelpCircle size={24} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Respond to Bottleneck</h2>
                  <p className="text-sm text-slate-400">Help the assignee resolve their challenge</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Task:</p>
                <p className="text-white font-medium">{bottleneckResponseModal.task.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Requested by: {bottleneckResponseModal.bottleneck.raisedBy?.firstName 
                    ? `${bottleneckResponseModal.bottleneck.raisedBy.firstName} ${bottleneckResponseModal.bottleneck.raisedBy.lastName || ''}`.trim()
                    : getEmployeeName(bottleneckResponseModal.task)}
                </p>
              </div>

              {/* Issue */}
              <div>
                <p className="text-sm text-slate-400 mb-2">Issue Raised:</p>
                <div className="bg-slate-700/50 p-3 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      bottleneckResponseModal.bottleneck.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                      bottleneckResponseModal.bottleneck.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      bottleneckResponseModal.bottleneck.urgency === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {bottleneckResponseModal.bottleneck.urgency?.toUpperCase() || 'MEDIUM'} URGENCY
                    </span>
                    <span className="text-xs text-slate-500">
                      {bottleneckResponseModal.bottleneck.raisedAt && 
                        format(new Date(bottleneckResponseModal.bottleneck.raisedAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-white">{bottleneckResponseModal.bottleneck.issue}</p>
                </div>
              </div>

              {/* Response Status */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Response Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setBottleneckStatus('acknowledged')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      bottleneckStatus === 'acknowledged'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Acknowledged
                  </button>
                  <button
                    onClick={() => setBottleneckStatus('in-progress')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      bottleneckStatus === 'in-progress'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Working on it
                  </button>
                  <button
                    onClick={() => setBottleneckStatus('resolved')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      bottleneckStatus === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              {/* Response Message */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Your Response *
                </label>
                <textarea
                  value={bottleneckResponse}
                  onChange={(e) => setBottleneckResponse(e.target.value)}
                  placeholder="Provide guidance, instructions, or let them know you're looking into it..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                  rows={4}
                />
              </div>

              {/* Resolution Notes (only if resolved) */}
              {bottleneckStatus === 'resolved' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Resolution Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={bottleneckResolution}
                    onChange={(e) => setBottleneckResolution(e.target.value)}
                    placeholder="Brief summary of how this was resolved..."
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setBottleneckResponseModal({ show: false, task: null, bottleneck: null });
                    setBottleneckResponse('');
                    setBottleneckStatus('acknowledged');
                    setBottleneckResolution('');
                  }}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                  disabled={respondingToBottleneck}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRespondToBottleneck}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                  disabled={respondingToBottleneck || !bottleneckResponse.trim()}
                >
                  {respondingToBottleneck ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span> Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send size={16} /> Send Response
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailPanel 
          task={selectedTask}
          defaultTab={filter === 'bottleneck' ? 'bottlenecks' : 'details'}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(updatedTask) => {
            // Update the task in the list and in selectedTask
            setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
            setSelectedTask(updatedTask);
          }}
          canPerformActions={canPerformActions}
        />
      )}
    </MainLayout>
  );
};

export default TasksABTesting;
