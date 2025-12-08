import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export const Card = ({ children, className = '', ...props }) => (
  <div
    className={`backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] transition-all hover:border-cyan-400/40 hover:shadow-[0_25px_90px_-45px_rgba(0,0,0,0.9)] ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles =
    'relative overflow-hidden group font-semibold rounded-xl transition-all duration-200 inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:ring-offset-0';

  const variants = {
    primary:
      'bg-gradient-to-r from-cyan-500/80 via-blue-500/80 to-purple-500/80 text-white border border-cyan-300/50 shadow-[0_10px_40px_-20px_rgba(56,189,248,0.7)] hover:shadow-[0_20px_60px_-25px_rgba(56,189,248,0.8)]',
    secondary:
      'bg-white/10 text-white border border-white/20 hover:border-cyan-300/60 hover:bg-white/15 backdrop-blur-md',
    danger:
      'bg-gradient-to-r from-rose-500/80 to-orange-500/80 text-white border border-red-300/60 shadow-[0_10px_40px_-20px_rgba(248,113,113,0.7)] hover:shadow-[0_20px_60px_-25px_rgba(248,113,113,0.8)]',
    success:
      'bg-gradient-to-r from-emerald-500/80 to-teal-500/80 text-white border border-emerald-300/60 shadow-[0_10px_40px_-20px_rgba(16,185,129,0.7)] hover:shadow-[0_20px_60px_-25px_rgba(16,185,129,0.8)]',
    ghost: 'text-slate-200 hover:bg-white/10 border border-white/10',
  };

  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
      <span className="relative">{children}</span>
    </button>
  );
};

export const Badge = ({ children, variant = 'blue', className = '' }) => {
  const variants = {
    blue: 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30',
    green: 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30',
    red: 'bg-rose-500/20 text-rose-100 border border-rose-400/30',
    yellow: 'bg-amber-400/20 text-amber-100 border border-amber-300/30',
    purple: 'bg-purple-500/20 text-purple-100 border border-purple-400/30',
    gray: 'bg-white/10 text-slate-200 border border-white/20',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Alert = ({ variant = 'info', title, message, onClose }) => {
  const icons = {
    info: <Info size={20} className="text-cyan-300" />,
    success: <CheckCircle size={20} className="text-emerald-300" />,
    warning: <AlertTriangle size={20} className="text-amber-300" />,
    error: <AlertCircle size={20} className="text-rose-300" />,
  };

  const styles = {
    info: 'bg-cyan-500/10 border border-cyan-400/30 text-cyan-50',
    success: 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-50',
    warning: 'bg-amber-500/10 border border-amber-400/30 text-amber-50',
    error: 'bg-rose-500/10 border border-rose-400/30 text-rose-50',
  };

  return (
    <div className={`backdrop-blur-md rounded-xl p-4 ${styles[variant]}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">{icons[variant]}</div>
        <div className="flex-1">
          {title && <h3 className="font-semibold text-white">{title}</h3>}
          {message && <p className="text-sm mt-1 text-slate-200">{message}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-lg font-bold opacity-60 hover:opacity-100 text-white"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export const Modal = ({ isOpen, title, children, onClose, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div
        className={`relative w-full ${sizes[size]} max-h-[80vh] overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/90 via-slate-900/85 to-slate-800/85 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)]`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-2xl font-bold px-2 py-1 rounded-lg hover:bg-white/5"
          >
            ×
          </button>
        </div>
        <div className="p-6 text-slate-100">{children}</div>
      </div>
    </div>
  );
};

export const Input = ({
  label,
  error,
  required = false,
  className = '',
  ...props
}) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-semibold text-slate-200">
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
    )}
    <input
      className={`w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-300/50 transition ${
        error ? 'border-rose-400/60 focus:ring-rose-400/70' : ''
      } ${className}`}
      {...props}
    />
    {error && <p className="text-sm text-rose-300">{error}</p>}
  </div>
);

export const Select = ({
  label,
  options,
  error,
  required = false,
  ...props
}) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-semibold text-slate-200">
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
    )}
    <select
      className={`w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-300/50 transition ${
        error ? 'border-rose-400/60 focus:ring-rose-400/70' : ''
      }`}
      {...props}
    >
      <option value="">Select {label}</option>
      {options?.map((option) => (
        <option key={option.value} value={option.value} className="text-slate-900">
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="text-sm text-rose-300">{error}</p>}
  </div>
);

export const Table = ({ columns, data, loading = false, onRowClick }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-white/5 border-b border-white/10">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-200"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-3 text-sm text-slate-100">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex items-center justify-between mt-6 text-slate-200">
    <p className="text-sm text-slate-300">
      Page {currentPage} of {totalPages}
    </p>
    <div className="flex gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </Button>
    </div>
  </div>
);

export const Tabs = ({ tabs, activeTab, onTabChange }) => (
  <div>
    <div className="flex border-b border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === tab.id
              ? 'border-cyan-400 text-white'
              : 'border-transparent text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);

export const Stat = ({ icon: Icon, label, value, trend, trendUp = true }) => (
  <Card className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      {Icon && <Icon size={20} className="text-cyan-300" />}
    </div>
    <p className="text-3xl font-black text-white">{value}</p>
    {trend && (
      <p className={`text-sm font-semibold ${trendUp ? 'text-emerald-300' : 'text-rose-300'}`}>
        {trendUp ? '↑' : '↓'} {trend}
      </p>
    )}
  </Card>
);
