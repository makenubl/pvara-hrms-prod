/**
 * Chart of Accounts Page
 * NAM/IFRS compliant chart of accounts management
 * Premium HRMS UI/UX with glass morphism design
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  Upload,
  Filter,
  BookOpen,
  X,
  Download,
  Layers
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Badge, Modal } from '../components/UI';
import api from '../services/api';

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'list'

  const accountTypes = [
    { value: 'asset', label: 'Asset', color: 'blue' },
    { value: 'liability', label: 'Liability', color: 'red' },
    { value: 'equity', label: 'Equity', color: 'purple' },
    { value: 'revenue', label: 'Revenue', color: 'green' },
    { value: 'expense', label: 'Expense', color: 'amber' },
    { value: 'contra-asset', label: 'Contra Asset', color: 'cyan' },
    { value: 'contra-liability', label: 'Contra Liability', color: 'orange' },
  ];

  const categories = {
    asset: ['current_asset', 'fixed_asset', 'other_asset'],
    liability: ['current_liability', 'long_term_liability'],
    equity: ['capital', 'reserves', 'retained_earnings'],
    revenue: ['operating_income', 'other_income'],
    expense: ['operating_expense', 'administrative_expense', 'financial_expense'],
  };

  useEffect(() => {
    fetchAccounts();
  }, [filterType, searchTerm]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get(`/chart-of-accounts?${params.toString()}`);
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const getTypeColor = (type) => {
    const typeObj = accountTypes.find(t => t.value === type);
    return typeObj?.color || 'gray';
  };

  const buildTree = (items, parentId = null, level = 0) => {
    return items
      .filter(item => {
        const itemParent = item.parentAccount?._id || item.parentAccount || null;
        return itemParent === parentId;
      })
      .map(item => {
        const children = buildTree(items, item._id, level + 1);
        const hasChildren = children.length > 0;
        const isExpanded = expandedAccounts.has(item._id);

        return (
          <React.Fragment key={item._id}>
            <tr className="hover:bg-white/5 border-b border-white/10 transition-colors">
              <td className="px-4 py-4">
                <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
                  {hasChildren ? (
                    <button 
                      onClick={() => toggleExpand(item._id)} 
                      className="mr-2 p-1 hover:bg-white/10 rounded-lg transition-all"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    <span className="w-6" />
                  )}
                  <span className="font-mono text-sm text-cyan-400 font-medium">
                    {item.accountCode}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-white font-medium">{item.accountName}</span>
              </td>
              <td className="px-4 py-4">
                <Badge variant={getTypeColor(item.accountType)}>
                  {item.accountType}
                </Badge>
              </td>
              <td className="px-4 py-4 text-sm text-slate-400 capitalize">
                {item.category?.replace(/_/g, ' ')}
              </td>
              <td className="px-4 py-4">
                <Badge variant={item.status === 'active' ? 'green' : 'gray'}>
                  {item.status}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingAccount(item); setShowModal(true); }}
                    className="p-2 hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-transparent rounded-lg transition-all"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item._id)}
                    className="p-2 hover:bg-red-500/20 hover:border-red-400/50 border border-transparent rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </td>
            </tr>
            {hasChildren && isExpanded && children}
          </React.Fragment>
        );
      });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    try {
      await api.delete(`/chart-of-accounts/${id}`);
      toast.success('Account deleted successfully');
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingAccount) {
        await api.put(`/chart-of-accounts/${editingAccount._id}`, formData);
        toast.success('Account updated successfully');
      } else {
        await api.post('/chart-of-accounts', formData);
        toast.success('Account created successfully');
      }
      setShowModal(false);
      setEditingAccount(null);
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save account');
    }
  };

  // Calculate stats
  const stats = {
    total: accounts.length,
    assets: accounts.filter(a => a.accountType === 'asset').length,
    liabilities: accounts.filter(a => a.accountType === 'liability').length,
    active: accounts.filter(a => a.status === 'active').length,
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header with gradient */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Chart of Accounts
            </h1>
            <p className="text-slate-400 mt-2">NAM/IFRS compliant account structure</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => toast('Import feature coming soon!', { icon: 'ℹ️' })}
              className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 hover:border-purple-400/50 hover:from-purple-500/30 hover:to-pink-500/30 transition-all flex items-center gap-2"
            >
              <Upload size={18} className="relative" />
              <span className="relative">Import</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/50 hover:to-blue-500/50 transition-all flex items-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <Plus size={18} className="relative" />
              <span className="relative">Add Account</span>
            </button>
          </div>
        </div>

        {/* Filters - Premium Glass Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Filter size={18} className="text-cyan-400" />
            Search & Filter
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-slate-400 transition-all"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              <option value="" className="bg-slate-900">All Types</option>
              {accountTypes.map(type => (
                <option key={type.value} value={type.value} className="bg-slate-900">
                  {type.label}
                </option>
              ))}
            </select>
            <div className="flex rounded-xl border border-white/20 overflow-hidden">
              <button
                onClick={() => setViewMode('tree')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  viewMode === 'tree' 
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-white border-r border-white/20' 
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 border-r border-white/20'
                }`}
              >
                <Layers size={16} />
                Tree
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-white' 
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <BookOpen size={16} />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Stats - Premium Glass Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-cyan-400/50 transition-all group relative">
            <p className="text-slate-400 text-sm font-medium">Total Accounts</p>
            <p className="text-3xl font-black text-white mt-2">{stats.total}</p>
            <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-blue-400/50 transition-all group">
            <p className="text-slate-400 text-sm font-medium">Assets</p>
            <p className="text-3xl font-black text-blue-400 mt-2">{stats.assets}</p>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-red-400/50 transition-all group">
            <p className="text-slate-400 text-sm font-medium">Liabilities</p>
            <p className="text-3xl font-black text-red-400 mt-2">{stats.liabilities}</p>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-green-400/50 transition-all group">
            <p className="text-slate-400 text-sm font-medium">Active</p>
            <p className="text-3xl font-black text-green-400 mt-2">{stats.active}</p>
          </div>
        </div>

        {/* Table - Premium Glass */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <BookOpen size={20} className="text-cyan-400" />
              Account List ({accounts.length})
            </h3>
            <button 
              onClick={() => toast('Export feature coming soon!', { icon: 'ℹ️' })} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-300 hover:text-purple-200 hover:border-purple-400/50 text-sm font-semibold transition-all"
            >
              <Download size={16} />
              Export
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-cyan-400/30 rounded-full animate-spin border-t-cyan-400"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-ping border-t-cyan-400/50"></div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Name</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {viewMode === 'tree' ? (
                    buildTree(accounts)
                  ) : (
                    accounts.map(account => (
                      <tr key={account._id} className="hover:bg-white/5 border-b border-white/10 transition-colors">
                        <td className="px-4 py-4 font-mono text-sm text-cyan-400 font-medium">
                          {account.accountCode}
                        </td>
                        <td className="px-4 py-4 text-white font-medium">{account.accountName}</td>
                        <td className="px-4 py-4">
                          <Badge variant={getTypeColor(account.accountType)}>
                            {account.accountType}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-400 capitalize">
                          {account.category?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={account.status === 'active' ? 'green' : 'gray'}>
                            {account.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => { setEditingAccount(account); setShowModal(true); }}
                              className="p-2 hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-transparent rounded-lg transition-all"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4 text-cyan-400" />
                            </button>
                            <button 
                              onClick={() => handleDelete(account._id)}
                              className="p-2 hover:bg-red-500/20 hover:border-red-400/50 border border-transparent rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {accounts.length === 0 && (
                <div className="text-center py-16">
                  <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No accounts found</p>
                  <p className="text-slate-500 text-sm mt-1">Click "Add Account" to create one</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Premium Modal */}
        {showModal && (
          <AccountModal
            account={editingAccount}
            accounts={accounts}
            accountTypes={accountTypes}
            categories={categories}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingAccount(null); }}
          />
        )}
      </div>
    </MainLayout>
  );
};

// Premium Account Modal Component
const AccountModal = ({ account, accounts, accountTypes, categories, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    accountCode: account?.accountCode || '',
    accountName: account?.accountName || '',
    accountType: account?.accountType || 'asset',
    category: account?.category || '',
    parentAccount: account?.parentAccount?._id || account?.parentAccount || '',
    description: account?.description || '',
    isBankAccount: account?.isBankAccount || false,
    bankDetails: account?.bankDetails || {},
    namCode: account?.namCode || '',
    status: account?.status || 'active',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {account ? 'Edit Account' : 'New Account'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {account ? 'Update account details' : 'Create a new chart of account entry'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Account Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="accountCode"
                value={formData.accountCode}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
                placeholder="e.g., 1001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Account Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
                placeholder="e.g., Cash in Hand"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Account Type <span className="text-red-400">*</span>
              </label>
              <select
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              >
                {accountTypes.map(type => (
                  <option key={type.value} value={type.value} className="bg-slate-900">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              >
                <option value="" className="bg-slate-900">Select Category</option>
                {(categories[formData.accountType] || []).map(cat => (
                  <option key={cat} value={cat} className="bg-slate-900">
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Parent Account
            </label>
            <select
              name="parentAccount"
              value={formData.parentAccount}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              <option value="" className="bg-slate-900">No Parent (Top Level)</option>
              {accounts
                .filter(a => a._id !== account?._id)
                .map(a => (
                  <option key={a._id} value={a._id} className="bg-slate-900">
                    {a.accountCode} - {a.accountName}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all resize-none"
              placeholder="Account description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                NAM Code
              </label>
              <input
                type="text"
                name="namCode"
                value={formData.namCode}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
                placeholder="Government NAM code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              >
                <option value="active" className="bg-slate-900">Active</option>
                <option value="inactive" className="bg-slate-900">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
            <input
              type="checkbox"
              name="isBankAccount"
              checked={formData.isBankAccount}
              onChange={handleChange}
              className="w-5 h-5 rounded border-white/30 bg-white/10 text-cyan-400 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer"
            />
            <label className="text-sm text-slate-300 cursor-pointer">
              This is a bank account
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-300 hover:bg-white/10 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="group relative overflow-hidden rounded-xl py-3 px-8 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/50 hover:to-blue-500/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
              <span className="relative">{account ? 'Update' : 'Create'} Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChartOfAccounts;
