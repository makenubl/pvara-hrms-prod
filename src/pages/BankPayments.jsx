/**
 * Bank Payments Page
 * Payment batches and RAAST file generation
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Download,
  Send,
  CheckCircle,
  Clock,
  Banknote,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { Badge } from '../components/UI';
import api from '../services/api';

const BankPayments = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'gray', label: 'Draft' },
      pending_approval: { variant: 'yellow', label: 'Pending Approval' },
      approved: { variant: 'blue', label: 'Approved' },
      submitted: { variant: 'purple', label: 'Submitted' },
      paid: { variant: 'green', label: 'Paid' },
      rejected: { variant: 'red', label: 'Rejected' },
      failed: { variant: 'red', label: 'Failed' }
    };
    const config = statusConfig[status] || { variant: 'gray', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  useEffect(() => {
    fetchBatches();
  }, [filterStatus]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const response = await api.get(`/bank-payments${params}`);
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRaast = async (batchId) => {
    try {
      await api.post(`/bank-payments/${batchId}/generate-raast`);
      toast.success('RAAST file generated successfully!');
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate RAAST file');
    }
  };

  const handleSubmitToBank = async (batchId) => {
    if (!confirm('Are you sure you want to submit this batch to the bank?')) return;
    
    try {
      await api.post(`/bank-payments/${batchId}/submit`);
      toast.success('Batch submitted to bank successfully!');
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit batch');
    }
  };

  const handleMarkPaid = async (batchId) => {
    if (!confirm('Mark this batch as paid?')) return;
    
    try {
      await api.post(`/bank-payments/${batchId}/mark-paid`);
      toast.success('Batch marked as paid!');
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark as paid');
    }
  };

  const handleSave = async (formData) => {
    try {
      await api.post('/bank-payments', formData);
      setShowModal(false);
      toast.success('Payment batch created successfully!');
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create batch');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStats = () => {
    const total = batches.length;
    const pending = batches.filter(b => ['draft', 'pending_approval', 'approved'].includes(b.status)).length;
    const submitted = batches.filter(b => b.status === 'submitted').length;
    const paid = batches.filter(b => b.status === 'paid').length;
    const totalAmount = batches.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const paidAmount = batches.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    return { total, pending, submitted, paid, totalAmount, paidAmount };
  };

  const stats = getStats();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Bank Payments</h1>
            <p className="text-slate-400">Manage payment batches and RAAST file generation</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white rounded-xl font-semibold shadow-[0_10px_40px_-15px_rgba(56,189,248,0.5)] hover:shadow-[0_20px_60px_-20px_rgba(56,189,248,0.6)] transition-all border border-cyan-400/30"
          >
            <Plus className="w-5 h-5" />
            New Batch
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
                <Banknote className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Batches</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-400/30">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Paid</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.paid}</p>
              </div>
            </div>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6">
            <p className="text-sm text-slate-400">Total Amount</p>
            <p className="text-xl font-bold text-white">{formatCurrency(stats.totalAmount)}</p>
            <p className="text-xs text-emerald-400">Paid: {formatCurrency(stats.paidAmount)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['', 'draft', 'pending_approval', 'approved', 'submitted', 'paid'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                filterStatus === status 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border border-cyan-400/50' 
                  : 'bg-white/10 backdrop-blur-sm text-slate-300 border border-white/20 hover:bg-white/15 hover:border-cyan-400/30'
              }`}
            >
              {status === '' ? 'All' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

      {/* Batches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : batches.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              No payment batches found. Click "New Batch" to create one.
            </div>
          ) : (
            batches.map(batch => (
              <div 
                key={batch._id}
                className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl overflow-hidden hover:border-cyan-400/40 transition-all"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-mono font-bold text-white">{batch.batchNumber}</p>
                      <p className="text-sm text-slate-400">{batch.description}</p>
                    </div>
                    {getStatusBadge(batch.status)}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Payment Type:</span>
                      <span className="font-medium text-white">{batch.paymentType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Payments:</span>
                      <span className="font-medium text-white">{batch.payments?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Amount:</span>
                      <span className="font-bold text-cyan-400">{formatCurrency(batch.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Created:</span>
                      <span className="text-slate-300">{formatDate(batch.createdAt)}</span>
                    </div>
                    {batch.raastFileGenerated && (
                      <div className="flex items-center gap-1 text-emerald-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>RAAST File Generated</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-white/10">
                    <button
                      onClick={() => { setSelectedBatch(batch); setShowPaymentsModal(true); }}
                      className="flex-1 px-3 py-2 text-sm bg-white/10 backdrop-blur-sm text-slate-300 rounded-xl hover:bg-white/15 border border-white/20 hover:border-cyan-400/30 transition-all flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    
                    {batch.status === 'approved' && !batch.raastFileGenerated && (
                      <button
                        onClick={() => handleGenerateRaast(batch._id)}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/30 border border-purple-400/30 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        RAAST
                      </button>
                    )}
                    
                    {batch.status === 'approved' && batch.raastFileGenerated && (
                      <button
                        onClick={() => handleSubmitToBank(batch._id)}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-cyan-500/20 text-cyan-300 rounded-xl hover:bg-cyan-500/30 border border-cyan-400/30 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        Submit
                      </button>
                    )}
                    
                    {batch.status === 'submitted' && (
                      <button
                        onClick={() => handleMarkPaid(batch._id)}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-emerald-500/20 text-emerald-300 rounded-xl hover:bg-emerald-500/30 border border-emerald-400/30 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Batch Modal */}
        {showModal && (
          <NewBatchModal
            onSave={handleSave}
            onClose={() => setShowModal(false)}
          />
        )}

        {/* Payments Detail Modal */}
        {showPaymentsModal && selectedBatch && (
          <PaymentsDetailModal
            batch={selectedBatch}
            onClose={() => { setShowPaymentsModal(false); setSelectedBatch(null); }}
            formatCurrency={formatCurrency}
            getStatusBadge={getStatusBadge}
          />
        )}
      </div>
    </MainLayout>
  );
};

// New Batch Modal
const NewBatchModal = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({
    description: '',
    paymentType: 'vendor',
    bankAccount: {
      bankName: '',
      accountNumber: '',
      accountTitle: ''
    },
    scheduledDate: new Date().toISOString().split('T')[0],
    payments: []
  });

  const [newPayment, setNewPayment] = useState({
    beneficiaryName: '',
    beneficiaryAccount: '',
    beneficiaryBank: '',
    amount: '',
    purpose: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setNewPayment(prev => ({ ...prev, [name]: value }));
  };

  const addPayment = () => {
    if (!newPayment.beneficiaryName || !newPayment.amount) return;
    
    setFormData(prev => ({
      ...prev,
      payments: [...prev.payments, { ...newPayment, amount: parseFloat(newPayment.amount) }]
    }));
    setNewPayment({
      beneficiaryName: '',
      beneficiaryAccount: '',
      beneficiaryBank: '',
      amount: '',
      purpose: ''
    });
  };

  const removePayment = (index) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.payments.length === 0) {
      toast.error('Please add at least one payment');
      return;
    }
    onSave(formData);
  };

  const totalAmount = formData.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/90 border border-white/20 rounded-2xl shadow-[0_30px_120px_-40px_rgba(0,0,0,0.9)] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">New Payment Batch</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                placeholder="e.g., Vendor Payments - December 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Payment Type
              </label>
              <select
                name="paymentType"
                value={formData.paymentType}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              >
                <option value="vendor" className="bg-slate-800">Vendor Payment</option>
                <option value="salary" className="bg-slate-800">Salary</option>
                <option value="pension" className="bg-slate-800">Pension</option>
                <option value="gpf" className="bg-slate-800">GPF</option>
                <option value="other" className="bg-slate-800">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Scheduled Date
              </label>
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              />
            </div>
          </div>

          {/* Bank Account */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Source Bank Account</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Bank Name</label>
                <input
                  type="text"
                  name="bankAccount.bankName"
                  value={formData.bankAccount.bankName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Account Number</label>
                <input
                  type="text"
                  name="bankAccount.accountNumber"
                  value={formData.bankAccount.accountNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Account Title</label>
                <input
                  type="text"
                  name="bankAccount.accountTitle"
                  value={formData.bankAccount.accountTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Add Payment */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Add Payments</h3>
            <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="beneficiaryName"
                  value={newPayment.beneficiaryName}
                  onChange={handlePaymentChange}
                  placeholder="Beneficiary Name"
                  className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                />
                <input
                  type="text"
                  name="beneficiaryAccount"
                  value={newPayment.beneficiaryAccount}
                  onChange={handlePaymentChange}
                  placeholder="Account/IBAN"
                  className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                />
                <input
                  type="text"
                  name="beneficiaryBank"
                  value={newPayment.beneficiaryBank}
                  onChange={handlePaymentChange}
                  placeholder="Bank Name"
                  className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                />
                <input
                  type="number"
                  name="amount"
                  value={newPayment.amount}
                  onChange={handlePaymentChange}
                  placeholder="Amount (PKR)"
                  className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                />
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  name="purpose"
                  value={newPayment.purpose}
                  onChange={handlePaymentChange}
                  placeholder="Purpose"
                  className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={addPayment}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-[0_10px_40px_-15px_rgba(56,189,248,0.5)] transition-all border border-cyan-400/30"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Payments List */}
          {formData.payments.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-300">
                  Payments ({formData.payments.length})
                </h3>
                <span className="font-bold text-cyan-400">
                  Total: PKR {totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-400 uppercase tracking-wider text-xs">Beneficiary</th>
                      <th className="px-4 py-3 text-left text-slate-400 uppercase tracking-wider text-xs">Account</th>
                      <th className="px-4 py-3 text-right text-slate-400 uppercase tracking-wider text-xs">Amount</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.payments.map((payment, index) => (
                      <tr key={index} className="hover:bg-white/5 border-b border-white/10">
                        <td className="px-4 py-3 text-white">{payment.beneficiaryName}</td>
                        <td className="px-4 py-3 text-slate-400">{payment.beneficiaryAccount}</td>
                        <td className="px-4 py-3 text-right text-white">
                          {payment.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removePayment(index)}
                            className="p-2 hover:bg-rose-500/20 hover:border-rose-400/50 border border-transparent rounded-lg transition-all text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-300 hover:bg-white/10 rounded-xl border border-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white rounded-xl font-semibold shadow-[0_10px_40px_-15px_rgba(56,189,248,0.5)] hover:shadow-[0_20px_60px_-20px_rgba(56,189,248,0.6)] transition-all border border-cyan-400/30"
            >
              Create Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Payments Detail Modal
const PaymentsDetailModal = ({ batch, onClose, formatCurrency, getStatusBadge }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/90 border border-white/20 rounded-2xl shadow-[0_30px_120px_-40px_rgba(0,0,0,0.9)] w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white">
                Batch: {batch.batchNumber}
              </h2>
              <p className="text-sm text-slate-400">{batch.description}</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(batch.status)}
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Batch Info */}
          <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
            <div>
              <p className="text-xs text-slate-400">Payment Type</p>
              <p className="font-medium text-white">{batch.paymentType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Payments</p>
              <p className="font-medium text-white">{batch.payments?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Amount</p>
              <p className="font-bold text-cyan-400">{formatCurrency(batch.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">RAAST File</p>
              <p className={`font-medium ${batch.raastFileGenerated ? 'text-emerald-400' : 'text-slate-500'}`}>
                {batch.raastFileGenerated ? 'Generated' : 'Not Generated'}
              </p>
            </div>
          </div>

          {/* Payments Table */}
          <h3 className="text-lg font-semibold text-white mb-4">Payments</h3>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Beneficiary</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Bank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Purpose</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {batch.payments?.map((payment, index) => (
                  <tr key={index} className="hover:bg-white/5 border-b border-white/10">
                    <td className="px-4 py-3 text-white">{payment.beneficiaryName}</td>
                    <td className="px-4 py-3 text-slate-400">{payment.beneficiaryBank}</td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                      {payment.beneficiaryAccount}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{payment.purpose}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white/5">
                <tr>
                  <td colSpan="4" className="px-4 py-3 text-right font-semibold text-white">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-cyan-400">
                    {formatCurrency(batch.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-slate-300 hover:bg-white/10 rounded-xl border border-white/20 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankPayments;
