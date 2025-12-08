import React, { useState } from 'react';
import { Bell, Settings, LogOut, User, MessageSquare, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const notifications = [
    { id: 1, message: '3 leave requests pending approval', time: '5 min ago', type: 'warning' },
    { id: 2, message: 'Payroll processing completed', time: '2 hours ago', type: 'success' },
    { id: 3, message: 'New job application received', time: '1 day ago', type: 'info' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-gradient-to-r from-slate-900/40 via-slate-900/40 to-slate-900/30 border-b border-white/10 shadow-lg">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left - Welcome Message */}
        <div className="flex-1">
          <h2 className="text-lg font-black bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
            Welcome back, {user?.name || 'Ayesha Khan'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{new Date().toLocaleDateString()}</p>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-white placeholder-slate-500 outline-none w-32"
            />
          </div>

          {/* Messages */}
          <button className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-all group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-lg"></div>
            <MessageSquare size={20} className="relative" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse"></span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-all group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-lg"></div>
              <Bell size={20} className="relative" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full animate-pulse"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 backdrop-blur-2xl bg-slate-900/95 rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-blur-in">
                <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                  <h3 className="font-bold text-white">Notifications</h3>
                  <p className="text-xs text-slate-400 mt-1">You have {notifications.length} new notifications</p>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 p-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-lg backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer ${
                        notif.type === 'warning' ? 'bg-amber-500/10' :
                        notif.type === 'success' ? 'bg-green-500/10' :
                        'bg-blue-500/10'
                      }`}
                    >
                      <p className="text-sm text-slate-200">{notif.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{notif.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative ml-2 pl-2 border-l border-white/10">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <span className="text-sm font-semibold text-slate-200 hidden sm:block group-hover:text-white transition-colors">
                {user?.name || 'Ayesha'}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 backdrop-blur-2xl bg-slate-900/95 rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-blur-in">
                <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                  <p className="text-sm font-bold text-white">{user?.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
                  <p className="text-xs text-cyan-400 font-semibold mt-2">{user?.role || 'HR Manager'}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all group/item">
                    <User size={16} className="group-hover/item:text-cyan-400 transition-colors" />
                    My Profile
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all group/item"
                  >
                    <Settings size={16} className="group-hover/item:text-cyan-400 transition-colors" />
                    Settings
                  </button>
                  <div className="border-t border-white/10 my-2"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
