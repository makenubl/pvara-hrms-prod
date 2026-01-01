import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Modal } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import employeeService from '../services/employeeService';
import taskService from '../services/taskService';
import DependencyManager from '../components/DependencyManager';
import { format, differenceInDays } from 'date-fns';
import {
  Plus,
  X,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Trash2,
  Edit2,
  Activity,
  Target,
  Users,
  ChevronDown,
  Flag,
  Eye,
  Paperclip,
  MessageSquare,
  Upload,
  Video,
  Link2,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TaskManagement = () => {
  const { user, role } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [activeDetailTab, setActiveDetailTab] = useState('details');
  const [attachmentForm, setAttachmentForm] = useState({ name: '', url: '', type: 'document' });
  const [submitting, setSubmitting] = useState(false);

  // Form state for new/edit task
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    secondaryAssignees: [],
    project: '',
    priority: 'medium',
    deadline: '',
    status: 'pending',
    category: 'task',
    meetingDateTime: '',
    meetingEndTime: '',
    meetingLocation: '',
    attendees: [],
  });

  // Check if user can manage all tasks (admin, chairman, managers)
  // Use top-level role from authStore for consistency
  const canManageAllTasks = ['admin', 'manager', 'hr', 'chairman', 'executive', 'director', 'hod', 'teamlead'].includes(role);
  
  // Check if user is an employee (restricted access)
  const isEmployee = role === 'employee';
  
  // Debug: Log role
  console.log('TaskManagement - role:', role, 'isEmployee:', isEmployee, 'canManageAllTasks:', canManageAllTasks);
  
  // Check if user can edit/delete a specific task
  const canEditTask = (task) => {
    if (canManageAllTasks) return true;
    // Employees can only edit their own tasks
    const taskAssignee = task.assignedTo?._id || task.assignedTo;
    return taskAssignee === user?._id;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, employeesRes] = await Promise.all([
        taskService.getAll({ all: 'true' }),
        employeeService.getAll(),
      ]);
      setTasks(tasksRes || []);
      setEmployees(employeesRes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Safe date formatter - prevents crashes on invalid dates
  const safeFormat = (dateValue, formatString, fallback = 'N/A') => {
    if (!dateValue) return fallback;
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return fallback;
      return format(date, formatString);
    } catch {
      return fallback;
    }
  };

  const generateTaskId = () => {
    const year = new Date().getFullYear();
    const count = tasks.length + 1;
    return `TASK-${year}-${String(count).padStart(4, '0')}`;
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    // For employees, automatically assign to themselves
    const assignedTo = isEmployee ? user?._id : taskForm.assignedTo;
    
    // For meetings, use meeting date as deadline if not set
    const deadline = taskForm.deadline || (taskForm.category === 'meeting' && taskForm.meetingDateTime 
      ? taskForm.meetingDateTime.split('T')[0] 
      : null);
    
    if (!taskForm.title || !assignedTo) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Require deadline for tasks, meeting date for meetings
    if (taskForm.category === 'task' && !deadline) {
      toast.error('Please set a deadline');
      return;
    }
    
    if (taskForm.category === 'meeting' && !taskForm.meetingDateTime) {
      toast.error('Please set meeting date and time');
      return;
    }

    try {
      const newTask = await taskService.create({
        ...taskForm,
        assignedTo,
        deadline: deadline || taskForm.meetingDateTime?.split('T')[0],
        project: taskForm.project || generateTaskId(),
      });
      
      setTasks([newTask, ...tasks]);
      setShowCreateModal(false);
      resetForm();
      toast.success(taskForm.category === 'meeting' ? 'Meeting scheduled successfully!' : 'Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create task');
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    
    if (!selectedTask) return;

    try {
      const updatedTask = await taskService.update(selectedTask._id, taskForm);
      setTasks(tasks.map(t => t._id === selectedTask._id ? updatedTask : t));
      setShowEditModal(false);
      setSelectedTask(null);
      resetForm();
      toast.success('Task updated successfully!');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskService.delete(taskId);
      setTasks(tasks.filter(t => t._id !== taskId));
      toast.success('Task deleted successfully!');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to delete task');
    }
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      secondaryAssignees: (task.secondaryAssignees || []).map(s => s._id || s),
      project: task.project || '',
      priority: task.priority || 'medium',
      deadline: safeFormat(task.deadline, 'yyyy-MM-dd', ''),
      status: task.status || 'pending',
      category: task.category || 'task',
      meetingDateTime: safeFormat(task.meetingDateTime, "yyyy-MM-dd'T'HH:mm", ''),
      meetingEndTime: safeFormat(task.meetingEndTime, "yyyy-MM-dd'T'HH:mm", ''),
      meetingLocation: task.meetingLocation || '',
      attendees: task.attendees?.map(a => a.user?._id || a.user) || [],
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      assignedTo: '',
      secondaryAssignees: [],
      project: '',
      priority: 'medium',
      deadline: '',
      status: 'pending',
      category: 'task',
      meetingDateTime: '',
      meetingEndTime: '',
      meetingLocation: '',
      attendees: [],
    });
  };

  // Open detail modal
  const openDetailModal = async (task) => {
    try {
      const fullTask = await taskService.getById(task._id);
      setSelectedTask(fullTask);
      setActiveDetailTab('details');
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load task details:', error);
      toast.error('Failed to load task details');
    }
  };

  // Add attachment handler (for assigner)
  const handleAddAttachment = async (e) => {
    e.preventDefault();
    if (!selectedTask || !attachmentForm.name.trim() || !attachmentForm.url.trim()) return;

    setSubmitting(true);
    try {
      await taskService.addAttachment(selectedTask._id, attachmentForm);
      setAttachmentForm({ name: '', url: '', type: 'document' });
      const updatedTask = await taskService.getById(selectedTask._id);
      setSelectedTask(updatedTask);
      toast.success('Attachment added');
    } catch (error) {
      console.error('Failed to add attachment:', error);
      toast.error(error.message || 'Failed to add attachment');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete attachment handler
  const handleDeleteAttachment = async (attachmentId) => {
    if (!selectedTask || !confirm('Delete this attachment?')) return;

    setSubmitting(true);
    try {
      await taskService.deleteAttachment(selectedTask._id, attachmentId);
      const updatedTask = await taskService.getById(selectedTask._id);
      setSelectedTask(updatedTask);
      toast.success('Attachment deleted');
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      toast.error(error.message || 'Failed to delete attachment');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.project?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.assignedTo?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.assignedTo?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const taskAssigneeId = task.assignedTo?._id || task.assignedTo;
    const matchesEmployee = filterEmployee === 'all' || taskAssigneeId === filterEmployee;
    return matchesSearch && matchesStatus && matchesPriority && matchesEmployee;
  });

  // Get deadline status
  const getDeadlineStatus = (task) => {
    if (!task.deadline) return { status: 'none', color: 'text-slate-400', label: 'No deadline' };
    
    const deadline = new Date(task.deadline);
    const now = new Date();
    const daysLeft = differenceInDays(deadline, now);

    if (task.status === 'completed') {
      return { status: 'completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Completed' };
    }
    if (deadline < now) {
      return { status: 'overdue', color: 'text-red-400', bg: 'bg-red-500/10', label: 'Overdue' };
    }
    if (daysLeft <= 3) {
      return { status: 'close', color: 'text-amber-400', bg: 'bg-amber-500/10', label: daysLeft === 0 ? 'Due Today' : `${daysLeft}d left` };
    }
    return { status: 'on-track', color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'On Track' };
  };

  // Task statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length,
  };

  // Note: All users can access Task Management, but with different permissions
  // Employees can only create tasks for themselves and edit their own tasks

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Task Management</h1>
            <p className="text-slate-400">Assign and manage tasks for your team</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Plus size={18} className="mr-2" />
            Assign New Task
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-slate-900/50 border-slate-700/50 p-4">
            <p className="text-2xl font-black text-cyan-400">{stats.total}</p>
            <p className="text-slate-400 text-sm">Total Tasks</p>
          </Card>
          <Card className="bg-slate-900/50 border-slate-700/50 p-4">
            <p className="text-2xl font-black text-slate-400">{stats.pending}</p>
            <p className="text-slate-400 text-sm">Pending</p>
          </Card>
          <Card className="bg-slate-900/50 border-slate-700/50 p-4">
            <p className="text-2xl font-black text-blue-400">{stats.inProgress}</p>
            <p className="text-slate-400 text-sm">In Progress</p>
          </Card>
          <Card className="bg-slate-900/50 border-slate-700/50 p-4">
            <p className="text-2xl font-black text-emerald-400">{stats.completed}</p>
            <p className="text-slate-400 text-sm">Completed</p>
          </Card>
          <Card className="bg-slate-900/50 border-slate-700/50 p-4">
            <p className="text-2xl font-black text-red-400">{stats.blocked}</p>
            <p className="text-slate-400 text-sm">Blocked</p>
          </Card>
          <Card className="bg-slate-900/50 border-slate-700/50 p-4">
            <p className="text-2xl font-black text-amber-400">{stats.overdue}</p>
            <p className="text-slate-400 text-sm">Overdue</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Employee Filter - only show for managers/admins */}
          {canManageAllTasks && (
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 min-w-[180px]"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Task Table */}
        <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 text-xs font-medium text-slate-400 uppercase tracking-wider">
            <div className="col-span-1">ID</div>
            <div className="col-span-3">Task</div>
            <div className="col-span-2">Assigned To</div>
            <div className="col-span-2">Deadline</div>
            <div className="col-span-1 text-center">Priority</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-700/30 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Target className="mx-auto text-slate-600 mb-2" size={32} />
                <p>No tasks found</p>
              </div>
            ) : (
              filteredTasks.map((task, idx) => {
                const assignee = typeof task.assignedTo === 'object' 
                  ? task.assignedTo 
                  : employees.find(e => e._id === task.assignedTo);
                const deadlineInfo = getDeadlineStatus(task);

                return (
                  <div 
                    key={task._id || idx}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-800/30 transition-colors ${
                      deadlineInfo.status === 'overdue' ? 'bg-red-500/5' :
                      deadlineInfo.status === 'close' ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Task ID */}
                    <div className="col-span-1">
                      <span className="text-slate-500 text-xs font-mono">
                        {task.project?.includes('TASK-') ? task.project.split('-').slice(-1)[0] : `#${String(idx + 1).padStart(3, '0')}`}
                      </span>
                    </div>

                    {/* Task Title & Description */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        {task.category === 'meeting' && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium">
                            <Video size={10} className="inline mr-0.5" />MTG
                          </span>
                        )}
                        <p className="text-white text-sm font-medium truncate">{task.title}</p>
                      </div>
                      {task.category === 'meeting' && task.meetingDateTime ? (
                        <p className="text-purple-400 text-xs truncate">
                          📅 {safeFormat(task.meetingDateTime, 'MMM d, yyyy h:mm a')}
                          {task.attendees?.length > 0 && ` • ${task.attendees.length} attendee(s)`}
                        </p>
                      ) : (
                        <p className="text-slate-500 text-xs truncate">{task.description || 'No description'}</p>
                      )}
                    </div>

                    {/* Assigned To */}
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {assignee?.firstName?.[0]}{assignee?.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-300 text-sm truncate block">
                          {assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned'}
                        </span>
                        <span className="text-slate-500 text-xs truncate block">
                          {assignee?.department || ''}
                        </span>
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="col-span-2">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${deadlineInfo.bg} ${deadlineInfo.color}`}>
                        <Calendar size={12} />
                        {safeFormat(task.deadline, 'MMM d, yyyy', 'No deadline')}
                      </div>
                      <p className={`text-[10px] mt-0.5 ${deadlineInfo.color}`}>
                        {deadlineInfo.label}
                      </p>
                    </div>

                    {/* Priority */}
                    <div className="col-span-1 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                        task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        task.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        <Flag size={10} />
                        {task.priority}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                        task.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {task.status?.replace('-', ' ')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        onClick={() => openDetailModal(task)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} className="text-slate-400 hover:text-emerald-400" />
                      </button>
                      {canEditTask(task) && (
                        <>
                          <button
                            onClick={() => openEditModal(task)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 size={16} className="text-slate-400 hover:text-cyan-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 size={16} className="text-slate-400 hover:text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
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

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {taskForm.category === 'meeting' ? '📅 Schedule Meeting' : 'Assign New Task'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {taskForm.category === 'meeting' ? 'Meeting' : 'Task'} ID: <span className="text-cyan-400 font-mono">{taskForm.category === 'meeting' ? 'MTG-' : ''}{generateTaskId()}</span>
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTaskForm({ ...taskForm, category: 'task' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                      taskForm.category === 'task'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Target size={18} />
                    Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskForm({ ...taskForm, category: 'meeting' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                      taskForm.category === 'meeting'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Video size={18} />
                    Meeting
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {taskForm.category === 'meeting' ? 'Meeting Title *' : 'Task Title *'}
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder={taskForm.category === 'meeting' ? 'e.g., Weekly Team Sync' : 'e.g., Complete API integration'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {taskForm.category === 'meeting' ? 'Agenda/Description' : 'Description'}
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none focus:ring-2 focus:ring-cyan-500"
                  rows={3}
                  placeholder={taskForm.category === 'meeting' ? 'Meeting agenda and discussion points...' : 'Detailed description of the task...'}
                />
              </div>

              {/* Meeting-specific fields */}
              {taskForm.category === 'meeting' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={taskForm.meetingDateTime}
                        onChange={(e) => setTaskForm({ ...taskForm, meetingDateTime: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">End Date & Time</label>
                      <input
                        type="datetime-local"
                        value={taskForm.meetingEndTime}
                        onChange={(e) => setTaskForm({ ...taskForm, meetingEndTime: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      <MapPin size={14} className="inline mr-1" />
                      Location / Meeting Link
                    </label>
                    <input
                      type="text"
                      value={taskForm.meetingLocation}
                      onChange={(e) => setTaskForm({ ...taskForm, meetingLocation: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Conference Room A or https://meet.google.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Users size={14} className="inline mr-1" />
                      Attendees (select multiple)
                    </label>
                    <div className="max-h-40 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1">
                      {employees.map((emp) => (
                        <label
                          key={emp._id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                            taskForm.attendees.includes(emp._id)
                              ? 'bg-purple-500/20 border border-purple-500/50'
                              : 'hover:bg-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={taskForm.attendees.includes(emp._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTaskForm({ ...taskForm, attendees: [...taskForm.attendees, emp._id] });
                              } else {
                                setTaskForm({ ...taskForm, attendees: taskForm.attendees.filter(id => id !== emp._id) });
                              }
                            }}
                            className="rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <p className="text-white text-sm">{emp.firstName} {emp.lastName}</p>
                            <p className="text-slate-500 text-xs">{emp.email}</p>
                          </div>
                          {emp.department && (
                            <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                              {emp.department}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    {taskForm.attendees.length > 0 && (
                      <p className="text-sm text-purple-300 mt-2">
                        {taskForm.attendees.length} attendee(s) selected
                      </p>
                    )}
                  </div>
                </>
              )}              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {taskForm.category === 'meeting' ? 'Organizer/Owner *' : 'Primary Assignee *'}
                  </label>
                  {isEmployee ? (
                    // Employees can only assign tasks to themselves
                    <div className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                      {user?.firstName} {user?.lastName} (You)
                    </div>
                  ) : (
                    <select
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                      required
                    >
                      <option value="">{taskForm.category === 'meeting' ? 'Select Organizer' : 'Select Primary Assignee'}</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} - {emp.department || 'No Dept'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {taskForm.category === 'meeting' ? 'Follow-up Deadline' : 'Deadline *'}
                  </label>
                  <input
                    type="date"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    required={taskForm.category !== 'meeting'}
                  />
                </div>
              </div>

              {/* Secondary Assignees - not for employees */}
              {!isEmployee && taskForm.category !== 'meeting' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Secondary Assignees (Optional)
                  </label>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {taskForm.secondaryAssignees.map((id) => {
                        const emp = employees.find(e => e._id === id);
                        return emp ? (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-sm"
                          >
                            {emp.firstName} {emp.lastName}
                            <button
                              type="button"
                              onClick={() => setTaskForm({
                                ...taskForm,
                                secondaryAssignees: taskForm.secondaryAssignees.filter(s => s !== id)
                              })}
                              className="ml-1 text-purple-400 hover:text-purple-200"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !taskForm.secondaryAssignees.includes(e.target.value) && e.target.value !== taskForm.assignedTo) {
                          setTaskForm({
                            ...taskForm,
                            secondaryAssignees: [...taskForm.secondaryAssignees, e.target.value]
                          });
                        }
                      }}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Add secondary assignee...</option>
                      {employees
                        .filter(emp => emp._id !== taskForm.assignedTo && !taskForm.secondaryAssignees.includes(emp._id))
                        .map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.firstName} {emp.lastName} - {emp.department || 'No Dept'}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-2">
                      Secondary assignees can view, update, and add comments to this task.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Project/Reference</label>
                  <input
                    type="text"
                    value={taskForm.project}
                    onChange={(e) => setTaskForm({ ...taskForm, project: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={taskForm.category === 'meeting' 
                    ? "bg-gradient-to-r from-purple-500 to-pink-600"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600"
                  }
                >
                  {taskForm.category === 'meeting' ? (
                    <>
                      <Video size={18} className="mr-2" />
                      Schedule Meeting
                    </>
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" />
                      Assign Task
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-white">Edit Task</h2>
                <p className="text-slate-400 text-sm">ID: <span className="text-cyan-400 font-mono">{selectedTask.project || selectedTask._id}</span></p>
              </div>
              <button onClick={() => { setShowEditModal(false); setSelectedTask(null); }} className="p-2 hover:bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none focus:ring-2 focus:ring-cyan-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Primary Assignee *</label>
                  {isEmployee ? (
                    // Employees cannot change assignment on their own tasks
                    <div className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                      {user?.firstName} {user?.lastName} (You)
                    </div>
                  ) : (
                    <select
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                      required
                    >
                      <option value="">Select Primary Assignee</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} - {emp.department || 'No Dept'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              {/* Secondary Assignees - not for employees */}
              {!isEmployee && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Secondary Assignees (Optional)
                  </label>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {taskForm.secondaryAssignees.map((id) => {
                        const emp = employees.find(e => e._id === id);
                        return emp ? (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-sm"
                          >
                            {emp.firstName} {emp.lastName}
                            <button
                              type="button"
                              onClick={() => setTaskForm({
                                ...taskForm,
                                secondaryAssignees: taskForm.secondaryAssignees.filter(s => s !== id)
                              })}
                              className="ml-1 text-purple-400 hover:text-purple-200"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !taskForm.secondaryAssignees.includes(e.target.value) && e.target.value !== taskForm.assignedTo) {
                          setTaskForm({
                            ...taskForm,
                            secondaryAssignees: [...taskForm.secondaryAssignees, e.target.value]
                          });
                        }
                      }}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Add secondary assignee...</option>
                      {employees
                        .filter(emp => emp._id !== taskForm.assignedTo && !taskForm.secondaryAssignees.includes(emp._id))
                        .map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.firstName} {emp.lastName} - {emp.department || 'No Dept'}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-2">
                      Secondary assignees can view, update, and add comments to this task.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Project/Reference</label>
                  <input
                    type="text"
                    value={taskForm.project}
                    onChange={(e) => setTaskForm({ ...taskForm, project: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowEditModal(false); setSelectedTask(null); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  Update Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal - for viewing activities and attachments */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div>
                <div className="flex items-center gap-3">
                  {selectedTask.category === 'meeting' && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                      <Video size={12} className="inline mr-1" />MEETING
                    </span>
                  )}
                  <h2 className="text-xl font-bold text-white">{selectedTask.title}</h2>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedTask.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                    selectedTask.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    selectedTask.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {selectedTask.priority?.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedTask.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedTask.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                    selectedTask.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {selectedTask.status?.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <button onClick={() => { setShowDetailModal(false); setSelectedTask(null); }} className="p-2 hover:bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Meeting Info Banner */}
            {selectedTask.category === 'meeting' && (
              <div className="mx-6 mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-purple-300 text-xs font-medium mb-1">📅 Date & Time</p>
                    <p className="text-white text-sm">
                      {safeFormat(selectedTask.meetingDateTime, 'EEEE, MMM d, yyyy', 'Not set')}
                    </p>
                    <p className="text-purple-400 text-sm font-medium">
                      {safeFormat(selectedTask.meetingDateTime, 'h:mm a', '')}
                      {selectedTask.meetingEndTime && (
                        <> - {safeFormat(selectedTask.meetingEndTime, 'h:mm a')}</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-purple-300 text-xs font-medium mb-1">📍 Location</p>
                    <p className="text-white text-sm">
                      {selectedTask.meetingLocation || 'Not specified'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-purple-300 text-xs font-medium mb-1">👥 Attendees ({selectedTask.attendees?.length || 0})</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.attendees?.length > 0 ? (
                        selectedTask.attendees.map((att, idx) => (
                          <div key={att.user?._id || idx} className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded-lg">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[8px] font-bold">
                              {att.user?.firstName?.[0]}{att.user?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-white text-xs">
                                {att.user?.firstName} {att.user?.lastName}
                              </p>
                              <p className="text-slate-500 text-[10px]">{att.email}</p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              att.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                              att.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                              att.status === 'tentative' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-600 text-slate-400'
                            }`}>
                              {att.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No attendees</p>
                      )}
                    </div>
                    {selectedTask.attendees?.some(a => a.notifiedAt) && (
                      <p className="text-slate-500 text-[10px] mt-2">
                        📧 Notifications sent: {safeFormat(selectedTask.attendees[0]?.notifiedAt, 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 border-b border-slate-700">
              {[
                { id: 'details', label: 'Details', icon: Target },
                { id: 'dependencies', label: 'Dependencies', icon: Link2, count: selectedTask.dependencies?.length || 0 },
                { id: 'updates', label: 'Updates', icon: MessageSquare, count: selectedTask.updates?.length || 0 },
                { id: 'activities', label: 'Activities', icon: Activity, count: selectedTask.activities?.length || 0 },
                { id: 'attachments', label: 'Attachments', icon: Paperclip, count: selectedTask.attachments?.length || 0 },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 font-medium transition-all border-b-2 -mb-[1px] ${
                    activeDetailTab === tab.id
                      ? 'text-cyan-400 border-cyan-400'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeDetailTab === tab.id ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Details Tab */}
              {activeDetailTab === 'details' && (
                <div className="space-y-4">
                  {selectedTask.description && (
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Description</p>
                      <p className="text-white">{selectedTask.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-slate-400 text-sm">Project</p>
                      <p className="text-white font-medium">{selectedTask.project || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Primary Assignee</p>
                      <p className="text-white font-medium">
                        {selectedTask.assignedTo?.firstName} {selectedTask.assignedTo?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Deadline</p>
                      <p className="text-white font-medium">
                        {safeFormat(selectedTask.deadline, 'MMM dd, yyyy', 'No deadline')}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-cyan-400" style={{ width: `${selectedTask.progress || 0}%` }} />
                        </div>
                        <span className="text-white font-medium">{selectedTask.progress || 0}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Created</p>
                      <p className="text-white font-medium">
                        {safeFormat(selectedTask.createdAt, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Secondary Assignees */}
                  {selectedTask.secondaryAssignees && selectedTask.secondaryAssignees.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-sm mb-2">Secondary Assignees</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.secondaryAssignees.map((assignee, idx) => (
                          <span
                            key={assignee._id || idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-sm"
                          >
                            {assignee.firstName ? `${assignee.firstName} ${assignee.lastName || ''}`.trim() : 'Unknown'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dependencies Tab */}
              {activeDetailTab === 'dependencies' && (
                <DependencyManager
                  taskId={selectedTask._id}
                  dependencies={selectedTask.dependencies || []}
                  employees={employees}
                  onUpdate={async () => {
                    // Refresh the selected task
                    const updatedTask = await taskService.getById(selectedTask._id);
                    setSelectedTask(updatedTask);
                    // Also refresh the tasks list
                    const tasksRes = await taskService.getAll({ all: 'true' });
                    setTasks(tasksRes || []);
                  }}
                />
              )}

              {/* Updates Tab */}
              {activeDetailTab === 'updates' && (
                <div>
                  {selectedTask.updates && selectedTask.updates.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedTask.updates.slice().reverse().map((update, idx) => (
                        <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-cyan-300 font-medium text-sm">
                              {update.addedBy?.firstName} {update.addedBy?.lastName}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {safeFormat(update.addedAt, 'MMM dd, h:mm a')}
                            </p>
                          </div>
                          <p className="text-slate-300 text-sm">{update.message}</p>
                          {(update.progress !== undefined || update.status) && (
                            <div className="flex gap-3 mt-2">
                              {update.progress !== undefined && (
                                <span className="text-xs text-purple-300">Progress: {update.progress}%</span>
                              )}
                              {update.status && (
                                <span className="text-xs text-blue-300">Status: {update.status}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No updates yet. Updates are added by the assignee.</p>
                  )}
                </div>
              )}

              {/* Activities Tab */}
              {activeDetailTab === 'activities' && (
                <div>
                  {selectedTask.activities && selectedTask.activities.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedTask.activities.slice().reverse().map((activity, idx) => (
                        <div key={activity._id || idx} className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-white font-medium">{activity.action}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {activity.department && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                                    {activity.department}
                                  </span>
                                )}
                                {activity.poc && (
                                  <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                                    POC: {activity.poc}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              activity.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                              activity.status === 'response-received' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-amber-500/20 text-amber-300'
                            }`}>
                              {activity.status === 'pending' ? '⏳ Pending' :
                               activity.status === 'response-received' ? '📩 Response Received' :
                               '✅ Completed'}
                            </span>
                          </div>
                          {activity.notes && (
                            <p className="text-slate-400 text-sm">{activity.notes}</p>
                          )}
                          <p className="text-slate-500 text-xs mt-2">
                            Added: {safeFormat(activity.sentAt || activity.addedAt, 'MMM dd, h:mm a')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No activities yet. Activities are added by the assignee to track their journey.</p>
                  )}
                </div>
              )}

              {/* Attachments Tab */}
              {activeDetailTab === 'attachments' && (
                <div>
                  {/* Add Attachment Form */}
                  <form onSubmit={handleAddAttachment} className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-purple-500/30">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Upload size={16} />
                      Add Attachment
                    </h4>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Name *</label>
                        <input
                          type="text"
                          value={attachmentForm.name}
                          onChange={(e) => setAttachmentForm({ ...attachmentForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                          placeholder="Document name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">URL *</label>
                        <input
                          type="url"
                          value={attachmentForm.url}
                          onChange={(e) => setAttachmentForm({ ...attachmentForm, url: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                          placeholder="https://..."
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Type</label>
                        <select
                          value={attachmentForm.type}
                          onChange={(e) => setAttachmentForm({ ...attachmentForm, type: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white"
                        >
                          <option value="document">Document</option>
                          <option value="image">Image</option>
                          <option value="spreadsheet">Spreadsheet</option>
                          <option value="presentation">Presentation</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
                    >
                      {submitting ? 'Adding...' : 'Add Attachment'}
                    </Button>
                  </form>

                  {/* Attachments List */}
                  {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTask.attachments.map((attachment, idx) => (
                        <div key={attachment._id || idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5">
                          <div className="flex items-center gap-3">
                            <Paperclip size={16} className="text-purple-400" />
                            <div>
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-cyan-300 font-medium"
                              >
                                {attachment.name}
                              </a>
                              <p className="text-slate-500 text-xs">
                                {attachment.type} • {attachment.uploadedBy?.firstName} {attachment.uploadedBy?.lastName} • {safeFormat(attachment.uploadedAt, 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteAttachment(attachment._id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            disabled={submitting}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-4">No attachments yet. Add documents or files related to this task.</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700">
              <Button
                onClick={() => { setShowDetailModal(false); setSelectedTask(null); }}
                className="w-full bg-slate-700 hover:bg-slate-600"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default TaskManagement;
