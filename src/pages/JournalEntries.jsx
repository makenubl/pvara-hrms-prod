/**
 * Journal Entries Page
 * GL posting and accounting entries management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  RefreshCw,
  X
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Badge } from '../components/UI';
import api from '../services/api';
import toast from 'react-hot-toast';

const JournalEntries = ({ openNew = false }) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(openNew);
  const [editingEntry, setEditingEntry] = useState(null);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);

  // Handle modal close - navigate back if opened via /new route
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    if (openNew) {
      navigate(-1); // Go back to previous page (Finance Dashboard or wherever user came from)
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'draft': return 'gray';
      case 'pending': return 'yellow';
      case 'approved': return 'blue';
      case 'posted': return 'green';
      case 'rejected': return 'red';
      case 'reversed': return 'purple';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const [entriesRes, coaRes] = await Promise.all([
        api.get(`/journal-entries${params}`),
        api.get('/chart-of-accounts')
      ]);
      setEntries(entriesRes.data.data || []);
      setChartOfAccounts(coaRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/journal-entries/${id}/approve`);
      toast.success('Entry approved successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve entry');
    }
  };

  const handlePost = async (id) => {
    try {
      await api.post(`/journal-entries/${id}/post`);
      toast.success('Entry posted to GL successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post entry');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    
    try {
      await api.post(`/journal-entries/${id}/reject`, { reason });
      toast.success('Entry rejected');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject entry');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await api.delete(`/journal-entries/${id}`);
      toast.success('Entry deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete entry');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingEntry) {
        await api.put(`/journal-entries/${editingEntry._id}`, formData);
        toast.success('Entry updated successfully');
      } else {
        await api.post('/journal-entries', formData);
        toast.success('Entry created successfully');
      }
      setShowModal(false);
      setEditingEntry(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save entry');
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

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Journal Entries
            </h1>
            <p className="text-slate-400 mt-2">General Ledger posting and accounting entries</p>
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="draft" className="bg-slate-900">Draft</option>
              <option value="pending" className="bg-slate-900">Pending</option>
              <option value="approved" className="bg-slate-900">Approved</option>
              <option value="posted" className="bg-slate-900">Posted</option>
              <option value="rejected" className="bg-slate-900">Rejected</option>
            </select>
            <button 
              onClick={() => setShowModal(true)}
              className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/50 hover:to-blue-500/50 transition-all flex items-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <Plus size={20} className="relative" />
              <span className="relative">New Entry</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['draft', 'pending', 'approved', 'posted', 'rejected'].map(status => {
            const count = entries.filter(e => e.status === status).length;
            return (
              <div 
                key={status}
                className={`group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border rounded-2xl p-4 overflow-hidden cursor-pointer transition-all ${filterStatus === status ? 'border-cyan-400/50 ring-2 ring-cyan-400/30' : 'border-white/20 hover:border-cyan-400/30'}`}
                onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative">
                  <p className="text-sm text-slate-400 capitalize">{status.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold text-white">{count}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Entries Table */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Entry #</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Debit</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => {
                    const totalDebit = entry.lines?.reduce((sum, l) => sum + (l.debit || 0), 0) || 0;
                    const totalCredit = entry.lines?.reduce((sum, l) => sum + (l.credit || 0), 0) || 0;

                    return (
                      <tr key={entry._id} className="hover:bg-white/5 border-b border-white/10 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-cyan-400" />
                            <span className="font-mono font-medium text-white">{entry.entryNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">
                          {formatDate(entry.entryDate)}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-white">{entry.description}</p>
                          <p className="text-xs text-slate-400">{entry.lines?.length || 0} lines</p>
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-white font-medium">
                          {formatCurrency(totalDebit)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-white font-medium">
                          {formatCurrency(totalCredit)}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={getStatusBadgeVariant(entry.status)}>
                            {entry.status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1">
                            {entry.status === 'draft' && (
                              <>
                                <button 
                                  onClick={() => { setEditingEntry(entry); setShowModal(true); }}
                                  className="p-2 hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-transparent rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4 text-cyan-400" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(entry._id)}
                                  className="p-2 hover:bg-red-500/20 hover:border-red-400/50 border border-transparent rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </>
                            )}
                            {entry.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleApprove(entry._id)}
                                  className="p-2 hover:bg-emerald-500/20 hover:border-emerald-400/50 border border-transparent rounded-lg transition-all"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                                </button>
                                <button 
                                  onClick={() => handleReject(entry._id)}
                                  className="p-2 hover:bg-red-500/20 hover:border-red-400/50 border border-transparent rounded-lg transition-all"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4 text-red-400" />
                                </button>
                              </>
                            )}
                            {entry.status === 'approved' && (
                              <button 
                                onClick={() => handlePost(entry._id)}
                                className="px-3 py-1.5 text-xs bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/50 text-emerald-300 rounded-lg hover:from-emerald-500/50 hover:to-green-500/50 transition-all font-medium"
                              >
                                Post to GL
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {entries.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-50" />
                  <p className="text-slate-400">No journal entries found.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                  >
                    Create first entry →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Journal Entry Modal */}
        {showModal && (
          <JournalEntryModal
            entry={editingEntry}
            chartOfAccounts={chartOfAccounts}
            onSave={handleSave}
            onClose={handleCloseModal}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </MainLayout>
  );
};

// Journal Entry Modal
const JournalEntryModal = ({ entry, chartOfAccounts, onSave, onClose, formatCurrency }) => {
  const [formData, setFormData] = useState({
    entryDate: entry?.entryDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    description: entry?.description || '',
    reference: entry?.reference || '',
    entryType: entry?.entryType || 'standard',
    lines: entry?.lines || [
      { account: '', description: '', debit: 0, credit: 0 },
      { account: '', description: '', debit: 0, credit: 0 }
    ]
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: field === 'debit' || field === 'credit' ? parseFloat(value) || 0 : value } : line
      )
    }));
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { account: '', description: '', debit: 0, credit: 0 }]
    }));
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 2) return;
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = (e, submitForApproval = false) => {
    e.preventDefault();
    
    if (!isBalanced) {
      setErrors({ balance: 'Debits must equal credits' });
      return;
    }

    const submitData = {
      ...formData,
      submitForApproval
    };

    onSave(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {entry ? 'Edit Journal Entry' : 'New Journal Entry'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form className="p-6 space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Date *
              </label>
              <input
                type="date"
                name="entryDate"
                value={formData.entryDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Type
              </label>
              <select
                name="entryType"
                value={formData.entryType}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              >
                <option value="standard" className="bg-slate-900">Standard</option>
                <option value="adjusting" className="bg-slate-900">Adjusting</option>
                <option value="closing" className="bg-slate-900">Closing</option>
                <option value="reversing" className="bg-slate-900">Reversing</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reference
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="e.g., Invoice #123"
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description *
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Describe the purpose of this entry"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
            />
          </div>

          {/* Entry Lines */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-slate-300">
                Entry Lines
              </label>
              <button
                type="button"
                onClick={addLine}
                className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
              >
                + Add Line
              </button>
            </div>

            <div className="border border-white/20 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Debit</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, index) => (
                    <tr key={index} className="border-b border-white/10">
                      <td className="px-2 py-2">
                        <select
                          value={line.account}
                          onChange={(e) => handleLineChange(index, 'account', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        >
                          <option value="" className="bg-slate-900">Select Account</option>
                          {chartOfAccounts.map(account => (
                            <option key={account._id} value={account._id} className="bg-slate-900">
                              {account.code} - {account.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          placeholder="Line description"
                          className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                          placeholder="0"
                          min="0"
                          className="w-full px-3 py-2 text-sm text-right bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                          placeholder="0"
                          min="0"
                          className="w-full px-3 py-2 text-sm text-right bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        {formData.lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="p-2 hover:bg-red-500/20 hover:border-red-400/50 border border-transparent rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-white/5">
                  <tr>
                    <td colSpan="2" className="px-3 py-3 text-right font-semibold text-white">
                      Totals
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-white">
                      {formatCurrency(totalDebit)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-white">
                      {formatCurrency(totalCredit)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance Check */}
            <div className={`mt-3 p-3 rounded-xl ${isBalanced ? 'bg-emerald-500/10 border border-emerald-400/30' : 'bg-red-500/10 border border-red-400/30'}`}>
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={isBalanced ? 'text-emerald-400' : 'text-red-400'}>
                  {isBalanced 
                    ? 'Entry is balanced' 
                    : `Out of balance by ${formatCurrency(Math.abs(totalDebit - totalCredit))}`
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-300 hover:bg-white/10 rounded-xl transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all font-medium"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={!isBalanced}
              className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/80 to-blue-500/80 border border-cyan-400/50 hover:border-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">Submit for Approval</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JournalEntries;
