/**
 * Vendors Management Page
 * Vendor management with WHT support - Premium HRMS UI/UX
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  Calculator,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Sparkles,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import api from '../services/api';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showWhtCalculator, setShowWhtCalculator] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const vendorTypes = [
    { value: 'supplier', label: 'Supplier' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'consultant', label: 'Consultant' },
    { value: 'service_provider', label: 'Service Provider' },
    { value: 'utility', label: 'Utility' },
    { value: 'government', label: 'Government' },
  ];

  useEffect(() => {
    fetchVendors();
  }, [searchTerm, filterType]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('vendorType', filterType);
      
      const response = await api.get(`/vendors?${params.toString()}`);
      setVendors(response.data.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
      await api.delete(`/vendors/${id}`);
      toast.success('Vendor deleted successfully');
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingVendor) {
        await api.put(`/vendors/${editingVendor._id}`, formData);
        toast.success('Vendor updated successfully');
      } else {
        await api.post('/vendors', formData);
        toast.success('Vendor created successfully');
      }
      setShowModal(false);
      setEditingVendor(null);
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save vendor');
    }
  };

  const openWhtCalculator = (vendor) => {
    setSelectedVendor(vendor);
    setShowWhtCalculator(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Stats data
  const stats = [
    {
      label: 'Total Vendors',
      value: vendors.length,
      icon: Building2,
      gradient: 'from-cyan-500 to-blue-500',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400'
    },
    {
      label: 'Filers',
      value: vendors.filter(v => v.taxInfo?.filerStatus === 'filer').length,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-500',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400'
    },
    {
      label: 'Non-Filers',
      value: vendors.filter(v => v.taxInfo?.filerStatus === 'non-filer').length,
      icon: XCircle,
      gradient: 'from-rose-500 to-red-500',
      iconBg: 'bg-rose-500/20',
      iconColor: 'text-rose-400'
    },
    {
      label: 'Active',
      value: vendors.filter(v => v.status === 'active').length,
      icon: Sparkles,
      gradient: 'from-violet-500 to-purple-500',
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-400'
    }
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Vendor Management
            </h1>
            <p className="text-slate-400 mt-2">Manage vendors with withholding tax support</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Vendor
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Search & Filter
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or NTN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              <option value="" className="bg-slate-900">All Types</option>
              {vendorTypes.map(type => (
                <option key={type.value} value={type.value} className="bg-slate-900">{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">NTN</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Filer Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">WHT Rate</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(vendor => (
                    <tr key={vendor._id} className="hover:bg-white/5 border-b border-white/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                            <Building2 className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{vendor.name}</p>
                            <p className="text-sm text-slate-400">{vendor.vendorCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 capitalize">
                        {vendor.vendorType?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-400">
                        {vendor.taxInfo?.ntn || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          vendor.taxInfo?.filerStatus === 'filer' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {vendor.taxInfo?.filerStatus || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {vendor.taxInfo?.whtApplicable ? `${vendor.taxInfo.whtRate || 4.5}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {vendor.bankDetails?.bankName || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          vendor.status === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openWhtCalculator(vendor)}
                            className="p-2 hover:bg-emerald-500/20 hover:border-emerald-400/50 border border-transparent rounded-lg transition-all"
                            title="WHT Calculator"
                          >
                            <Calculator className="w-4 h-4 text-emerald-400" />
                          </button>
                          <button 
                            onClick={() => { setEditingVendor(vendor); setShowModal(true); }}
                            className="p-2 hover:bg-blue-500/20 hover:border-blue-400/50 border border-transparent rounded-lg transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-blue-400" />
                          </button>
                          <button 
                            onClick={() => handleDelete(vendor._id)}
                            className="p-2 hover:bg-rose-500/20 hover:border-rose-400/50 border border-transparent rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vendors.length === 0 && (
                <div className="text-center py-16">
                  <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No vendors found</p>
                  <p className="text-slate-500 text-sm mt-1">Click "Add Vendor" to create one</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vendor Modal */}
        {showModal && (
          <VendorModal
            vendor={editingVendor}
            vendorTypes={vendorTypes}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingVendor(null); }}
          />
        )}

        {/* WHT Calculator Modal */}
        {showWhtCalculator && selectedVendor && (
          <WhtCalculatorModal
            vendor={selectedVendor}
            onClose={() => { setShowWhtCalculator(false); setSelectedVendor(null); }}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </MainLayout>
  );
};

// Vendor Modal
const VendorModal = ({ vendor, vendorTypes, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    vendorType: vendor?.vendorType || 'supplier',
    contactPerson: vendor?.contactPerson || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    address: vendor?.address || {},
    taxInfo: {
      ntn: vendor?.taxInfo?.ntn || '',
      strn: vendor?.taxInfo?.strn || '',
      filerStatus: vendor?.taxInfo?.filerStatus || 'filer',
      whtApplicable: vendor?.taxInfo?.whtApplicable !== false,
      whtRate: vendor?.taxInfo?.whtRate || 4.5,
    },
    bankDetails: {
      bankName: vendor?.bankDetails?.bankName || '',
      branchName: vendor?.bankDetails?.branchName || '',
      accountTitle: vendor?.bankDetails?.accountTitle || '',
      accountNumber: vendor?.bankDetails?.accountNumber || '',
      iban: vendor?.bankDetails?.iban || '',
    },
    paymentTerms: vendor?.paymentTerms || 30,
    status: vendor?.status || 'active',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Auto-calculate WHT rate based on filer status
  useEffect(() => {
    const rate = formData.taxInfo.filerStatus === 'filer' ? 4.5 : 9;
    setFormData(prev => ({
      ...prev,
      taxInfo: { ...prev.taxInfo, whtRate: rate }
    }));
  }, [formData.taxInfo.filerStatus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass = "w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all";
  const selectClass = "w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all";
  const labelClass = "block text-sm font-medium text-slate-300 mb-2";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {vendor ? 'Edit Vendor' : 'New Vendor'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {vendor ? 'Update vendor information' : 'Add a new vendor to your system'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 md:col-span-1">
                <label className={labelClass}>Vendor Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter vendor name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Vendor Type</label>
                <select
                  name="vendorType"
                  value={formData.vendorType}
                  onChange={handleChange}
                  className={selectClass}
                >
                  {vendorTypes.map(type => (
                    <option key={type.value} value={type.value} className="bg-slate-900">{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Contact Person</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Enter contact person name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="vendor@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+92 300 0000000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment Terms (Days)</label>
                <input
                  type="number"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  placeholder="30"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Tax Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Tax Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>NTN (National Tax Number)</label>
                <input
                  type="text"
                  name="taxInfo.ntn"
                  value={formData.taxInfo.ntn}
                  onChange={handleChange}
                  placeholder="1234567-8"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>STRN (Sales Tax)</label>
                <input
                  type="text"
                  name="taxInfo.strn"
                  value={formData.taxInfo.strn}
                  onChange={handleChange}
                  placeholder="Enter STRN"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Filer Status</label>
                <select
                  name="taxInfo.filerStatus"
                  value={formData.taxInfo.filerStatus}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="filer" className="bg-slate-900">Filer (4.5% WHT)</option>
                  <option value="non-filer" className="bg-slate-900">Non-Filer (9% WHT)</option>
                </select>
              </div>
              <div className="flex items-center pt-8">
                <input
                  type="checkbox"
                  name="taxInfo.whtApplicable"
                  checked={formData.taxInfo.whtApplicable}
                  onChange={handleChange}
                  className="w-5 h-5 text-cyan-500 rounded border-white/30 bg-white/10 focus:ring-cyan-400"
                />
                <label className="ml-3 text-sm text-slate-300">
                  WHT Applicable <span className="text-cyan-400">(Rate: {formData.taxInfo.whtRate}%)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Bank Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                <input
                  type="text"
                  name="bankDetails.bankName"
                  value={formData.bankDetails.bankName}
                  onChange={handleChange}
                  placeholder="Enter bank name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Branch</label>
                <input
                  type="text"
                  name="bankDetails.branchName"
                  value={formData.bankDetails.branchName}
                  onChange={handleChange}
                  placeholder="Enter branch name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Account Title</label>
                <input
                  type="text"
                  name="bankDetails.accountTitle"
                  value={formData.bankDetails.accountTitle}
                  onChange={handleChange}
                  placeholder="Enter account title"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  type="text"
                  name="bankDetails.accountNumber"
                  value={formData.bankDetails.accountNumber}
                  onChange={handleChange}
                  placeholder="Enter account number"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>IBAN</label>
                <input
                  type="text"
                  name="bankDetails.iban"
                  value={formData.bankDetails.iban}
                  onChange={handleChange}
                  placeholder="PK00BANK0000000000000000"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-300 hover:bg-white/10 rounded-xl transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 transition-all duration-300"
            >
              {vendor ? 'Update' : 'Create'} Vendor
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// WHT Calculator Modal
const WhtCalculatorModal = ({ vendor, onClose, formatCurrency }) => {
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const calculate = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      setCalculating(true);
      const response = await api.post(`/vendors/${vendor._id}/calculate-wht`, {
        amount: parseFloat(amount)
      });
      setResult(response.data.data);
    } catch (error) {
      console.error('Error calculating WHT:', error);
      toast.error('Failed to calculate WHT');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
              <Calculator className="w-6 h-6 text-emerald-400" />
              WHT Calculator
            </h2>
            <p className="text-slate-400 text-sm mt-1">{vendor.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Vendor Info Card */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Filer Status:</span>
              <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                vendor.taxInfo?.filerStatus === 'filer' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {vendor.taxInfo?.filerStatus || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">WHT Rate:</span>
              <span className="font-medium text-white">{vendor.taxInfo?.whtRate || 4.5}%</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Gross Amount (PKR)
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-slate-400 transition-all"
                placeholder="Enter amount"
              />
              <button
                onClick={calculate}
                disabled={calculating}
                className="group relative overflow-hidden rounded-xl py-3 px-5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 border border-emerald-400/50 hover:border-emerald-400 transition-all duration-300 disabled:opacity-50"
              >
                {calculating ? 'Calculating...' : 'Calculate'}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Gross Amount:</span>
                <span className="font-medium text-white">{formatCurrency(result.grossAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WHT ({result.whtRate}%):</span>
                <span className="font-medium text-rose-400">- {formatCurrency(result.whtAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3">
                <span className="font-semibold text-white">Net Payable:</span>
                <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  {formatCurrency(result.netPayable)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-slate-300 hover:bg-white/10 rounded-xl transition-all font-medium border border-white/10 hover:border-white/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Vendors;
