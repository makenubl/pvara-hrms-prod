import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  BarChart3,
  DollarSign,
  Award,
  Briefcase,
  BookOpen,
  Shield,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import pvaraLogo from '../pvara-logo.png';

const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Employees', path: '/employees' },
    { icon: Calendar, label: 'Attendance', path: '/attendance' },
    { icon: Calendar, label: 'Leave Management', path: '/leaves' },
    { icon: DollarSign, label: 'Payroll', path: '/payroll' },
    { icon: Award, label: 'Performance', path: '/performance' },
    { icon: Briefcase, label: 'Recruitment', path: '/recruitment' },
    { icon: BookOpen, label: 'Learning & Development', path: '/learning' },
    { icon: Shield, label: 'Compliance', path: '/compliance' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-2 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 w-64 backdrop-blur-xl bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/60 border-r border-white/10 text-white transition-transform duration-300 z-40 md:z-auto overflow-y-auto shadow-2xl`}
      >
        {/* Logo Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg opacity-30 group-hover:opacity-50 blur-lg transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-lg p-1 flex items-center justify-center">
                <img src={pvaraLogo} alt="PVARA" className="w-9 h-9 object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                PVARA
              </h1>
              <p className="text-xs text-slate-400">{user?.company || 'Enterprise'}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => sidebarOpen && toggleSidebar()}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/20 border border-cyan-400/50 text-cyan-100'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/30 blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-50"></div>
                )}
                <Icon size={20} className={`relative z-10 transition-transform ${active ? 'text-cyan-300' : ''}`} />
                <span className="text-sm font-semibold relative z-10">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 bg-cyan-400 rounded-full relative z-10 animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* User Info */}
        <div className="px-4 py-4 rounded-xl bg-gradient-to-r from-white/5 to-white/0 border border-white/10 m-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Ayesha Khan'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'ayesha@pvara.com'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/30 text-red-300 hover:text-red-200 hover:border-red-400/50 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-pink-500/30 text-xs font-semibold transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
