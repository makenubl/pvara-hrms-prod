import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Modal } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import employeeService from '../services/employeeService';
import taskService from '../services/taskService';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

const TaskManagement = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Form state for new/edit task
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    project: '',
    priority: 'medium',
    deadline: '',
    status: 'pending',
  });

  // Check if user can manage tasks
  const canManageTasks = ['admin', 'manager', 'hr', 'chairman', 'executive', 'director', 'hod', 'teamlead'].includes(user?.role);

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

  const generateTaskId = () => {
    const year = new Date().getFullYear();
    const count = tasks.length + 1;
    return `TASK-${year}-${String(count).padStart(4, '0')}`;
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!taskForm.title || !taskForm.assignedTo || !taskForm.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const newTask = await taskService.create({
        ...taskForm,
        project: taskForm.project || generateTaskId(),
      });
      
      setTasks([newTask, ...tasks]);
      setShowCreateModal(false);
      resetForm();
      toast.success('Task created successfully!');
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
      project: task.project || '',
      priority: task.priority || 'medium',
      deadline: task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '',
      status: task.status || 'pending',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      assignedTo: '',
      project: '',
      priority: 'medium',
      deadline: '',
      status: 'pending',
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.project?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
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

  if (!canManageTasks) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="bg-slate-900/50 border-red-500/30 p-8 text-center">
            <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400">You don't have permission to manage tasks.</p>
            <p className="text-slate-500 text-sm mt-2">Contact your administrator for access.</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

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
                      <p className="text-white text-sm font-medium truncate">{task.title}</p>
                      <p className="text-slate-500 text-xs truncate">{task.description || 'No description'}</p>
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
                        {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy') : 'No deadline'}
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
                    <div className="col-span-2 flex items-center justify-center gap-2">
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
                <h2 className="text-xl font-bold text-white">Assign New Task</h2>
                <p className="text-slate-400 text-sm">Task ID: <span className="text-cyan-400 font-mono">{generateTaskId()}</span></p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="e.g., Complete API integration"
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
                  placeholder="Detailed description of the task..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Assign To *</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    required
                  >
                    <option value="">Select Team Member</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} - {emp.department || 'No Dept'}
                      </option>
                    ))}
                  </select>
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
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  <Plus size={18} className="mr-2" />
                  Assign Task
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
                  <label className="block text-sm font-medium text-slate-300 mb-1">Assign To *</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    required
                  >
                    <option value="">Select Team Member</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} - {emp.department || 'No Dept'}
                      </option>
                    ))}
                  </select>
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
    </MainLayout>
  );
};

export default TaskManagement;
