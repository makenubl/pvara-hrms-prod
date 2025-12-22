import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

const TasksABTesting = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending', 'bottleneck'
  const [selectedTask, setSelectedTask] = useState(null);

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
  const bottleneckTasks = tasks.filter(t => 
    t.status === 'blocked' || 
    (new Date(t.deadline) < new Date() && t.status !== 'completed')
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
    { key: 'bottleneck', label: 'Bottleneck', count: bottleneckTasks.length, color: 'from-red-500 to-rose-500' },
  ];

  // Task Detail Modal/Panel
  const TaskDetailPanel = ({ task, onClose, onTaskUpdate }) => {
    const [activeTab, setActiveTab] = useState('details');
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
      { key: 'details', label: 'Details', icon: FileText },
      { key: 'activities', label: 'Activities', icon: Activity, count: task.activities?.length || 0 },
      { key: 'comments', label: 'Comments', icon: MessageSquare, count: task.chairmanComments?.length || 0 },
      { key: 'attachments', label: 'Attachments', icon: Paperclip, count: task.attachments?.length || 0 },
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
                  <button
                    key={tab.key}
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

                {/* Add Comment */}
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
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                          title="Open attachment"
                        >
                          <Link size={16} className="text-cyan-400" />
                        </a>
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
  const TaskRow = ({ task, onClick }) => (
    <div 
      onClick={() => onClick(task)}
      className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {getStatusIcon(task.status)}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">
            {task.title}
          </h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <User size={12} />
              {getEmployeeName(task)}
            </span>
            {task.deadline && (
              <span className={`flex items-center gap-1 text-xs ${
                new Date(task.deadline) < new Date() && task.status !== 'completed'
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}>
                <Calendar size={12} />
                {format(new Date(task.deadline), 'MMM d, yyyy')}
                {new Date(task.deadline) < new Date() && task.status !== 'completed' && ' (Overdue)'}
              </span>
            )}
          </div>
        </div>

        {/* Priority & Status Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
            {task.priority || 'medium'}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
            {task.status || 'pending'}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight size={20} className="text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
      </div>

      {/* Blocker indicator */}
      {task.blocker && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle size={12} />
          <span className="truncate">{task.blocker}</span>
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

  const filteredTasks = getFilteredTasks();

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Chairperson Task Dashboard - v1
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Click on any task to view full details
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-slate-400 text-sm">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`p-4 rounded-xl border transition-all ${
                filter === btn.key
                  ? `bg-gradient-to-br ${btn.color} border-transparent shadow-lg`
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="text-2xl font-bold text-white">{btn.count}</div>
              <div className={`text-sm ${filter === btn.key ? 'text-white/80' : 'text-slate-400'}`}>
                {btn.label}
              </div>
            </button>
          ))}
        </div>

        {/* Task List */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-700">
            <List size={20} className="text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">
              {filter === 'all' ? 'All Tasks' : 
               filter === 'completed' ? 'Completed Tasks' :
               filter === 'pending' ? 'Pending Tasks' : 'Bottleneck Tasks'}
            </h3>
            <span className="ml-auto text-slate-400 text-sm">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskRow 
                  key={task._id} 
                  task={task} 
                  onClick={setSelectedTask}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <List size={48} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">No tasks in this category</p>
              </div>
            )}
          </div>
        </Card>

        {/* Summary */}
        <div className="text-center text-slate-500 text-sm">
          Total: {tasks.length} | 
          Completed: {completedTasks.length} | 
          Pending: {pendingTasks.length} | 
          Bottleneck: {bottleneckTasks.length} |
          Completion Rate: {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailPanel 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(updatedTask) => {
            // Update the task in the list and in selectedTask
            setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
            setSelectedTask(updatedTask);
          }}
        />
      )}
    </MainLayout>
  );
};

export default TasksABTesting;
