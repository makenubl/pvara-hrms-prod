import React, { useState } from 'react';
import { Search, Plus, Filter, Download, Edit2, Eye, Trash2, UserPlus } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { handleAddEmployee } from '../utils/handlers';
import { Card, Button, Badge, Table, Input, Modal } from '../components/UI';
import { EMPLOYEE_STATUS, DEPARTMENTS } from '../utils/constants';

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Mock employee data
  const [employees] = useState([
    {
      id: 'EMP001',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1 (555) 123-4567',
      department: 'Technology',
      designation: 'Senior Software Engineer',
      status: 'active',
      joiningDate: '2021-03-15',
      salary: 85000,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    },
    {
      id: 'EMP002',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1 (555) 234-5678',
      department: 'Human Resources',
      designation: 'HR Manager',
      status: 'active',
      joiningDate: '2020-06-20',
      salary: 65000,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    },
    {
      id: 'EMP003',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      phone: '+1 (555) 345-6789',
      department: 'Finance',
      designation: 'Financial Analyst',
      status: 'active',
      joiningDate: '2022-01-10',
      salary: 55000,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    },
    {
      id: 'EMP004',
      name: 'Sarah Williams',
      email: 'sarah@example.com',
      phone: '+1 (555) 456-7890',
      department: 'Marketing',
      designation: 'Marketing Manager',
      status: 'active',
      joiningDate: '2021-09-05',
      salary: 60000,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    {
      id: 'EMP005',
      name: 'Michael Brown',
      email: 'michael@example.com',
      phone: '+1 (555) 567-8901',
      department: 'Technology',
      designation: 'Full Stack Developer',
      status: 'on_leave',
      joiningDate: '2022-05-12',
      salary: 75000,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    },
  ]);

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase());
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
      key: 'id',
      label: 'Employee ID',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <img src={row.avatar} alt={row.name} className="w-8 h-8 rounded-full" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
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
      key: 'designation',
      label: 'Designation',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge variant={statusColors[value]}>{value.replace('_', ' ')}</Badge>,
    },
    {
      key: 'id',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <button className="p-2 hover:bg-blue-500/20 hover:border-blue-400/50 border border-transparent rounded-lg transition-all" title="View">
            <Eye size={16} className="text-blue-400" />
          </button>
          <button className="p-2 hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-transparent rounded-lg transition-all" title="Edit">
            <Edit2 size={16} className="text-cyan-400" />
          </button>
          <button className="p-2 hover:bg-red-500/20 hover:border-red-400/50 border border-transparent rounded-lg transition-all" title="Delete">
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
            onClick={handleAddEmployee}
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
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-300 hover:text-purple-200 hover:border-purple-400/50 text-sm font-semibold transition-all">
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
                setShowModal(true);
              }}
            />
          </div>
        </div>

        {/* Employee Detail Modal */}
        <Modal
          isOpen={showModal}
          title="Employee Details"
          onClose={() => setShowModal(false)}
          size="lg"
        >
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedEmployee.avatar}
                  alt={selectedEmployee.name}
                  className="w-16 h-16 rounded-lg"
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{selectedEmployee.name}</h3>
                  <p className="text-gray-600">{selectedEmployee.designation}</p>
                  <Badge variant="green">{selectedEmployee.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Joining Date</p>
                  <p className="font-semibold text-gray-800">{selectedEmployee.joiningDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Salary</p>
                  <p className="font-semibold text-gray-800">${selectedEmployee.salary.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button className="flex-1">Edit</Button>
                <Button variant="secondary" className="flex-1">View Full Profile</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
};

export default Employees;
