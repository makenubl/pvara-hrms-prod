/**
 * Budget Management Page
 * Budget formulation, tracking, and variance analysis
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  RefreshCw,
  Filter,
  X
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Badge } from '../components/UI';
import api from '../services/api';
import toast from 'react-hot-toast';

const BudgetManagement = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
  const [costCenters, setCostCenters] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [viewMode, setViewMode] = useState('summary'); // summary, detail
  const [stats, setStats] = useState({
    totalAllocated: 0,
    totalUtilized: 0,
    totalRemaining: 0,
    utilizationRate: 0
  });

  useEffect(() => {
    fetchData();
  }, [fiscalYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [budgetRes, ccRes, coaRes] = await Promise.all([
        api.get(`/budgets?fiscalYear=${fiscalYear}`),
        api.get('/cost-centers'),
        api.get('/chart-of-accounts')
      ]);
      
      const budgetData = budgetRes.data.data || [];
      setBudgets(budgetData);
      setCostCenters(ccRes.data.data || []);
      setChartOfAccounts(coaRes.data.data || []);

      // Calculate stats
      const totalAllocated = budgetData.reduce((sum, b) => sum + (b.allocatedAmount || 0), 0);
      const totalUtilized = budgetData.reduce((sum, b) => sum + (b.utilizedAmount || 0), 0);
      setStats({
        totalAllocated,
        totalUtilized,
        totalRemaining: totalAllocated - totalUtilized,
        utilizationRate: totalAllocated > 0 ? ((totalUtilized / totalAllocated) * 100).toFixed(1) : 0
      });
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    
    try {
      await api.delete(`/budgets/${id}`);
      toast.success('Budget deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete budget');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget._id}`, formData);
        toast.success('Budget updated successfully');
      } else {
        await api.post('/budgets', formData);
        toast.success('Budget created successfully');
      }
      setShowModal(false);
      setEditingBudget(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save budget');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getUtilizationStatus = (budget) => {
    const rate = budget.allocatedAmount > 0 
      ? (budget.utilizedAmount / budget.allocatedAmount) * 100 
      : 0;
    
    if (rate > 90) return { color: 'red', label: 'Critical', icon: AlertTriangle };
    if (rate > 75) return { color: 'yellow', label: 'Warning', icon: TrendingUp };
    return { color: 'green', label: 'Normal', icon: CheckCircle };
  };

  const fiscalYears = [
    (new Date().getFullYear() - 1).toString(),
    new Date().getFullYear().toString(),
    (new Date().getFullYear() + 1).toString()
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header with gradient text */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Budget Management
            </h1>
            <p className="text-slate-400 mt-2">Budget formulation, tracking, and variance analysis</p>
          </div>
          <div className="flex gap-3">
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              {fiscalYears.map(year => (
                <option key={year} value={year} className="bg-slate-900">FY {year}</option>
              ))}
            </select>
            <button 
              onClick={() => setShowModal(true)}
              className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/50 hover:to-blue-500/50 transition-all flex items-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <Plus size={20} className="relative" />
              <span className="relative">Add Budget</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - Premium Glass */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-cyan-400/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="relative space-y-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400/30 to-blue-500/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-cyan-300" />
              </div>
              <p className="text-slate-400 text-sm font-medium">Total Allocated</p>
              <p className="text-2xl font-black text-white">{formatCurrency(stats.totalAllocated)}</p>
            </div>
          </div>
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-blue-400/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="relative space-y-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400/30 to-purple-500/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-300" />
              </div>
              <p className="text-slate-400 text-sm font-medium">Total Utilized</p>
              <p className="text-2xl font-black text-blue-400">{formatCurrency(stats.totalUtilized)}</p>
            </div>
          </div>
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-emerald-400/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="relative space-y-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400/30 to-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-300" />
              </div>
              <p className="text-slate-400 text-sm font-medium">Remaining</p>
              <p className="text-2xl font-black text-emerald-400">{formatCurrency(stats.totalRemaining)}</p>
            </div>
          </div>
          <div className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 overflow-hidden hover:border-amber-400/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
            <div className="relative space-y-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400/30 to-orange-500/30 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-amber-300" />
              </div>
              <p className="text-slate-400 text-sm font-medium">Utilization Rate</p>
              <p className={`text-2xl font-black ${stats.utilizationRate > 90 ? 'text-rose-400' : stats.utilizationRate > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {stats.utilizationRate}%
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${viewMode === 'summary' 
              ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 text-white' 
              : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/30'}`}
          >
            Summary View
          </button>
          <button
            onClick={() => setViewMode('detail')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${viewMode === 'detail' 
              ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 text-white' 
              : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/30'}`}
          >
            Detailed View
          </button>
        </div>

        {/* Budget Table - Premium Glass */}
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
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Head of Account</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost Center</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Allocated</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Utilized</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Utilization</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map(budget => {
                    const remaining = budget.allocatedAmount - budget.utilizedAmount;
                    const utilizationRate = budget.allocatedAmount > 0 
                      ? ((budget.utilizedAmount / budget.allocatedAmount) * 100).toFixed(1)
                      : 0;
                    const statusInfo = getUtilizationStatus(budget);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={budget._id} className="hover:bg-white/5 border-b border-white/10 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-white">
                              {budget.headOfAccount?.name || budget.headOfAccount}
                            </p>
                            <p className="text-sm text-cyan-400 font-mono">
                              {budget.headOfAccount?.code}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">
                          {budget.costCenter?.name || budget.costCenter || 'General'}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-white font-medium">
                          {formatCurrency(budget.allocatedAmount)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-blue-400 font-medium">
                          {formatCurrency(budget.utilizedAmount)}
                        </td>
                        <td className={`px-4 py-4 text-right font-mono font-medium ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatCurrency(remaining)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center">
                            <div className="w-full max-w-[100px]">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">{utilizationRate}%</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${
                                    utilizationRate > 90 ? 'bg-gradient-to-r from-rose-500 to-red-500' : 
                                    utilizationRate > 75 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'
                                  }`}
                                  style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusInfo.color === 'red' ? 'red' : statusInfo.color === 'yellow' ? 'yellow' : 'green'}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1">
                            <button 
                              onClick={() => { setEditingBudget(budget); setShowModal(true); }}
                              className="p-2 hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-transparent rounded-lg transition-all"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4 text-cyan-400" />
                            </button>
                            <button 
                              onClick={() => handleDelete(budget._id)}
                              className="p-2 hover:bg-red-500/20 hover:border-red-400/50 border border-transparent rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {budgets.length === 0 && (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-50" />
                  <p className="text-slate-400">No budgets found for FY {fiscalYear}</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                  >
                    Create first budget →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Budget vs Actual Chart */}
        {viewMode === 'detail' && budgets.length > 0 && (
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4">Budget vs Actual</h3>
            <div className="space-y-4">
              {budgets.slice(0, 10).map(budget => {
                const utilizationRate = budget.allocatedAmount > 0 
                  ? (budget.utilizedAmount / budget.allocatedAmount) * 100
                  : 0;
                
                return (
                  <div key={budget._id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">
                        {budget.headOfAccount?.name || budget.headOfAccount}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatCurrency(budget.utilizedAmount)} / {formatCurrency(budget.allocatedAmount)}
                      </span>
                    </div>
                    <div className="relative h-6 bg-white/10 rounded-lg overflow-hidden">
                      <div 
                        className="absolute h-full bg-white/10"
                        style={{ width: '100%' }}
                      />
                      <div 
                        className={`absolute h-full rounded-lg ${
                          utilizationRate > 100 ? 'bg-gradient-to-r from-rose-500 to-red-500' : 
                          utilizationRate > 90 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'
                        }`}
                        style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                        {utilizationRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Budget Modal */}
        {showModal && (
          <BudgetModal
            budget={editingBudget}
            fiscalYear={fiscalYear}
            costCenters={costCenters}
            chartOfAccounts={chartOfAccounts.filter(a => a.type === 'expense')}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingBudget(null); }}
          />
        )}
      </div>
    </MainLayout>
  );
};

// Budget Modal
const BudgetModal = ({ budget, fiscalYear, costCenters, chartOfAccounts, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    fiscalYear: budget?.fiscalYear || fiscalYear,
    headOfAccount: budget?.headOfAccount?._id || budget?.headOfAccount || '',
    costCenter: budget?.costCenter?._id || budget?.costCenter || '',
    allocatedAmount: budget?.allocatedAmount || '',
    utilizedAmount: budget?.utilizedAmount || 0,
    description: budget?.description || '',
    budgetType: budget?.budgetType || 'original',
    quarters: budget?.quarters || {
      q1: { allocated: 0, utilized: 0 },
      q2: { allocated: 0, utilized: 0 },
      q3: { allocated: 0, utilized: 0 },
      q4: { allocated: 0, utilized: 0 }
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuarterChange = (quarter, field, value) => {
    setFormData(prev => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          [field]: parseFloat(value) || 0
        }
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      allocatedAmount: parseFloat(formData.allocatedAmount),
      utilizedAmount: parseFloat(formData.utilizedAmount)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {budget ? 'Edit Budget' : 'New Budget'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fiscal Year
              </label>
              <input
                type="text"
                name="fiscalYear"
                value={formData.fiscalYear}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Budget Type
              </label>
              <select
                name="budgetType"
                value={formData.budgetType}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              >
                <option value="original" className="bg-slate-900">Original</option>
                <option value="revised" className="bg-slate-900">Revised</option>
                <option value="supplementary" className="bg-slate-900">Supplementary</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Head of Account *
            </label>
            <select
              name="headOfAccount"
              value={formData.headOfAccount}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              <option value="" className="bg-slate-900">Select Account</option>
              {chartOfAccounts.map(account => (
                <option key={account._id} value={account._id} className="bg-slate-900">
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cost Center
            </label>
            <select
              name="costCenter"
              value={formData.costCenter}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              <option value="" className="bg-slate-900">General (No specific cost center)</option>
              {costCenters.map(cc => (
                <option key={cc._id} value={cc._id} className="bg-slate-900">{cc.code} - {cc.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Allocated Amount (PKR) *
              </label>
              <input
                type="number"
                name="allocatedAmount"
                value={formData.allocatedAmount}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Utilized Amount (PKR)
              </label>
              <input
                type="number"
                name="utilizedAmount"
                value={formData.utilizedAmount}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Quarterly Breakdown */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Quarterly Breakdown
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['q1', 'q2', 'q3', 'q4'].map((q, i) => (
                <div key={q} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-xs text-cyan-400 font-medium mb-2">Q{i + 1}</p>
                  <input
                    type="number"
                    placeholder="Allocated"
                    value={formData.quarters[q].allocated}
                    onChange={(e) => handleQuarterChange(q, 'allocated', e.target.value)}
                    className="w-full px-2 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
            />
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
              type="submit"
              className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/80 to-blue-500/80 border border-cyan-400/50 hover:border-cyan-400 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">{budget ? 'Update' : 'Create'} Budget</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetManagement;
