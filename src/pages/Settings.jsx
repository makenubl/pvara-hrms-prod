import React, { useState } from 'react';
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
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Modal } from '../components/UI';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState(new Set());
  const [showPositionModal, setShowPositionModal] = useState(false);

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

  // Mock organizational hierarchy data
  const [positions] = useState([
    {
      id: 1,
      title: 'CEO',
      department: 'Executive',
      level: 'executive',
      employees: 1,
      reportsTo: null,
      children: [
        {
          id: 2,
          title: 'CTO',
          department: 'Technology',
          level: 'executive',
          employees: 1,
          reportsTo: 1,
          children: [
            {
              id: 5,
              title: 'Engineering Manager',
              department: 'Technology',
              level: 'senior',
              employees: 5,
              reportsTo: 2,
              children: [],
            },
          ],
        },
        {
          id: 3,
          title: 'COO',
          department: 'Operations',
          level: 'executive',
          employees: 1,
          reportsTo: 1,
          children: [
            {
              id: 6,
              title: 'HR Manager',
              department: 'Human Resources',
              level: 'mid',
              employees: 3,
              reportsTo: 3,
              children: [],
            },
          ],
        },
        {
          id: 4,
          title: 'CFO',
          department: 'Finance',
          level: 'executive',
          employees: 1,
          reportsTo: 1,
          children: [],
        },
      ],
    },
  ]);

  const [newPosition, setNewPosition] = useState({
    title: '',
    department: '',
    reportsTo: null,
    level: 'mid',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePositionChange = (e) => {
    const { name, value } = e.target;
    setNewPosition((prev) => ({ ...prev, [name]: value }));
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
    <div key={pos.id} className="ml-4">
      <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg mb-2 hover:bg-white/10 transition-all">
        {pos.children && pos.children.length > 0 && (
          <button onClick={() => toggleExpanded(pos.id)} className="text-cyan-400">
            {expandedPositions.has(pos.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
        {(!pos.children || pos.children.length === 0) && <div className="w-6" />}

        <div className="flex-1">
          <p className="font-semibold text-white">{pos.title}</p>
          <p className="text-xs text-slate-400">{pos.department}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="blue">{pos.level}</Badge>
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <Users size={12} /> {pos.employees} employee{pos.employees !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="p-2 hover:bg-cyan-500/20 rounded-lg transition-all">
            <Edit2 size={16} className="text-cyan-400" />
          </button>
          <button className="p-2 hover:bg-red-500/20 rounded-lg transition-all">
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>
      </div>

      {expandedPositions.has(pos.id) && pos.children && pos.children.length > 0 && (
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

            <Card>
              <h3 className="font-semibold text-white mb-4">Reporting Structure</h3>
              <div className="space-y-4">
                {positions.map((pos) => renderPositionTree(pos))}
              </div>
            </Card>

            {/* Position Distribution */}
            <Card>
              <h3 className="font-semibold text-white mb-4">Position Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-slate-300 text-sm">Total Positions</p>
                  <p className="text-2xl font-black text-cyan-400 mt-2">12</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-slate-300 text-sm">Filled</p>
                  <p className="text-2xl font-black text-emerald-400 mt-2">10</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-slate-300 text-sm">Open</p>
                  <p className="text-2xl font-black text-amber-400 mt-2">2</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Position Modal */}
      <Modal isOpen={showPositionModal} title="Add/Edit Position" onClose={() => setShowPositionModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Position Title</label>
            <input
              type="text"
              name="title"
              value={newPosition.title}
              onChange={handlePositionChange}
              placeholder="e.g., Senior Developer"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
              <option value="">Select a position</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button className="flex-1">Save Position</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setShowPositionModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
};

export default Settings;
