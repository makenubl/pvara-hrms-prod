import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import taskService from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Calendar,
} from 'lucide-react';

const MyTasks = () => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateProgress, setUpdateProgress] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const filters = { myTasks: true };
      if (filter !== 'all') filters.status = filter;
      
      const data = await taskService.getAll(filters);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTask || !updateMessage.trim()) return;

    setSubmitting(true);
    try {
      await taskService.addUpdate(selectedTask._id, {
        message: updateMessage,
        progress: updateProgress ? parseInt(updateProgress) : undefined,
        status: updateStatus || undefined,
      });

      setUpdateMessage('');
      setUpdateProgress('');
      setUpdateStatus('');
      await loadTasks();
      
      // Reload selected task
      const updatedTask = await taskService.getById(selectedTask._id);
      setSelectedTask(updatedTask);
    } catch (error) {
      console.error('Failed to add update:', error);
      alert(error.message || 'Failed to add update');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'default';
      case 'blocked': return 'danger';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'default';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            My Tasks
          </h1>
          <p className="text-slate-400 mt-2">View and manage your assigned tasks</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10 p-4">
            <p className="text-slate-400 text-sm">Total</p>
            <p className="text-3xl font-bold text-cyan-300 mt-1">{stats.total}</p>
          </Card>
          <Card className="backdrop-blur-xl bg-amber-500/10 border-amber-500/20 p-4">
            <p className="text-slate-400 text-sm">Pending</p>
            <p className="text-3xl font-bold text-amber-300 mt-1">{stats.pending}</p>
          </Card>
          <Card className="backdrop-blur-xl bg-blue-500/10 border-blue-500/20 p-4">
            <p className="text-slate-400 text-sm">In Progress</p>
            <p className="text-3xl font-bold text-blue-300 mt-1">{stats.inProgress}</p>
          </Card>
          <Card className="backdrop-blur-xl bg-red-500/10 border-red-500/20 p-4">
            <p className="text-slate-400 text-sm">Blocked</p>
            <p className="text-3xl font-bold text-red-300 mt-1">{stats.blocked}</p>
          </Card>
          <Card className="backdrop-blur-xl bg-emerald-500/10 border-emerald-500/20 p-4">
            <p className="text-slate-400 text-sm">Completed</p>
            <p className="text-3xl font-bold text-emerald-300 mt-1">{stats.completed}</p>
          </Card>
          <Card className="backdrop-blur-xl bg-orange-500/10 border-orange-500/20 p-4">
            <p className="text-slate-400 text-sm">Overdue</p>
            <p className="text-3xl font-bold text-orange-300 mt-1">{stats.overdue}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'in-progress', 'blocked', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {loading ? (
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10 p-8 text-center">
              <p className="text-slate-400">Loading tasks...</p>
            </Card>
          ) : tasks.length === 0 ? (
            <Card className="backdrop-blur-xl bg-slate-900/50 border-white/10 p-8 text-center">
              <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
              <p className="text-slate-300 text-lg font-semibold">No tasks found</p>
              <p className="text-slate-400 mt-2">
                {filter === 'all' ? "You don't have any tasks assigned yet" : `No ${filter} tasks`}
              </p>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card
                key={task._id}
                className={`backdrop-blur-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                  task.status === 'completed'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : task.status === 'blocked'
                    ? 'bg-red-500/10 border-red-500/20'
                    : new Date(task.deadline) < new Date() && task.status !== 'completed'
                    ? 'bg-orange-500/10 border-orange-500/20'
                    : 'bg-blue-500/10 border-blue-500/20'
                }`}
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-white font-bold text-lg">{task.title}</h3>
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority.toUpperCase()}
                      </Badge>
                      <Badge variant={getStatusColor(task.status)}>
                        {task.status === 'in-progress' ? '⏳ In Progress' : 
                         task.status === 'blocked' ? '🚫 Blocked' : 
                         task.status === 'completed' ? '✅ Completed' :
                         task.status === 'pending' ? '⏸️ Pending' : task.status}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-slate-300 mb-3">{task.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400">Project</p>
                        <p className="text-cyan-300 font-medium">{task.project}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Department</p>
                        <p className="text-blue-300 font-medium">{task.department || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Deadline</p>
                        <p className={`font-medium ${
                          new Date(task.deadline) < new Date() && task.status !== 'completed'
                            ? 'text-red-300'
                            : 'text-amber-300'
                        }`}>
                          {format(new Date(task.deadline), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Progress</p>
                        <p className="text-purple-300 font-medium">{task.progress}%</p>
                      </div>
                    </div>
                    {task.blocker && (
                      <div className="mt-3 p-2 rounded bg-red-500/20 border border-red-500/30">
                        <p className="text-red-300 text-sm">🚨 {task.blocker}</p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col gap-2 min-w-[120px]">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Progress</p>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            task.status === 'completed' ? 'bg-emerald-400' :
                            task.status === 'blocked' ? 'bg-red-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                    {task.capacity && (
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Capacity</p>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              task.capacity >= 85 ? 'bg-red-400' :
                              task.capacity >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${task.capacity}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Task Detail Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border-cyan-500/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedTask.title}</h2>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant={getPriorityColor(selectedTask.priority)}>
                      {selectedTask.priority.toUpperCase()}
                    </Badge>
                    <Badge variant={getStatusColor(selectedTask.status)}>
                      {selectedTask.status.toUpperCase().replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {selectedTask.description && (
                <p className="text-slate-300 mb-4">{selectedTask.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-white/10">
                <div>
                  <p className="text-slate-400 text-sm">Project</p>
                  <p className="text-white font-medium">{selectedTask.project}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Department</p>
                  <p className="text-white font-medium">{selectedTask.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Deadline</p>
                  <p className="text-white font-medium">
                    {format(new Date(selectedTask.deadline), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Assigned By</p>
                  <p className="text-white font-medium">
                    {selectedTask.assignedBy?.firstName} {selectedTask.assignedBy?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 transition-all"
                        style={{ width: `${selectedTask.progress}%` }}
                      />
                    </div>
                    <span className="text-white font-medium">{selectedTask.progress}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Capacity</p>
                  <p className="text-white font-medium">{selectedTask.capacity}%</p>
                </div>
              </div>

              {selectedTask.blocker && (
                <div className="mb-4 p-3 rounded bg-red-500/20 border border-red-500/30">
                  <p className="text-red-300">🚨 Blocker: {selectedTask.blocker}</p>
                </div>
              )}

              {/* Updates Section */}
              <div className="mb-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Updates ({selectedTask.updates?.length || 0})
                </h3>
                {selectedTask.updates && selectedTask.updates.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTask.updates.slice().reverse().map((update, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-cyan-300 font-medium text-sm">
                            {update.addedBy?.firstName} {update.addedBy?.lastName}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {format(new Date(update.addedAt), 'MMM dd, h:mm a')}
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
                  <p className="text-slate-400 text-sm">No updates yet</p>
                )}
              </div>

              {/* Add Update Form */}
              <form onSubmit={handleAddUpdate} className="border-t border-white/10 pt-4">
                <h4 className="text-white font-semibold mb-3">Add Update</h4>
                <textarea
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-3"
                  placeholder="Describe your progress or any blockers..."
                  rows={3}
                  required
                />
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Update Progress (%)</label>
                    <input
                      type="number"
                      value={updateProgress}
                      onChange={(e) => setUpdateProgress(e.target.value)}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="0-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Update Status</label>
                    <select
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Keep current</option>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  >
                    {submitting ? 'Adding...' : 'Add Update'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="bg-slate-700 hover:bg-slate-600"
                  >
                    Close
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

export default MyTasks;
