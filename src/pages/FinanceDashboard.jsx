/**
 * Finance Dashboard - ERP Module Entry Point
 * Overview of financial status, budgets, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  FileText,
  Building2,
  BarChart3,
  Banknote,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import api from '../services/api';

const FinanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBudget: 0,
    utilized: 0,
    pendingPayments: 0,
    pendingApprovals: 0
  });
  const [recentEntries, setRecentEntries] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple data points in parallel
      const [budgetRes, entriesRes, paymentsRes] = await Promise.all([
        api.get('/budgets/summary').catch(() => ({ data: { data: {} } })),
        api.get('/journal-entries?limit=5&status=posted').catch(() => ({ data: { data: [] } })),
        api.get('/bank-payments?status=draft').catch(() => ({ data: { data: [] } }))
      ]);

      setStats({
        totalBudget: budgetRes.data.data?.totalAllocated || 0,
        utilized: budgetRes.data.data?.totalUtilized || 0,
        pendingPayments: paymentsRes.data.data?.length || 0,
        pendingApprovals: 0
      });

      setRecentEntries(entriesRes.data.data || []);
      setBudgetAlerts(budgetRes.data.data?.alerts || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const utilizationPercent = stats.totalBudget > 0 
    ? Math.round((stats.utilized / stats.totalBudget) * 100) 
    : 0;

  const quickLinks = [
    { name: 'Chart of Accounts', href: '/finance/chart-of-accounts', icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { name: 'Budget Management', href: '/finance/budgets', icon: BarChart3, color: 'from-emerald-500 to-teal-500' },
    { name: 'Vendors', href: '/finance/vendors', icon: Building2, color: 'from-purple-500 to-pink-500' },
    { name: 'Journal Entries', href: '/finance/journal-entries', icon: FileText, color: 'from-indigo-500 to-blue-500' },
    { name: 'Bank Payments', href: '/finance/bank-payments', icon: Banknote, color: 'from-amber-500 to-orange-500' },
    { name: 'Financial Reports', href: '/finance/reports', icon: BarChart3, color: 'from-rose-500 to-red-500' },
  ];

  const statCards = [
    {
      label: 'Total Budget',
      value: formatCurrency(stats.totalBudget),
      icon: DollarSign,
      color: 'cyan',
      gradient: 'from-cyan-500/20 to-blue-500/20',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-500'
    },
    {
      label: 'Utilized',
      value: formatCurrency(stats.utilized),
      subtext: `${utilizationPercent}% of budget`,
      icon: utilizationPercent > 80 ? TrendingUp : TrendingDown,
      color: utilizationPercent > 80 ? 'rose' : 'emerald',
      gradient: utilizationPercent > 80 ? 'from-rose-500/20 to-orange-500/20' : 'from-emerald-500/20 to-teal-500/20',
      iconBg: utilizationPercent > 80 ? 'bg-gradient-to-br from-rose-500 to-orange-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500',
      showProgress: true
    },
    {
      label: 'Pending Payments',
      value: stats.pendingPayments,
      icon: Banknote,
      color: 'amber',
      gradient: 'from-amber-500/20 to-yellow-500/20',
      iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-500'
    },
    {
      label: 'Available Balance',
      value: formatCurrency(stats.totalBudget - stats.utilized),
      icon: CheckCircle,
      color: 'emerald',
      gradient: 'from-emerald-500/20 to-green-500/20',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-500'
    }
  ];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-cyan-400/30 rounded-full animate-spin border-t-cyan-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Finance & Accounting
            </h1>
            <p className="text-slate-400 mt-2">ERP Dashboard - Budget, Payments & Reporting</p>
          </div>
          <Link to="/finance/journal-entries/new">
            <Button className="flex items-center gap-2">
              <Plus size={20} />
              New Entry
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <Card key={idx} className="group hover:scale-[1.02] transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} rounded-2xl opacity-50`}></div>
                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                    <p className="text-2xl font-black text-white mt-2">{stat.value}</p>
                    {stat.subtext && (
                      <p className={`text-xs mt-1 ${stat.color === 'rose' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {stat.subtext}
                      </p>
                    )}
                  </div>
                  <div className={`${stat.iconBg} p-3 rounded-xl shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                </div>
                {stat.showProgress && (
                  <div className="relative mt-4">
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          utilizationPercent > 80 
                            ? 'bg-gradient-to-r from-rose-500 to-orange-500' 
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Quick Links */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="group flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:bg-white/10 transition-all duration-300"
              >
                <div className={`p-3 bg-gradient-to-br ${link.color} rounded-xl mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <link.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-center text-slate-300 group-hover:text-white transition-colors">{link.name}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Journal Entries */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Entries</h2>
              <Link 
                to="/finance/journal-entries" 
                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentEntries.length > 0 ? (
                recentEntries.map((entry) => (
                  <div 
                    key={entry._id} 
                    className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-white">{entry.entryNumber}</p>
                      <p className="text-sm text-slate-400 mt-1">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-400">{formatCurrency(entry.totalAmount)}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(entry.entryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No recent entries</p>
                  <Link to="/finance/journal-entries/new">
                    <Button variant="secondary" size="sm" className="mt-3">
                      Create First Entry
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Budget Alerts */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Budget Alerts</h2>
              <Link 
                to="/finance/budgets" 
                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 transition-colors"
              >
                Manage Budgets <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {budgetAlerts.length > 0 ? (
                budgetAlerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"
                  >
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{alert.account}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        <span className="text-amber-400 font-medium">{alert.utilizationPercent}%</span> utilized - {formatCurrency(alert.remaining)} remaining
                      </p>
                    </div>
                    <Badge variant="yellow">{alert.utilizationPercent}%</Badge>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-400">All Clear!</p>
                    <p className="text-sm text-slate-400">All budgets are within limits</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default FinanceDashboard;
