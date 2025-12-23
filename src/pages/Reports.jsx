import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import taskService from '../services/taskService';
import employeeService from '../services/employeeService';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, differenceInDays } from 'date-fns';
import {
  FileText,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  Target,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
  useAuthStore(); // Using store for authentication check
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [generating, setGenerating] = useState(false);

  // Calculate week range
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 }); // Sunday

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

  // Navigate weeks
  const goToPreviousWeek = () => {
    setSelectedWeek(subWeeks(selectedWeek, 1));
  };

  const goToNextWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, 1));
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  // Filter tasks for the selected week
  const getWeekTasks = () => {
    return tasks.filter(task => {
      // Check if task was created in this week OR has deadline in this week OR is pending from before
      const createdAt = task.createdAt ? new Date(task.createdAt) : null;
      const deadline = task.deadline ? new Date(task.deadline) : null;
      
      // Include if created in this week
      const createdInWeek = createdAt && createdAt >= weekStart && createdAt <= weekEnd;
      
      // Include if deadline is in this week
      const deadlineInWeek = deadline && deadline >= weekStart && deadline <= weekEnd;
      
      // Include if pending and created before this week (still pending from earlier)
      const pendingFromBefore = task.status !== 'completed' && createdAt && createdAt < weekEnd;
      
      const inWeek = createdInWeek || deadlineInWeek || pendingFromBefore;
      
      // Apply status filter
      const statusMatch = filterStatus === 'all' || task.status === filterStatus;
      
      // Apply employee filter
      const employeeId = task.assignedTo?._id || task.assignedTo;
      const employeeMatch = filterEmployee === 'all' || employeeId === filterEmployee;
      
      return inWeek && statusMatch && employeeMatch;
    });
  };

  const weekTasks = getWeekTasks();

  // Calculate stats
  const stats = {
    total: weekTasks.length,
    pending: weekTasks.filter(t => t.status === 'pending').length,
    inProgress: weekTasks.filter(t => t.status === 'in-progress').length,
    completed: weekTasks.filter(t => t.status === 'completed').length,
    overdue: weekTasks.filter(t => {
      if (!t.deadline) return false;
      return new Date(t.deadline) < new Date() && t.status !== 'completed';
    }).length,
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const styles = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'on-hold': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return styles[status] || styles['pending'];
  };

  // Get priority badge style
  const getPriorityBadge = (priority) => {
    const styles = {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-orange-100 text-orange-800',
      'low': 'bg-green-100 text-green-800',
    };
    return styles[priority] || styles['medium'];
  };

  // Calculate days pending
  const getDaysPending = (task) => {
    if (!task.createdAt) return 0;
    const created = new Date(task.createdAt);
    const now = new Date();
    return differenceInDays(now, created);
  };

  // Get overdue info
  const getOverdueInfo = (task) => {
    if (!task.deadline) return null;
    const deadline = new Date(task.deadline);
    const now = new Date();
    if (task.status === 'completed') return null;
    
    const daysOverdue = differenceInDays(now, deadline);
    if (daysOverdue > 0) {
      return { overdue: true, days: daysOverdue };
    }
    return null;
  };

  // Generate PDF
  const generatePDF = async () => {
    setGenerating(true);
    
    try {
      // Dynamically import jsPDF
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175);
      doc.text('PVARA - Weekly Task Report', 14, 20);
      
      // Week range
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Week: ${format(weekStart, 'MMM dd, yyyy')} - ${format(weekEnd, 'MMM dd, yyyy')}`, 14, 30);
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 37);
      
      // Stats summary
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Tasks: ${stats.total} | Pending: ${stats.pending} | In Progress: ${stats.inProgress} | Completed: ${stats.completed} | Overdue: ${stats.overdue}`, 14, 47);
      
      // Table data
      const tableData = weekTasks.map(task => {
        const assignee = task.assignedTo 
          ? `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim()
          : 'Unassigned';
        
        const overdueInfo = getOverdueInfo(task);
        const daysPending = getDaysPending(task);
        
        return [
          task.project || task.title?.substring(0, 15) || '-',
          task.title?.substring(0, 40) || '-',
          task.status || '-',
          task.priority || '-',
          assignee,
          task.deadline ? format(new Date(task.deadline), 'MMM dd, yyyy') : '-',
          task.createdAt ? format(new Date(task.createdAt), 'MMM dd, yyyy') : '-',
          task.status !== 'completed' ? `${daysPending} days` : '-',
          overdueInfo ? `${overdueInfo.days} days` : '-',
          task.blocker || '-',
        ];
      });
      
      // Create table
      autoTable(doc, {
        head: [['Task ID', 'Title', 'Status', 'Priority', 'Assigned To', 'Deadline', 'Created', 'Pending Days', 'Overdue', 'Blocker']],
        body: tableData,
        startY: 55,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 20 },
          3: { cellWidth: 18 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 22 },
          8: { cellWidth: 18 },
          9: { cellWidth: 35 },
        },
      });
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        doc.text('PVARA HRMS - Confidential', 14, doc.internal.pageSize.getHeight() - 10);
      }
      
      // Save the PDF
      const fileName = `PVARA_Weekly_Report_${format(weekStart, 'yyyy-MM-dd')}_to_${format(weekEnd, 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="text-cyan-400" />
              Weekly Reports
            </h1>
            <p className="text-slate-400 mt-1">View and download weekly task reports</p>
          </div>
          
          <Button
            onClick={generatePDF}
            disabled={generating || weekTasks.length === 0}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2 rounded-xl flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            Download PDF Report
          </Button>
        </div>

        {/* Week Navigation */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={goToPreviousWeek}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                </div>
                <div className="text-sm text-slate-400">Week {format(weekStart, 'w')} of {format(weekStart, 'yyyy')}</div>
              </div>
              
              <button
                onClick={goToNextWeek}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={goToCurrentWeek}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-sm font-medium transition-colors"
              >
                This Week
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
              
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800/50 border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Tasks</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">In Progress</p>
                <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Overdue</p>
                <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </Card>
        </div>

        {/* Tasks Table */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white">Tasks for this week</h2>
            <p className="text-sm text-slate-400">{weekTasks.length} task(s) found</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Task ID</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Title</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Priority</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Assigned To</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Deadline</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Created</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Pending Days</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Overdue</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-300">Blocker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {weekTasks.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-8 text-center text-slate-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks found for this week</p>
                    </td>
                  </tr>
                ) : (
                  weekTasks.map(task => {
                    const overdueInfo = getOverdueInfo(task);
                    const daysPending = getDaysPending(task);
                    const assignee = task.assignedTo 
                      ? `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim()
                      : 'Unassigned';
                    
                    return (
                      <tr key={task._id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="p-4">
                          <span className="text-sm font-mono text-cyan-400">{task.project || '-'}</span>
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs">
                            <p className="text-sm text-white font-medium truncate">{task.title}</p>
                            {task.category === 'meeting' && (
                              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                🎥 Meeting
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize border ${getStatusBadge(task.status)}`}>
                            {task.status?.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                              {task.assignedTo?.firstName?.[0] || '?'}
                            </div>
                            <span className="text-sm text-slate-300">{assignee}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-300">
                            {task.deadline ? format(new Date(task.deadline), 'MMM dd, yyyy') : '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-400">
                            {task.createdAt ? format(new Date(task.createdAt), 'MMM dd, yyyy') : '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          {task.status !== 'completed' ? (
                            <span className={`text-sm ${daysPending > 7 ? 'text-orange-400' : 'text-slate-400'}`}>
                              {daysPending} days
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {overdueInfo ? (
                            <span className="flex items-center gap-1 text-sm text-red-400">
                              <AlertTriangle className="w-4 h-4" />
                              {overdueInfo.days} days
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`text-sm ${task.blocker ? 'text-red-400' : 'text-slate-500'}`}>
                            {task.blocker || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Reports;
