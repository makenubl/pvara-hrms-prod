import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Lock,
  User,
  Save,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  AlertCircle,
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Modal } from '../components/UI';
import positionService from '../services/positionService';
import { useAuthStore } from '../store/authStore';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState(new Set());
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    department: 'Engineering',
    timezone: 'UTC-5',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    slackNotifications: false,
    smsAlerts: true,
    weeklyReport: true,
    payrollReminder: true,
    leaveApprovals: true,
  });

  const [securitySettings] = useState({
    twoFactorEnabled: true,
    lastPasswordChange: '2025-10-15',
    sessionTimeout: '30',
    loginAlerts: true,
  });

  const [newPosition, setNewPosition] = useState({
    title: '',
    department: '',
    reportsTo: null,
    level: 'mid',
  });

  const [newPositionError, setNewPositionError] = useState(null);
  const [submittingPosition, setSubmittingPosition] = useState(false);

  // Load positions from API on mount
  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await positionService.getHierarchy();
      setPositions(Array.isArray(data) ? data : data.positions || []);
    } catch (err) {
      setError(err.message || 'Failed to load positions');
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePositionChange = (e) => {
    const { name, value } = e.target;
    setNewPosition((prev) => ({ ...prev, [name]: name === 'reportsTo' ? (value ? value : null) : value }));
  };

  const handleAddPosition = async (e) => {
    e.preventDefault();
    setNewPositionError(null);
    setSubmittingPosition(true);

    try {
      if (!newPosition.title || !newPosition.department) {
        setNewPositionError('Title and Department are required');
        setSubmittingPosition(false);
        return;
      }

      const result = await positionService.create({
        title: newPosition.title,
        department: newPosition.department,
        level: newPosition.level,
        reportsTo: newPosition.reportsTo || undefined,
      });

      await fetchPositions();
      setShowPositionModal(false);
      setNewPosition({ title: '', department: '', reportsTo: null, level: 'mid' });
    } catch (err) {
      setNewPositionError(err.message || 'Failed to create position');
    } finally {
      setSubmittingPosition(false);
    }
  };

  const handleDeletePosition = async (posId) => {
    if (window.confirm('Delete this position?')) {
      try {
        await positionService.delete(posId);
        await fetchPositions();
      } catch (err) {
        alert('Failed to delete position: ' + err.message);
      }
    }
  };

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPositions(newExpanded);
  };

  const renderPositionTree = (pos, level = 0) => (
    <div key={pos._id || pos.id} className="ml-4">
      <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg mb-2 hover:bg-white/10 transition-all">
        {pos.children && pos.children.length > 0 && (
          <button onClick={() => toggleExpanded(pos._id || pos.id)} className="text-cyan-400">
            {expandedPositions.has(pos._id || pos.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
        {(!pos.children || pos.children.length === 0) && <div className="w-6" />}

        <div className="flex-1">
          <p className="font-semibold text-white">{pos.title}</p>
          <p className="text-xs text-slate-400">{pos.department}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="blue">{pos.level}</Badge>
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <Users size={12} /> {pos.employees || 0} employee{(pos.employees || 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="p-2 hover:bg-cyan-500/20 rounded-lg transition-all">
            <Edit2 size={16} className="text-cyan-400" />
          </button>
          <button onClick={() => handleDeletePosition(pos._id || pos.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-all">
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>
      </div>

      {expandedPositions.has(pos._id || pos.id) && pos.children && pos.children.length > 0 && (
        <div>{pos.children.map((child) => renderPositionTree(child, level + 1))}</div>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6 pb-6 text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-slate-400 mt-2">Manage your account and preferences</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
          {['account', 'notifications', 'security', 'hierarchy'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'
              }`}
            >
              {tab === 'hierarchy' ? 'Organization' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Account Settings */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <User size={18} />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option>Engineering</option>
                    <option>Sales</option>
                    <option>Marketing</option>
                    <option>HR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option>UTC-5</option>
                    <option>UTC-8</option>
                    <option>UTC+0</option>
                    <option>UTC+5:30</option>
                  </select>
                </div>
              </div>
              <Button className="mt-6 flex items-center gap-2">
                <Save size={18} />
                Save Changes
              </Button>
            </Card>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Bell size={18} />
                Notification Preferences
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive updates via email' },
                  { key: 'slackNotifications', label: 'Slack Notifications', description: 'Send alerts to Slack' },
                  { key: 'smsAlerts', label: 'SMS Alerts', description: 'Critical updates via SMS' },
                  { key: 'weeklyReport', label: 'Weekly Report', description: 'Summary every Monday' },
                  { key: 'payrollReminder', label: 'Payroll Reminders', description: 'Notify before payroll processing' },
                  { key: 'leaveApprovals', label: 'Leave Approvals', description: 'Alert on leave requests' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-start gap-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                    <input
                      type="checkbox"
                      id={setting.key}
                      checked={notificationSettings[setting.key]}
                      onChange={() => handleNotificationChange(setting.key)}
                      className="w-4 h-4 mt-1 rounded border-white/20 accent-cyan-400"
                    />
                    <div className="flex-1">
                      <label htmlFor={setting.key} className="block font-medium text-white cursor-pointer">
                        {setting.label}
                      </label>
                      <p className="text-xs text-slate-400 mt-1">{setting.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Lock size={18} />
                Security Settings
              </h3>
              
              {/* Two-Factor Authentication */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-400 mt-1">Protect your account with 2FA</p>
                  </div>
                  <Badge variant={securitySettings.twoFactorEnabled ? 'green' : 'gray'}>
                    {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              {/* Password Change */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="font-medium text-white mb-4">Change Password</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                  <Button className="w-full">Update Password</Button>
                </div>
              </div>

              {/* Login History */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="font-medium text-white mb-2">Recent Activity</p>
                <div className="text-sm text-slate-300">
                  <p>Last password change: {securitySettings.lastPasswordChange}</p>
                  <p>Session timeout: {securitySettings.sessionTimeout} minutes</p>
                  <p className="mt-2 text-cyan-400">Login alerts: {securitySettings.loginAlerts ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Organization Hierarchy */}
        {activeTab === 'hierarchy' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Organization Structure</h2>
              <Button onClick={() => setShowPositionModal(true)} className="flex items-center gap-2">
                <Plus size={18} />
                Add Position
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-400/50 rounded-xl flex items-center gap-3">
                <AlertCircle className="text-red-400" size={20} />
                <p className="text-red-300">{error}</p>
              </div>
            )}

            <Card>
              <h3 className="font-semibold text-white mb-4">Reporting Structure</h3>
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading positions...</div>
              ) : positions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No positions found. Create one to get started.</div>
              ) : (
                <div className="space-y-4">
                  {positions.map((pos) => renderPositionTree(pos))}
                </div>
              )}
            </Card>

            {/* Position Distribution */}
            <Card>
              <h3 className="font-semibold text-white mb-4">Position Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-slate-300 text-sm">Total Positions</p>
                  <p className="text-2xl font-black text-cyan-400 mt-2">{positions.length}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-slate-300 text-sm">Filled</p>
                  <p className="text-2xl font-black text-emerald-400 mt-2">{positions.filter(p => p.employees > 0).length}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-slate-300 text-sm">Open</p>
                  <p className="text-2xl font-black text-amber-400 mt-2">{positions.filter(p => p.employees === 0).length}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Position Modal */}
      <Modal isOpen={showPositionModal} title="Add Position" onClose={() => setShowPositionModal(false)}>
        <div className="space-y-4">
          {newPositionError && (
            <div className="p-3 bg-red-500/20 border border-red-400/50 rounded-lg">
              <p className="text-red-300 text-sm">{newPositionError}</p>
            </div>
          )}
          
          <form onSubmit={handleAddPosition} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Position Title</label>
              <input
                type="text"
                name="title"
                value={newPosition.title}
                onChange={handlePositionChange}
                placeholder="e.g., Senior Developer"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Department</label>
              <input
                type="text"
                name="department"
                value={newPosition.department}
                onChange={handlePositionChange}
                placeholder="e.g., Engineering"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Level</label>
              <select
                name="level"
                value={newPosition.level}
                onChange={handlePositionChange}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Reports To</label>
              <select
                name="reportsTo"
                value={newPosition.reportsTo || ''}
                onChange={handlePositionChange}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="">None (Top Level)</option>
                {positions.map((pos) => (
                  <option key={pos._id || pos.id} value={pos._id || pos.id}>
                    {pos.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submittingPosition} className="flex-1">
                {submittingPosition ? 'Creating...' : 'Save Position'}
              </Button>
              <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowPositionModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </MainLayout>
  );
};

export default Settings;
