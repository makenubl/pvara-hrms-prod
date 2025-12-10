import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, Users, Briefcase, UserCog } from 'lucide-react';
import { DEPARTMENTS } from '../utils/constants';
import employeeService from '../services/employeeService';
import positionService from '../services/positionService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const EditEmployeeModal = ({ isOpen, onClose, onSuccess, employee }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    reportsTo: '',
    role: 'employee',
    joiningDate: '',
    salary: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const { user } = useAuthStore();

  // Fetch positions and supervisors on mount
  useEffect(() => {
    if (isOpen) {
      fetchPositions();
      fetchSupervisors();
    }
  }, [isOpen]);

  const fetchPositions = async () => {
    setLoadingPositions(true);
    try {
      const data = await positionService.getAll();
      console.log('✅ Positions fetched for edit:', data);
      setPositions(data || []);
    } catch (error) {
      console.error('❌ Failed to fetch positions:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const fetchSupervisors = async () => {
    setLoadingSupervisors(true);
    try {
      const data = await employeeService.getAll();
      // Filter to show only admins and managers as potential supervisors
      const potentialSupervisors = data.filter(emp => 
        emp.role === 'admin' || emp.role === 'manager' || emp.role === 'hr'
      );
      setSupervisors(potentialSupervisors || []);
    } catch (error) {
      console.error('❌ Failed to fetch supervisors:', error);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  // Populate form when employee data changes
  useEffect(() => {
    if (employee && isOpen) {
      console.log('👁️ Employee selected for edit:', employee);
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || '',
        position: employee.position?._id || employee.position || '',
        reportsTo: employee.reportsTo?._id || employee.reportsTo || '',
        role: employee.role || 'employee',
        joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
        salary: employee.salary || '',
      });
      setErrors({});
    }
  }, [employee, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.position) newErrors.position = 'Position is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (formData.salary && isNaN(parseFloat(formData.salary))) newErrors.salary = 'Salary must be a number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    setLoading(true);
    try {
      const employeeData = {
        ...formData,
        salary: formData.salary ? Number(formData.salary) : 0,
      };
      
      console.log('📤 Submitting edit data for employee:', employee._id, employeeData);
      const response = await employeeService.update(employee._id, employeeData);
      console.log('✅ Employee updated successfully:', response);
      
      toast.success('Employee updated successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      toast.error(error.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-black text-white">Edit Employee</h2>
            <p className="text-slate-400 text-sm mt-1">Update employee information</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400 hover:text-red-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.firstName
                    ? 'border-red-500/50 focus:ring-red-400'
                    : 'border-white/10 focus:ring-cyan-400 focus:border-cyan-400/50'
                }`}
              />
              {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.lastName
                    ? 'border-red-500/50 focus:ring-red-400'
                    : 'border-white/10 focus:ring-cyan-400 focus:border-cyan-400/50'
                }`}
              />
              {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Mail size={16} className="text-cyan-400" />
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@company.com"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-500/50 focus:ring-red-400'
                    : 'border-white/10 focus:ring-cyan-400 focus:border-cyan-400/50'
                }`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Phone size={16} className="text-cyan-400" />
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.phone
                    ? 'border-red-500/50 focus:ring-red-400'
                    : 'border-white/10 focus:ring-cyan-400 focus:border-cyan-400/50'
                }`}
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Department & Position */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Users size={16} className="text-cyan-400" />
                Department <span className="text-red-400">*</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all ${
                  errors.department
                    ? 'border-red-500/50 focus:ring-red-400'
                    : 'border-white/10 focus:ring-cyan-400 focus:border-cyan-400/50'
                }`}
              >
                <option value="" className="bg-slate-900">Select Department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-900">
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Briefcase size={16} className="text-cyan-400" />
                Position <span className="text-red-400">*</span>
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                disabled={loadingPositions}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.position
                    ? 'border-red-500/50 focus:ring-red-400'
                    : 'border-white/10 focus:ring-cyan-400 focus:border-cyan-400/50'
                }`}
              >
                <option value="" className="bg-slate-900">
                  {loadingPositions ? 'Loading positions...' : 'Select Position'}
                </option>
                {positions.map((pos) => (
                  <option key={pos._id} value={pos._id} className="bg-slate-900">
                    {pos.title} {pos.department ? `(${pos.department})` : ''}
                  </option>
                ))}
              </select>
              {errors.position && <p className="text-red-400 text-xs mt-1">{errors.position}</p>}
            </div>
          </div>

          {/* Reports To - Only for Admin/HR/Manager */}
          {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <UserCog size={16} className="text-cyan-400" />
                Reports To (Supervisor)
              </label>
              <select
                name="reportsTo"
                value={formData.reportsTo}
                onChange={handleChange}
                disabled={loadingSupervisors}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 transition-all disabled:opacity-50"
              >
                <option value="" className="bg-slate-900">No Supervisor (Top Level)</option>
                {supervisors
                  .filter(sup => sup._id !== employee?._id) // Don't allow self-reporting
                  .map((supervisor) => (
                    <option key={supervisor._id} value={supervisor._id} className="bg-slate-900">
                      {supervisor.firstName} {supervisor.lastName} ({supervisor.role})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {formData.reportsTo ? 'Employee will report to selected supervisor' : 'Employee will be at top level'}
              </p>
            </div>
          )}

          {/* Role, Date & Salary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">"
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 transition-all"
              >
                <option value="employee" className="bg-slate-900">Employee</option>
                <option value="manager" className="bg-slate-900">Manager</option>
                <option value="hr" className="bg-slate-900">HR</option>
                <option value="admin" className="bg-slate-900">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Joining Date</label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Salary (Annual)</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="50000"
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.salary
                    ? 'border-red-500/50 focus:ring-red-400'
                    : 'border-white/10 focus:ring-cyan-400 focus:border-cyan-400/50'
                }`}
              />
              {errors.salary && <p className="text-red-400 text-xs mt-1">{errors.salary}</p>}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg border border-white/10 text-white font-semibold hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeeModal;
