import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Timer,
  Briefcase,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const Worklog = () => {
  const { user: _user } = useAuthStore();
  const [worklogs, setWorklogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('day'); // day, week, month
  const [stats, setStats] = useState({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    totalEntries: 0,
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project: '',
    task: '',
    description: '',
    hoursWorked: '',
    status: 'completed',
  });

  // Fetch worklogs
  useEffect(() => {
    fetchWorklogs();
  }, [selectedDate, viewMode]);

  const fetchWorklogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/worklogs', {
        params: { date: selectedDate, view: viewMode }
      });
      setWorklogs(response.data.worklogs || []);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Error fetching worklogs:', error);
      // Use mock data if API not available
      const mockLogs = generateMockWorklogs();
      setWorklogs(mockLogs);
      calculateStats(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  const generateMockWorklogs = () => {
    return [
      {
        _id: '1',
        date: selectedDate,
        project: 'HRMS Development',
        task: 'Frontend Development',
        description: 'Implemented worklog feature with CRUD operations',
        hoursWorked: 4,
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
      {
        _id: '2',
        date: selectedDate,
        project: 'HRMS Development',
        task: 'API Integration',
        description: 'Connected worklog API endpoints with frontend',
        hoursWorked: 3,
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
      {
        _id: '3',
        date: selectedDate,
        project: 'Documentation',
        task: 'Technical Docs',
        description: 'Updated API documentation for new endpoints',
        hoursWorked: 1.5,
        status: 'in-progress',
        createdAt: new Date().toISOString(),
      },
    ];
  };

  const calculateStats = (logs) => {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date();
    monthStart.setDate(1);

    const todayHours = logs
      .filter(log => log.date === today)
      .reduce((sum, log) => sum + log.hoursWorked, 0);

    const weekHours = logs
      .filter(log => new Date(log.date) >= weekStart)
      .reduce((sum, log) => sum + log.hoursWorked, 0);

    const monthHours = logs
      .filter(log => new Date(log.date) >= monthStart)
      .reduce((sum, log) => sum + log.hoursWorked, 0);

    setStats({
      todayHours,
      weekHours,
      monthHours,
      totalEntries: logs.length,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLog) {
        await api.put(`/worklogs/${editingLog._id}`, formData);
        toast.success('Worklog updated successfully');
      } else {
        await api.post('/worklogs', formData);
        toast.success('Worklog added successfully');
      }
      setShowAddModal(false);
      setEditingLog(null);
      resetForm();
      fetchWorklogs();
    } catch (error) {
      console.error('Error saving worklog:', error);
      toast.error('Failed to save worklog');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this worklog entry?')) return;
    try {
      await api.delete(`/worklogs/${id}`);
      toast.success('Worklog deleted');
      fetchWorklogs();
    } catch (error) {
      console.error('Error deleting worklog:', error);
      toast.error('Failed to delete worklog');
    }
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      date: log.date,
      project: log.project,
      task: log.task,
      description: log.description,
      hoursWorked: log.hoursWorked,
      status: log.status,
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      project: '',
      task: '',
      description: '',
      hoursWorked: '',
      status: 'completed',
    });
  };

  const navigateDate = (direction) => {
    const date = new Date(selectedDate);
    if (viewMode === 'day') {
      date.setDate(date.getDate() + direction);
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() + (direction * 7));
    } else {
      date.setMonth(date.getMonth() + direction);
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'in-progress': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'pending': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Work Log
          </h1>
          <p className="text-slate-400 mt-1">Track your daily work activities and hours</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingLog(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-semibold transition-all"
        >
          <Plus size={20} />
          Add Entry
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Timer className="text-cyan-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.todayHours}h</p>
              <p className="text-slate-400 text-sm">Today</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="text-emerald-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.weekHours}h</p>
              <p className="text-slate-400 text-sm">This Week</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.monthHours}h</p>
              <p className="text-slate-400 text-sm">This Month</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <FileText className="text-amber-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalEntries}</p>
              <p className="text-slate-400 text-sm">Total Entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Navigation & View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 py-2 bg-slate-800 rounded-lg min-w-[200px] text-center">
            <span className="font-medium">{formatDate(selectedDate)}</span>
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {['day', 'week', 'month'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                viewMode === mode
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Worklog List */}
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading worklogs...</p>
          </div>
        ) : worklogs.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No work entries for this period</p>
            <p className="text-slate-500 text-sm">Click "Add Entry" to log your work</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {worklogs.map((log) => (
              <div
                key={log._id}
                className="p-4 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-white">{log.project}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">{log.task}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{log.description}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(log.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {log.hoursWorked} hours
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <p className="text-2xl font-bold text-cyan-400">{log.hoursWorked}h</p>
                    </div>
                    <button
                      onClick={() => handleEdit(log)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(log._id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total for selected period */}
      {worklogs.length > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Total Hours ({viewMode})</span>
            <span className="text-2xl font-bold text-cyan-400">
              {worklogs.reduce((sum, log) => sum + log.hoursWorked, 0)} hours
            </span>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingLog ? 'Edit Work Entry' : 'Add Work Entry'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Project</label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="e.g., HRMS Development"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Task</label>
                <input
                  type="text"
                  value={formData.task}
                  onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                  placeholder="e.g., Frontend Development"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What did you work on?"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500 resize-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={formData.hoursWorked}
                    onChange={(e) => setFormData({ ...formData, hoursWorked: parseFloat(e.target.value) })}
                    placeholder="e.g., 4"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
                  >
                    <option value="completed">Completed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLog(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-medium transition-colors"
                >
                  {editingLog ? 'Update' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Worklog;
