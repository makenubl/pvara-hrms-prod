import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Plus, AlertCircle } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table, Modal, Input } from '../components/UI';
import { LEAVE_TYPES } from '../utils/constants';
import approvalService from '../services/approvalService';
import { useAuthStore } from '../store/authStore';

const LeaveManagement = () => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [leaveBalance, setLeaveBalance] = useState({
    annual: { used: 0, balance: 0, total: 0 },
    sick: { used: 0, balance: 0, total: 0 },
    personal: { used: 0, balance: 0, total: 0 },
    casual: { used: 0, balance: 0, total: 0 },
  });

  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  const fetchLeaveBalance = async () => {
    try {
      console.log('📤 Fetching leave balance...');
      const response = await fetch('http://localhost:5000/api/leaves/balance', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setLeaveBalance(data);
      
      // Fallback mock leave balance if API returns empty
      if (!data) {
        setLeaveBalance({
          annual: { used: 12, balance: 8, total: 20 },
          sick: { used: 2, balance: 8, total: 10 },
          personal: { used: 1, balance: 4, total: 5 },
          casual: { used: 0, balance: 3, total: 3 },
        });
      }
    } catch (err) {
      console.error('❌ Error fetching leave balance:', err);
      setLeaveBalance({
        annual: { used: 12, balance: 8, total: 20 },
        sick: { used: 2, balance: 8, total: 10 },
        personal: { used: 1, balance: 4, total: 5 },
        casual: { used: 0, balance: 3, total: 3 },
      });
    }
  };

  const statusIcons = {
    approved: <CheckCircle className="w-5 h-5 text-emerald-300" />,
    rejected: <XCircle className="w-5 h-5 text-rose-300" />,
    pending: <Clock className="w-5 h-5 text-amber-300" />,
  };

  const statusColors = {
    approved: 'green',
    rejected: 'red',
    pending: 'yellow',
  };

  // Load leave records on mount
  useEffect(() => {
    fetchLeaveRecords();
    fetchPendingApprovals();
  }, []);

  const fetchLeaveRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await approvalService.getAll({ requestType: 'leave', limit: 50 });
      const records = Array.isArray(data) ? data : data.approvals || [];
      setLeaveRecords(records);
    } catch (err) {
      setError(err.message || 'Failed to load leave records');
      setLeaveRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const data = await approvalService.getPendingForMe();
      const pending = Array.isArray(data) ? data : data.approvals || [];
      setPendingApprovals(pending);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    }
  };

  const filteredRecords = filterStatus === 'all'
    ? leaveRecords
    : leaveRecords.filter((r) => r.status === filterStatus);

  const columns = [
    {
      key: 'employeeName',
      label: 'Employee',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-white">{value || 'N/A'}</p>
          <p className="text-xs text-slate-400">{row.employeeId || 'N/A'}</p>
        </div>
      ),
    },
    {
      key: 'leaveType',
      label: 'Leave Type',
      render: (value) => <Badge variant="blue">{value || 'leave'}</Badge>,
    },
    {
      key: 'days',
      label: 'Days',
      render: (value) => <span className="font-semibold text-white">{value || '-'} days</span>,
    },
    {
      key: 'startDate',
      label: 'Period',
      render: (value, row) => <span className="text-sm text-slate-200">{value || 'N/A'} to {row.endDate || 'N/A'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <div className="flex items-center gap-2 text-white">
          {statusIcons[value] || statusIcons['pending']}
          <Badge variant={statusColors[value] || 'gray'}>{value || 'pending'}</Badge>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value) => <span className="text-slate-200">{value || '-'}</span>,
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
        setFormError('Please fill all fields');
        setSubmitting(false);
        return;
      }

      // Calculate days
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

      await approvalService.create({
        type: 'leave',
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: days,
        reason: formData.reason,
        status: 'pending',
      });

      // Refresh data
      await fetchLeaveRecords();
      setShowRequestModal(false);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      setFormError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (record) => {
    try {
      await approvalService.approve(record._id || record.id);
      await fetchLeaveRecords();
      await fetchPendingApprovals();
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    }
  };

  const handleReject = async (record) => {
    try {
      // Update to rejected status (you may need to add a reject endpoint)
      setLeaveRecords(leaveRecords.map(r => 
        (r._id || r.id) === (record._id || record.id) ? { ...r, status: 'rejected' } : r
      ));
      await fetchPendingApprovals();
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header with gradient */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Leave Management
            </h1>
            <p className="text-slate-400 mt-2">Manage employee leave requests and balances</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setShowRequestModal(true)}>
            <Plus size={20} />
            Request Leave
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-400/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Leave Balance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-100">
          {Object.entries(leaveBalance).map(([type, balance]) => (
            <Card key={type}>
              <p className="text-slate-300 text-xs font-semibold uppercase">{type} Leave</p>
              <div className="mt-2">
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-white">{balance.balance}</span>
                  <span className="text-sm text-slate-400">/ {balance.total}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Used: {balance.used}</p>
              </div>
              <div className="mt-3 w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                  style={{ width: `${(balance.used / balance.total) * 100}%` }}
                ></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <Card>
          <div className="flex items-center gap-4 text-slate-100">
            <label className="text-sm font-medium text-slate-200">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </Card>

        {/* Leave Requests Table */}
        <Card>
          <h3 className="font-semibold text-white mb-4">Leave Requests</h3>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading leave records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No leave records found</div>
          ) : (
            <Table columns={columns} data={filteredRecords} />
          )}
        </Card>

        {/* Pending Approvals & Upcoming Leaves */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-white mb-4">Pending Approvals</h3>
            <div className="space-y-3">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">No pending approvals</p>
              ) : (
                pendingApprovals.map((record) => (
                  <div key={record._id || record.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="text-slate-100">
                        <p className="font-medium text-white">{record.employeeName || 'Employee'}</p>
                        <p className="text-sm text-slate-300">{record.leaveType} Leave • {record.days || '-'} days</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {record.startDate || 'N/A'} to {record.endDate || 'N/A'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => handleApprove(record)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleReject(record)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-white mb-4">Upcoming Leaves</h3>
            <div className="space-y-3">
              {leaveRecords.filter((r) => r.status === 'approved').length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">No upcoming leaves</p>
              ) : (
                leaveRecords
                  .filter((r) => r.status === 'approved')
                  .map((record) => (
                    <div key={record._id || record.id} className="p-3 border border-white/10 rounded-lg bg-white/5">
                      <div className="flex items-center justify-between">
                        <div className="text-slate-100">
                          <p className="font-medium text-white">{record.employeeName || 'Employee'}</p>
                          <p className="text-sm text-slate-300">{record.leaveType} Leave</p>
                          <p className="text-xs text-slate-400">{record.startDate || 'N/A'} to {record.endDate || 'N/A'}</p>
                        </div>
                        <Badge variant={statusColors[record.status]}>{record.status}</Badge>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>

        {/* Leave Policies */}
        <Card>
          <h3 className="font-semibold text-white mb-4">Leave Policies</h3>
          <div className="space-y-3 text-sm text-slate-200">
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="font-medium text-white">Annual Leave</p>
              <p className="text-xs text-slate-300">20 days per year • Non-transferable</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="font-medium text-white">Sick Leave</p>
              <p className="text-xs text-slate-300">10 days per year • With medical certificate</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="font-medium text-white">Personal Leave</p>
              <p className="text-xs text-slate-300">5 days per year • 1 week notice required</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="font-medium text-white">Casual Leave</p>
              <p className="text-xs text-slate-300">3 days per year • Immediate approval</p>
            </div>
          </div>
        </Card>

        {/* Leave Request Modal */}
        <Modal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
        >
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Request Leave</h2>

            {formError && (
              <div className="p-3 bg-red-500/20 border border-red-400/50 rounded-lg mb-4">
                <p className="text-red-300 text-sm">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Leave Type</label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  required
                >
                  <option value="">Select Leave Type</option>
                  {Object.entries(LEAVE_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">From Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">To Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Reason</label>
                <textarea
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400"
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Reason for leave..."
                  required
                ></textarea>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default LeaveManagement;
