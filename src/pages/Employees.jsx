import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Filter, Download, Edit2, Eye, Trash2, UserPlus } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import AddEmployeeModal from '../components/AddEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import { Card, Button, Badge, Table, Input, Modal } from '../components/UI';
import { EMPLOYEE_STATUS, DEPARTMENTS } from '../utils/constants';
import employeeService from '../services/employeeService';

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeService.getAll();
      console.log('✅ Employees fetched:', data);
      setEmployees(data || []);
    } catch (error) {
      toast.error('Failed to fetch employees');
      console.error('❌ Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    fetchEmployees();
  };

  const handleEditSuccess = () => {
    fetchEmployees();
    setSelectedEmployee(null);
  };

  const handleEditClick = (employee, e) => {
    e.stopPropagation();
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleDeleteClick = async (employeeId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to deactivate this employee?')) {
      return;
    }

    try {
      await employeeService.delete(employeeId);
      toast.success('Employee deactivated successfully!');
      fetchEmployees();
    } catch (error) {
      toast.error(error.message || 'Failed to delete employee');
      console.error('❌ Error deleting employee:', error);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const matchSearch =
      empName.includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp._id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = !filterDept || emp.department === filterDept;
    const matchStatus = !filterStatus || emp.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const statusColors = {
    active: 'green',
    inactive: 'gray',
    on_leave: 'yellow',
    suspended: 'red',
  };

  const columns = [
    {
      key: '_id',
      label: 'Employee ID',
      render: (value, row) => {
        const avatar = row.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.firstName}`;
        return (
          <div className="flex items-center gap-2">
            <img src={avatar} alt={`${row.firstName} ${row.lastName}`} className="w-8 h-8 rounded-full" />
            <span>{value?.slice(0, 8) || 'N/A'}</span>
          </div>
        );
      },
    },
    {
      key: 'firstName',
      label: 'Name',
      render: (value, row) => `${value} ${row.lastName}`,
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'department',
      label: 'Department',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge variant={statusColors[value] || 'gray'}>{value?.replace('_', ' ') || 'N/A'}</Badge>,
    },
    {
      key: '_id',
      label: 'Actions',
      render: (value, row) => (
        <div className="flex gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEmployee(row);
              setShowDetailModal(true);
            }}
            className="p-2 hover:bg-blue-500/20 hover:border-blue-400/50 border border-transparent rounded-lg transition-all" 
            title="View"
          >
            <Eye size={16} className="text-blue-400" />
          </button>
          <button 
            onClick={(e) => handleEditClick(row, e)}
            className="p-2 hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-transparent rounded-lg transition-all" 
            title="Edit"
          >
            <Edit2 size={16} className="text-cyan-400" />
          </button>
          <button 
            onClick={(e) => handleDeleteClick(value, e)}
            className="p-2 hover:bg-red-500/20 hover:border-red-400/50 border border-transparent rounded-lg transition-all" 
            title="Delete"
          >
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header with gradient */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Employee Directory
            </h1>
            <p className="text-slate-400 mt-2">Manage and view all employees</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="group relative overflow-hidden rounded-xl py-3 px-6 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/50 hover:to-blue-500/50 transition-all flex items-center gap-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"></div>
            <UserPlus size={20} className="relative" />
            <span className="relative">Add Employee</span>
          </button>
        </div>

        {/* Filters - Premium Glass Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Filter size={18} className="text-cyan-400" />
            Search & Filter
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-slate-400 transition-all"
              />
            </div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              <option value="" className="bg-slate-900">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept} className="bg-slate-900">
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white transition-all"
            >
              <option value="" className="bg-slate-900">All Status</option>
              <option value="active" className="bg-slate-900">Active</option>
              <option value="on_leave" className="bg-slate-900">On Leave</option>
              <option value="inactive" className="bg-slate-900">Inactive</option>
              <option value="suspended" className="bg-slate-900">Suspended</option>
            </select>
          </div>
        </div>

        {/* Stats - Premium Glass Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-cyan-400/50 transition-all group">
            <p className="text-slate-400 text-sm font-medium">Total Employees</p>
            <p className="text-3xl font-black text-white mt-2">{employees.length}</p>
            <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-green-400/50 transition-all group">
            <p className="text-slate-400 text-sm font-medium">Active</p>
            <p className="text-3xl font-black text-green-400 mt-2">
              {employees.filter((e) => e.status === 'active').length}
            </p>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-amber-400/50 transition-all group">
            <p className="text-slate-400 text-sm font-medium">On Leave</p>
            <p className="text-3xl font-black text-amber-400 mt-2">
              {employees.filter((e) => e.status === 'on_leave').length}
            </p>
          </div>
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-blue-400/50 transition-all group">
            <p className="text-slate-400 text-sm font-medium">Departments</p>
            <p className="text-3xl font-black text-blue-400 mt-2">
              {new Set(employees.map((e) => e.department)).size}
            </p>
          </div>
        </div>

        {/* Table - Premium Glass */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-white/30 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white text-lg">Employee List ({filteredEmployees.length})</h3>
            <button onClick={() => toast.info('Export feature coming soon!')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-300 hover:text-purple-200 hover:border-purple-400/50 text-sm font-semibold transition-all">
              <Download size={16} />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              data={filteredEmployees}
              onRowClick={(emp) => {
                setSelectedEmployee(emp);
                setShowDetailModal(true);
              }}
            />
          </div>
        </div>

        {/* Employee Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          title="Employee Details"
          onClose={() => setShowDetailModal(false)}
          size="lg"
        >
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedEmployee.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployee.firstName}`}
                  alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                  className="w-16 h-16 rounded-lg"
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                  <p className="text-gray-600">{selectedEmployee.role || 'Employee'}</p>
                  <Badge variant={statusColors[selectedEmployee.status] || 'gray'}>
                    {selectedEmployee.status || 'N/A'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee._id?.slice(0, 8) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Joining Date</p>
                  <p className="font-semibold text-gray-800">
                    {selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Salary</p>
                  <p className="font-semibold text-gray-800">
                    ${selectedEmployee.salary ? selectedEmployee.salary.toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button 
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowEditModal(true);
                  }}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button onClick={() => toast.info('Full profile page coming soon!')} variant="secondary" className="flex-1">View Full Profile</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add Employee Modal */}
        <AddEmployeeModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />

        {/* Edit Employee Modal */}
        <EditEmployeeModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
          employee={selectedEmployee}
        />
      </div>
    </MainLayout>
  );
};

export default Employees;
