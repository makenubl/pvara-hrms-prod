import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { handleApprove, handleReject, handleRequestLeave } from '../utils/handlers';
import { Card, Button, Badge, Table, Modal, Input, Select } from '../components/UI';
import { LEAVE_TYPES } from '../utils/constants';

const LeaveManagement = () => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [leaveRecords] = useState([
    {
      id: 1,
      employeeId: 'EMP001',
      name: 'John Doe',
      leaveType: 'annual',
      startDate: '2025-12-15',
      endDate: '2025-12-19',
      days: 5,
      status: 'approved',
      appliedOn: '2025-12-01',
      reason: 'Vacation',
    },
    {
      id: 2,
      employeeId: 'EMP002',
      name: 'Jane Smith',
      leaveType: 'sick',
      startDate: '2025-12-10',
      endDate: '2025-12-10',
      days: 1,
      status: 'approved',
      appliedOn: '2025-12-10',
      reason: 'Medical appointment',
    },
    {
      id: 3,
      employeeId: 'EMP003',
      name: 'Bob Johnson',
      leaveType: 'personal',
      startDate: '2025-12-22',
      endDate: '2025-12-24',
      days: 3,
      status: 'pending',
      appliedOn: '2025-12-08',
      reason: 'Personal work',
    },
    {
      id: 4,
      employeeId: 'EMP004',
      name: 'Sarah Williams',
      leaveType: 'annual',
      startDate: '2025-12-01',
      endDate: '2025-12-08',
      days: 8,
      status: 'rejected',
      appliedOn: '2025-11-25',
      reason: 'Vacation',
    },
  ]);

  const leaveBalance = {
    annual: { used: 12, balance: 8, total: 20 },
    sick: { used: 2, balance: 8, total: 10 },
    personal: { used: 1, balance: 4, total: 5 },
    casual: { used: 0, balance: 3, total: 3 },
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

  const filteredRecords = filterStatus === 'all'
    ? leaveRecords
    : leaveRecords.filter((r) => r.status === filterStatus);

  const columns = [
    {
      key: 'name',
      label: 'Employee',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-white">{value}</p>
          <p className="text-xs text-slate-400">{row.employeeId}</p>
        </div>
      ),
    },
    {
      key: 'leaveType',
      label: 'Leave Type',
      render: (value) => <Badge variant="blue">{value}</Badge>,
    },
    {
      key: 'days',
      label: 'Days',
      render: (value) => <span className="font-semibold text-white">{value} days</span>,
    },
    {
      key: 'startDate',
      label: 'Period',
      render: (value, row) => <span className="text-sm text-slate-200">{value} to {row.endDate}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <div className="flex items-center gap-2 text-white">
          {statusIcons[value]}
          <Badge variant={statusColors[value]}>{value}</Badge>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value) => <span className="text-slate-200">{value}</span>,
    },
  ];

  const handleSubmit = () => {
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Please fill all fields');
      return;
    }
    handleRequestLeave(formData);
    toast.success('Leave request submitted');
    setShowRequestModal(false);
    setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
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
          <Table columns={columns} data={filteredRecords} />
        </Card>

        {/* Pending Approvals & Upcoming Leaves */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-white mb-4">Pending Approvals</h3>
            <div className="space-y-3">
              {leaveRecords
                .filter((r) => r.status === 'pending')
                .map((record) => (
                  <div key={record.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="text-slate-100">
                        <p className="font-medium text-white">{record.name}</p>
                        <p className="text-sm text-slate-300">{record.leaveType} Leave • {record.days} days</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {record.startDate} to {record.endDate}
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
                ))}
              {leaveRecords.filter((r) => r.status === 'pending').length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">No pending approvals</p>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-white mb-4">Upcoming Leaves</h3>
            <div className="space-y-3">
              {leaveRecords
                .filter((r) => r.status === 'approved')
                .map((record) => (
                  <div key={record.id} className="p-3 border border-white/10 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between">
                      <div className="text-slate-100">
                        <p className="font-medium text-white">{record.name}</p>
                        <p className="text-sm text-slate-300">{record.leaveType} Leave</p>
                        <p className="text-xs text-slate-400">{record.startDate} to {record.endDate}</p>
                      </div>
                      <Badge variant={statusColors[record.status]}>{record.status}</Badge>
                    </div>
                  </div>
                ))}
              {leaveRecords.filter((r) => r.status === 'approved').length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">No upcoming leaves</p>
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
          title="Request Leave"
          onClose={() => setShowRequestModal(false)}
        >
          <form className="space-y-4 text-slate-100">
            <Select
              label="Leave Type"
              options={Object.entries(LEAVE_TYPES).map(([key, value]) => ({
                label: key.replace('_', ' ').toUpperCase(),
                value: value,
              }))}
              required
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
            />
            <Input
              label="From Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
            <Input
              label="To Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Reason</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-300/50 transition"
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              ></textarea>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowRequestModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Submit Request</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default LeaveManagement;
