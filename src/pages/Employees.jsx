import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Table, Input, Modal } from '../components/UI';
import { EMPLOYEE_STATUS, DEPARTMENTS } from '../utils/constants';
import employeeService from '../services/employeeService';
import { useAuthStore } from '../store/authStore';

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    status: 'active',
    salary: '',
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();

  // Load employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getAll();
      setEmployees(Array.isArray(data) ? data : data.employees || []);
    } catch (err) {
      setError(err.message || 'Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setSelectedEmployee(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      status: 'active',
      salary: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleEditClick = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      firstName: emp.firstName || emp.name?.split(' ')[0] || '',
      lastName: emp.lastName || emp.name?.split(' ')[1] || '',
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department || '',
      designation: emp.designation || '',
      status: emp.status || 'active',
      salary: emp.salary || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleDeleteClick = async (emp) => {
    if (window.confirm(`Delete ${emp.firstName || emp.name}?`)) {
      try {
        await employeeService.delete(emp._id || emp.id);
        setEmployees(employees.filter(e => (e._id || e.id) !== (emp._id || emp.id)));
      } catch (err) {
        alert('Failed to delete employee: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (!formData.firstName || !formData.email) {
        setFormError('First name and email are required');
        setSubmitting(false);
        return;
      }

      if (selectedEmployee) {
        // Update
        const result = await employeeService.update(selectedEmployee._id || selectedEmployee.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          designation: formData.designation,
          status: formData.status,
          salary: parseInt(formData.salary) || 0,
        });
        setEmployees(employees.map(e => 
          (e._id || e.id) === (selectedEmployee._id || selectedEmployee.id) ? result : e
        ));
      } else {
        // Create
        const result = await employeeService.create({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          designation: formData.designation,
          status: formData.status,
          salary: parseInt(formData.salary) || 0,
        });
        setEmployees([...employees, result]);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const name = `${emp.firstName || ''} ${emp.lastName || emp.name || ''}`.toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDept || emp.department === filterDept;
    const matchesStatus = !filterStatus || emp.status === filterStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Employee Directory</h1>
            <p className="text-slate-400 mt-1">{filteredEmployees.length} employees total</p>
          </div>
          <Button onClick={handleAddClick} className="flex items-center gap-2">
            <Plus size={20} /> Add Employee
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-400/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="">All Status</option>
              {Object.entries(EMPLOYEE_STATUS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading employees...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No employees found</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp._id || emp.id}>
                    <td className="font-medium text-white">{emp.firstName} {emp.lastName || emp.name?.split(' ')[1] || ''}</td>
                    <td className="text-slate-300">{emp.email}</td>
                    <td className="text-slate-300">{emp.department}</td>
                    <td className="text-slate-300">{emp.designation}</td>
                    <td>
                      <Badge 
                        variant={EMPLOYEE_STATUS[emp.status]?.color || 'gray'}
                      >
                        {EMPLOYEE_STATUS[emp.status]?.label || emp.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(emp)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(emp)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">
              {selectedEmployee ? 'Edit Employee' : 'Add Employee'}
            </h2>

            {formError && (
              <div className="p-3 bg-red-500/20 border border-red-400/50 rounded-lg mb-4">
                <p className="text-red-300 text-sm">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    {Object.entries(EMPLOYEE_STATUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="e.g., Senior Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Salary</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Annual salary"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Saving...' : selectedEmployee ? 'Update' : 'Add'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default Employees;
