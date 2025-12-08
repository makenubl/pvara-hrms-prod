import React, { useState } from 'react';
import { DollarSign, Download, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table, Modal, Input, Select } from '../components/UI';
import { PAYROLL_FREQUENCY } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

const Payroll = () => {
  const [filterMonth, setFilterMonth] = useState('2025-12');

  const [payslips] = useState([
    {
      id: 1,
      employeeId: 'EMP001',
      name: 'John Doe',
      month: '2025-12',
      status: 'processed',
      baseSalary: 85000,
      allowances: 28750,
      deductions: 17850,
      netSalary: 95900,
      processedDate: '2025-12-05',
    },
    {
      id: 2,
      employeeId: 'EMP002',
      name: 'Jane Smith',
      month: '2025-12',
      status: 'processed',
      baseSalary: 65000,
      allowances: 22950,
      deductions: 13390,
      netSalary: 74560,
      processedDate: '2025-12-05',
    },
    {
      id: 3,
      employeeId: 'EMP003',
      name: 'Bob Johnson',
      month: '2025-12',
      status: 'pending',
      baseSalary: 75000,
      allowances: 25800,
      deductions: 15525,
      netSalary: 85275,
      processedDate: null,
    },
  ]);

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
      render: (value) => <span className="text-white font-medium">{formatCurrency(value)}</span>,
    },
    {
      key: 'allowances',
      label: 'Allowances',
      render: (value) => <span className="text-emerald-300">{formatCurrency(value)}</span>,
    },
    {
      key: 'deductions',
      label: 'Deductions',
      render: (value) => <span className="text-rose-300">{formatCurrency(value)}</span>,
    },
    {
      key: 'netSalary',
      label: 'Net Salary',
      render: (value) => <span className="text-cyan-300 font-bold">{formatCurrency(value)}</span>,
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
          <Button className="flex items-center gap-2">
            <Plus size={20} />
            Process Payroll
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Payroll</p>
                <p className="text-2xl font-black text-white mt-1">
                  {formatCurrency(payslips.reduce((sum, p) => sum + p.netSalary, 0))}
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
                  {formatCurrency(payslips.reduce((sum, p) => sum + p.allowances, 0))}
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
                  {formatCurrency(payslips.reduce((sum, p) => sum + p.deductions, 0))}
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
            <Button variant="secondary">Filter</Button>
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
