/**
 * Financial Reports Page
 * Trial Balance, Income Statement, Balance Sheet
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  BarChart3,
  Scale,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import api from '../services/api';

const FinancialReports = () => {
  const [activeReport, setActiveReport] = useState('trial-balance');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());

  const reports = [
    { id: 'trial-balance', name: 'Trial Balance', icon: Scale, description: 'Debit and credit balances' },
    { id: 'income-statement', name: 'Income Statement', icon: DollarSign, description: 'Revenue and expenses' },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: BarChart3, description: 'Assets, liabilities, equity' },
    { id: 'budget-vs-actual', name: 'Budget vs Actual', icon: FileText, description: 'Variance analysis' },
  ];

  useEffect(() => {
    fetchReport();
  }, [activeReport, dateRange, fiscalYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        fiscalYear
      });
      
      const response = await api.get(`/financial-reports/${activeReport}?${params.toString()}`);
      setReportData(response.data.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleExport = () => {
    // In a real app, this would trigger a PDF/Excel export
    toast('Export functionality would be implemented with a PDF library like jsPDF or server-side export', { icon: 'ℹ️' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Financial Reports</h1>
            <p className="text-slate-400">IFRS-compliant financial statements</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchReport}
              className="flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-cyan-400/50 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {reports.map(report => {
            const Icon = report.icon;
            const isActive = activeReport === report.id;
            return (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border rounded-2xl p-4 transition-all cursor-pointer ${
                  isActive
                    ? 'border-cyan-400/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10'
                    : 'border-white/20 hover:border-cyan-400/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  isActive 
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
                    : 'bg-gradient-to-br from-slate-600 to-slate-700'
                }`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className={`font-semibold ${isActive ? 'text-cyan-400' : 'text-white'}`}>
                  {report.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">{report.description}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Fiscal Year
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year} className="bg-slate-800">FY {year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <>
              {activeReport === 'trial-balance' && (
                <TrialBalanceReport data={reportData} formatCurrency={formatCurrency} />
              )}
              {activeReport === 'income-statement' && (
                <IncomeStatementReport data={reportData} formatCurrency={formatCurrency} />
              )}
              {activeReport === 'balance-sheet' && (
                <BalanceSheetReport data={reportData} formatCurrency={formatCurrency} />
              )}
              {activeReport === 'budget-vs-actual' && (
                <BudgetVsActualReport data={reportData} formatCurrency={formatCurrency} fiscalYear={fiscalYear} />
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

// Trial Balance Report
const TrialBalanceReport = ({ data, formatCurrency }) => {
  if (!data || !data.accounts) {
    return (
      <div className="p-8 text-center text-slate-400">
        No trial balance data available. Post some journal entries first.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Trial Balance</h2>
        <p className="text-sm text-slate-400">
          As of {new Date(data.asOfDate || Date.now()).toLocaleDateString()}
        </p>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Account Code</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Account Name</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Debit</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Credit</th>
          </tr>
        </thead>
        <tbody>
          {data.accounts?.map((account, index) => (
            <tr key={index} className="hover:bg-white/5 border-b border-white/10 transition-colors">
              <td className="px-4 py-3 font-mono text-sm text-slate-400">{account.code}</td>
              <td className="px-4 py-3 text-white">{account.name}</td>
              <td className="px-4 py-3 text-right font-mono text-white">
                {account.debit > 0 ? formatCurrency(account.debit) : '-'}
              </td>
              <td className="px-4 py-3 text-right font-mono text-white">
                {account.credit > 0 ? formatCurrency(account.credit) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/20 bg-white/5">
            <td colSpan="2" className="px-4 py-3 text-right font-bold text-white">Total</td>
            <td className="px-4 py-3 text-right font-bold font-mono text-white">
              {formatCurrency(data.totalDebit || 0)}
            </td>
            <td className="px-4 py-3 text-right font-bold font-mono text-white">
              {formatCurrency(data.totalCredit || 0)}
            </td>
          </tr>
        </tfoot>
      </table>

      {data.totalDebit !== data.totalCredit && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 font-medium">
            ⚠️ Trial Balance is out of balance by {formatCurrency(Math.abs(data.totalDebit - data.totalCredit))}
          </p>
        </div>
      )}
    </div>
  );
};

// Income Statement Report
const IncomeStatementReport = ({ data, formatCurrency }) => {
  if (!data) {
    return (
      <div className="p-8 text-center text-slate-400">
        No income statement data available.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Income Statement</h2>
        <p className="text-sm text-slate-400">
          For the period {data.period?.start} to {data.period?.end}
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Revenue */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 border-b border-white/10 pb-2">
            Revenue
          </h3>
          <div className="space-y-2">
            {data.revenue?.items?.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-slate-400">{item.name}</span>
                <span className="font-mono text-white">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="font-semibold text-white">Total Revenue</span>
              <span className="font-bold font-mono text-emerald-400">{formatCurrency(data.revenue?.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 border-b border-white/10 pb-2">
            Expenses
          </h3>
          <div className="space-y-2">
            {data.expenses?.items?.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-slate-400">{item.name}</span>
                <span className="font-mono text-white">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="font-semibold text-white">Total Expenses</span>
              <span className="font-bold font-mono text-red-400">{formatCurrency(data.expenses?.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex justify-between">
            <span className="text-xl font-bold text-white">Net Income</span>
            <span className={`text-xl font-bold font-mono ${(data.netIncome || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(data.netIncome || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Balance Sheet Report
const BalanceSheetReport = ({ data, formatCurrency }) => {
  if (!data) {
    return (
      <div className="p-8 text-center text-slate-400">
        No balance sheet data available.
      </div>
    );
  }

  const renderSection = (title, items, total, colorClass = 'text-white') => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 border-b border-white/10 pb-2">
        {title}
      </h3>
      <div className="space-y-2">
        {items?.map((item, index) => (
          <div key={index} className="flex justify-between pl-4">
            <span className="text-slate-400">{item.name}</span>
            <span className="font-mono text-white">{formatCurrency(item.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 border-t border-white/10">
          <span className="font-semibold text-white">Total {title}</span>
          <span className={`font-bold font-mono ${colorClass}`}>{formatCurrency(total || 0)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Balance Sheet</h2>
        <p className="text-sm text-slate-400">
          As of {new Date(data.asOfDate || Date.now()).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Assets */}
        <div>
          {renderSection('Assets', data.assets?.items, data.assets?.total, 'text-cyan-400')}
        </div>

        {/* Liabilities & Equity */}
        <div>
          {renderSection('Liabilities', data.liabilities?.items, data.liabilities?.total, 'text-red-400')}
          {renderSection('Equity', data.equity?.items, data.equity?.total, 'text-emerald-400')}
          
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex justify-between">
              <span className="font-bold text-white">Total Liabilities & Equity</span>
              <span className="font-bold font-mono text-cyan-400">
                {formatCurrency((data.liabilities?.total || 0) + (data.equity?.total || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Check */}
      {data.assets?.total !== (data.liabilities?.total || 0) + (data.equity?.total || 0) && (
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <p className="text-yellow-400 font-medium">
            ⚠️ Balance sheet is out of balance. Assets should equal Liabilities + Equity.
          </p>
        </div>
      )}
    </div>
  );
};

// Budget vs Actual Report
const BudgetVsActualReport = ({ data, formatCurrency, fiscalYear }) => {
  if (!data || !data.items) {
    return (
      <div className="p-8 text-center text-slate-400">
        No budget variance data available. Create some budgets first.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Budget vs Actual Analysis</h2>
        <p className="text-sm text-slate-400">
          Fiscal Year {fiscalYear}
        </p>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Head of Account</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Budget</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Actual</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Variance</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">%</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/5">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.items?.map((item, index) => {
            const variance = (item.budget || 0) - (item.actual || 0);
            const variancePercent = item.budget ? ((variance / item.budget) * 100).toFixed(1) : 0;
            const isOverBudget = variance < 0;

            return (
              <tr key={index} className="hover:bg-white/5 border-b border-white/10 transition-colors">
                <td className="px-4 py-3 text-white">{item.name}</td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  {formatCurrency(item.budget)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  {formatCurrency(item.actual)}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(variance))}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                  {variancePercent}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    isOverBudget ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isOverBudget ? 'Over Budget' : 'Under Budget'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/20 bg-white/5">
            <td className="px-4 py-3 font-bold text-white">Total</td>
            <td className="px-4 py-3 text-right font-bold font-mono text-white">
              {formatCurrency(data.totalBudget)}
            </td>
            <td className="px-4 py-3 text-right font-bold font-mono text-white">
              {formatCurrency(data.totalActual)}
            </td>
            <td className={`px-4 py-3 text-right font-bold font-mono ${(data.totalBudget - data.totalActual) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatCurrency(Math.abs(data.totalBudget - data.totalActual))}
            </td>
            <td colSpan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default FinancialReports;
