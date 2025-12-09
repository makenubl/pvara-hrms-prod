import React, { useState, useEffect } from 'react';
import { DollarSign, Download, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table, Modal, Input, Select } from '../components/UI';
import { PAYROLL_FREQUENCY } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import payrollService from '../services/payrollService';
import toast from 'react-hot-toast';

const Payroll = () => {
  const [filterMonth, setFilterMonth] = useState('2025-12');
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPayslips();
  }, [filterMonth]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      console.log('📤 Fetching payslips for month:', filterMonth);
      const data = await payrollService.getAll(filterMonth);
      const normalized = (data || []).map((entry) => ({
        id: entry._id,
        employeeId: entry.employee?._id || 'N/A',
        name: entry.employee ? `${entry.employee.firstName || ''} ${entry.employee.lastName || ''}`.trim() : 'Unknown',
        month: entry.month,
        status: entry.status || 'uploaded',
        baseSalary: Number(entry.amount) || 0,
        allowances: 0,
        deductions: 0,
        netSalary: Number(entry.amount) || 0,
        processedDate: entry.updatedAt ? entry.updatedAt.split('T')[0] : null,
      }));
      setPayslips(normalized);
      console.log('✅ Payslips loaded:', normalized.length);
    } catch (err) {
      console.error('❌ Error fetching payslips:', err);
      setError(err.message || 'Failed to load payslips');
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) {
        toast.error('CSV is empty');
        return;
      }

      // Expect header: email,amount,month,currency
      const [header, ...rows] = lines;
      const headers = header.toLowerCase().split(',').map((h) => h.trim());
      const emailIdx = headers.indexOf('email');
      const amountIdx = headers.indexOf('amount');
      const monthIdx = headers.indexOf('month');
      const currencyIdx = headers.indexOf('currency');

      if (emailIdx === -1 || amountIdx === -1 || monthIdx === -1) {
        toast.error('CSV must include headers: email, amount, month');
        return;
      }

      const records = rows.map((row) => {
        const cols = row.split(',').map((c) => c.trim());
        return {
          email: cols[emailIdx],
          amount: Number(cols[amountIdx]) || 0,
          month: cols[monthIdx],
          currency: currencyIdx !== -1 ? cols[currencyIdx] || 'PKR' : 'PKR',
        };
      }).filter((r) => r.email && r.month && r.amount >= 0);

      if (!records.length) {
        toast.error('No valid rows found in CSV');
        return;
      }

      await payrollService.bulkUpload(records);
      toast.success('Payroll data uploaded');
      fetchPayslips();
    } catch (err) {
      console.error('❌ Error uploading payroll CSV:', err);
      toast.error(err.message || 'Failed to upload payroll');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

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
      key: 'baseSalary',
      label: 'Base Salary',
      render: (value) => <span className="text-white font-medium">{formatCurrency(value, 'PKR')}</span>,
    },
    {
      key: 'allowances',
      label: 'Allowances',
      render: (value) => <span className="text-emerald-300">{formatCurrency(value, 'PKR')}</span>,
    },
    {
      key: 'deductions',
      label: 'Deductions',
      render: (value) => <span className="text-rose-300">{formatCurrency(value, 'PKR')}</span>,
    },
    {
      key: 'netSalary',
      label: 'Net Salary',
      render: (value) => <span className="text-cyan-300 font-bold">{formatCurrency(value, 'PKR')}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge variant={value === 'processed' ? 'green' : 'yellow'}>{value}</Badge>,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Payroll Management
            </h1>
            <p className="text-slate-400 mt-2">Process and manage employee salaries</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-sm font-semibold">
              <Plus size={18} />
              Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleUploadCsv}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <Button onClick={() => alert('Exporting payroll...')} className="flex items-center gap-2">
              <Download size={18} />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Payroll</p>
                <p className="text-2xl font-black text-white mt-1">
                  {formatCurrency(payslips.reduce((sum, p) => sum + p.netSalary, 0), 'PKR')}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Allowances</p>
                <p className="text-2xl font-black text-emerald-300 mt-1">
                  {formatCurrency(payslips.reduce((sum, p) => sum + p.allowances, 0), 'PKR')}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Deductions</p>
                <p className="text-2xl font-black text-rose-300 mt-1">
                  {formatCurrency(payslips.reduce((sum, p) => sum + p.deductions, 0), 'PKR')}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-rose-400" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-200 mb-2 block">Month</label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
            <div className="text-xs text-slate-400 flex-1 sm:flex-none sm:w-64">
              Upload CSV with headers: <code>email, amount, month, currency</code>. We will match employees by email.
            </div>
            <Button variant="secondary" onClick={() => fetchPayslips()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </Card>

        {/* Payroll Table */}
        <Card>
          <h3 className="font-semibold text-white mb-4">Payroll Register</h3>
          <Table columns={columns} data={payslips} />
        </Card>

        {/* Processing Status */}
        <Card>
          <h3 className="font-semibold text-white mb-4">Processing Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-2xl font-bold text-emerald-300">
                {payslips.filter((p) => p.status === 'processed').length}
              </p>
              <p className="text-xs text-slate-300 mt-1">Processed</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-2xl font-bold text-amber-300">
                {payslips.filter((p) => p.status === 'pending').length}
              </p>
              <p className="text-xs text-slate-300 mt-1">Pending</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-2xl font-bold text-slate-200">{payslips.length}</p>
              <p className="text-xs text-slate-300 mt-1">Total</p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Payroll;
