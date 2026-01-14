import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Timer,
  Target,
  TrendingUp,
  Send,
  Save,
  Users,
  Eye,
  Filter,
  X,
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Modal } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import dailyWorklogService from '../services/dailyWorklogService';
import toast from 'react-hot-toast';

const DailyStandup = () => {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'hr', 'manager'].includes(user?.role);

  // State for user's worklogs
  const [worklogs, setWorklogs] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [todaySubmitted, setTodaySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    weekEntries: 0,
    monthEntries: 0,
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Admin view state
  const [activeTab, setActiveTab] = useState('my-logs'); // 'my-logs' or 'admin'
  const [adminWorklogs, setAdminWorklogs] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Admin filters
  const [adminFilters, setAdminFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    userId: '',
    hasShowstopper: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    workedOnToday: '',
    planToWorkOn: '',
    showstopper: {
      hasShowstopper: false,
      description: '',
      priority: 'medium',
    },
  });

  // Calculate total hours
  const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    return ((endMinutes - startMinutes) / 60).toFixed(1);
  };

  const totalHours = calculateHours(formData.startTime, formData.endTime);

  // Fetch user's worklogs
  useEffect(() => {
    fetchMyWorklogs();
  }, []);

  // Fetch admin data when tab changes
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
      fetchAdminData();
    }
  }, [activeTab, adminFilters.date]);

  const fetchMyWorklogs = async () => {
    try {
      setLoading(true);
      const data = await dailyWorklogService.getMyWorklogs();
      setWorklogs(data.worklogs || []);
      setTodayLog(data.todayLog);
      setTodaySubmitted(data.todaySubmitted);
      setStats(data.stats || stats);

      // If today's log exists, populate the form
      if (data.todayLog) {
        setFormData({
          date: data.todayLog.date.split('T')[0],
          startTime: data.todayLog.startTime,
          endTime: data.todayLog.endTime,
          workedOnToday: data.todayLog.workedOnToday,
          planToWorkOn: data.todayLog.planToWorkOn,
          showstopper: data.todayLog.showstopper || {
            hasShowstopper: false,
            description: '',
            priority: 'medium',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching worklogs:', error);
      toast.error('Failed to load worklogs');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      setAdminLoading(true);
      const [logsData, statusData] = await Promise.all([
        dailyWorklogService.getAllWorklogs({
          date: adminFilters.date,
          hasShowstopper: adminFilters.hasShowstopper,
          userId: adminFilters.userId,
        }),
        dailyWorklogService.getSubmissionStatus(adminFilters.date),
      ]);
      setAdminWorklogs(logsData.worklogs || []);
      setSubmissionStatus(statusData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load team data');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.workedOnToday.trim()) {
      toast.error('Please describe what you worked on today');
      return;
    }
    if (!formData.planToWorkOn.trim()) {
      toast.error('Please describe what you plan to work on next');
      return;
    }

    try {
      if (isEditing && todayLog) {
        await dailyWorklogService.update(todayLog._id, formData);
        toast.success('Standup updated successfully!');
      } else {
        await dailyWorklogService.submit(formData);
        toast.success('Daily standup submitted!');
      }
      setShowModal(false);
      setIsEditing(false);
      fetchMyWorklogs();
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error(error.response?.data?.message || 'Failed to submit standup');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await dailyWorklogService.delete(id);
      toast.success('Entry deleted');
      fetchMyWorklogs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const openNewEntry = () => {
    if (todaySubmitted) {
      // Open in edit mode
      setIsEditing(true);
    } else {
      // Reset form for new entry
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        workedOnToday: '',
        planToWorkOn: '',
        showstopper: {
          hasShowstopper: false,
          description: '',
          priority: 'medium',
        },
      });
      setIsEditing(false);
    }
    setShowModal(true);
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const navigateDate = (direction) => {
    const date = new Date(adminFilters.date);
    date.setDate(date.getDate() + direction);
    setAdminFilters({ ...adminFilters, date: date.toISOString().split('T')[0] });
  };

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Daily Standup
            </h1>
            <p className="text-slate-400 mt-1">
              {todaySubmitted 
                ? '✅ You have submitted today\'s standup' 
                : '📝 Submit your daily work update'}
            </p>
          </div>
          <Button 
            variant={todaySubmitted ? 'secondary' : 'primary'}
            onClick={openNewEntry}
          >
            {todaySubmitted ? (
              <>
                <Edit2 size={18} />
                Edit Today's Standup
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Standup
              </>
            )}
          </Button>
        </div>

        {/* Tabs for Admin */}
        {isAdmin && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('my-logs')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'my-logs'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              My Standups
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users size={18} />
              Team Overview
            </button>
          </div>
        )}

        {/* My Standups Tab */}
        {activeTab === 'my-logs' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="!p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Timer className="text-cyan-400" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.todayHours}h</p>
                    <p className="text-slate-400 text-sm">Today</p>
                  </div>
                </div>
              </Card>
              <Card className="!p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Calendar className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.weekHours}h</p>
                    <p className="text-slate-400 text-sm">This Week</p>
                  </div>
                </div>
              </Card>
              <Card className="!p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.monthHours}h</p>
                    <p className="text-slate-400 text-sm">This Month</p>
                  </div>
                </div>
              </Card>
              <Card className="!p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="text-amber-400" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.monthEntries}</p>
                    <p className="text-slate-400 text-sm">Entries (Month)</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* My Worklogs List */}
            <Card>
              <h2 className="text-xl font-bold text-white mb-4">My Standup History</h2>
              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading...</p>
                </div>
              ) : worklogs.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2">No standups yet</p>
                  <p className="text-slate-500 text-sm">Submit your first daily standup!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {worklogs.map((log) => (
                    <div
                      key={log._id}
                      className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => viewLogDetails(log)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="font-semibold text-white">
                              {formatDate(log.date)}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-300">
                              {log.startTime} - {log.endTime}
                            </span>
                            {log.showstopper?.hasShowstopper && (
                              <Badge variant={getPriorityColor(log.showstopper.priority)}>
                                <AlertTriangle size={12} className="mr-1" />
                                {log.showstopper.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm line-clamp-2">
                            {log.workedOnToday}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-cyan-400">{log.totalHours}h</p>
                          </div>
                          <Eye size={18} className="text-slate-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isAdmin && (
          <>
            {/* Date Navigation */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigateDate(-1)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-4 py-2 bg-slate-800 rounded-lg min-w-[200px] text-center">
                <span className="font-medium">{formatDate(adminFilters.date)}</span>
              </div>
              <button
                onClick={() => navigateDate(1)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setAdminFilters({ ...adminFilters, date: new Date().toISOString().split('T')[0] })}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                Today
              </button>
              
              {/* Showstopper Filter */}
              <select
                value={adminFilters.hasShowstopper}
                onChange={(e) => setAdminFilters({ ...adminFilters, hasShowstopper: e.target.value })}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">All Entries</option>
                <option value="true">With Showstoppers</option>
                <option value="false">No Showstoppers</option>
              </select>
            </div>

            {/* Submission Status Cards */}
            {submissionStatus && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card className="!p-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{submissionStatus.stats.totalUsers}</p>
                    <p className="text-slate-400 text-sm">Total Team</p>
                  </div>
                </Card>
                <Card className="!p-4 !border-emerald-500/30">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-400">{submissionStatus.stats.submittedCount}</p>
                    <p className="text-slate-400 text-sm">Submitted</p>
                  </div>
                </Card>
                <Card className="!p-4 !border-amber-500/30">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-400">{submissionStatus.stats.notSubmittedCount}</p>
                    <p className="text-slate-400 text-sm">Pending</p>
                  </div>
                </Card>
                <Card className="!p-4 !border-red-500/30">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-400">{submissionStatus.stats.showstopperCount}</p>
                    <p className="text-slate-400 text-sm">Showstoppers</p>
                  </div>
                </Card>
                <Card className="!p-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-cyan-400">{submissionStatus.stats.submissionRate}%</p>
                    <p className="text-slate-400 text-sm">Rate</p>
                  </div>
                </Card>
              </div>
            )}

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Submitted */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="text-emerald-400" size={20} />
                  <h3 className="text-lg font-bold text-white">Submitted</h3>
                </div>
                {adminLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-slate-800 rounded-lg" />
                    ))}
                  </div>
                ) : submissionStatus?.submitted?.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No submissions yet</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {submissionStatus?.submitted?.map(({ user: u, worklog }) => (
                      <div
                        key={worklog._id}
                        onClick={() => viewLogDetails(worklog)}
                        className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                              {u.firstName?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="text-slate-500 text-xs">
                                {worklog.startTime} - {worklog.endTime} ({worklog.totalHours}h)
                              </p>
                            </div>
                          </div>
                          {worklog.showstopper?.hasShowstopper && (
                            <Badge variant={getPriorityColor(worklog.showstopper.priority)}>
                              <AlertTriangle size={12} />
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Not Submitted */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="text-amber-400" size={20} />
                  <h3 className="text-lg font-bold text-white">Not Submitted</h3>
                </div>
                {adminLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-slate-800 rounded-lg" />
                    ))}
                  </div>
                ) : submissionStatus?.notSubmitted?.length === 0 ? (
                  <p className="text-emerald-400 text-center py-8">
                    🎉 Everyone has submitted!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {submissionStatus?.notSubmitted?.map((u) => (
                      <div
                        key={u._id}
                        className="p-3 bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-sm">
                            {u.firstName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-slate-500 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        {/* Submit/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {isEditing ? 'Edit Today\'s Standup' : 'Daily Standup'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Working Schedule */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-cyan-400" />
                    Working Schedule
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
                        disabled={isEditing}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">End Time</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-cyan-400 font-semibold">Total: {totalHours} hours</span>
                  </div>
                </div>

                {/* What I Worked On */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    What I Worked On Today <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.workedOnToday}
                    onChange={(e) => setFormData({ ...formData, workedOnToday: e.target.value })}
                    placeholder="Describe the tasks and activities you completed today..."
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500 resize-none"
                    required
                  />
                </div>

                {/* What I Plan to Work On */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    What I Plan to Work On Next <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.planToWorkOn}
                    onChange={(e) => setFormData({ ...formData, planToWorkOn: e.target.value })}
                    placeholder="Describe your planned tasks for the next working day..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500 resize-none"
                    required
                  />
                </div>

                {/* Showstoppers */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showstopper.hasShowstopper}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            showstopper: { ...formData.showstopper, hasShowstopper: e.target.checked },
                          })
                        }
                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-white font-medium flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-400" />
                        I have a showstopper/roadblock
                      </span>
                    </label>
                  </div>

                  {formData.showstopper.hasShowstopper && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                        <select
                          value={formData.showstopper.priority}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              showstopper: { ...formData.showstopper, priority: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
                        >
                          <option value="low">Low - Can work around it</option>
                          <option value="medium">Medium - Affecting productivity</option>
                          <option value="critical">Critical - Completely blocked</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Describe the issue
                        </label>
                        <textarea
                          value={formData.showstopper.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              showstopper: { ...formData.showstopper, description: e.target.value },
                            })
                          }
                          placeholder="Describe the blocker and any help needed..."
                          rows={3}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1">
                    {isEditing ? (
                      <>
                        <Save size={18} />
                        Update
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedLog && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Standup Details
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      {formatDate(selectedLog.date)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* User info if admin view */}
                {selectedLog.user && typeof selectedLog.user === 'object' && (
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">
                      {selectedLog.user.firstName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">
                        {selectedLog.user.firstName} {selectedLog.user.lastName}
                      </p>
                      <p className="text-slate-400 text-sm">{selectedLog.user.email}</p>
                    </div>
                  </div>
                )}

                {/* Working Hours */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="text-cyan-400" size={24} />
                      <div>
                        <p className="text-white font-medium">Working Hours</p>
                        <p className="text-slate-400 text-sm">
                          {selectedLog.startTime} - {selectedLog.endTime}
                        </p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-cyan-400">{selectedLog.totalHours}h</p>
                  </div>
                </div>

                {/* What they worked on */}
                <div>
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-400" />
                    What I Worked On Today
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedLog.workedOnToday}</p>
                  </div>
                </div>

                {/* What they plan to work on */}
                <div>
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <Target size={18} className="text-blue-400" />
                    What I Plan to Work On Next
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedLog.planToWorkOn}</p>
                  </div>
                </div>

                {/* Showstopper */}
                {selectedLog.showstopper?.hasShowstopper && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle size={18} className="text-red-400" />
                      Showstopper / Roadblock
                      <Badge variant={getPriorityColor(selectedLog.showstopper.priority)}>
                        {selectedLog.showstopper.priority}
                      </Badge>
                    </h3>
                    <p className="text-slate-300 whitespace-pre-wrap">
                      {selectedLog.showstopper.description || 'No description provided'}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-700">
                <Button
                  variant="secondary"
                  onClick={() => setShowDetailModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default DailyStandup;
